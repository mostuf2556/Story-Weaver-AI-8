import { useState, useMemo } from "react";
import { Eye, Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TRANSLATE_LANGUAGES } from "@/config/translate-languages";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

interface Props {
  value: string[];
  onChange: (langs: string[]) => void;
  label?: string;
}

export function ViewLanguagesSwitcher({ value, onChange, label }: Props) {
  const t = useT();
  const [search, setSearch] = useState("");
  const selectedSet = new Set(value);

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

  const toggle = (code: string) => {
    if (selectedSet.has(code)) {
      onChange(value.filter((c) => c !== code));
    } else {
      onChange([...value, code]);
    }
  };

  const clearAll = () => onChange([]);

  const triggerText =
    value.length === 0
      ? t("viewLangs.original")
      : value.length === 1
        ? (TRANSLATE_LANGUAGES.find((l) => l.code === value[0])?.native ?? value[0])
        : t("viewLangs.nLangs", String(value.length));

  const title =
    value.length === 0
      ? t("viewLangs.translationsOff")
      : t("viewLangs.translateTo", value.join(", "));

  return (
    <Popover onOpenChange={(open) => { if (!open) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("viewLangs.ariaLabel")}
          title={title}
          data-testid="select-view-languages"
          className="h-8 gap-1 px-2 border border-border/60 bg-transparent text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent/40"
        >
          <Eye className="w-4 h-4 shrink-0" />
          {label && (
            <span className="text-[10px] uppercase tracking-wide font-sans font-medium opacity-70 leading-none">
              {label}
            </span>
          )}
          <span>{triggerText}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-72 p-0 flex flex-col max-h-96"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
          <span className="text-xs font-sans text-muted-foreground">
            {value.length === 0
              ? t("viewLangs.noTranslations")
              : t("viewLangs.selected", String(value.length))}
          </span>
          <button
            type="button"
            onClick={clearAll}
            disabled={value.length === 0}
            className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="clear-view-languages"
          >
            {t("viewLangs.clear")}
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30">
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
              const checked = selectedSet.has(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggle(l.code)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent/40 transition-colors",
                    checked && "bg-accent/20",
                  )}
                  data-testid={`view-language-option-${l.code}`}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded border border-border/60 flex items-center justify-center shrink-0",
                      checked && "bg-primary border-primary",
                    )}
                  >
                    {checked && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </span>
                  <span className="flex-1 font-medium">{l.label}</span>
                  <span className="text-muted-foreground text-xs shrink-0">{l.native}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
