import { useEffect, useMemo, useState } from "react";
import { ListOrdered, ArrowUp, ArrowDown, X, Plus } from "lucide-react";
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
  PLAY_ORIGINAL,
  syncPlayOrderForView,
  type StorySettings,
} from "@/hooks/use-settings";
import { TRANSLATE_LANGUAGES } from "@/config/translate-languages";
import { useT } from "@/lib/i18n-context";

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

export function TtsPlayOrderDialog({ settings, onSave }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(settings.ttsPlayOrder);

  /* Build a label map from the full translation-language list */
  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of TRANSLATE_LANGUAGES) map[l.code] = l.label;
    return map;
  }, []);

  useEffect(() => {
    if (open) {
      setOrder(syncPlayOrderForView(settings.ttsPlayOrder, settings.viewLanguages));
    }
  }, [open, settings.ttsPlayOrder, settings.viewLanguages]);

  const renderLabel = (item: string) =>
    item === PLAY_ORIGINAL
      ? t("playOrder.original")
      : (labelByCode[item] ?? item);

  /* Move by index so duplicates are handled correctly */
  const move = (idx: number, delta: number) => {
    setOrder((prev) => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  /* Remove by index so duplicates are handled correctly */
  const remove = (idx: number) => {
    setOrder((prev) => prev.filter((_, i) => i !== idx));
  };

  /* Add always appends — same item can appear multiple times */
  const add = (item: string) => {
    setOrder((prev) => [...prev, item]);
  };

  const handleSave = () => {
    onSave({ ttsPlayOrder: order });
    setOpen(false);
  };

  /* All available items can always be added (duplicates allowed) */
  const addable = [PLAY_ORIGINAL, ...settings.viewLanguages];

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

          {/* Add section — always shows all available items, duplicates allowed */}
          {addable.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("playOrder.addToOrder")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {addable.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => add(item)}
                    className="h-7 px-2 text-xs gap-1"
                    data-testid={`button-tts-order-add-${item}`}
                  >
                    <Plus className="w-3 h-3" />
                    {renderLabel(item)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/70 italic">
                {t("playOrder.duplicatesAllowed")}
              </p>
            </div>
          )}

          {settings.viewLanguages.length === 0 && (
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
