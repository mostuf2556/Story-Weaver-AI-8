import { useEffect, useMemo, useState } from "react";
import { ListOrdered, ArrowUp, ArrowDown, X, Plus, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  PLAY_ORIGINAL,
  syncPlayOrderForView,
  type StorySettings,
} from "@/hooks/use-settings";
import { TRANSLATE_LANGUAGES } from "@/config/translate-languages";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

export function TtsPlayOrderDialog({ settings, onSave }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(settings.ttsPlayOrder);
  /* Local copy of viewLanguages so we can add new ones from the picker */
  const [viewLangs, setViewLangs] = useState<string[]>(settings.viewLanguages);
  const [pickerOpen, setPickerOpen] = useState(false);

  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of TRANSLATE_LANGUAGES) map[l.code] = l.label;
    return map;
  }, []);

  useEffect(() => {
    if (open) {
      const synced = syncPlayOrderForView(settings.ttsPlayOrder, settings.viewLanguages);
      setOrder(synced);
      setViewLangs(settings.viewLanguages);
    }
  }, [open, settings.ttsPlayOrder, settings.viewLanguages]);

  const renderLabel = (item: string) =>
    item === PLAY_ORIGINAL
      ? t("playOrder.original")
      : (labelByCode[item] ?? item);

  const move = (idx: number, delta: number) => {
    setOrder((prev) => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const remove = (idx: number) => {
    setOrder((prev) => prev.filter((_, i) => i !== idx));
  };

  /** Add item to order (duplicates allowed). If it's a language not yet in
   *  viewLangs, also add it there so the translation is displayed on screen. */
  const addItem = (item: string) => {
    setOrder((prev) => [...prev, item]);
    if (item !== PLAY_ORIGINAL && !viewLangs.includes(item)) {
      setViewLangs((prev) => [...prev, item]);
    }
    setPickerOpen(false);
  };

  const handleSave = () => {
    onSave({
      ttsPlayOrder: order,
      viewLanguages: viewLangs,
      /* keep play order in sync with any newly added view languages */
      ...(viewLangs !== settings.viewLanguages
        ? { ttsPlayOrder: syncPlayOrderForView(order, viewLangs) }
        : {}),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("playOrder.ariaLabel")}
          title={t("playOrder.triggerTitle")}
          data-testid="button-tts-play-order"
        >
          <ListOrdered className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("playOrder.title")}</DialogTitle>
          <DialogDescription className="text-foreground/60">
            {t("playOrder.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Current order ── */}
          {order.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-background px-4 py-6 text-center text-sm text-muted-foreground">
              {t("playOrder.empty")}
            </div>
          ) : (
            <ol className="space-y-1.5">
              {order.map((item, idx) => (
                <li
                  key={`${item}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                  data-testid={`tts-play-order-item-${idx}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="truncate">
                      {renderLabel(item)}
                      {item !== PLAY_ORIGINAL && (
                        <span className="ml-1 text-muted-foreground font-mono text-xs">
                          {item}
                        </span>
                      )}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      aria-label={t("playOrder.moveUp", renderLabel(item))}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => move(idx, 1)}
                      disabled={idx === order.length - 1}
                      aria-label={t("playOrder.moveDown", renderLabel(item))}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(idx)}
                      aria-label={t("playOrder.remove", renderLabel(item))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* ── Add to order ── */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("playOrder.addToOrder")}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {/* Original language quick-add */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(PLAY_ORIGINAL)}
                className="h-7 px-2 text-xs gap-1"
                data-testid={`button-tts-order-add-${PLAY_ORIGINAL}`}
              >
                <Plus className="w-3 h-3" />
                {t("playOrder.original")}
              </Button>

              {/* Searchable language combobox */}
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    data-testid="button-tts-order-add-language"
                  >
                    <Plus className="w-3 h-3" />
                    {t("playOrder.addTranslation")}
                    <ChevronsUpDown className="w-3 h-3 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 p-0"
                  align="start"
                  /* Keep it on top of the Dialog */
                  style={{ zIndex: 9999 }}
                >
                  <Command>
                    <CommandInput placeholder={t("playOrder.searchLanguage")} />
                    <CommandList>
                      <CommandEmpty>{t("playOrder.noLanguage")}</CommandEmpty>
                      {/* Already-selected view languages appear first */}
                      {viewLangs.length > 0 && (
                        <CommandGroup heading={t("playOrder.currentTranslations")}>
                          {viewLangs.map((code) => {
                            const lang = TRANSLATE_LANGUAGES.find((l) => l.code === code);
                            return (
                              <CommandItem
                                key={code}
                                value={`${lang?.label ?? code} ${lang?.native ?? ""} ${code}`}
                                onSelect={() => addItem(code)}
                                data-testid={`tts-order-lang-${code}`}
                              >
                                <Check className={cn("w-3 h-3 shrink-0", order.includes(code) ? "opacity-100" : "opacity-0")} />
                                <span className="flex-1 truncate">{lang?.label ?? code}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{lang?.native}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      )}
                      {viewLangs.length > 0 && <CommandSeparator />}
                      <CommandGroup heading={t("playOrder.allLanguages")}>
                        {TRANSLATE_LANGUAGES.filter((l) => !viewLangs.includes(l.code)).map((l) => (
                          <CommandItem
                            key={l.code}
                            value={`${l.label} ${l.native} ${l.code}`}
                            onSelect={() => addItem(l.code)}
                            data-testid={`tts-order-lang-${l.code}`}
                          >
                            <span className="w-3 h-3 shrink-0" />
                            <span className="flex-1 truncate">{l.label}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{l.native}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <p className="text-xs text-muted-foreground/70 italic">
              {t("playOrder.duplicatesAllowed")}
            </p>
          </div>

          {viewLangs.length === 0 && order.every((o) => o === PLAY_ORIGINAL) && (
            <p className="text-xs text-muted-foreground italic">
              {t("playOrder.tip")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-full font-sans border-2"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-full font-bold font-sans bg-primary text-primary-foreground active:translate-y-[2px] transition-all duration-100 hover:-translate-y-0.5"
            style={{ boxShadow: "0 4px 0 0 var(--primary-shadow)" }}
            data-testid="button-save-tts-play-order"
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
