import { useEffect, useMemo, useRef, useState, useCallback, Fragment } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetOpenrouterConversation,
  useListOpenrouterMessages,
  useUpdateOpenrouterMessage,
  useDeleteOpenrouterMessage,
  useDeleteOpenrouterMessageFromHere,
  useRegenerateOpenrouterMessage,
  getGetOpenrouterConversationQueryKey,
  getListOpenrouterMessagesQueryKey,
  type OpenrouterMessage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStoryStream, emitDebug } from "@/hooks/use-story-stream";
import { useSettings } from "@/hooks/use-settings";
import { useDocumentDir } from "@/hooks/use-document-dir";
import { useVoice } from "@/hooks/use-voice";
import { useSounds } from "@/hooks/use-sounds";
import { OpenrouterSettingsDialog } from "@/components/openrouter-settings-dialog";
import { SttSettingsDialog } from "@/components/stt-settings-dialog";
import { TtsSpeedDialog } from "@/components/tts-speed-dialog";
import { TtsVoiceDialog } from "@/components/tts-voice-dialog";
import { SttLanguageSwitcher } from "@/components/stt-language-switcher";
import { ViewLanguagesSwitcher } from "@/components/view-languages-switcher";
import { TtsPlayOrderDialog } from "@/components/tts-play-order-dialog";
import { TranslatedLine } from "@/components/translated-line";

import { translate, toGoogleLang } from "@/lib/translate";
import {
  PLAY_ORIGINAL,
  syncPlayOrderForView,
  type StorySettings,
} from "@/hooks/use-settings";
import { ThemeToggle } from "@/components/theme-toggle";
import { DebugPanel } from "@/components/debug-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Home,
  Send,
  Sparkles,
  PenLine,
  Pencil,
  Wand2,
  Check,
  X,
  Volume2,
  VolumeX,
  Mic,
  Ear,
  EarOff,
  AlertCircle,
  Trash2,
  RefreshCw,
  Pause,
  Play,
  StopCircle,
  Zap,
  ZapOff,
  Bug,
  Settings,
  ImageIcon,
  Merge,
  ChevronRight,
  ChevronDown,
  ListEnd,
  MoreVertical,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n-context";
import { useHealthCheck } from "@/hooks/use-health-check";
import { STT_LANGUAGES } from "@/config/stt";
import { TRANSLATE_LANGUAGES } from "@/config/translate-languages";

/**
 * Map a BCP-47 or Google-translate language code to a human-readable label.
 * Checks STT_LANGUAGES first (regional codes like "en-US"), then
 * TRANSLATE_LANGUAGES (short codes like "en", "he"), then falls back to the
 * raw code string.
 */
function langCodeToName(code: string): string {
  if (!code) return code;
  const lower = code.toLowerCase();
  for (const l of STT_LANGUAGES) {
    if (l.code.toLowerCase() === lower) return l.label;
  }
  for (const l of TRANSLATE_LANGUAGES) {
    if (l.code.toLowerCase() === lower) return l.label;
  }
  const base = lower.split("-")[0];
  for (const l of TRANSLATE_LANGUAGES) {
    if (l.code.toLowerCase() === base) return l.label;
  }
  return code;
}

/**
 * Returns true for languages that flow right-to-left (Arabic, Hebrew, etc.)
 * so the story line container can set dir="rtl" automatically.
 */
function isRtlLang(code: string): boolean {
  if (!code) return false;
  const base = code.toLowerCase().split("-")[0];
  return ["ar", "he", "fa", "ur", "yi", "ps", "sd", "dv"].includes(base);
}

/**
 * Turn an unknown error from a mutation/fetch into a single-line user-
 * facing message. Tries to dig out the most useful field (`message`,
 * server-side `error`, status text) without dumping the whole stack trace
 * into the banner.
 */
function formatActionError(prefix: string, err: unknown): string {
  if (!err) return prefix;
  const anyErr = err as {
    message?: string;
    response?: { data?: { error?: string; message?: string }; statusText?: string; status?: number };
    status?: number;
    statusText?: string;
  };
  const detail =
    anyErr.response?.data?.error ||
    anyErr.response?.data?.message ||
    anyErr.message ||
    anyErr.response?.statusText ||
    anyErr.statusText;
  const code = anyErr.response?.status ?? anyErr.status;
  if (detail && code) return `${prefix}: ${detail} (HTTP ${code})`;
  if (detail) return `${prefix}: ${detail}`;
  if (code) return `${prefix}: HTTP ${code}`;
  try {
    return `${prefix}: ${JSON.stringify(err)}`;
  } catch {
    return `${prefix}: ${String(err)}`;
  }
}

/**
 * Render a message body word-by-word so that during TTS playback we can
 * highlight whichever word the engine is currently announcing.
 *
 * Tokens are split preserving whitespace runs so `whitespace-pre-wrap` on
 * the wrapper keeps original visual spacing intact.
 *
 * Words are grouped into sentence "buckets" by detecting sentence-ending
 * punctuation (.!?). The bucket containing the active word gets a subtle
 * blue outline so the reader can see which sentence is being spoken — the
 * "square around the current sentence" effect (item 5).
 *
 * `highlightWord` is the 0-based word index (ignoring whitespace runs)
 * that should be highlighted, or `null` for no highlight.
 */
function MessageBody({
  text,
  highlightWord,
}: {
  text: string;
  highlightWord: number | null;
}) {
  // Group tokens into sentence buckets.
  // A new bucket starts after every token that ends with . ! ? (possibly
  // followed by quotes/brackets), so multi-sentence paragraphs each have
  // their own container that can be highlighted independently.
  const buckets = useMemo(() => {
    const allTokens = text.split(/(\s+)/);
    const groups: Array<{
      tokens: Array<{ tok: string; wordIdx: number | null }>;
      startWord: number;
      endWord: number;
    }> = [];
    let current: (typeof groups)[0] = { tokens: [], startWord: 0, endWord: -1 };
    let wordCount = 0;

    for (const tok of allTokens) {
      if (tok.length === 0) continue;
      if (/^\s+$/.test(tok)) {
        current.tokens.push({ tok, wordIdx: null });
        continue;
      }
      const wIdx = wordCount++;
      current.tokens.push({ tok, wordIdx: wIdx });
      current.endWord = wIdx;

      // Sentence boundary: token ends with . ! ? (optionally followed by " ' ) ] )
      if (/[.!?؟]+['")\]]*$/.test(tok)) {
        groups.push(current);
        current = { tokens: [], startWord: wordCount, endWord: wordCount };
      }
    }

    if (current.tokens.length > 0) {
      groups.push(current);
    }

    // If nothing was grouped (no punctuation), the whole text is one bucket
    return groups;
  }, [text]);

  // Derive active-sentence index from the active-word index
  const activeBucketIdx = useMemo(() => {
    if (highlightWord === null) return null;
    for (let i = 0; i < buckets.length; i++) {
      if (highlightWord >= buckets[i].startWord && highlightWord <= buckets[i].endWord) {
        return i;
      }
    }
    return null;
  }, [highlightWord, buckets]);

  return (
    <div className="whitespace-pre-wrap" dir="auto">
      {buckets.map((bucket, bIdx) => {
        const isSentenceActive = bIdx === activeBucketIdx && activeBucketIdx !== null;
        return (
          <span
            key={bIdx}
            className={cn(
              "transition-colors duration-200",
              isSentenceActive &&
                "bg-sky-100/60 dark:bg-sky-900/30 ring-1 ring-sky-400/50 dark:ring-sky-600/50 rounded-sm",
            )}
          >
            {bucket.tokens.map(({ tok, wordIdx: wIdx }, tIdx) => {
              if (wIdx === null) return <span key={tIdx}>{tok}</span>;
              const isWordActive = wIdx === highlightWord;
              return (
                <span
                  key={tIdx}
                  className={cn(
                    "transition-colors duration-100",
                    isWordActive &&
                      "bg-amber-300/60 dark:bg-amber-400/50 text-foreground rounded px-0.5",
                  )}
                >
                  {tok}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}

export default function Story() {
  const [, params] = useRoute("/story/:id");
  const id = Number(params?.id);

  const { settings, updateSettings } = useSettings();
  const queryClient = useQueryClient();

  const { data: conversation, isLoading: isLoadingConv } =
    useGetOpenrouterConversation(id, {
      query: {
        enabled: !!id,
        queryKey: getGetOpenrouterConversationQueryKey(id),
      },
    });

  const { data: messages, isLoading: isLoadingMsgs } =
    useListOpenrouterMessages(id, {
      query: {
        enabled: !!id,
        queryKey: getListOpenrouterMessagesQueryKey(id),
      },
    });

  const {
    submitUserMessage,
    requestAiTurn,
    sendMessage,
    isTyping,
    streamedContent,
    streamError,
    clearError,
  } = useStoryStream(id, settings);
  const updateMessage = useUpdateOpenrouterMessage();
  const deleteMessage = useDeleteOpenrouterMessage();
  const deleteFromHere = useDeleteOpenrouterMessageFromHere();
  const regenerateMessage = useRegenerateOpenrouterMessage();
  // Track which message is currently being regenerated (so only that row shows
  // the spinner, not all of them).
  const [regeneratingMsgId, setRegeneratingMsgId] = useState<number | null>(
    null,
  );
  const [translationsFolded, setTranslationsFolded] = useState(false);

  const voice = useVoice(true);
  const { playSound } = useSounds();
  useDocumentDir(settings.uiLanguage);
  const t = getT(settings.uiLanguage);

  // Server health indicator
  const { status: healthStatus, history: healthHistory, refetch: healthRefetch } = useHealthCheck(30_000);

  // Debug panel — driven by config.json `debugToggle` field (default true)
  const [debugToggle, setDebugToggle] = useState(true);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  useEffect(() => {
    fetch("/api/openrouter/config")
      .then((r) => r.json())
      .then((cfg: { debugToggle?: boolean }) => {
        setDebugToggle(cfg.debugToggle !== false);
      })
      .catch(() => {
        /* keep default true if config fetch fails */
      });
  }, []);

  // Bottom action sheet — which message's actions are open on mobile
  const [actionSheetMsg, setActionSheetMsg] = useState<OpenrouterMessage | null>(null);
  // ID of the story line that is currently highlighted (set when bottom sheet opens)
  const [selectedMsgId, setSelectedMsgId] = useState<number | null>(null);
  // Counts consecutive magic-stop-word utterances in voice dictation mode
  const stopWordCountRef = useRef(0);
  // Tracks the last transcript value across sessions for magic-word detection
  const lastTranscriptRef = useRef("");

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // Composer (normal mode)
  const [draft, setDraft] = useState("");
  // Live interim voice transcript shown while the mic is active
  const [interimTranscript, setInterimTranscript] = useState("");

  // Blind mode status text shown to the user
  const [blindStatus, setBlindStatus] = useState("");
  // Amber background when user hasn't responded (nudge state)
  const [isNoResponse, setIsNoResponse] = useState(false);

  const endOfStoryRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Tracks which AI message id has been processed by the blind loop
  const lastHandledMsgIdRef = useRef<number | null>(null);
  // Tracks which (lastMsg, refreshTick) pair the blind loop has started for
  const lastCycleKeyRef = useRef<string | null>(null);
  // Prevents concurrent blind-mode loops
  const blindLoopRunningRef = useRef(false);
  // Allows the in-flight loop to detect blind-mode toggle-off
  const blindModeEnabledRef = useRef(settings.blindMode);
  // Track if we already played the error sound this error cycle
  const errorSoundPlayedRef = useRef(false);
  // When true, the loop gave up after max nudges and should not auto-restart
  const gaveUpRef = useRef(false);

  // --- "Play story" full-conversation TTS playback ---
  // Tracks whether the user has pressed the header Play button. We use a ref
  // alongside the state so the async per-message loop can detect a Stop press
  // mid-flight without waiting for React to re-render.
  const [isPlayingStory, setIsPlayingStory] = useState(false);
  const isPlayingStoryRef = useRef(false);

  /**
   * Resolve which BCP-47 language a saved message should be read in. Prefers
   * the language stored on the row (set when the message was first created),
   * but falls back to the user's active STT/AI language for legacy rows that
   * pre-date the schema migration so older stories still play back sensibly.
   */
  const resolveMessageLanguage = useCallback(
    (msg: { role: string; language?: string | null }): string => {
      if (msg.language) return msg.language;
      return msg.role === "assistant"
        ? settings.stt.aiLanguage
        : settings.stt.language;
    },
    [settings.stt.aiLanguage, settings.stt.language],
  );

  /** Look up the configured playback rate for a given language. */
  const rateForLanguage = useCallback(
    (lang: string): number =>
      settings.ttsRates[lang] ?? settings.ttsRateDefault,
    [settings.ttsRates, settings.ttsRateDefault],
  );

  /**
   * Build the ordered list of (text, lang, rate, voiceName) units that should be
   * spoken for a single message, in the exact order configured by the
   * user via the TTS Play Order dialog (`settings.ttsPlayOrder`).
   *
   * Each entry in `ttsPlayOrder` is either `PLAY_ORIGINAL` (= speak the
   * source paragraph) or a BCP-47 code (= fetch & speak the translation
   * to that language). Entries the user removed are skipped; entries
   * referencing a language that's no longer in `viewLanguages` are also
   * skipped (defensive — the sync helper normally prevents this).
   *
   * Translations are fetched through `queryClient.fetchQuery` using the
   * same key as `<TranslatedLine>` so on-screen translations and
   * playback share the same cache — no duplicate network requests.
   *
   * `isOriginal` is set for the original-language unit so the play
   * handlers can keep highlighting word-by-word in the rendered original
   * paragraph (which matches the visible text). Translation units don't
   * highlight because the visible word-mapping wouldn't line up.
   *
   * `voiceName` is looked up from user settings and passed to voice.speak()
   * to allow per-language voice selection.
   */
  const buildPlayUnits = useCallback(
    async (msg: {
      id: number;
      content: string;
      role: string;
      language?: string | null;
    }): Promise<
      Array<{ text: string; lang: string; rate: number; isOriginal: boolean; voiceName?: string }>
    > => {
      const text = msg.content?.trim() ?? "";
      if (!text) return [];

      const units: Array<{
        text: string;
        lang: string;
        rate: number;
        isOriginal: boolean;
        voiceName?: string;
      }> = [];

      const origLang = resolveMessageLanguage(msg);
      const viewSet = new Set(settings.viewLanguages);

      for (const item of settings.ttsPlayOrder) {
        if (item === PLAY_ORIGINAL) {
          units.push({
            text,
            lang: origLang,
            rate: rateForLanguage(origLang),
            isOriginal: true,
            voiceName: settings.ttsVoices[origLang],
          });
          continue;
        }
        // Defensive: the sync helper normally prunes stale entries, but
        // bail if a code isn't currently a view language so we don't
        // surprise-translate to something the user removed.
        if (!viewSet.has(item)) continue;
        const googleTarget = toGoogleLang(item);
        try {
          const translated = await queryClient.fetchQuery({
            queryKey: ["translation", googleTarget, text],
            queryFn: () =>
              translate({
                finalTranscriptProxy: text,
                fromLang: "auto",
                toLang: googleTarget,
              }),
            staleTime: Infinity,
            gcTime: Infinity,
          });
          if (translated && translated !== "translation error") {
            units.push({
              text: translated,
              lang: item,
              rate: rateForLanguage(item),
              isOriginal: false,
              voiceName: settings.ttsVoices[item],
            });
          } else {
            console.warn(
              `[story] translation empty/error msg=${msg.id} target=${item} → skipped`,
            );
          }
        } catch (err) {
          console.warn(
            `[story] translation fetch failed msg=${msg.id} target=${item}`,
            err,
          );
        }
      }

      return units;
    },
    [
      queryClient,
      resolveMessageLanguage,
      rateForLanguage,
      settings.ttsPlayOrder,
      settings.viewLanguages,
      settings.ttsVoices,
    ],
  );

  /**
   * Which message is currently being read aloud (header Play loop OR a
   * per-message Play button) and which word index inside it the engine
   * just announced via the `boundary` event. Used by `<MessageBody>` to
   * paint a highlight under the spoken word.
   */
  const [playingMsgId, setPlayingMsgId] = useState<number | null>(null);
  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null);
  // Which item *within* the currently playing message is being spoken
  // right now: either {@link PLAY_ORIGINAL} for the source paragraph or
  // a BCP-47 code for one of its translations. Used to draw a border
  // around the exact line that's audible so the user can follow along
  // when there are several translations stacked under each paragraph.
  const [playingItem, setPlayingItem] = useState<string | null>(null);
  // Ref-mirror of `playingMsgId` so the blind-mode loop (which reads via
  // refs to avoid re-firing on every render) can synchronously check
  // whether a manual per-message playback is currently in progress and
  // bail out — preventing the blind loop from auto-speaking a new
  // assistant message in the middle of a Play-All / Play-One run and
  // interrupting an in-flight translation utterance.
  const playingMsgIdRef = useRef<number | null>(null);
  useEffect(() => {
    playingMsgIdRef.current = playingMsgId;
  }, [playingMsgId]);
  // Local error surface: errors from imperative actions (regenerate,
  // delete, edit) that don't go through `useStoryStream` would otherwise
  // only emit a console.error + a beep; surface them in the same banner
  // as `streamError` so the user can actually see what failed.
  const [actionError, setActionError] = useState<string | null>(null);
  const displayedError = streamError ?? actionError;
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const stopPlayingStory = useCallback(() => {
    isPlayingStoryRef.current = false;
    setIsPlayingStory(false);
    setPlayingMsgId(null);
    setPlayingItem(null);
    setCurrentWordIdx(null);
    voice.stopSpeaking();
  }, [voice]);

  const handlePlayStory = useCallback(async () => {
    console.info(
      `[story] handlePlayStory click playing=${isPlayingStoryRef.current} msgs=${messages?.length ?? 0}`,
    );
    if (isPlayingStoryRef.current) {
      // Second click acts as a Stop button.
      stopPlayingStory();
      return;
    }
    if (!messages || messages.length === 0) return;

    isPlayingStoryRef.current = true;
    setIsPlayingStory(true);
    try {
      for (const msg of messages) {
        if (!isPlayingStoryRef.current) break;
        // Skip image-only messages — they have no text to speak.
        if (msg.content.startsWith("[STORYIMG]:")) continue;
        const units = await buildPlayUnits(msg);
        if (units.length === 0) continue;
        if (!isPlayingStoryRef.current) break;
        setPlayingMsgId(msg.id);
        setCurrentWordIdx(null);
        for (const unit of units) {
          if (!isPlayingStoryRef.current) break;
          console.info(
            `[story] play-all → msg=${msg.id} ${unit.isOriginal ? "original" : "translation"} lang=${unit.lang} rate=${unit.rate} chars=${unit.text.length}`,
          );
          setCurrentWordIdx(null);
          // Tag which line is "live" so its row gets the playing border.
          setPlayingItem(unit.isOriginal ? PLAY_ORIGINAL : unit.lang);
          await voice.speak(unit.text, unit.lang, unit.rate, {
            onWord: ({ wordIndex }) => setCurrentWordIdx(wordIndex),
            voiceName: unit.voiceName,
          });
        }
      }
    } finally {
      isPlayingStoryRef.current = false;
      setIsPlayingStory(false);
      setPlayingMsgId(null);
      setPlayingItem(null);
      setCurrentWordIdx(null);
    }
  }, [messages, voice, buildPlayUnits, stopPlayingStory]);

  /**
   * Read a single message aloud (per-message Play button). If the same
   * message is already playing, acts as a Stop button. Cancels any other
   * ongoing playback (header loop or another message) so only one voice
   * is ever audible.
   */
  const handlePlayMessage = useCallback(
    async (
      msg: { id: number; content: string; role: string; language?: string | null },
      /**
       * Optional starting item — either {@link PLAY_ORIGINAL} or a
       * BCP-47 code from the message's play queue. When provided, the
       * built unit list is sliced so playback begins at that item and
       * continues through the rest of `ttsPlayOrder`. Used by the
       * click-to-play handlers on the original and translated lines.
       */
      startItem?: string,
    ) => {
      console.info(
        `[story] handlePlayMessage click msg=${msg.id} startItem=${startItem ?? "(default)"} alreadyPlaying=${playingMsgId === msg.id && playingItem === (startItem ?? null)}`,
      );
      // Tapping the *same* line that's currently being spoken stops
      // playback (acts as a toggle). When startItem is omitted we fall
      // back to the prior "same message → stop" behaviour.
      if (
        playingMsgId === msg.id &&
        (startItem === undefined || playingItem === startItem)
      ) {
        stopPlayingStory();
        return;
      }
      // Cancel any ongoing playback (header loop or other message). We do
      // NOT call `voice.stopSpeaking()` here because `voice.speak()` itself
      // safely tears down any prior utterance — calling cancel twice in
      // the same tick triggers a Chrome bug where the new utterance fires
      // its onend immediately with no audio.
      isPlayingStoryRef.current = false;
      setIsPlayingStory(false);

      let units = await buildPlayUnits(msg);
      if (units.length === 0) return;
      // Honour the click-to-play starting point: drop everything before
      // the requested item so playback begins at the line the user
      // actually clicked. If the item isn't in the queue (e.g. the user
      // clicked an old translation that was since removed from
      // ttsPlayOrder) fall back to playing the whole queue.
      if (startItem !== undefined) {
        const startIdx = units.findIndex((u) =>
          startItem === PLAY_ORIGINAL ? u.isOriginal : u.lang === startItem,
        );
        if (startIdx > 0) units = units.slice(startIdx);
        else if (startIdx === -1) {
          // Requested item isn't enabled in ttsPlayOrder. Synthesise a
          // single ad-hoc unit so a click on a visible translation still
          // plays even if the user never added it to the order.
          if (startItem === PLAY_ORIGINAL) {
            const lang = resolveMessageLanguage(msg);
            units = [
              {
                text: msg.content.trim(),
                lang,
                rate: rateForLanguage(lang),
                isOriginal: true,
              },
            ];
          } else {
            try {
              const googleTarget = toGoogleLang(startItem);
              const translated = await queryClient.fetchQuery({
                queryKey: ["translation", googleTarget, msg.content.trim()],
                queryFn: () =>
                  translate({
                    finalTranscriptProxy: msg.content.trim(),
                    fromLang: "auto",
                    toLang: googleTarget,
                  }),
                staleTime: Infinity,
                gcTime: Infinity,
              });
              if (translated && translated !== "translation error") {
                units = [
                  {
                    text: translated,
                    lang: startItem,
                    rate: rateForLanguage(startItem),
                    isOriginal: false,
                  },
                ];
              } else {
                units = [];
              }
            } catch {
              units = [];
            }
          }
        }
      }
      if (units.length === 0) return;
      setPlayingMsgId(msg.id);
      setCurrentWordIdx(null);
      try {
        for (const unit of units) {
          console.info(
            `[story] play-one → msg=${msg.id} ${unit.isOriginal ? "original" : "translation"} lang=${unit.lang} rate=${unit.rate} chars=${unit.text.length}`,
          );
          setCurrentWordIdx(null);
          setPlayingItem(unit.isOriginal ? PLAY_ORIGINAL : unit.lang);
          await voice.speak(unit.text, unit.lang, unit.rate, {
            onWord: ({ wordIndex }) => setCurrentWordIdx(wordIndex),
            voiceName: unit.voiceName,
          });
        }
      } finally {
        setPlayingMsgId((cur) => (cur === msg.id ? null : cur));
        setPlayingItem(null);
        setCurrentWordIdx(null);
      }
    },
    [
      playingMsgId,
      playingItem,
      voice,
      buildPlayUnits,
      stopPlayingStory,
      queryClient,
      resolveMessageLanguage,
      rateForLanguage,
    ],
  );

  /*
   * Stop any in-flight TTS when the page unmounts. We MUST NOT depend on
   * `voice` here: `useVoice()` returns a fresh object on every render
   * (its internal `state` is part of the returned object), so depending
   * on `voice` would re-run the cleanup on every render and call
   * `cancel()` immediately after `speak()` — which produces an
   * `interrupted` SpeechSynthesisErrorEvent and silent playback.
   *
   * Instead, capture the latest `voice.stopSpeaking` in a ref and run
   * the cleanup only on unmount.
   */
  const stopSpeakingRef = useRef(voice.stopSpeaking);
  stopSpeakingRef.current = voice.stopSpeaking;
  useEffect(() => {
    return () => {
      if (isPlayingStoryRef.current) {
        isPlayingStoryRef.current = false;
        stopSpeakingRef.current();
      }
    };
  }, []);

  useEffect(() => {
    blindModeEnabledRef.current = settings.blindMode;
    if (!settings.blindMode) {
      voice.stopSpeaking();
      voice.stopListening();
      setIsNoResponse(false);
      gaveUpRef.current = false;
    } else {
      // Re-entering blind mode → forget previous cycle so loop fires
      lastCycleKeyRef.current = null;
      gaveUpRef.current = false;
    }
    // IMPORTANT: do NOT depend on `voice` here. `useVoice()` returns a fresh
    // object literal on every render, so depending on `voice` re-runs this
    // effect after every render — including the one triggered by clicking
    // Play (setIsPlayingStory/setPlayingMsgId). That would call
    // `voice.stopSpeaking()` immediately after `voice.speak()` queued an
    // utterance, producing `onerror=interrupted` and silent playback.
    // The individual methods are useCallback-stable, so we depend on them
    // directly instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.blindMode, voice.stopSpeaking, voice.stopListening]);

  // Reset gave-up flag whenever new messages arrive (fresh AI turn = fresh chance to listen)
  useEffect(() => {
    gaveUpRef.current = false;
    setIsNoResponse(false);
  }, [messages]);

  // Play error sound once when a stream error occurs
  useEffect(() => {
    if (streamError && !errorSoundPlayedRef.current) {
      errorSoundPlayedRef.current = true;
      playSound("error");
    }
    if (!streamError) {
      errorSoundPlayedRef.current = false;
    }
  }, [streamError, playSound]);

  // Auto-scroll whenever content changes
  useEffect(() => {
    endOfStoryRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedContent, isTyping]);

  // Auto-expand translations whenever a translated line starts playing
  useEffect(() => {
    if (playingItem && playingItem !== PLAY_ORIGINAL) {
      setTranslationsFolded(false);
    }
  }, [playingItem]);

  // Settings ref so the running blind loop always reads the latest values
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Timer for "interval" continue mode auto-restart
  const intervalRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const clearIntervalRetry = useCallback(() => {
    if (intervalRetryTimerRef.current) {
      clearTimeout(intervalRetryTimerRef.current);
      intervalRetryTimerRef.current = null;
    }
  }, []);

  // Bumping this triggers the blind-mode effect to (re)start a listening cycle
  const [refreshTick, setRefreshTick] = useState(0);

  // --- Blind mode auto-loop ---
  useEffect(() => {
    if (!settings.blindMode) return;
    if (isTyping) return;
    if (blindLoopRunningRef.current) return;
    if (gaveUpRef.current) return;
    if (!messages) return;
    // If the user is currently driving a manual playback (Play All header
    // button OR a per-message Play), bail out *without* recording the
    // cycle key so the loop will re-trigger once playback ends. This is
    // critical: otherwise the blind loop's `voice.speak()` call for the
    // newest assistant message races against `handlePlayStory` /
    // `handlePlayMessage` and interrupts in-flight translation
    // utterances mid-word (you'd hear ~0.8s of French then silence).
    if (isPlayingStoryRef.current || playingMsgIdRef.current != null) return;

    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastMsgKey = lastMsg ? `${lastMsg.id}` : "empty";
    const cycleKey = `${lastMsgKey}:${refreshTick}`;

    // Skip if we've already started the cycle for this (lastMsg, refreshTick) pair
    if (lastCycleKeyRef.current === cycleKey) return;
    lastCycleKeyRef.current = cycleKey;

    // We re-speak the AI paragraph only the first time we see a new AI msg.
    const shouldSpeak =
      lastMsg?.role === "assistant" &&
      lastHandledMsgIdRef.current !== lastMsg.id;

    blindLoopRunningRef.current = true;

    async function runLoop() {
      try {
        const cur = settingsRef.current;

        // 1. Speak the last AI paragraph (only when it's actually new)
        if (lastMsg?.role === "assistant" && shouldSpeak) {
          lastHandledMsgIdRef.current = lastMsg.id!;
          setBlindStatus(getT(settingsRef.current.uiLanguage)("story.readingAloud"));
          // Prefer the language saved with the message; fall back to the
          // current AI-language setting for legacy rows.
          const lang = lastMsg.language ?? cur.stt.aiLanguage;
          await voice.speak(
            lastMsg.content,
            lang,
            cur.ttsRates[lang] ?? cur.ttsRateDefault,
            { voiceName: cur.ttsVoices[lang] },
          );
        }

        if (!blindModeEnabledRef.current) return;

        // 2. Listen — config-driven nudge / silence / language
        setBlindStatus(getT(settingsRef.current.uiLanguage)("story.listeningSpeak"));
        const transcript = await voice.listenOnce({
          silenceMs: cur.stt.silenceMs,
          nudgeMs: cur.stt.nudgeMs,
          maxNudges: cur.stt.maxNudges,
          maxSpeechMs: cur.stt.maxSpeechMs,
          language: cur.stt.language,
          onInterim: (partial) => {
            setDraft(partial);
          },
          // Warn 1.5 s before the silence cutoff so the user knows time is up
          silenceWarningMs: 1500,
          onSilenceWarning: () => {
            playSound("silence-warning");
            setBlindStatus(getT(settingsRef.current.uiLanguage)("story.wrappingUp"));
          },
          onNudge: (n) => {
            playSound("nudge");
            setIsNoResponse(true);
            setBlindStatus(
              n < cur.stt.maxNudges
                ? getT(settingsRef.current.uiLanguage)("story.stillListening")
                : getT(settingsRef.current.uiLanguage)("story.lastChance"),
            );
          },
        });

        // Clear the nudge background once listening ends
        setIsNoResponse(false);

        if (!blindModeEnabledRef.current) return;

        if (!transcript.trim()) {
          // No response — react based on continue mode
          const mode = settingsRef.current.stt.continueMode;
          if (mode === "continuous") {
            setBlindStatus(getT(settingsRef.current.uiLanguage)("story.noResponseAgain"));
            // Loop will re-run because we bump the tick after release
            queueMicrotask(() => setRefreshTick((t) => t + 1));
          } else if (mode === "interval") {
            const secs = settingsRef.current.stt.intervalSeconds;
            gaveUpRef.current = true;
            setBlindStatus(
              getT(settingsRef.current.uiLanguage)("story.noResponseInterval", String(secs)),
            );
            clearIntervalRetry();
            intervalRetryTimerRef.current = setTimeout(() => {
              if (!blindModeEnabledRef.current) return;
              gaveUpRef.current = false;
              setRefreshTick((t) => t + 1);
            }, secs * 1000);
          } else {
            gaveUpRef.current = true;
            setBlindStatus(
              getT(settingsRef.current.uiLanguage)("story.noResponseTapRefresh"),
            );
          }
          return;
        }

        // 3. Play back what was heard (if option enabled) — use the user's
        //    speech language so the transcript is read in the same voice.
        if (cur.playUserTranscription) {
          setBlindStatus(getT(settingsRef.current.uiLanguage)("story.playingBackParagraph"));
          await voice.speak(
            transcript.trim(),
            cur.stt.language,
            cur.ttsRates[cur.stt.language] ?? cur.ttsRateDefault,
            { voiceName: cur.ttsVoices[cur.stt.language] },
          );
          if (!blindModeEnabledRef.current) return;
        }

        // 4. Play STT complete sound and submit
        playSound("stt-complete");
        setDraft(transcript.trim());
        setBlindStatus(getT(settingsRef.current.uiLanguage)("story.sendingParagraph"));
        await sendMessage(transcript.trim(), { autoAiTurn: true });
        setDraft("");
        setBlindStatus("");
      } finally {
        blindLoopRunningRef.current = false;
      }
    }

    runLoop();
    // See note above: depending on `voice` re-runs this effect on every
    // render and causes a fresh blind-loop iteration to start mid-flight.
    // The individual methods are useCallback-stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    messages,
    isTyping,
    settings.blindMode,
    voice.speak,
    voice.listenOnce,
    sendMessage,
    playSound,
    refreshTick,
    clearIntervalRetry,
    // Re-run when manual playback ends (playingMsgId → null,
    // isPlayingStory → false) so the blind loop resumes its
    // read-listen cycle for any newly-arrived assistant message.
    playingMsgId,
    isPlayingStory,
  ]);

  // Cleanup the interval-retry timer when blind mode turns off / unmount
  useEffect(() => {
    if (!settings.blindMode) clearIntervalRetry();
    return () => clearIntervalRetry();
  }, [settings.blindMode, clearIntervalRetry]);

  // User-initiated "refresh listening" — abort current STT, reset, listen again
  const handleRefreshListening = useCallback(() => {
    clearIntervalRetry();
    voice.stopSpeaking();
    voice.stopListening();
    gaveUpRef.current = false;
    setIsNoResponse(false);
    setBlindStatus(getT(settingsRef.current.uiLanguage)("story.restarting"));
    // Force the loop to re-run even if we just listened to the same AI msg
    setRefreshTick((t) => t + 1);
  }, [voice, clearIntervalRetry]);

  // Merge two adjacent messages into one: update the first with combined
  // content then delete the second so the story timeline stays intact.
  const handleMergeMessages = useCallback(
    async (
      first: { id: number; content: string },
      second: { id: number; content: string },
    ) => {
      try {
        const merged = first.content.trimEnd() + "\n\n" + second.content.trimStart();
        await updateMessage.mutateAsync({
          messageId: first.id,
          data: { content: merged },
        });
        await deleteMessage.mutateAsync({ messageId: second.id });
        queryClient.invalidateQueries({
          queryKey: getListOpenrouterMessagesQueryKey(id),
        });
      } catch (err) {
        console.error("Merge failed:", err);
        playSound("error");
        setActionError(formatActionError(t("story.errMerge"), err));
      }
    },
    [updateMessage, deleteMessage, queryClient, id, playSound, t],
  );

  // Generate an AI illustration from the current story context.
  const handleGenerateImage = useCallback(async () => {
    if (!id || isGeneratingImage || isTyping) return;
    setIsGeneratingImage(true);
    try {
      const requestBody = {
        ...(settings.apiKey ? { apiKey: settings.apiKey } : {}),
        ...(settings.apiUrl ? { apiUrl: settings.apiUrl } : {}),
        model: settings.model || "openrouter/free",
      };
      const raw = await fetch(
        `/api/openrouter/conversations/${id}/generate-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
      );
      if (!raw.ok) {
        const errData = (await raw.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errData?.error ?? `Server error ${raw.status}`);
      }
      queryClient.invalidateQueries({
        queryKey: getListOpenrouterMessagesQueryKey(id),
      });
    } catch (err) {
      console.error("Image generation failed:", err);
      playSound("error");
      setActionError(formatActionError(t("story.errGenerateImage"), err));
    } finally {
      setIsGeneratingImage(false);
    }
  }, [id, isGeneratingImage, isTyping, settings, queryClient, playSound, t]);

  // Inline edit handlers
  const startEdit = (msgId: number, content: string) => {
    setEditingId(msgId);
    setEditDraft(content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (messageId: number) => {
    if (!editDraft.trim()) return;
    try {
      await updateMessage.mutateAsync({
        messageId,
        data: { content: editDraft.trim() },
      });
      queryClient.invalidateQueries({
        queryKey: getListOpenrouterMessagesQueryKey(id),
      });
      setEditingId(null);
      setEditDraft("");
    } catch (err) {
      console.error("Save edit failed:", err);
      playSound("error");
      setActionError(formatActionError(t("story.errSaveEdit"), err));
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm(t("story.confirmDelete"))) return;
    try {
      await deleteMessage.mutateAsync({ messageId });
      queryClient.invalidateQueries({
        queryKey: getListOpenrouterMessagesQueryKey(id),
      });
    } catch (err) {
      console.error("Delete failed:", err);
      playSound("error");
      setActionError(formatActionError(t("story.errDelete"), err));
    }
  };

  const handleDeleteFromHere = async (messageId: number) => {
    if (!confirm(t("story.confirmDeleteFromHere"))) return;
    try {
      await deleteFromHere.mutateAsync({ messageId });
      queryClient.invalidateQueries({
        queryKey: getListOpenrouterMessagesQueryKey(id),
      });
    } catch (err) {
      console.error("Delete from here failed:", err);
      playSound("error");
      setActionError(formatActionError(t("story.errDeleteFromHere"), err));
    }
  };

  // Regenerate (rewrite) a single paragraph in place using AI completion.
  // The AI sees only the paragraphs that came BEFORE this one, so the rest of
  // the story remains untouched.
  const handleRegenerateMessage = async (messageId: number) => {
    if (regeneratingMsgId !== null) return;
    setRegeneratingMsgId(messageId);
    const endpoint = `/api/openrouter/messages/${messageId}/regenerate`;
    const requestBody = {
      model: settings.model || "openrouter/free",
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      maxRetries: settings.aiMaxRetries ?? 3,
      ...(settings.apiKey ? { apiKey: settings.apiKey } : {}),
      ...(settings.apiUrl ? { apiUrl: settings.apiUrl } : {}),
      ...(settings.stt.aiLanguage ? { language: settings.stt.aiLanguage } : {}),
    };
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const start = performance.now();
    let status: number | null = null;
    let responseJson: unknown = null;
    let responseHeaders: Record<string, string> | undefined;
    try {
      const raw = await fetch(endpoint, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(requestBody),
      });
      status = raw.status;
      responseHeaders = {};
      raw.headers.forEach((v, k) => { responseHeaders![k] = v; });
      responseJson = await raw.json().catch(() => null);
      if (!raw.ok) {
        const msg =
          (responseJson as { error?: string } | null)?.error ??
          `Server error ${raw.status}`;
        throw new Error(msg);
      }
      queryClient.invalidateQueries({
        queryKey: getListOpenrouterMessagesQueryKey(id),
      });
    } catch (err) {
      console.error("Regenerate failed:", err);
      playSound("error");
      setActionError(formatActionError(t("story.errRegenerate"), err));
    } finally {
      const res = responseJson as {
        requestedModel?: string;
        actualModel?: string;
        request?: unknown;
        response?: unknown;
      } | null;
      emitDebug({
        endpoint,
        method: "POST",
        status,
        request: requestBody,
        requestHeaders: reqHeaders,
        response: responseJson,
        responseHeaders,
        openrouterRequest: res?.request,
        openrouterResponse: res?.response,
        requestedModel: res?.requestedModel ?? requestBody.model,
        actualModel: res?.actualModel,
        durationMs: Math.round(performance.now() - start),
      });
      setRegeneratingMsgId(null);
    }
  };

  // Derived voice state — declared here so handleVoiceSend can reference them
  const isSpeaking = voice.state === "speaking";
  const isListening = voice.state === "listening";

  // ── Swipe-to-regenerate on mobile ──────────────────────────────────────
  // Tracks the X position where the touch started so we can compute how far
  // the finger moved horizontally.
  const swipeTouchStartX = useRef<number | null>(null);
  // Which message the in-progress swipe belongs to (drives the visual shift).
  const [swipingMsgId, setSwipingMsgId] = useState<number | null>(null);
  // Current horizontal offset (px, always ≤ 0 for left-swipes) fed as a CSS
  // transform so the paragraph visually follows the finger.
  const [swipeOffset, setSwipeOffset] = useState(0);
  const SWIPE_THRESHOLD = 72; // px needed for a confirmed regenerate

  const handleSwipeTouchStart = useCallback((e: React.TouchEvent, msgId: number) => {
    swipeTouchStartX.current = e.touches[0].clientX;
    setSwipingMsgId(msgId);
    setSwipeOffset(0);
  }, []);

  const handleSwipeTouchMove = useCallback((e: React.TouchEvent) => {
    if (swipeTouchStartX.current === null) return;
    const delta = e.touches[0].clientX - swipeTouchStartX.current;
    if (delta < 0) {
      // Clamp to a bit past the threshold so the arrow fully appears
      setSwipeOffset(Math.max(delta, -SWIPE_THRESHOLD * 1.3));
    }
  }, []);

  const handleSwipeTouchEnd = useCallback(
    (e: React.TouchEvent, msgId: number) => {
      if (swipeTouchStartX.current === null) return;
      const delta = e.changedTouches[0].clientX - swipeTouchStartX.current;
      swipeTouchStartX.current = null;
      setSwipeOffset(0);
      setSwipingMsgId(null);
      if (delta < -SWIPE_THRESHOLD && regeneratingMsgId === null) {
        handleRegenerateMessage(msgId);
      }
    },
    [handleRegenerateMessage, regeneratingMsgId],
  );

  // Normal mode voice send — tap once to start, tap again to stop early
  const handleVoiceSend = useCallback(() => {
    if (isTyping) return;
    if (isListening) {
      voice.stopListening();
      setInterimTranscript("");
      return;
    }
    const magicStopWord = (settingsRef.current.magicStopWord ?? "stop").toLowerCase();
    const magicStopCount = settingsRef.current.magicStopCount ?? 3;
    voice.listen(
      (transcript) => {
        lastTranscriptRef.current = transcript;
        setDraft(transcript);
        setInterimTranscript(transcript);
      },
      async () => {
        // STT ended — check for magic stop word then play completion sound
        const final = lastTranscriptRef.current.trim().toLowerCase();
        lastTranscriptRef.current = "";
        if (final === magicStopWord) {
          stopWordCountRef.current += 1;
          if (stopWordCountRef.current >= magicStopCount) {
            stopWordCountRef.current = 0;
            setDraft("");
            setInterimTranscript("");
            return;
          }
        } else if (final !== "") {
          stopWordCountRef.current = 0;
        }
        playSound("stt-complete");
        setInterimTranscript("");
      },
      settingsRef.current.stt.language,
    );
  }, [isTyping, isListening, voice, playSound]);

  // Submit user's typed paragraph (no AI yet); in auto mode, immediately ask AI to take its turn.
  const handleSend = useCallback(async () => {
    if (!draft.trim() || isTyping) return;
    const content = draft.trim();
    setDraft("");
    await sendMessage(content, { autoAiTurn: settings.gameMode === "auto" });
  }, [draft, isTyping, sendMessage, settings.gameMode]);

  // Manual mode: explicitly request the AI to take its turn.
  const handleRequestAi = useCallback(async () => {
    if (isTyping) return;
    await requestAiTurn();
  }, [isTyping, requestAiTurn]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoadingConv || isLoadingMsgs) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6 h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-5xl animate-pulse">📖</div>
        <div className="space-y-4 w-full max-w-md">
          <div className="h-8 bg-muted animate-pulse rounded-xl w-2/3 mx-auto"></div>
          <div className="h-24 bg-muted animate-pulse rounded-xl w-full"></div>
          <div className="h-20 bg-muted animate-pulse rounded-xl w-5/6 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-6 text-center">
        <div className="text-6xl mb-5">🔍</div>
        <h2
          className="text-4xl font-bold mb-3"
          style={{ fontFamily: "'Caveat', cursive", color: "#E65C40" }}
        >
          {t("story.notFound")}
        </h2>
        <p className="text-muted-foreground mb-6 font-sans">
          {t("story.notFoundHint")}
        </p>
        <Link href="/">
          <button
            className="relative inline-flex items-center justify-center px-6 py-3 text-lg font-bold text-white rounded-full transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0.5"
            style={{
              fontFamily: "'Caveat', cursive",
              backgroundColor: "#E65C40",
              boxShadow: "0 5px 0 0 #C54A32",
            }}
          >
            {t("story.returnToLibrary")}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <I18nProvider locale={settings.uiLanguage}>
    <div
      className={cn(
        "max-w-3xl mx-auto min-h-screen flex flex-col transition-colors duration-700",
        isNoResponse
          ? "bg-amber-950/10 dark:bg-amber-900/20"
          : isListening
          ? "bg-blue-950/10 dark:bg-blue-900/20"
          : "bg-background"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "py-3 sm:py-5 px-3 sm:px-6 md:px-8 border-b border-border/40 sticky top-0 backdrop-blur-sm z-10 flex items-center justify-between gap-2 transition-colors duration-700",
          isNoResponse
            ? "bg-amber-950/10 dark:bg-amber-900/20"
            : isListening
            ? "bg-blue-950/10 dark:bg-blue-900/20"
            : "bg-background/95"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 shrink">
          <Link href="/" className="shrink-0">
            <button
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
              style={{
                fontFamily: "'Nunito', sans-serif",
                backgroundColor: "#E65C40",
                boxShadow: "0 4px 0 0 #C54A32",
              }}
              aria-label={t("story.backToLibrary")}
              title={t("story.backToLibrary")}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("story.backToLibrary")}</span>
            </button>
          </Link>
          <h1
            className="text-xl sm:text-2xl font-bold truncate min-w-0"
            style={{ fontFamily: "'Caveat', cursive", color: "hsl(var(--primary))" }}
          >
            {conversation.title}
          </h1>
        </div>
        {/* ── Right toolbar: kept compact so it never overflows the header.
            Frequently-toggled controls are always visible; all settings
            dialogs live inside the Sheet so the bar stays ≤5 icons wide. ── */}
        <div className="flex items-center gap-0.5 shrink-0">

          {/* Status pills — shown only when the voice engine is active */}
          {isListening && !isNoResponse && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 me-1">
              <Mic className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span className="text-xs text-blue-400 font-sans font-medium hidden sm:inline">{t("story.listeningIndicator")}</span>
            </div>
          )}
          {isNoResponse && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 me-1">
              <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400 font-sans font-medium hidden sm:inline">{t("story.waitingIndicator")}</span>
            </div>
          )}

          {/* Stop speaking (blind mode only) — contextual, always visible */}
          {settings.blindMode && isSpeaking && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary animate-pulse"
              onClick={() => voice.stopSpeaking()}
              aria-label={t("story.stopStoryAria")}
              data-testid="button-stop-reading"
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          )}

          {/* Refresh listening (blind mode only) — contextual, always visible */}
          {settings.blindMode && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleRefreshListening}
              aria-label={t("story.refreshListening")}
              title={t("story.restartListening")}
              data-testid="button-refresh-listening"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          )}

          {/* Health dot — click to open history popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Server health"
              >
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-colors",
                    healthStatus === "ok"
                      ? "bg-emerald-400"
                      : healthStatus === "error"
                      ? "bg-red-400 animate-pulse"
                      : "bg-muted-foreground/30",
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Server Health</span>
                <button onClick={() => healthRefetch()} className="text-xs text-primary hover:underline font-sans">
                  Check now
                </button>
              </div>
              {healthHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground font-sans">No checks yet…</p>
              ) : (
                <div className="space-y-1.5">
                  {healthHistory.slice(0, 6).map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-sans">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", entry.ok ? "bg-emerald-400" : "bg-red-400")} />
                      <span className="text-muted-foreground flex-1 tabular-nums">{entry.ts.toLocaleTimeString()}</span>
                      <span className={cn("tabular-nums", entry.ok ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                        {entry.ok ? `${entry.latencyMs}ms` : (entry.statusCode ? `HTTP ${entry.statusCode}` : "err")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* ── Desktop toolbar: all icons shown inline on md+ ── */}
          <div className="hidden md:flex items-center gap-0.5">
            <ThemeToggle />
            {debugToggle && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9", debugPanelOpen ? "text-amber-400 bg-amber-400/10" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setDebugPanelOpen((v) => !v)}
                aria-label={debugPanelOpen ? t("story.debugClose") : t("story.debugOpen")}
                title="Debug"
              >
                <Bug className="w-5 h-5" />
              </Button>
            )}
            <div className="w-px h-5 bg-border mx-0.5" />
            <Button
              variant="ghost" size="icon"
              className={cn("h-9 w-9", settings.blindMode ? "text-primary" : "text-muted-foreground hover:text-foreground")}
              onClick={() => updateSettings({ blindMode: !settings.blindMode })}
              aria-label={settings.blindMode ? t("story.disableBlindMode") : t("story.enableBlindMode")}
              aria-pressed={settings.blindMode}
              title={settings.blindMode ? t("story.blindModeOn") : t("story.blindModeOff")}
              data-testid="button-toggle-blind-mode"
            >
              {settings.blindMode ? <Ear className="w-5 h-5" /> : <EarOff className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn("h-9 w-9", settings.gameMode === "manual" ? "text-amber-400" : "text-muted-foreground hover:text-foreground")}
              onClick={() => updateSettings({ gameMode: settings.gameMode === "manual" ? "auto" : "manual" })}
              aria-label={settings.gameMode === "manual" ? t("story.switchToAutoAi") : t("story.switchToManualAi")}
              aria-pressed={settings.gameMode === "manual"}
              title={settings.gameMode === "manual" ? t("story.aiModeManual") : t("story.aiModeAuto")}
              data-testid="button-toggle-game-mode"
            >
              {settings.gameMode === "manual" ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn("h-9 w-9", isPlayingStory ? "text-primary" : "text-muted-foreground hover:text-foreground")}
              onClick={handlePlayStory}
              disabled={!messages || messages.length === 0}
              aria-label={isPlayingStory ? t("story.stopStoryAria") : t("story.playStoryAria")}
              aria-pressed={isPlayingStory}
              title={isPlayingStory ? t("story.stopStoryTitle") : t("story.playStoryTitle")}
              data-testid="button-play-story"
            >
              {isPlayingStory ? <StopCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
          </div>

          {/* ── Mobile toolbar: single "..." reveals all icons in a popover ── */}
          <div className="flex md:hidden items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t("story.storySettings")}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-1.5">
                <div className="flex items-center gap-0.5">
                  <ThemeToggle />
                  {debugToggle && (
                    <Button
                      variant="ghost" size="icon"
                      className={cn("h-9 w-9", debugPanelOpen ? "text-amber-400 bg-amber-400/10" : "text-muted-foreground hover:text-foreground")}
                      onClick={() => setDebugPanelOpen((v) => !v)}
                      title="Debug"
                    >
                      <Bug className="w-5 h-5" />
                    </Button>
                  )}
                  <div className="w-px h-5 bg-border mx-0.5" />
                  <Button
                    variant="ghost" size="icon"
                    className={cn("h-9 w-9", settings.blindMode ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => updateSettings({ blindMode: !settings.blindMode })}
                    aria-pressed={settings.blindMode}
                    title={settings.blindMode ? t("story.blindModeOn") : t("story.blindModeOff")}
                    data-testid="button-toggle-blind-mode"
                  >
                    {settings.blindMode ? <Ear className="w-5 h-5" /> : <EarOff className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className={cn("h-9 w-9", settings.gameMode === "manual" ? "text-amber-400" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => updateSettings({ gameMode: settings.gameMode === "manual" ? "auto" : "manual" })}
                    aria-pressed={settings.gameMode === "manual"}
                    title={settings.gameMode === "manual" ? t("story.aiModeManual") : t("story.aiModeAuto")}
                    data-testid="button-toggle-game-mode"
                  >
                    {settings.gameMode === "manual" ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className={cn("h-9 w-9", isPlayingStory ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                    onClick={handlePlayStory}
                    disabled={!messages || messages.length === 0}
                    aria-pressed={isPlayingStory}
                    title={isPlayingStory ? t("story.stopStoryTitle") : t("story.playStoryTitle")}
                    data-testid="button-play-story"
                  >
                    {isPlayingStory ? <StopCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Settings sheet — always accessible on all screen sizes */}
          <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      aria-label={t("story.storySettings")}
                      title={t("story.storySettings")}
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {t("story.storySettings")}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">

                {/* ── Languages ── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {t("story.settingsSectionLanguages")}
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t("story.labelYou")}</span>
                      <SttLanguageSwitcher
                        label={t("story.labelYou")}
                        value={settings.stt.language}
                        onChange={(lang) =>
                          updateSettings({ stt: { ...settings.stt, language: lang } })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t("story.labelAI")}</span>
                      <SttLanguageSwitcher
                        variant="ai"
                        label={t("story.labelAI")}
                        value={settings.stt.aiLanguage}
                        onChange={(lang) =>
                          updateSettings({ stt: { ...settings.stt, aiLanguage: lang } })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t("story.labelView")}</span>
                      <ViewLanguagesSwitcher
                        label={t("story.labelView")}
                        value={settings.viewLanguages}
                        onChange={(langs) =>
                          updateSettings({
                            viewLanguages: langs,
                            ttsPlayOrder: syncPlayOrderForView(settings.ttsPlayOrder, langs),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ── Playback ── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {t("story.settingsSectionPlay")}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {/* Play-back-your-words toggle */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm">{t("story.enablePlayback")}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          settings.playUserTranscription
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() =>
                          updateSettings({ playUserTranscription: !settings.playUserTranscription })
                        }
                        aria-pressed={settings.playUserTranscription}
                        data-testid="button-toggle-playback"
                      >
                        {settings.playUserTranscription ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <TtsPlayOrderDialog
                      settings={settings}
                      onSave={(patch: Partial<StorySettings>) => updateSettings(patch)}
                    />
                    <TtsSpeedDialog settings={settings} onSave={updateSettings} />
                    <TtsVoiceDialog settings={settings} onSave={updateSettings} />
                  </div>
                </div>

                <Separator />

                {/* ── Voice & Speech ── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {t("story.settingsSectionVoice")}
                  </p>
                  <SttSettingsDialog settings={settings} onSave={updateSettings} />
                </div>

                <Separator />

                {/* ── AI & Model ── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {t("story.settingsSectionAI")}
                  </p>
                  <OpenrouterSettingsDialog settings={settings} onSave={updateSettings} />
                </div>

                <Separator />

                {/* ── Appearance ── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {t("story.settingsSectionAppearance")}
                  </p>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">Theme</span>
                    <ThemeToggle />
                  </div>
                  {debugToggle && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm">Debug panel</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          debugPanelOpen
                            ? "text-amber-400 bg-amber-400/10"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => setDebugPanelOpen((v) => !v)}
                        aria-label={debugPanelOpen ? t("story.debugClose") : t("story.debugOpen")}
                      >
                        <Bug className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

              </div>
                  </SheetContent>
                </Sheet>

        </div>
      </header>

      {/* Error banner — surfaces both streaming errors (AI completion,
          message submit) AND imperative-action errors (regenerate,
          delete, edit) so users actually see what went wrong instead of
          just hearing the error sound. */}
      {displayedError && (
        <div
          className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-destructive/10 dark:bg-red-900/30 border border-destructive/30 dark:border-red-500/40 text-destructive dark:text-red-400 font-sans text-sm"
          data-testid="error-banner"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span className="flex-1 whitespace-pre-wrap break-words">
            {displayedError}
          </span>
          <button
            onClick={() => {
              clearError();
              setActionError(null);
            }}
            className="shrink-0 hover:opacity-70 transition-opacity"
            aria-label={t("story.dismissError")}
            data-testid="button-dismiss-error"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Story Content */}
      <div
        className="flex-1 overflow-y-auto px-6 md:px-12 py-8 font-serif text-lg leading-loose space-y-8"
        ref={scrollContainerRef}
      >
        {messages?.length === 0 && (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <div className="text-5xl">✏️</div>
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: "'Caveat', cursive", color: "#E65C40" }}
            >
              {settings.blindMode
                ? t("story.blindModeHint")
                : t("story.firstPageBlank")}
            </p>
            {!settings.blindMode && (
              <p className="text-muted-foreground font-sans text-sm">
                {t("story.writeOpeningHint")}
              </p>
            )}
          </div>
        )}

        {(() => {
          const visibleMessages: OpenrouterMessage[] = messages?.filter((msg: OpenrouterMessage) => msg.content.trim() !== "") ?? [];
          return visibleMessages.map((msg: OpenrouterMessage, idx: number) => {
            const isImg = msg.content.startsWith("[STORYIMG]:");
            const imgUrl = isImg ? msg.content.slice("[STORYIMG]:".length) : null;
            const nextMsg = idx < visibleMessages.length - 1 ? visibleMessages[idx + 1] : null;
            // Only offer merge between two adjacent non-image text messages
            const canMerge = nextMsg && !isImg && !nextMsg.content.startsWith("[STORYIMG]:");

            return (
              <Fragment key={msg.id}>
                {/* ── Image message: render as an inline illustration ── */}
                {isImg ? (
                  <div className="group relative animate-in fade-in duration-700 flex flex-col items-center gap-1 my-2">
                    <img
                      src={imgUrl!}
                      alt={t("story.imageAlt")}
                      className="rounded-xl max-w-full max-h-80 object-contain shadow-md border border-border/30"
                    />
                    <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-70 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            disabled={deleteMessage.isPending || deleteFromHere.isPending}
                            aria-label={t("story.deletePassage")}
                            className="text-muted-foreground hover:text-destructive p-1 rounded bg-background/80 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onSelect={() => handleDeleteMessage(msg.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t("story.deleteOnlyThis")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onSelect={() => handleDeleteFromHere(msg.id)}
                          >
                            <ListEnd className="w-4 h-4" />
                            {t("story.deleteFromHereToEnd")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ) : (
                  /* ── Text message ── */
                  <div
                    dir={msg.language ? (isRtlLang(msg.language) ? "rtl" : "ltr") : undefined}
                    className={cn(
                      "group relative animate-in fade-in slide-in-from-bottom-2 duration-500 ps-4 border-s-4 rounded-e-sm transition-colors cursor-pointer",
                      msg.role === "assistant"
                        ? "text-foreground border-[#82C3DF] hover:bg-[#82C3DF08]"
                        : "text-foreground border-[#E65C40] hover:bg-[#E65C4008]",
                      selectedMsgId === msg.id && "ring-2 ring-inset ring-primary/40 bg-primary/5"
                    )}
                    onClick={(e) => {
                      // Don't open sheet when tapping a button/link inside the message
                      if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;
                      if (editingId === msg.id) return;
                      setSelectedMsgId(msg.id);
                      setActionSheetMsg(msg);
                    }}
                    {...(msg.role === "assistant"
                      ? {
                          onTouchStart: (e) => handleSwipeTouchStart(e, msg.id),
                          onTouchMove: handleSwipeTouchMove,
                          onTouchEnd: (e) => handleSwipeTouchEnd(e, msg.id),
                          style:
                            swipingMsgId === msg.id
                              ? { transform: `translateX(${swipeOffset}px)`, transition: "none" }
                              : undefined,
                        }
                      : {})}
                  >
                    {/* Swipe-to-regenerate hint icon — only visible while swiping */}
                    {swipingMsgId === msg.id && swipeOffset < -16 && (
                      <div
                        className="pointer-events-none absolute -end-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary"
                        aria-hidden
                      >
                        <Wand2 className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "absolute -start-8 top-1.5 opacity-0 group-hover:opacity-50 transition-opacity",
                        msg.role === "assistant"
                          ? "text-secondary-foreground"
                          : "text-primary"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <Sparkles className="w-4 h-4" />
                      ) : (
                        <PenLine className="w-4 h-4" />
                      )}
                    </div>

                    {editingId === msg.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          autoFocus
                          className="min-h-[100px] resize-none font-serif text-lg leading-relaxed bg-background/80 border-primary/40 focus-visible:ring-primary/50"
                          dir="auto"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEdit();
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                              saveEdit(msg.id);
                          }}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-8 text-muted-foreground hover:text-foreground font-sans text-xs"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            {t("story.cancelEdit")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(msg.id)}
                            disabled={!editDraft.trim() || updateMessage.isPending}
                            className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 font-sans text-xs"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            {t("story.saveEdit")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div
                          data-testid={`message-original-${msg.id}`}
                          data-playing={
                            playingMsgId === msg.id && playingItem === PLAY_ORIGINAL
                              ? "true"
                              : undefined
                          }
                          className={cn(
                            "rounded-e border-s-2 ps-3 -ms-3 transition-colors",
                            playingMsgId === msg.id && playingItem === PLAY_ORIGINAL
                              ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                              : "border-transparent",
                          )}
                        >
                          <MessageBody
                            text={msg.content}
                            highlightWord={
                              playingMsgId === msg.id ? currentWordIdx : null
                            }
                          />
                        </div>
                        {settings.viewLanguages.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setTranslationsFolded((f) => !f)}
                              className="mt-2 flex items-center gap-1 text-[11px] font-sans text-muted-foreground/60 hover:text-muted-foreground transition-colors select-none"
                              aria-label={translationsFolded ? t("story.showTranslations") : t("story.hideTranslations")}
                            >
                              {translationsFolded ? (
                                <ChevronRight className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              <span>{translationsFolded ? t("story.showTranslations") : t("story.hideTranslations")}</span>
                            </button>
                            {!translationsFolded && settings.viewLanguages.map((lang) => (
                              <TranslatedLine
                                key={lang}
                                text={msg.content}
                                toLang={lang}
                                isPlaying={playingMsgId === msg.id && playingItem === lang}
                                highlightWord={playingMsgId === msg.id && playingItem === lang ? currentWordIdx : null}
                                onClick={() => handlePlayMessage(msg, lang)}
                              />
                            ))}
                          </>
                        )}
                        {(msg.language || msg.model) && (
                          <div
                            className="mt-1 flex flex-wrap gap-1 text-[10px] font-sans text-muted-foreground/70 select-none"
                            data-testid={`message-meta-${msg.id}`}
                          >
                            {msg.language && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-muted/40"
                                data-testid={`message-language-${msg.id}`}
                                title={t("story.passageLanguageTitle")}
                              >
                                {langCodeToName(msg.language)}
                              </span>
                            )}
                            {msg.role === "assistant" && msg.model && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-muted/40"
                                data-testid={`message-model-${msg.id}`}
                                title={t("story.passageModelTitle")}
                              >
                                {msg.model}
                              </span>
                            )}
                          </div>
                        )}
                        {/* ── Per-message action menu — single trigger, fully inside container ──
                            Previously the 4 buttons lived at -end-8 (outside the box) which
                            caused them to be clipped on mobile. Now a single MoreHorizontal
                            button sits at the top-right corner inside the message and opens a
                            DropdownMenu with all available actions. */}
                        <div className="absolute top-1 end-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                aria-label={t("story.editPassage")}
                                data-testid={`button-actions-message-${msg.id}`}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Play / stop */}
                              <DropdownMenuItem
                                className="gap-2"
                                onSelect={() => handlePlayMessage(msg)}
                                data-testid={`button-play-message-${msg.id}`}
                              >
                                {playingMsgId === msg.id ? (
                                  <StopCircle className="w-4 h-4 text-primary" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}
                                {playingMsgId === msg.id
                                  ? t("story.stopReadPassage")
                                  : t("story.readPassage")}
                              </DropdownMenuItem>
                              {/* Edit */}
                              <DropdownMenuItem
                                className="gap-2"
                                onSelect={() => startEdit(msg.id, msg.content)}
                                data-testid={`button-edit-message-${msg.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                                {t("story.editPassage")}
                              </DropdownMenuItem>
                              {/* Regenerate */}
                              <DropdownMenuItem
                                className="gap-2"
                                onSelect={() => handleRegenerateMessage(msg.id)}
                                disabled={regeneratingMsgId !== null}
                                data-testid={`button-regenerate-message-${msg.id}`}
                              >
                                {regeneratingMsgId === msg.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Wand2 className="w-4 h-4" />
                                )}
                                {t("story.regeneratePassage")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* Delete this passage */}
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onSelect={() => handleDeleteMessage(msg.id)}
                                disabled={deleteMessage.isPending || deleteFromHere.isPending}
                                data-testid={`button-delete-message-${msg.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                                {t("story.deleteOnlyThis")}
                              </DropdownMenuItem>
                              {/* Delete from here to end */}
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onSelect={() => handleDeleteFromHere(msg.id)}
                                disabled={deleteMessage.isPending || deleteFromHere.isPending}
                              >
                                <ListEnd className="w-4 h-4" />
                                {t("story.deleteFromHereToEnd")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Merge button between adjacent text paragraphs ── */}
                {canMerge && (
                  <div className="flex items-center justify-center opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity h-4 -my-1 group/merge">
                    <button
                      onClick={() => handleMergeMessages(
                        { id: msg.id, content: msg.content },
                        { id: nextMsg.id, content: nextMsg.content },
                      )}
                      aria-label={t("story.mergeWithNext")}
                      title={t("story.mergeWithNext")}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans text-muted-foreground/60 hover:text-primary hover:bg-primary/10 border border-dashed border-transparent hover:border-primary/30 transition-all"
                    >
                      <Merge className="w-3 h-3" />
                      <ChevronRight className="w-2.5 h-2.5 -mx-0.5" />
                    </button>
                  </div>
                )}
              </Fragment>
            );
          });
        })()}

        {/* AI is composing (non-streaming) */}
        {isTyping && (
          <div className="relative animate-in fade-in duration-300 ps-4 border-s-4 border-[#82C3DF] rounded-e-sm">
            <div className="absolute -start-8 top-1.5 opacity-50" style={{ color: "#82C3DF" }}>
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="italic text-muted-foreground font-serif">
              {t("story.aiComposing")}
              {streamedContent ? `… ${streamedContent}` : "…"}
              <span className="inline-block w-1.5 h-5 ml-1 align-middle bg-[#82C3DF]/60 animate-pulse rounded-sm"></span>
            </div>
          </div>
        )}

        <div ref={endOfStoryRef} className="h-4" />
      </div>

      {/* Persistent TTS control bar — visible whenever a message or story is playing */}
      {(playingMsgId !== null || isPlayingStory) && (
        <div className="flex items-center gap-3 px-4 py-2 bg-card border-t border-border/60 animate-in slide-in-from-bottom-2 duration-200">
          <Volume2 className="w-4 h-4 text-primary animate-pulse shrink-0" />
          <span className="text-xs text-muted-foreground font-sans flex-1 truncate">
            {isPlayingStory ? t("story.playStoryTitle") : t("story.readingAloud")}
          </span>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => voice.isPaused ? voice.resumeSpeaking() : voice.pauseSpeaking()}
            aria-label={voice.isPaused ? "Resume" : "Pause"}
          >
            {voice.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={stopPlayingStory}
            aria-label="Stop playback"
          >
            <StopCircle className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Bottom bar */}
      <div className="p-3 sm:p-4 md:p-6 border-t-4 border-dashed border-[#FFB84D]/40 bg-card rounded-t-2xl shadow-[0_-6px_24px_rgba(92,58,30,0.06)]">
        {settings.blindMode ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 py-2">
              {isSpeaking && (
                <Volume2 className="w-5 h-5 text-primary animate-pulse shrink-0" />
              )}
              {isListening && !isNoResponse && (
                <Mic className="w-5 h-5 text-blue-400 animate-pulse shrink-0" />
              )}
              {isNoResponse && (
                <Mic className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
              )}
              <p className="text-center text-sm font-sans text-muted-foreground italic">
                {isTyping
                  ? t("story.coAuthorWriting")
                  : isSpeaking
                  ? t("story.readingAloud")
                  : isListening
                  ? t("story.listeningSpeak")
                  : blindStatus || t("story.ready")}
              </p>
            </div>

            {draft && (
              <div className="px-4 py-3 rounded-lg bg-background/70 border border-border/40 font-serif text-base leading-relaxed text-primary/80" dir="auto">
                {draft}
                {isListening && (
                  <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-blue-400/70 animate-pulse rounded-sm" />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isTyping
                  ? t("story.composerPlaceholderTyping")
                  : isListening
                  ? t("story.composerPlaceholderListening")
                  : t("story.composerPlaceholder")
              }
              disabled={isTyping}
              className="min-h-[80px] sm:min-h-[120px] resize-none pe-24 font-serif text-base sm:text-lg leading-relaxed bg-background border-2 border-dashed border-[#FFB84D]/50 rounded-xl focus-visible:ring-primary/50 placeholder:italic placeholder:font-serif"
              dir="auto"
            />
            {/* Live interim voice transcription indicator */}
            {isListening && interimTranscript && (
              <div className="absolute top-2 start-3 end-24 pointer-events-none">
                <span className="text-[10px] font-sans text-blue-400/80 uppercase tracking-wider">
                  {t("story.listeningIndicator")}
                  <span className="inline-block w-1 h-3 ml-1 align-middle bg-blue-400/60 animate-pulse rounded-sm" />
                </span>
              </div>
            )}
            {isListening && !interimTranscript && (
              <div className="absolute top-2 start-3 pointer-events-none">
                <span className="text-[10px] font-sans text-blue-400/70 uppercase tracking-wider flex items-center gap-1">
                  <Mic className="w-2.5 h-2.5" />
                  {t("story.listeningEllipsis")}
                </span>
              </div>
            )}
            <div className="absolute bottom-3 end-3 flex gap-1.5">
              {/* AI Illustration button */}
              <Button
                size="icon"
                variant="outline"
                onClick={handleGenerateImage}
                disabled={isTyping || isGeneratingImage || !messages || messages.filter((m: OpenrouterMessage) => !m.content.startsWith("[STORYIMG]:") && m.content.trim() !== "").length === 0}
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full transition-all",
                  isGeneratingImage
                    ? "text-violet-400 border-violet-400/50 animate-pulse"
                    : "text-muted-foreground hover:text-violet-500 hover:border-violet-400/50",
                )}
                aria-label={isGeneratingImage ? t("story.generatingImage") : t("story.generateImage")}
                title={isGeneratingImage ? t("story.generatingImage") : t("story.generateImage")}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleVoiceSend}
                disabled={isTyping}
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full transition-all",
                  isListening
                    ? "bg-blue-500/20 border-blue-400/50 text-blue-400 animate-pulse"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={isListening ? t("story.stopDictation") : t("story.dictate")}
                title={isListening ? t("story.tapToStop") : t("story.tapToDictate")}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!draft.trim() || isTyping}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-white transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
                style={{ backgroundColor: "#E65C40", boxShadow: "0 4px 0 0 #C54A32" }}
                aria-label={t("story.sendParagraph")}
              >
                <Send className="w-4 h-4 ms-0.5" />
              </Button>
              {settings.gameMode === "manual" && (
                <Button
                  onClick={handleRequestAi}
                  disabled={isTyping}
                  data-testid="button-ai-turn"
                  className="h-9 sm:h-10 px-2 sm:px-4 rounded-full text-amber-950 font-bold transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 gap-1.5"
                  style={{ fontFamily: "'Nunito', sans-serif", backgroundColor: "#FFB84D", boxShadow: "0 4px 0 0 #D4962B" }}
                  aria-label={t("story.requestAiTurn")}
                  title={t("story.askAiTitle")}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("story.aiTurnBtn")}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <DebugPanel
        open={debugPanelOpen}
        onClose={() => setDebugPanelOpen(false)}
      />

      {/* ── Bottom action sheet — opened when user taps a story passage ── */}
      <Sheet open={!!actionSheetMsg} onOpenChange={(v) => { if (!v) { setActionSheetMsg(null); setSelectedMsgId(null); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-safe">
          <SheetHeader className="px-5 pt-4 pb-2 border-b border-border/40">
            <SheetTitle className="text-sm font-semibold text-left font-sans">
              {actionSheetMsg?.role === "assistant" ? "AI passage" : "Your passage"}
            </SheetTitle>
          </SheetHeader>
          {actionSheetMsg && (
            <div className="px-4 py-4 flex flex-col gap-1">
              {/* Play / Stop */}
              <button
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/40 transition-colors text-sm font-sans text-left w-full"
                onClick={() => {
                  handlePlayMessage(actionSheetMsg);
                }}
              >
                {playingMsgId === actionSheetMsg.id ? (
                  <StopCircle className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <Volume2 className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span>{playingMsgId === actionSheetMsg.id ? t("story.stopReadPassage") : t("story.readPassage")}</span>
              </button>
              {/* Edit */}
              <button
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/40 transition-colors text-sm font-sans text-left w-full"
                onClick={() => {
                  startEdit(actionSheetMsg.id, actionSheetMsg.content);
                  setActionSheetMsg(null);
                }}
              >
                <Pencil className="w-5 h-5 text-muted-foreground shrink-0" />
                <span>{t("story.editPassage")}</span>
              </button>
              {/* Regenerate (AI messages only) */}
              {actionSheetMsg.role === "assistant" && (
                <button
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/40 transition-colors text-sm font-sans text-left w-full disabled:opacity-50"
                  disabled={regeneratingMsgId !== null}
                  onClick={() => {
                    handleRegenerateMessage(actionSheetMsg.id);
                    setActionSheetMsg(null);
                  }}
                >
                  {regeneratingMsgId === actionSheetMsg.id ? (
                    <RefreshCw className="w-5 h-5 text-muted-foreground shrink-0 animate-spin" />
                  ) : (
                    <Wand2 className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <span>{t("story.regeneratePassage")}</span>
                </button>
              )}
              <div className="h-px bg-border/40 my-1" />
              {/* Delete this */}
              <button
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm font-sans text-left w-full text-destructive"
                disabled={deleteMessage.isPending || deleteFromHere.isPending}
                onClick={() => {
                  handleDeleteMessage(actionSheetMsg.id);
                  setActionSheetMsg(null);
                }}
              >
                <Trash2 className="w-5 h-5 shrink-0" />
                <span>{t("story.deleteOnlyThis")}</span>
              </button>
              {/* Delete from here */}
              <button
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm font-sans text-left w-full text-destructive"
                disabled={deleteMessage.isPending || deleteFromHere.isPending}
                onClick={() => {
                  handleDeleteFromHere(actionSheetMsg.id);
                  setActionSheetMsg(null);
                }}
              >
                <ListEnd className="w-5 h-5 shrink-0" />
                <span>{t("story.deleteFromHereToEnd")}</span>
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </I18nProvider>
  );
}
