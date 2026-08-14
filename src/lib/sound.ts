let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function context() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  if (!noise) {
    const n = Math.floor(ctx.sampleRate * 0.04);
    noise = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < n; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
    }
  }
  return ctx;
}

/** Short mechanical click when something lands in the cart. */
export function playAddSound() {
  try {
    const ac = context();
    const t = ac.currentTime;

    const burst = ac.createBufferSource();
    burst.buffer = noise;

    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2100, t);
    filter.Q.setValueAtTime(1.1, t);

    const snap = ac.createGain();
    snap.gain.setValueAtTime(0.14, t);
    snap.gain.exponentialRampToValueAtTime(0.0001, t + 0.042);

    burst.connect(filter);
    filter.connect(snap);
    snap.connect(ac.destination);
    burst.start(t);
    burst.stop(t + 0.045);

    const tick = ac.createOscillator();
    tick.type = "triangle";
    tick.frequency.setValueAtTime(1950, t);
    tick.frequency.exponentialRampToValueAtTime(880, t + 0.038);

    const body = ac.createGain();
    body.gain.setValueAtTime(0.028, t);
    body.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    tick.connect(body);
    body.connect(ac.destination);
    tick.start(t);
    tick.stop(t + 0.055);
  } catch {
    /* autoplay or unsupported */
  }
}
