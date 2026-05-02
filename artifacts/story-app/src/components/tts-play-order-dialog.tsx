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
import { STT_LANGUAGES } from "@/config/stt";

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

/**
 * Header dialog for configuring the order in which the original paragraph
 * and each on-screen translation are spoken when the user presses Play.
 *
 * The model is intentionally simple: a single ordered list. Each entry is
 * either {@link PLAY_ORIGINAL} or a BCP-47 code from `viewLanguages`.
 * Items present in the list are spoken in order; items absent are
 * skipped. This subsumes the prior "off / both / only" enum because the
 * three states are expressible as orderings (just original / original +
 * translations / just translations).
 *
 * Edits are buffered in local state and only committed on Save so the
 * user can experiment with the order without triggering re-renders /
 * playback changes mid-edit.
 */
export function TtsPlayOrderDialog({ settings, onSave }: Props) {
  const [open, setOpen] = useState(false);
  // Local working copy. Always reconciled against the current
  // viewLanguages whenever the dialog opens so removed/added view
  // languages show up correctly even if the order was never saved.
  const [order, setOrder] = useState<string[]>(settings.ttsPlayOrder);

  // Friendly label lookup (e.g. "en-US" → "English (US)") for the rows.
  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of STT_LANGUAGES) map[l.code] = l.label;
    return map;
  }, []);

  // Reset the working copy every time the dialog opens so it reflects
  // the latest persisted settings (and any view-language drift).
  useEffect(() => {
    if (open) {
      setOrder(syncPlayOrderForView(settings.ttsPlayOrder, settings.viewLanguages));
    }
  }, [open, settings.ttsPlayOrder, settings.viewLanguages]);

  const renderLabel = (item: string) =>
    item === PLAY_ORIGINAL
      ? "Original (source language)"
      : `${labelByCode[item] ?? item}`;

  const move = (idx: number, delta: number) => {
    setOrder((prev) => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const remove = (item: string) => {
    setOrder((prev) => prev.filter((x) => x !== item));
  };

  const add = (item: string) => {
    setOrder((prev) => (prev.includes(item) ? prev : [...prev, item]));
  };

  const handleSave = () => {
    onSave({ ttsPlayOrder: order });
    setOpen(false);
  };

  // Items the user could add: original + every selected view language
  // that isn't already in the order.
  const addable = [PLAY_ORIGINAL, ...settings.viewLanguages].filter(
    (item) => !order.includes(item),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Playback order settings"
          title="Set the order of TTS playback"
          data-testid="button-tts-play-order"
        >
          <ListOrdered className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            Playback Order
          </DialogTitle>
          <DialogDescription className="text-foreground/60">
            Choose what gets spoken when you press Play and in which order.
            Use the arrows to reorder, the X to skip an item, and the
            buttons below to add the original or any displayed translation
            back into the queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ordered list */}
          {order.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-background px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing will be spoken. Add at least one item below.
            </div>
          ) : (
            <ol className="space-y-1.5">
              {order.map((item, idx) => (
                <li
                  key={item}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                  data-testid={`tts-play-order-item-${item}`}
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
                      aria-label={`Move ${renderLabel(item)} up`}
                      data-testid={`button-tts-order-up-${item}`}
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
                      aria-label={`Move ${renderLabel(item)} down`}
                      data-testid={`button-tts-order-down-${item}`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(item)}
                      aria-label={`Remove ${renderLabel(item)} from playback`}
                      data-testid={`button-tts-order-remove-${item}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Addable items (original or view languages not in the order) */}
          {addable.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Add to Order
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
            </div>
          )}

          {settings.viewLanguages.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Tip: pick one or more languages from the View dropdown to be
              able to add translations to the playback order.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-full font-sans border-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-full font-bold font-sans bg-primary text-primary-foreground active:translate-y-[2px] transition-all duration-100 hover:-translate-y-0.5"
            style={{ boxShadow: "0 4px 0 0 var(--primary-shadow)" }}
            data-testid="button-save-tts-play-order"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
