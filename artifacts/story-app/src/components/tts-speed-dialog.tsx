import { useMemo, useState } from "react";
import { Gauge, Trash2, ChevronsUpDown, Check } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { type StorySettings } from "@/hooks/use-settings";
import { TRANSLATE_LANGUAGES } from "@/config/translate-languages";
import { STT_LANGUAGES } from "@/config/stt";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

const RATE_MIN = 0.5;
const RATE_MAX = 2.0;
const RATE_STEP = 0.05;

export function TtsSpeedDialog({ settings, onSave }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<StorySettings>(settings);
  const [editingLang, setEditingLang] = useState<string>(
    settings.stt.language || "en-US",
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleOpen = (v: boolean) => {
    if (v) {
      setLocal(settings);
      setEditingLang(settings.stt.language || "en-US");
    }
    setOpen(v);
  };

  const handleSave = () => {
    onSave({ ttsRates: local.ttsRates, ttsRateDefault: local.ttsRateDefault });
    setOpen(false);
  };

  const currentRate = local.ttsRates[editingLang] ?? local.ttsRateDefault;

  const setRateForEditingLang = (rate: number) => {
    setLocal((p) => ({
      ...p,
      ttsRates: { ...p.ttsRates, [editingLang]: rate },
    }));
  };

  const clearOverride = (lang: string) => {
    setLocal((p) => {
      const next = { ...p.ttsRates };
      delete next[lang];
      return { ...p, ttsRates: next };
    });
  };

  /*
   * Build a combined label map from both lists.
   * STT uses region codes like "en-US"; translate uses subtags like "en".
   */
  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of TRANSLATE_LANGUAGES) map[l.code] = l.label;
    for (const l of STT_LANGUAGES) map[l.code] = l.label;
    return map;
  }, []);

  const nativeByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of TRANSLATE_LANGUAGES) map[l.code] = l.native;
    return map;
  }, []);

  /*
   * Active languages = STT language + all selected view languages.
   * These appear at the top of the picker as the "in-use" group.
   */
  const activeCodes = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    const push = (c: string) => { if (!seen.has(c)) { seen.add(c); result.push(c); } };
    if (local.stt.language) push(local.stt.language);
    for (const c of local.viewLanguages) push(c);
    return result;
  }, [local.stt.language, local.viewLanguages]);

  /*
   * Remaining languages from the full translate list (not already active).
   */
  const otherLanguages = useMemo(() =>
    TRANSLATE_LANGUAGES.filter((l) => !activeCodes.includes(l.code)),
    [activeCodes],
  );

  const selectLang = (code: string) => {
    setEditingLang(code);
    setPickerOpen(false);
  };

  const overrideEntries = Object.entries(local.ttsRates).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const hasExplicitOverride = editingLang in local.ttsRates;

  const editingLabel = labelByCode[editingLang] ?? editingLang;
  const editingNative = nativeByCode[editingLang];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("ttsSpeed.ariaLabel")}
          title={t("ttsSpeed.triggerTitle")}
          data-testid="button-tts-speed-settings"
        >
          <Gauge className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("ttsSpeed.title")}</DialogTitle>
          <DialogDescription className="text-foreground/60">
            {t("ttsSpeed.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Default rate */}
          <div className="space-y-2 rounded-lg border border-border/60 bg-background px-4 py-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="ttsRateDefault" className="text-sm font-medium">
                {t("ttsSpeed.defaultSpeed")}
              </Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {local.ttsRateDefault.toFixed(2)}×
              </span>
            </div>
            <Slider
              id="ttsRateDefault"
              data-testid="slider-tts-rate-default"
              min={RATE_MIN} max={RATE_MAX} step={RATE_STEP}
              value={[local.ttsRateDefault]}
              onValueChange={([v]) => setLocal((p) => ({ ...p, ttsRateDefault: v }))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{t("ttsSpeed.defaultSpeedHint")}</p>
          </div>

          {/* Per-language editor */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("ttsSpeed.perLangOverride")}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="ttsRateLangBtn">{t("ttsSpeed.language")}</Label>

              {/* Searchable language combobox */}
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="ttsRateLangBtn"
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    data-testid="select-tts-rate-language"
                    className="w-full justify-between bg-background border-border font-normal"
                  >
                    <span className="flex items-center gap-2 min-w-0 truncate">
                      <span className="truncate">{editingLabel}</span>
                      {editingNative && (
                        <span className="text-muted-foreground text-xs shrink-0">{editingNative}</span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{editingLang}</span>
                    </span>
                    <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start" style={{ zIndex: 9999 }}>
                  <Command>
                    <CommandInput placeholder={t("ttsSpeed.searchLanguage")} />
                    <CommandList>
                      <CommandEmpty>{t("ttsSpeed.noLanguage")}</CommandEmpty>

                      {/* In-use languages first */}
                      {activeCodes.length > 0 && (
                        <CommandGroup heading={t("ttsSpeed.activeLanguages")}>
                          {activeCodes.map((code) => (
                            <CommandItem
                              key={code}
                              value={`${labelByCode[code] ?? code} ${nativeByCode[code] ?? ""} ${code}`}
                              onSelect={() => selectLang(code)}
                              data-testid={`tts-speed-lang-${code}`}
                            >
                              <Check className={cn("w-3 h-3 shrink-0", editingLang === code ? "opacity-100" : "opacity-0")} />
                              <span className="flex-1 truncate">{labelByCode[code] ?? code}</span>
                              {nativeByCode[code] && (
                                <span className="text-xs text-muted-foreground shrink-0">{nativeByCode[code]}</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {activeCodes.length > 0 && <CommandSeparator />}

                      {/* All other translate languages */}
                      <CommandGroup heading={t("playOrder.allLanguages")}>
                        {otherLanguages.map((l) => (
                          <CommandItem
                            key={l.code}
                            value={`${l.label} ${l.native} ${l.code}`}
                            onSelect={() => selectLang(l.code)}
                            data-testid={`tts-speed-lang-${l.code}`}
                          >
                            <Check className={cn("w-3 h-3 shrink-0", editingLang === l.code ? "opacity-100" : "opacity-0")} />
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

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="ttsRateForLang" className="text-sm">
                  {t("ttsSpeed.speedFor", editingLabel)}
                </Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {currentRate.toFixed(2)}×
                  {!hasExplicitOverride && (
                    <span className="ml-1 text-xs italic">{t("ttsSpeed.default")}</span>
                  )}
                </span>
              </div>
              <Slider
                id="ttsRateForLang"
                data-testid="slider-tts-rate-language"
                min={RATE_MIN} max={RATE_MAX} step={RATE_STEP}
                value={[currentRate]}
                onValueChange={([v]) => setRateForEditingLang(v)}
                className="w-full"
              />
              {hasExplicitOverride && (
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => clearOverride(editingLang)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  data-testid="button-clear-tts-override"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {t("ttsSpeed.useDefault")}
                </Button>
              )}
            </div>
          </div>

          {/* List of existing overrides */}
          {overrideEntries.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("ttsSpeed.currentOverrides")}
              </p>
              <ul className="space-y-1">
                {overrideEntries.map(([code, rate]) => (
                  <li
                    key={code}
                    className="flex items-center justify-between rounded-md bg-background border border-border/40 px-3 py-1.5 text-sm"
                  >
                    <span className="truncate">
                      {labelByCode[code] ?? code}{" "}
                      <span className="text-muted-foreground font-mono text-xs">{code}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tabular-nums text-muted-foreground">{rate.toFixed(2)}×</span>
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={() => clearOverride(code)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        aria-label={t("ttsSpeed.removeOverride", code)}
                        data-testid={`button-remove-tts-override-${code}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full font-sans border-2">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-full font-bold font-sans bg-primary text-primary-foreground active:translate-y-[2px] transition-all duration-100 hover:-translate-y-0.5"
            style={{ boxShadow: "0 4px 0 0 var(--primary-shadow)" }}
            data-testid="button-save-tts-speed"
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
