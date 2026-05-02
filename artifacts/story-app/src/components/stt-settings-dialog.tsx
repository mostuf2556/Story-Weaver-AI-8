import { useState } from "react";
import { AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type StorySettings } from "@/hooks/use-settings";
import { STT_LANGUAGES, type SttContinueMode } from "@/config/stt";
import { useT } from "@/lib/i18n-context";

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

export function SttSettingsDialog({ settings, onSave }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<StorySettings>(settings);

  const handleOpen = (v: boolean) => {
    if (v) setLocal(settings);
    setOpen(v);
  };

  const handleSave = () => {
    onSave(local);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("story.voiceSettings")}
          title={t("story.voiceSettings")}
          data-testid="button-stt-settings"
        >
          <AudioLines className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {t("voiceSettings.title")}
          </DialogTitle>
          <DialogDescription className="text-foreground/60">
            {t("voiceSettings.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Blind Mode */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
            <div>
              <Label htmlFor="blindMode" className="text-sm font-medium cursor-pointer">
                {t("voiceSettings.blindMode")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("voiceSettings.blindModeDesc")}
              </p>
            </div>
            <Switch
              id="blindMode"
              checked={local.blindMode}
              onCheckedChange={(v) => setLocal((p) => ({ ...p, blindMode: v }))}
            />
          </div>

          {/* Play user transcription */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
            <div>
              <Label htmlFor="playUserTranscription" className="text-sm font-medium cursor-pointer">
                {t("voiceSettings.playBack")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("voiceSettings.playBackDesc")}
              </p>
            </div>
            <Switch
              id="playUserTranscription"
              checked={local.playUserTranscription}
              onCheckedChange={(v) =>
                setLocal((p) => ({ ...p, playUserTranscription: v }))
              }
            />
          </div>

          {/* Languages */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("voiceSettings.languages")}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="sttLanguage">{t("voiceSettings.yourSpeech")}</Label>
              <Select
                value={local.stt.language}
                onValueChange={(v) =>
                  setLocal((p) => ({ ...p, stt: { ...p.stt, language: v } }))
                }
              >
                <SelectTrigger
                  id="sttLanguage"
                  data-testid="select-stt-language"
                  className="bg-background border-border"
                >
                  <SelectValue placeholder={t("voiceSettings.selectLanguage")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {STT_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}{" "}
                      <span className="text-muted-foreground font-mono text-xs">
                        {l.code}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("voiceSettings.yourSpeechHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sttAiLanguage">{t("voiceSettings.aiFriend")}</Label>
              <Select
                value={local.stt.aiLanguage}
                onValueChange={(v) =>
                  setLocal((p) => ({ ...p, stt: { ...p.stt, aiLanguage: v } }))
                }
              >
                <SelectTrigger
                  id="sttAiLanguage"
                  data-testid="select-stt-ai-language"
                  className="bg-background border-border"
                >
                  <SelectValue placeholder={t("voiceSettings.selectLanguage")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {STT_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}{" "}
                      <span className="text-muted-foreground font-mono text-xs">
                        {l.code}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("voiceSettings.aiFriendHint")}
              </p>
            </div>
          </div>

          {/* Listening behavior */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("voiceSettings.listeningBehavior")}
            </p>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sttSilence">{t("voiceSettings.silence")}</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {(local.stt.silenceMs / 1000).toFixed(1)} s
                </span>
              </div>
              <Slider
                id="sttSilence"
                data-testid="slider-stt-silence"
                min={1}
                max={15}
                step={0.5}
                value={[local.stt.silenceMs / 1000]}
                onValueChange={([v]) =>
                  setLocal((p) => ({
                    ...p,
                    stt: { ...p.stt, silenceMs: Math.round(v * 1000) },
                  }))
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t("voiceSettings.silenceHint")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sttMaxSpeech">{t("voiceSettings.maxSpeech")}</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {local.stt.maxSpeechMs === 0
                    ? t("voiceSettings.off")
                    : `${(local.stt.maxSpeechMs / 1000).toFixed(0)} s`}
                </span>
              </div>
              <Slider
                id="sttMaxSpeech"
                data-testid="slider-stt-max-speech"
                min={0}
                max={180}
                step={5}
                value={[local.stt.maxSpeechMs / 1000]}
                onValueChange={([v]) =>
                  setLocal((p) => ({
                    ...p,
                    stt: { ...p.stt, maxSpeechMs: Math.round(v * 1000) },
                  }))
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t("voiceSettings.maxSpeechHint")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sttNudge">{t("voiceSettings.nudge")}</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {(local.stt.nudgeMs / 1000).toFixed(1)} s
                </span>
              </div>
              <Slider
                id="sttNudge"
                data-testid="slider-stt-nudge"
                min={3}
                max={60}
                step={0.5}
                value={[local.stt.nudgeMs / 1000]}
                onValueChange={([v]) =>
                  setLocal((p) => ({
                    ...p,
                    stt: { ...p.stt, nudgeMs: Math.round(v * 1000) },
                  }))
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t("voiceSettings.nudgeHint")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sttMaxNudges">{t("voiceSettings.nudgeCount")}</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {local.stt.maxNudges}
                </span>
              </div>
              <Slider
                id="sttMaxNudges"
                data-testid="slider-stt-max-nudges"
                min={1}
                max={10}
                step={1}
                value={[local.stt.maxNudges]}
                onValueChange={([v]) =>
                  setLocal((p) => ({
                    ...p,
                    stt: { ...p.stt, maxNudges: v },
                  }))
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t("voiceSettings.nudgeCountHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sttContinueMode">{t("voiceSettings.keepListening")}</Label>
              <Select
                value={local.stt.continueMode}
                onValueChange={(v) =>
                  setLocal((p) => ({
                    ...p,
                    stt: { ...p.stt, continueMode: v as SttContinueMode },
                  }))
                }
              >
                <SelectTrigger
                  id="sttContinueMode"
                  data-testid="select-stt-continue-mode"
                  className="bg-background border-border"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">{t("voiceSettings.continueOff")}</SelectItem>
                  <SelectItem value="continuous">{t("voiceSettings.continueContinuous")}</SelectItem>
                  <SelectItem value="interval">{t("voiceSettings.continueInterval")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("voiceSettings.keepListeningHint")}
              </p>
            </div>

            {local.stt.continueMode === "interval" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="sttInterval">{t("voiceSettings.retryInterval")}</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {local.stt.intervalSeconds} s
                  </span>
                </div>
                <Slider
                  id="sttInterval"
                  data-testid="slider-stt-interval"
                  min={2}
                  max={120}
                  step={1}
                  value={[local.stt.intervalSeconds]}
                  onValueChange={([v]) =>
                    setLocal((p) => ({
                      ...p,
                      stt: { ...p.stt, intervalSeconds: v },
                    }))
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t("voiceSettings.retryIntervalHint")}
                </p>
              </div>
            )}
          </div>
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
            data-testid="button-save-stt-settings"
          >
            {t("saveSettings")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
