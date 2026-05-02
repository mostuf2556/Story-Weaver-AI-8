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

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

export function OpenrouterSettingsDialog({ settings, onSave }: Props) {
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
          aria-label="AI settings"
          title="AI settings"
          data-testid="button-openrouter-settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            AI Settings
          </DialogTitle>
          <DialogDescription className="text-foreground/60">
            Model and generation parameters. Saved locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Game mode */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
            <div>
              <Label htmlFor="gameMode" className="text-sm font-medium cursor-pointer">
                Manual AI Turn
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Off: AI replies automatically after you send. On: tap the spark
                button to take the AI's turn.
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
            <Label htmlFor="model">Model</Label>
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
              Any OpenRouter model ID, e.g.{" "}
              <span className="font-mono">openrouter/free</span>,{" "}
              <span className="font-mono">meta-llama/llama-4-scout</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="maxTokens">Response Length</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {local.maxTokens} {local.maxTokens === 1 ? "word" : "words"}
              </span>
            </div>
            <Slider
              id="maxTokens"
              data-testid="slider-max-tokens"
              min={1}
              max={20}
              step={1}
              value={[local.maxTokens]}
              onValueChange={([v]) => setLocal((p) => ({ ...p, maxTokens: v }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 word</span>
              <span>20 words</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="temperature">Temperature</Label>
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
              <span>0 — precise</span>
              <span>2 — creative</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Custom API (optional)
            </p>
            <Label htmlFor="apiKey">OpenRouter API Key</Label>
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
            <Label htmlFor="apiUrl">OpenRouter Base URL</Label>
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
              Leave blank to use the built-in Replit-managed key.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex justify-between items-center">
              <Label htmlFor="aiMaxRetries">Retry empty responses</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {local.aiMaxRetries} {local.aiMaxRetries === 1 ? "time" : "times"}
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
              If the AI returns an empty reply, the server retries this many
              times before showing an error.
            </p>
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
            data-testid="button-save-openrouter-settings"
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
