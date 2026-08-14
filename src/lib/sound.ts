let ctx: AudioContext | null = null;

function context() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Soft tick when something lands in the cart. */
export function playAddSound() {
  try {
    const ac = context();
    const t = ac.currentTime;

    const tone = ac.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(980, t);
    tone.frequency.exponentialRampToValueAtTime(620, t + 0.11);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.045, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

    tone.connect(gain);
    gain.connect(ac.destination);
    tone.start(t);
    tone.stop(t + 0.14);
  } catch {
    /* autoplay or unsupported */
  }
}
