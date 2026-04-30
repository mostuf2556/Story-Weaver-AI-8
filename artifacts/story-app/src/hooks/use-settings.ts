import { useState, useEffect } from "react";
import { STT_DEFAULTS, type SttConfig } from "@/config/stt";

export type GameMode = "auto" | "manual";

/**
 * Sentinel value used inside `ttsPlayOrder` to represent "speak the
 * original-language paragraph" (as opposed to a translation). Keeping it
 * as a string in the same array keeps ordering trivial and lets the user
 * place the original anywhere in the play sequence.
 */
export const PLAY_ORIGINAL = "original" as const;

/**
 * Legacy enum that replaced the original boolean. Still kept (and read in
 * the migration) so older persisted settings can be upgraded to
 * `ttsPlayOrder` without losing intent. New code should not read this.
 */
export type TtsTranslationMode = "off" | "with" | "only";

export interface StorySettings {
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey: string;
  apiUrl: string;
  blindMode: boolean;
  playUserTranscription: boolean;
  gameMode: GameMode;
  stt: SttConfig;
  /**
   * BCP-47 languages to display each story line translated into. Empty
   * array = show only the original text. Multiple entries each render
   * their own translated line below the original (and, depending on
   * `ttsTranslationMode`, are also spoken aloud).
   *
   * Translations are powered by Google Translate's free public endpoint
   * (no API key required).
   */
  viewLanguages: string[];
  /**
   * Ordered list of items to speak when the user presses Play. Each entry
   * is either {@link PLAY_ORIGINAL} (= speak the message in its source
   * language) or a BCP-47 code from `viewLanguages` (= speak the
   * translated text). Items absent from this list are silently skipped,
   * letting the user pick *which* translations get spoken and in what
   * order — independent of which translations are *displayed* on screen.
   *
   * Kept loosely in sync with `viewLanguages`: when the user adds a new
   * view language it is auto-appended here so playback "just works"; when
   * a view language is removed it is also pruned from this list. Users
   * who want a non-default order or to skip a translation use the TTS
   * Play Order dialog (`tts-play-order-dialog.tsx`).
   */
  ttsPlayOrder: string[];
  /**
   * Per-language playback speed (rate) for text-to-speech, keyed by the
   * BCP-47 language tag (e.g. { "en-US": 1.0, "ja-JP": 0.85 }). When a
   * language is missing from this map the global `ttsRateDefault` is used.
   * Range matches SpeechSynthesisUtterance.rate (typically 0.5–2.0).
   */
  ttsRates: Record<string, number>;
  /** Default playback rate when a language has no explicit override. */
  ttsRateDefault: number;
  /**
   * Per-language voice selection for text-to-speech, keyed by the BCP-47
   * language tag (e.g. { "en-US": "Google US English", "ja-JP": "Google 日本語" }).
   * When a language is missing from this map, the browser's default voice
   * for that language is used. The voice name should match one of the voices
   * returned by SpeechSynthesis.getVoices().
   */
  ttsVoices: Record<string, string>;
  /**
   * Schema version for the persisted settings blob. Bumped whenever a
   * default changes in a way that should overwrite a previously saved
   * value (e.g. when a default was wrong and the user almost certainly
   * never explicitly chose it). The migration in `load()` re-applies the
   * relevant defaults for any version below the current one.
   */
  settingsVersion: number;
}

/**
 * Bump this when you want existing localStorage payloads to be treated
 * as outdated and re-defaulted in `load()`.
 *  - 1: introduced after `ttsTranslationMode` was added with a `"off"`
 *       default; bumping to "with" so picking View languages auto-plays.
 *  - 2: replaced `ttsTranslationMode` with the richer `ttsPlayOrder`
 *       array. Migration derives the order from the prior mode +
 *       viewLanguages so users keep the playback they had configured.
 */
const SETTINGS_VERSION = 2;

const STORAGE_KEY = "story-together-settings";

const DEFAULTS: StorySettings = {
  model: "openrouter/free",
  maxTokens: 10,
  temperature: 1.0,
  apiKey: "",
  apiUrl: "",
  blindMode: false,
  playUserTranscription: true,
  gameMode: "auto",
  stt: { ...STT_DEFAULTS },
  viewLanguages: [],
  // Default play order: just the original. As soon as the user picks a
  // View language it gets auto-appended (see `syncPlayOrderForView`).
  ttsPlayOrder: [PLAY_ORIGINAL],
  ttsRates: {},
  ttsRateDefault: 0.95,
  ttsVoices: {},
  settingsVersion: SETTINGS_VERSION,
};

/** Shape of legacy settings persisted before the multi-language migration. */
type LegacyStorySettings = Partial<StorySettings> & {
  /** Replaced by `viewLanguages: string[]`. Migrated on load. */
  viewLanguage?: string;
  /** Replaced by `ttsPlayOrder: string[]` (settingsVersion 2). */
  ttsTranslationMode?: TtsTranslationMode;
};

/**
 * Build a default play order from a `viewLanguages` list — original
 * first, then each translation in the order the user picked them. Used
 * by both the v2 migration and the runtime sync helper.
 */
function defaultPlayOrder(viewLanguages: string[]): string[] {
  return [PLAY_ORIGINAL, ...viewLanguages];
}

/**
 * Reconcile `ttsPlayOrder` against the current `viewLanguages`:
 *   - drop entries that are no longer a view language (and aren't the
 *     special "original" sentinel),
 *   - append any view language not already in the order so newly added
 *     translations start playing immediately.
 *
 * `PLAY_ORIGINAL` is preserved if present and added back when missing
 * (so the default play order always at least contains the original).
 */
export function syncPlayOrderForView(
  currentOrder: string[],
  viewLanguages: string[],
): string[] {
  const allowed = new Set<string>([PLAY_ORIGINAL, ...viewLanguages]);
  const kept = currentOrder.filter((item) => allowed.has(item));
  const next = kept.includes(PLAY_ORIGINAL) ? kept : [PLAY_ORIGINAL, ...kept];
  for (const lang of viewLanguages) {
    if (!next.includes(lang)) next.push(lang);
  }
  return next;
}

function load(): StorySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LegacyStorySettings;
      // Migrate legacy single `viewLanguage` → `viewLanguages: string[]`.
      // "off" / empty / missing → no translations selected.
      let viewLanguages = parsed.viewLanguages ?? DEFAULTS.viewLanguages;
      if (
        !parsed.viewLanguages &&
        parsed.viewLanguage &&
        parsed.viewLanguage !== "off"
      ) {
        viewLanguages = [parsed.viewLanguage];
      }
      const storedVersion = parsed.settingsVersion ?? 0;
      // v2 migration: derive `ttsPlayOrder` from the previous
      // `ttsTranslationMode` enum + `viewLanguages` so users keep the
      // playback intent they had configured. New default is "everything
      // in selection order" — original then each translation.
      let ttsPlayOrder: string[];
      if (Array.isArray(parsed.ttsPlayOrder) && storedVersion >= 2) {
        // Already on v2 or newer — keep what was saved but reconcile
        // against the current viewLanguages (handles cases where the
        // user removed a view language without opening the dialog).
        ttsPlayOrder = syncPlayOrderForView(parsed.ttsPlayOrder, viewLanguages);
      } else if (parsed.ttsTranslationMode === "off") {
        ttsPlayOrder = [PLAY_ORIGINAL];
      } else if (parsed.ttsTranslationMode === "only") {
        ttsPlayOrder = [...viewLanguages];
      } else {
        // "with" (or anything unrecognised) → default behaviour.
        ttsPlayOrder = defaultPlayOrder(viewLanguages);
      }
      return {
        ...DEFAULTS,
        ...parsed,
        stt: { ...DEFAULTS.stt, ...(parsed.stt ?? {}) },
        ttsRates: { ...DEFAULTS.ttsRates, ...(parsed.ttsRates ?? {}) },
        ttsVoices: { ...DEFAULTS.ttsVoices, ...(parsed.ttsVoices ?? {}) },
        viewLanguages,
        ttsPlayOrder,
        settingsVersion: SETTINGS_VERSION,
      };
    }
  } catch {}
  return DEFAULTS;
}

export function useSettings() {
  const [settings, setSettingsState] = useState<StorySettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const updateSettings = (patch: Partial<StorySettings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch }));
  };

  return { settings, updateSettings, DEFAULTS };
}
