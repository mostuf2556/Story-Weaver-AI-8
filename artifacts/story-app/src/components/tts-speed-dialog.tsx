import { useMemo, useState } from "react";
import { Gauge, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type StorySettings } from "@/hooks/use-settings";
import { TRANSLATE_LANGUAGES } from "@/config/translate-languages";
import { STT_LANGUAGES } from "@/config/stt";
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
   * Build a combined label map from both the full translation list and the
   * STT list (which uses BCP-47 region codes like "en-US" that differ from
   * the translation codes like "en").
   */
  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of TRANSLATE_LANGUAGES) map[l.code] = l.label;
    for (const l of STT_LANGUAGES) map[l.code] = l.label;
    return map;
  }, []);

  /*
   * Combined, deduplicated language list for the speed selector.
   * STT_LANGUAGES come first (they're the ones in active use for dictation /
   * TTS), followed by any additional translate-only languages.
   */
  const allLanguages = useMemo(() => {
    const seen = new Set<string>();
    const result: { code: string; label: string }[] = [];
    for (const l of STT_LANGUAGES) {
      if (!seen.has(l.code)) { seen.add(l.code); result.push(l); }
    }
    for (const l of TRANSLATE_LANGUAGES) {
      if (!seen.has(l.code)) { seen.add(l.code); result.push({ code: l.code, label: `${l.label} (${l.native})` }); }
    }
    return result;
  }, []);

  const overrideEntries = Object.entries(local.ttsRates).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const hasExplicitOverride = editingLang in local.ttsRates;

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
              min={RATE_MIN}
              max={RATE_MAX}
              step={RATE_STEP}
              value={[local.ttsRateDefault]}
              onValueChange={([v]) =>
                setLocal((p) => ({ ...p, ttsRateDefault: v }))
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t("ttsSpeed.defaultSpeedHint")}
            </p>
          </div>

          {/* Per-language editor */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("ttsSpeed.perLangOverride")}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="ttsRateLang">{t("ttsSpeed.language")}</Label>
              <Select value={editingLang} onValueChange={setEditingLang}>
                <SelectTrigger
                  id="ttsRateLang"
                  data-testid="select-tts-rate-language"
                  className="bg-background border-border"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allLanguages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}{" "}
                      <span className="text-muted-foreground font-mono text-xs">
                        {l.code}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="ttsRateForLang" className="text-sm">
                  {t("ttsSpeed.speedFor", labelByCode[editingLang] ?? editingLang)}
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
                min={RATE_MIN}
                max={RATE_MAX}
                step={RATE_STEP}
                value={[currentRate]}
                onValueChange={([v]) => setRateForEditingLang(v)}
                className="w-full"
              />
              {hasExplicitOverride && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
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
                      <span className="text-muted-foreground font-mono text-xs">
                        {code}
                      </span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tabular-nums text-muted-foreground">
                        {rate.toFixed(2)}×
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
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
            data-testid="button-save-tts-speed"
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
