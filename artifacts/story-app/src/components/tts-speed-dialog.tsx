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

  const handleOpen = (v: boolean) => {
    if (v) setLocal(settings);
    setOpen(v);
  };

  const handleSave = () => {
    onSave({ ttsRates: local.ttsRates, ttsRateDefault: local.ttsRateDefault });
    setOpen(false);
  };

  const setRateForLang = (code: string, rate: number) => {
    setLocal((p) => ({
      ...p,
      ttsRates: { ...p.ttsRates, [code]: rate },
    }));
  };

  const clearOverride = (code: string) => {
    setLocal((p) => {
      const next = { ...p.ttsRates };
      delete next[code];
      return { ...p, ttsRates: next };
    });
  };

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

  const activeCodes = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    const push = (c: string) => {
      if (c && !seen.has(c)) { seen.add(c); result.push(c); }
    };
    if (local.stt.language) push(local.stt.language);
    if (local.stt.aiLanguage) push(local.stt.aiLanguage);
    for (const c of local.viewLanguages) push(c);
    return result;
  }, [local.stt.language, local.stt.aiLanguage, local.viewLanguages]);

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

        <div className="space-y-4 py-2">
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

          {/* Per active language — no picker, show all active langs as cards */}
          {activeCodes.length > 0 && (
            <div className="space-y-3 pt-1 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("ttsSpeed.perLangOverride")}
              </p>
              <div className="space-y-3">
                {activeCodes.map((code) => {
                  const label = labelByCode[code] ?? code;
                  const native = nativeByCode[code];
                  const rate = local.ttsRates[code] ?? local.ttsRateDefault;
                  const hasOverride = code in local.ttsRates;
                  return (
                    <div key={code} className="rounded-lg border border-border/60 bg-background px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{label}</span>
                          {native && native !== label && (
                            <span className="text-xs text-muted-foreground shrink-0">{native}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {rate.toFixed(2)}×
                            {!hasOverride && (
                              <span className="ml-1 text-xs italic">{t("ttsSpeed.default")}</span>
                            )}
                          </span>
                          {hasOverride && (
                            <Button
                              type="button" variant="ghost" size="icon"
                              onClick={() => clearOverride(code)}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              aria-label={t("ttsSpeed.removeOverride", label)}
                              data-testid={`button-remove-tts-override-${code}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Slider
                        min={RATE_MIN} max={RATE_MAX} step={RATE_STEP}
                        value={[rate]}
                        onValueChange={([v]) => setRateForLang(code, v)}
                        className="w-full"
                        data-testid={`slider-tts-rate-${code}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeCodes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("ttsSpeed.perLangOverride")} — {t("ttsSpeed.noLanguage")}
            </p>
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
