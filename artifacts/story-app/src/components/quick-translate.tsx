/**
 * QuickTranslate — per-paragraph inline translation widget.
 *
 * Renders a compact Globe + language-select row below a story passage.
 * When the user picks a language from the list the paragraph is translated
 * on the fly using the Google Translate free endpoint via translate().
 * The result is displayed inline; selecting "—" clears it.
 */
import { useState, useMemo } from "react";
import { Globe, X, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { translate } from "@/lib/translate";
import { TRANSLATE_LANGUAGES } from "@/config/translate-languages";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
}

export function QuickTranslate({ text }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [targetLang, setTargetLang] = useState<{ code: string; label: string; native: string } | null>(null);

  const trimmed = text.trim();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return TRANSLATE_LANGUAGES;
    return TRANSLATE_LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["quick-translate", targetLang?.code ?? "", trimmed],
    queryFn: () =>
      translate({
        finalTranscriptProxy: trimmed,
        fromLang: "auto",
        toLang: targetLang!.code,
      }),
    enabled: !!targetLang && !!trimmed,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  const selectLang = (lang: (typeof TRANSLATE_LANGUAGES)[number]) => {
    setTargetLang(lang);
    setSearch("");
    setOpen(false);
  };

  const clearLang = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetLang(null);
    setSearch("");
  };

  if (!trimmed) return null;

  return (
    <div className="mt-2 select-none" data-testid="quick-translate">
      {/* ── Trigger row ── */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs transition-colors",
              targetLang
                ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border/40 bg-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
            aria-label="Translate this passage"
            data-testid="quick-translate-trigger"
          >
            <Globe className="w-3 h-3 shrink-0" />
            {targetLang ? (
              <>
                <span className="font-medium">{targetLang.native}</span>
                <span className="opacity-60 font-mono">({targetLang.code})</span>
              </>
            ) : (
              <span>Translate…</span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          className="w-64 p-0 flex flex-col max-h-72"
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search language…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Language list */}
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
            ) : (
              filtered.map((l) => {
                const isSelected = targetLang?.code === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => selectLang(l)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors hover:bg-accent/40",
                      isSelected && "bg-primary/10 text-primary",
                    )}
                    data-testid={`quick-translate-lang-${l.code}`}
                  >
                    <span className="flex-1 font-medium">{l.label}</span>
                    <span
                      className={cn(
                        "font-mono text-xs",
                        isSelected ? "text-primary/70" : "text-muted-foreground",
                      )}
                    >
                      {l.native}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* ── Translation result ── */}
      {targetLang && (
        <div
          className={cn(
            "mt-1.5 ps-3 border-s-2 text-sm italic flex gap-2 rounded-e transition-colors",
            isLoading
              ? "border-border/30 text-muted-foreground/50"
              : "border-primary/30 text-muted-foreground",
          )}
          dir="auto"
          data-testid="quick-translate-result"
        >
          <div className="flex-1 whitespace-pre-wrap min-w-0">
            {isLoading ? (
              <span className="inline-flex gap-1 items-center">
                <span className="animate-pulse">·</span>
                <span className="animate-pulse delay-75">·</span>
                <span className="animate-pulse delay-150">·</span>
              </span>
            ) : data === "translation error" ? (
              <span className="text-destructive/70 not-italic text-xs">Translation unavailable</span>
            ) : (
              data
            )}
          </div>
          <button
            type="button"
            onClick={clearLang}
            className="shrink-0 mt-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Clear translation"
            data-testid="quick-translate-clear"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
