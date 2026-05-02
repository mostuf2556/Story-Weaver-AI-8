import { useCallback } from "react";

export type SoundType = "stt-complete" | "error" | "nudge" | "silence-warning";

function createAudioContext(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

export function useSounds() {
  const playSound = useCallback((type: SoundType) => {
    const ctx = createAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    let latestEnd = now;

    function tone(
      t: OscillatorType,
      f0: number,
      f1: number,
      start: number,
      dur: number,
      vol: number,
    ) {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.type = t;
      osc.frequency.setValueAtTime(f0, start);
      if (f1 !== f0) osc.frequency.linearRampToValueAtTime(f1, start + dur);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
      if (start + dur > latestEnd) latestEnd = start + dur;
    }

    if (type === "stt-complete") {
      // Pleasant ascending triple tone — recognition finished
      tone("sine", 440, 660, now, 0.18, 0.28);
      tone("sine", 660, 880, now + 0.12, 0.22, 0.22);
    } else if (type === "error") {
      // Descending sawtooth — something went wrong
      tone("sawtooth", 440, 200, now, 0.45, 0.3);
    } else if (type === "nudge") {
      // Two short pulses — gentle attention-getter for no-response
      tone("sine", 520, 520, now, 0.12, 0.22);
      tone("sine", 520, 520, now + 0.18, 0.12, 0.22);
    } else if (type === "silence-warning") {
      // Two soft descending pips — "wrapping up soon" countdown signal
      tone("sine", 600, 440, now, 0.10, 0.18);
      tone("sine", 500, 360, now + 0.16, 0.10, 0.15);
    }

    // Close the AudioContext once after ALL oscillators have stopped.
    // A single delayed close prevents the InvalidStateError that occurred
    // when each oscillator's onended handler tried to close an already-
    // closing context (e.g. for the two-tone stt-complete / nudge sounds).
    const closeDelay = Math.max(0, (latestEnd - now) + 0.3) * 1000;
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, closeDelay);
  }, []);

  return { playSound };
}
