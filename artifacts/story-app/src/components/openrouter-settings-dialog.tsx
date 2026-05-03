import { useState } from "react";
import { Settings } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { type StorySettings } from "@/hooks/use-settings";
import { useT } from "@/lib/i18n-context";

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

export function OpenrouterSettingsDialog({ settings, onSave }: Props) {
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
          aria-label={t("story.aiSettings")}
          title={t("story.aiSettings")}
          data-testid="button-openrouter-settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {t("aiSettings.title")}
          </DialogTitle>
          <DialogDescription className="text-foreground/60">
            {t("aiSettings.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Game mode */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
            <div>
              <Label htmlFor="gameMode" className="text-sm font-medium cursor-pointer">
                {t("aiSettings.manualTurn")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("aiSettings.manualTurnDesc")}
              </p>
            </div>
            <Switch
              id="gameMode"
              checked={local.gameMode === "manual"}
              onCheckedChange={(v) =>
                setLocal((p) => ({ ...p, gameMode: v ? "manual" : "auto" }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="model">{t("aiSettings.model")}</Label>
            <Input
              id="model"
              data-testid="input-model"
              value={local.model}
              onChange={(e) =>
                setLocal((p) => ({ ...p, model: e.target.value }))
              }
              placeholder="openrouter/free"
              className="bg-background border-border focus-visible:ring-primary font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t("aiSettings.modelHint")}{" "}
              <span className="font-mono">openrouter/free</span>,{" "}
              <span className="font-mono">meta-llama/llama-4-scout</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="maxTokens">{t("aiSettings.responseLength")}</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {local.maxTokens}{" "}
                {local.maxTokens === 1 ? t("aiSettings.word") : t("aiSettings.words")}
              </span>
            </div>
            <Slider
              id="maxTokens"
              data-testid="slider-max-tokens"
              min={1}
              max={100}
              step={1}
              value={[local.maxTokens]}
              onValueChange={([v]) => setLocal((p) => ({ ...p, maxTokens: v }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("aiSettings.oneWord")}</span>
              <span>{t("aiSettings.maxWords")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="temperature">{t("aiSettings.temperature")}</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {local.temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              id="temperature"
              data-testid="slider-temperature"
              min={0}
              max={2}
              step={0.05}
              value={[local.temperature]}
              onValueChange={([v]) =>
                setLocal((p) => ({ ...p, temperature: v }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("aiSettings.tempPrecise")}</span>
              <span>{t("aiSettings.tempCreative")}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              {t("aiSettings.customApi")}
            </p>
            <Label htmlFor="apiKey">{t("aiSettings.apiKey")}</Label>
            <Input
              id="apiKey"
              data-testid="input-api-key"
              type="password"
              value={local.apiKey}
              onChange={(e) =>
                setLocal((p) => ({ ...p, apiKey: e.target.value }))
              }
              placeholder="sk-or-..."
              className="bg-background border-border focus-visible:ring-primary font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apiUrl">{t("aiSettings.apiUrlLabel")}</Label>
            <Input
              id="apiUrl"
              data-testid="input-api-url"
              value={local.apiUrl}
              onChange={(e) =>
                setLocal((p) => ({ ...p, apiUrl: e.target.value }))
              }
              placeholder="https://openrouter.ai/api/v1"
              className="bg-background border-border focus-visible:ring-primary font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t("aiSettings.apiUrlHint")}
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex justify-between items-center">
              <Label htmlFor="aiMaxRetries">{t("aiSettings.retries")}</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {local.aiMaxRetries}{" "}
                {local.aiMaxRetries === 1 ? t("aiSettings.time") : t("aiSettings.times")}
              </span>
            </div>
            <Slider
              id="aiMaxRetries"
              data-testid="slider-ai-max-retries"
              min={1}
              max={10}
              step={1}
              value={[local.aiMaxRetries]}
              onValueChange={([v]) =>
                setLocal((p) => ({ ...p, aiMaxRetries: v }))
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t("aiSettings.retriesHint")}
            </p>
          </div>

          {/* Interface language */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("aiSettings.interfaceLang")}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={local.uiLanguage === "en" ? "default" : "outline"}
                onClick={() => setLocal((p) => ({ ...p, uiLanguage: "en" }))}
                className="rounded-full px-4"
              >
                {t("aiSettings.english")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={local.uiLanguage === "he" ? "default" : "outline"}
                onClick={() => setLocal((p) => ({ ...p, uiLanguage: "he" }))}
                className="rounded-full px-4"
                style={{ fontFamily: "'Noto Sans Hebrew', 'Arial Hebrew', sans-serif" }}
              >
                {t("aiSettings.hebrew")}
              </Button>
            </div>
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
            data-testid="button-save-openrouter-settings"
          >
            {t("saveSettings")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
