"use client";

type CtxRef = { current: AudioContext | null };

function getAudioContext(ctxRef?: CtxRef): AudioContext | null {
  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return null;
    if (ctxRef) {
      if (!ctxRef.current) ctxRef.current = new AudioCtor();
      return ctxRef.current;
    }
    return new AudioCtor();
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  {
    frequency,
    start,
    duration,
    type = "sine",
    peak = 0.16,
  }: {
    frequency: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    peak?: number;
  }
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** Short click when picking an answer. */
export function playSelectBeep(ctxRef?: CtxRef) {
  const ctx = getAudioContext(ctxRef);
  if (!ctx) return;
  void ctx.resume();
  const t = ctx.currentTime;
  tone(ctx, { frequency: 720, start: t, duration: 0.14, peak: 0.18 });
}

/** Cheerful arpeggio when the student passes. */
export function playPassFanfare(ctxRef?: CtxRef) {
  const ctx = getAudioContext(ctxRef);
  if (!ctx) return;
  void ctx.resume();
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((frequency, i) => {
    tone(ctx, {
      frequency,
      start: t + i * 0.12,
      duration: 0.28,
      type: i === notes.length - 1 ? "triangle" : "sine",
      peak: 0.14 + i * 0.02,
    });
  });
  // Soft sparkle after
  tone(ctx, {
    frequency: 1568,
    start: t + 0.55,
    duration: 0.35,
    type: "triangle",
    peak: 0.1,
  });
}

/** Gentle tone when not yet passed. */
export function playEncourageTone(ctxRef?: CtxRef) {
  const ctx = getAudioContext(ctxRef);
  if (!ctx) return;
  void ctx.resume();
  const t = ctx.currentTime;
  tone(ctx, { frequency: 392, start: t, duration: 0.22, peak: 0.1 });
  tone(ctx, { frequency: 330, start: t + 0.2, duration: 0.28, peak: 0.08 });
}
