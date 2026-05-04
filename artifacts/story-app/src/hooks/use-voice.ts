import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "speaking";

// Minimal SpeechRecognition typing — the Web Speech API isn't included in
// TypeScript's default DOM lib so we declare the surface we actually use.
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: ((e: any) => void) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((e: any) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface ListenOptions {
  /** Ms of silence after speech ends before resolving. Default 4000. */
  silenceMs?: number;
  /**
   * Ms of no-speech before the nudge callback fires. Default 0 (disabled).
   * Repeats every `nudgeMs` until `maxNudges` is reached, then stops recognition.
   */
  nudgeMs?: number;
  /** How many nudges to emit before giving up. Default 0 (infinite). */
  maxNudges?: number;
  /** Called each time the nudge timer fires. Receives nudge index (1-based). */
  onNudge?: (nudgeIndex: number) => void;
  /** BCP-47 language tag for SpeechRecognition (e.g. "en-US"). Default "en-US". */
  language?: string;
  /**
   * Hard cap (ms) on listening time once the user has actually started
   * speaking. Useful to prevent the silence detector from getting stuck in
   * noisy environments. Default 0 (disabled).
   */
  maxSpeechMs?: number;
  /**
   * Called repeatedly as speech is being recognised (interim results).
   * Receives the best-guess transcript so far (final + current interim).
   */
  onInterim?: (partial: string) => void;
  /**
   * How many ms before the silence cutoff to fire `onSilenceWarning`.
   * Default 0 (disabled). Typical value: 1500.
   */
  silenceWarningMs?: number;
  /** Called `silenceWarningMs` before the silence cutoff fires. */
  onSilenceWarning?: () => void;
}

export function useVoice(enabled: boolean) {
  const [state, setState] = useState<VoiceState>("idle");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);

  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  /**
   * Pick the best available voice for the given BCP-47 lang. If a preferred
   * voice name is provided, tries to match it first. Falls back to trying
   * an exact language match, then a language-only match (e.g. "en" for
   * "en-US").
   */
  const pickVoice = useCallback(
    (lang: string, preferredVoiceName?: string): SpeechSynthesisVoice | null => {
      const synth = synthRef.current;
      if (!synth) return null;
      const voices = synth.getVoices();
      if (!voices || voices.length === 0) return null;
      const target = lang.toLowerCase();
      const targetBase = target.split("-")[0];
      
      if (preferredVoiceName) {
        const preferred = voices.find(
          (v) => v.name.toLowerCase() === preferredVoiceName.toLowerCase()
        );
        if (preferred) return preferred;
      }
      
      const exact = voices.find((v) => v.lang.toLowerCase() === target);
      if (exact) return exact;
      const baseMatch = voices.find(
        (v) => v.lang.toLowerCase().split("-")[0] === targetBase,
      );
      return baseMatch ?? null;
    },
    [],
  );

  const speak = useCallback(
    (
      text: string,
      language: string = "en-US",
      rate: number = 0.95,
      opts?: { onWord?: (info: { wordIndex: number; charIndex: number }) => void; voiceName?: string },
    ): Promise<void> => {
      return new Promise((resolve) => {
        const synth = synthRef.current;
        if (!synth) {
          console.warn("[useVoice.speak] no SpeechSynthesis available");
          resolve();
          return;
        }

        const wordRanges: Array<[number, number]> = [];
        if (opts?.onWord) {
          const parts = text.split(/(\s+)/);
          let pos = 0;
          for (const part of parts) {
            if (part.length === 0) continue;
            if (/\S/.test(part)) wordRanges.push([pos, pos + part.length]);
            pos += part.length;
          }
        }

        const buildUtterance = () => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = Math.min(Math.max(rate, 0.1), 10);
          utterance.pitch = 1.0;
          utterance.lang = language;
          const voice = pickVoice(language, opts?.voiceName);
          if (voice) utterance.voice = voice;

          if (opts?.onWord && wordRanges.length > 0) {
            let lastWordIdx = -1;
            utterance.onboundary = (e: SpeechSynthesisEvent) => {
              if (e.name && e.name !== "word") return;
              const ci = e.charIndex ?? 0;
              for (let i = Math.max(lastWordIdx, 0); i < wordRanges.length; i++) {
                const [s, end] = wordRanges[i];
                if (ci >= s && ci < end) {
                  lastWordIdx = i;
                  opts.onWord!({ wordIndex: i, charIndex: ci });
                  return;
                }
                if (ci < s) {
                  lastWordIdx = i;
                  opts.onWord!({ wordIndex: i, charIndex: ci });
                  return;
                }
              }
            };
          }

          let resolved = false;
          const settle = () => {
            if (resolved) return;
            resolved = true;
            setState("idle");
            resolve();
          };
          utterance.onstart = () => {
            console.info(
              `[useVoice.speak] onstart lang=${language} rate=${utterance.rate} voice=${utterance.voice?.name ?? "(default)"} chars=${text.length}`,
            );
            setState("speaking");
          };
          utterance.onend = () => {
            console.info("[useVoice.speak] onend");
            settle();
          };
          utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
            console.warn(`[useVoice.speak] onerror error=${e.error}`);
            settle();
          };
          return utterance;
        };

        const start = () => {
          try {
            synth.resume();
          } catch {
            // ignore
          }
          const utterance = buildUtterance();
          console.info(
            `[tts-play] lang=${language} speed=${utterance.rate} chars=${text.length}`,
          );
          console.info(
            `[useVoice.speak] speak() pending=${synth.pending} speaking=${synth.speaking} paused=${synth.paused}`,
          );
          synth.speak(utterance);
        };

        if (synth.speaking || synth.pending) {
          synth.cancel();
          setTimeout(start, 60);
        } else {
          start();
        }
      });
    },
    [pickVoice]
  );

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setState("idle");
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.abort();
    setState("idle");
  }, []);

  /**
   * Listen until speech is detected and then `silenceMs` of silence elapses.
   * Calls `onInterim` repeatedly with the running transcript so callers can
   * show live partial results. Calls `onSilenceWarning` before the cutoff.
   */
  const listenOnce = useCallback(
    (options: ListenOptions = {}): Promise<string> => {
      const {
        silenceMs = 4000,
        nudgeMs = 0,
        maxNudges = 0,
        onNudge,
        language = "en-US",
        maxSpeechMs = 0,
        onInterim,
        silenceWarningMs = 0,
        onSilenceWarning,
      } = options;

      return new Promise((resolve) => {
        if (!enabled) {
          resolve("");
          return;
        }

        const Ctor = getSpeechRecognition();
        if (!Ctor) {
          resolve("");
          return;
        }

        const recognition = new Ctor();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;

        let transcript = "";
        let speechDetected = false;
        let silenceTimer: ReturnType<typeof setTimeout> | null = null;
        let warningTimer: ReturnType<typeof setTimeout> | null = null;
        let nudgeTimer: ReturnType<typeof setTimeout> | null = null;
        let maxSpeechTimer: ReturnType<typeof setTimeout> | null = null;
        let nudgeCount = 0;

        const clearAllTimers = () => {
          if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
          if (warningTimer) { clearTimeout(warningTimer); warningTimer = null; }
          if (nudgeTimer) { clearTimeout(nudgeTimer); nudgeTimer = null; }
          if (maxSpeechTimer) { clearTimeout(maxSpeechTimer); maxSpeechTimer = null; }
        };

        const resetSilenceTimer = () => {
          if (silenceTimer) clearTimeout(silenceTimer);
          if (warningTimer) { clearTimeout(warningTimer); warningTimer = null; }
          // Schedule warning before the silence cutoff fires
          if (silenceWarningMs > 0 && onSilenceWarning && silenceMs > silenceWarningMs) {
            warningTimer = setTimeout(() => {
              onSilenceWarning();
            }, silenceMs - silenceWarningMs);
          }
          silenceTimer = setTimeout(() => recognition.stop(), silenceMs);
        };

        const scheduleNudge = () => {
          if (!nudgeMs || nudgeMs <= 0) return;
          nudgeTimer = setTimeout(() => {
            if (speechDetected) return;
            nudgeCount++;
            onNudge?.(nudgeCount);
            if (maxNudges > 0 && nudgeCount >= maxNudges) {
              recognition.stop();
            } else {
              scheduleNudge();
            }
          }, nudgeMs);
        };

        recognition.onstart = () => {
          setState("listening");
          scheduleNudge();
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (e: any) => {
          if (!speechDetected) {
            speechDetected = true;
            if (nudgeTimer) { clearTimeout(nudgeTimer); nudgeTimer = null; }
            if (maxSpeechMs > 0) {
              maxSpeechTimer = setTimeout(() => {
                recognition.stop();
              }, maxSpeechMs);
            }
          }
          let currentInterim = "";
          let hasContent = false;
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              transcript += e.results[i][0].transcript + " ";
              hasContent = true;
            } else if (e.results[i][0].transcript) {
              currentInterim += e.results[i][0].transcript;
              hasContent = true;
            }
          }
          // Fire interim callback with running best-guess transcript
          if (onInterim && (transcript || currentInterim)) {
            onInterim((transcript + currentInterim).trim());
          }
          if (hasContent) resetSilenceTimer();
        };

        recognition.onend = () => {
          clearAllTimers();
          setState("idle");
          resolve(transcript.trim());
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (e: any) => {
          console.warn("[useVoice.listenOnce] recognition error:", e.error ?? e);
          clearAllTimers();
          setState("idle");
          resolve(transcript.trim());
        };

        recognition.start();
      });
    },
    [enabled]
  );

  /**
   * Manual listen with streaming interim results (used outside of blind auto-loop).
   * Calls `onResult` for every interim and final result so the caller can
   * show live transcription in a textarea.
   */
  const listen = useCallback(
    (
      onResult: (transcript: string) => void,
      onEnd?: () => void,
      language: string = "en-US",
    ): (() => void) => {
      if (!enabled) return () => {};

      const Ctor = getSpeechRecognition();
      if (!Ctor) {
        alert("Your browser does not support voice recognition. Try Chrome or Edge.");
        return () => {};
      }

      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => setState("listening");
      let finalAccum = "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (e: any) => {
        // Only process newly arrived results (avoids Chrome mobile re-sending old
        // interim results each event, which caused duplicate words).
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalAccum += e.results[i][0].transcript;
          }
        }
        // Show the latest interim text from the last non-final result
        const last = e.results[e.results.length - 1];
        const interim = last && !last.isFinal ? last[0].transcript : "";
        onResult(finalAccum || interim);
      };
      recognition.onend = () => {
        setState("idle");
        onEnd?.();
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (e: any) => {
        console.warn("[useVoice.listen] recognition error:", e.error ?? e);
        setState("idle");
        onEnd?.();
      };

      recognition.start();

      return () => {
        recognition.abort();
        setState("idle");
      };
    },
    [enabled]
  );

  return { state, speak, stopSpeaking, stopListening, listen, listenOnce };
}
