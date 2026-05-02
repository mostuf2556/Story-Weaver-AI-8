import { useQuery } from "@tanstack/react-query";
import { Languages } from "lucide-react";
import { translate, toGoogleLang } from "@/lib/translate";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

interface Props {
  text: string;
  toLang: string;
  isPlaying?: boolean;
  onClick?: () => void;
}

export function TranslatedLine({ text, toLang, isPlaying, onClick }: Props) {
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
      <div className="whitespace-pre-wrap min-w-0 flex-1" dir="auto">
        <span
          className="font-mono not-italic text-xs uppercase tracking-wider mr-2 px-1 py-0.5 rounded bg-muted/40 text-muted-foreground/80 align-middle"
          data-testid={`translated-line-lang-${toLang}`}
        >
          {toLang}
        </span>
        {isLoading
          ? t("translatedLine.translating")
          : isError || data === "translation error"
            ? t("translatedLine.unavailable")
            : data}
      </div>
    </div>
  );
}
