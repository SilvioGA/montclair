const TOKEN = "montclair-admin";

export function apiUrl(path: string) {
  const env = import.meta.env.PUBLIC_API_URL as string | undefined;
  const local =
    typeof location !== "undefined" &&
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "http://localhost:8787"
      : "";
  const base = (env || local).replace(/\/$/, "");
  return `${base}${path}`;
}

export function adminToken() {
  try {
    return sessionStorage.getItem(TOKEN) || "";
  } catch {
    return "";
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN, token);
    else sessionStorage.removeItem(TOKEN);
  } catch {
    /* ignore */
  }
}

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const token = adminToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "No se pudo");
  return data;
}
