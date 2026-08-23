export interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  ADMIN_SECRET: string;
}

const COOKIE = "montclair_admin";
const DAY = 60 * 60 * 24;

const enc = new TextEncoder();

function json(data: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

function cors(req: Request, res: Response) {
  const origin = req.headers.get("Origin") || "";
  const allow =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".pages.dev")
      ? origin
      : "";
  if (allow) {
    res.headers.set("Access-Control-Allow-Origin", allow);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Headers", "content-type, authorization");
    res.headers.set("Access-Control-Allow-Methods", "GET,PATCH,POST,OPTIONS");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeSession(secret: string) {
  const exp = String(Math.floor(Date.now() / 1000) + 7 * DAY);
  return `${exp}.${await hmac(secret, exp)}`;
}

async function validSession(secret: string, token: string | null) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return sig === (await hmac(secret, exp));
}

function cookieValue(req: Request) {
  const raw = req.headers.get("Cookie") || "";
  const hit = raw.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(COOKIE.length + 1)) : null;
}

function bearer(req: Request) {
  const h = req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

function rowToPerfume(row: Record<string, unknown>) {
  const moods = JSON.parse(String(row.moods || "[]"));
  const related = JSON.parse(String(row.related || "[]"));
  return {
    slug: row.slug,
    name: row.name,
    house: row.house,
    smell: row.smell,
    gender: row.gender,
    world: row.world,
    moods,
    image: row.image,
    available: Boolean(row.available),
    related,
    sizes: [
      { key: "3", label: "3 ml", price: Number(row.price_3), hint: "Para olerlo" },
      { key: "5", label: "5 ml", price: Number(row.price_5), hint: "El que más piden" },
      { key: "10", label: "10 ml", price: Number(row.price_10), hint: "Para usarlo seguido" },
      { key: "frasco", label: "Frasco", price: Number(row.price_frasco), hint: "Si ya lo conoces. Precio estimado." },
    ],
  };
}

async function requireAdmin(req: Request, env: Env) {
  return validSession(env.ADMIN_SECRET, bearer(req) || cookieValue(req));
}

export default {
  async fetch(req: Request, env: Env) {
    if (req.method === "OPTIONS") return cors(req, new Response(null, { status: 204 }));

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    try {
      if (req.method === "GET" && (path === "/catalog" || path === "/api/catalog")) {
        const { results } = await env.DB.prepare("SELECT * FROM perfumes ORDER BY house, name").all();
        return cors(req, json({ perfumes: (results || []).map((r) => rowToPerfume(r as Record<string, unknown>)) }));
      }

      if (req.method === "POST" && (path === "/admin/login" || path === "/api/admin/login")) {
        const body = (await req.json().catch(() => ({}))) as { password?: string };
        if (!body.password || body.password !== env.ADMIN_PASSWORD) {
          return cors(req, json({ error: "Clave incorrecta" }, 401));
        }
        const token = await makeSession(env.ADMIN_SECRET);
        const res = json({ ok: true, token });
        res.headers.set(
          "Set-Cookie",
          `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * DAY}`,
        );
        return cors(req, res);
      }

      if (req.method === "POST" && (path === "/admin/logout" || path === "/api/admin/logout")) {
        const res = json({ ok: true });
        res.headers.set("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
        return cors(req, res);
      }

      if (req.method === "GET" && (path === "/admin/session" || path === "/api/admin/session")) {
        const ok = await requireAdmin(req, env);
        return cors(req, json({ ok }, ok ? 200 : 401));
      }

      const patch = path.match(/^\/(?:api\/)?admin\/perfumes\/([^/]+)$/);
      if (req.method === "PATCH" && patch) {
        if (!(await requireAdmin(req, env))) return cors(req, json({ error: "Entrá primero" }, 401));
        const slug = decodeURIComponent(patch[1]);
        const body = (await req.json().catch(() => ({}))) as {
          available?: boolean;
          price_3?: number;
          price_5?: number;
          price_10?: number;
          price_frasco?: number;
        };
        const current = await env.DB.prepare("SELECT * FROM perfumes WHERE slug = ?").bind(slug).first();
        if (!current) return cors(req, json({ error: "No está" }, 404));

        const available = body.available === undefined ? current.available : body.available ? 1 : 0;
        const price_3 = Number(body.price_3 ?? current.price_3);
        const price_5 = Number(body.price_5 ?? current.price_5);
        const price_10 = Number(body.price_10 ?? current.price_10);
        const price_frasco = Number(body.price_frasco ?? current.price_frasco);

        await env.DB.prepare(
          "UPDATE perfumes SET available = ?, price_3 = ?, price_5 = ?, price_10 = ?, price_frasco = ? WHERE slug = ?",
        )
          .bind(available, price_3, price_5, price_10, price_frasco, slug)
          .run();

        const row = await env.DB.prepare("SELECT * FROM perfumes WHERE slug = ?").bind(slug).first();
        return cors(req, json({ perfume: rowToPerfume(row as Record<string, unknown>) }));
      }

      return cors(req, json({ error: "Nada aquí" }, 404));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      return cors(req, json({ error: message }, 500));
    }
  },
};
