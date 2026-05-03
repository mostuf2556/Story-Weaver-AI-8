import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Languages } from "lucide-react";
import { translate, toGoogleLang } from "@/lib/translate";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

interface Props {
  text: string;
  toLang: string;
  isPlaying?: boolean;
  highlightWord?: number | null;
  onClick?: () => void;
}

function HighlightedText({
  text,
  highlightWord,
}: {
  text: string;
  highlightWord: number | null;
}) {
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
      if (/[.!?؟]+['")\]]*$/.test(tok)) {
        groups.push(current);
        current = { tokens: [], startWord: wordCount, endWord: wordCount };
      }
    }
    if (current.tokens.length > 0) groups.push(current);
    return groups;
  }, [text]);

  const activeBucketIdx = useMemo(() => {
    if (highlightWord === null) return null;
    for (let i = 0; i < buckets.length; i++) {
      if (
        highlightWord >= buckets[i].startWord &&
        highlightWord <= buckets[i].endWord
      ) {
        return i;
      }
    }
    return null;
  }, [highlightWord, buckets]);

  return (
    <span className="whitespace-pre-wrap" dir="auto">
      {buckets.map((bucket, bIdx) => {
        const isSentenceActive =
          bIdx === activeBucketIdx && activeBucketIdx !== null;
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
    </span>
  );
}

export function TranslatedLine({
  text,
  toLang,
  isPlaying,
  highlightWord,
  onClick,
}: Props) {
  const t = useT();
  const trimmed = text.trim();
  const target = toGoogleLang(toLang);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["translation", target, trimmed],
    queryFn: () =>
      translate({
        finalTranscriptProxy: trimmed,
        fromLang: "auto",
        toLang: target,
      }),
    enabled: !!trimmed && !!target,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  if (!trimmed) return null;

  const translatedText =
    !isLoading && !isError && data && data !== "translation error"
      ? data
      : null;

  const interactive = !!onClick;
  return (
    <div
      className={cn(
        "mt-2 ps-3 border-s-2 text-base italic flex gap-2 rounded-e transition-colors",
        isPlaying
          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/40"
          : "border-border/40 text-muted-foreground",
        interactive && "cursor-pointer hover:bg-muted/30",
      )}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      aria-label={interactive ? t("translatedLine.playAria", toLang) : undefined}
      data-testid={`translated-line-${toLang}`}
      data-playing={isPlaying ? "true" : undefined}
    >
      <Languages className="w-4 h-4 mt-1.5 shrink-0 opacity-60" />
      <div className="min-w-0 flex-1" dir="auto">
        <span
          className="font-mono not-italic text-xs uppercase tracking-wider mr-2 px-1 py-0.5 rounded bg-muted/40 text-muted-foreground/80 align-middle"
          data-testid={`translated-line-lang-${toLang}`}
        >
          {toLang}
        </span>
        {isLoading ? (
          t("translatedLine.translating")
        ) : isError || data === "translation error" ? (
          t("translatedLine.unavailable")
        ) : translatedText && isPlaying && highlightWord != null ? (
          <HighlightedText text={translatedText} highlightWord={highlightWord} />
        ) : (
          translatedText
        )}
      </div>
    </div>
  );
}
