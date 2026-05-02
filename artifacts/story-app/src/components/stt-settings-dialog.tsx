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

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

export function SttSettingsDialog({ settings, onSave }: Props) {
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
          aria-label="Voice settings"
          title="Voice settings"
          data-testid="button-stt-settings"
        >
          <AudioLines className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            Voice Settings
          </DialogTitle>
          <DialogDescription className="text-foreground/60">
            Speech recognition, text-to-speech, and Blind Mode behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Blind Mode */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
            <div>
              <Label htmlFor="blindMode" className="text-sm font-medium cursor-pointer">
                Blind Mode
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hands-free: AI reads aloud, then you speak your turn.
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
                Play Back Your Words
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                In Blind Mode, read your transcribed paragraph aloud before sending.
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
              Languages
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="sttLanguage">Your speech language</Label>
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
                  <SelectValue placeholder="Select a language" />
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
                Used for speech recognition and reading your own words back.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sttAiLanguage">AI friend language</Label>
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
                  <SelectValue placeholder="Select a language" />
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
                Language the AI writes in (and the voice used to read AI
                paragraphs aloud). Switch this to chat with the AI in a
                different language.
              </p>
            </div>
          </div>

          {/* Listening behavior */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Listening Behavior
            </p>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sttSilence">Silence before stopping</Label>
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
                After you stop talking, listening ends after this many seconds.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sttMaxSpeech">Max speech duration</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {local.stt.maxSpeechMs === 0
                    ? "Off"
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
                Once you start talking, force-stop after this many seconds.
                Helps in noisy rooms where the silence detector won't fire.
                Set to 0 to disable.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sttNudge">Wait before nudging</Label>
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
                If you stay silent this long, a soft nudge sound plays.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sttMaxNudges">Number of nudges</Label>
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
                After this many nudges with no response, listening pauses.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sttContinueMode">Keep listening</Label>
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
                  <SelectItem value="off">Off — pause after no response</SelectItem>
                  <SelectItem value="continuous">Continuous — restart immediately</SelectItem>
                  <SelectItem value="interval">Interval — wait, then retry</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose what happens after listening times out with no speech.
              </p>
            </div>

            {local.stt.continueMode === "interval" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="sttInterval">Retry interval</Label>
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
                  Seconds to wait before automatically listening again.
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
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-full font-bold font-sans bg-primary text-primary-foreground active:translate-y-[2px] transition-all duration-100 hover:-translate-y-0.5"
            style={{ boxShadow: "0 4px 0 0 var(--primary-shadow)" }}
            data-testid="button-save-stt-settings"
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
