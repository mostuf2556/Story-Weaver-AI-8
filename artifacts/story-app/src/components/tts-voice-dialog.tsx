import { useMemo, useState, useEffect } from "react";
import { Mic, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type StorySettings } from "@/hooks/use-settings";
import { STT_LANGUAGES } from "@/config/stt";

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

/**
 * Dialog for configuring per-language text-to-speech voice selection.
 *
 * The story page can read each saved message in its own BCP-47 language.
 * This dialog lets the user pick a specific voice for any language. When
 * no override is set, the browser's default voice for that language is used.
 * Saved overrides are listed below so they can be inspected and removed
 * individually.
 */
export function TtsVoiceDialog({ settings, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<StorySettings>(settings);
  // Which language the per-language voice selector is currently editing.
  // Defaults to the user's STT language so the most common case is one click away.
  const [editingLang, setEditingLang] = useState<string>(
    settings.stt.language || "en-US",
  );

  // All available voices from the browser's SpeechSynthesis API
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Fetch available voices when dialog opens or voices change
  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return;

    const updateVoices = () => {
      const voices = synth.getVoices();
      setAvailableVoices(voices);
    };

    updateVoices();
    synth.addEventListener("voiceschanged", updateVoices);
    return () => {
      synth.removeEventListener("voiceschanged", updateVoices);
    };
  }, [open]);

  const handleOpen = (v: boolean) => {
    if (v) {
      setLocal(settings);
      setEditingLang(settings.stt.language || "en-US");
    }
    setOpen(v);
  };

  const handleSave = () => {
    onSave({ ttsVoices: local.ttsVoices });
    setOpen(false);
  };

  // Get voices available for the currently selected language
  const voicesForLang = useMemo(() => {
    if (!availableVoices.length) return [];
    const target = editingLang.toLowerCase();
    const targetBase = target.split("-")[0];

    // First, exact language matches
    const exact = availableVoices.filter(
      (v) => v.lang.toLowerCase() === target
    );

    // Then, language-base matches (e.g., "en" for "en-US")
    const baseMatches = availableVoices.filter(
      (v) =>
        v.lang.toLowerCase().split("-")[0] === targetBase &&
        !exact.includes(v)
    );

    return [...exact, ...baseMatches];
  }, [availableVoices, editingLang]);

  // Sentinel value for "browser default" (no override)
  const DEFAULT_VOICE_SENTINEL = "__browser_default__";

  const selectedVoiceName = local.ttsVoices[editingLang];
  const selectedVoice = availableVoices.find(
    (v) => v.name === selectedVoiceName
  );

  const setVoiceForEditingLang = (voiceName: string) => {
    if (voiceName === DEFAULT_VOICE_SENTINEL) {
      setLocal((p) => {
        const next = { ...p.ttsVoices };
        delete next[editingLang];
        return { ...p, ttsVoices: next };
      });
    } else {
      setLocal((p) => ({
        ...p,
        ttsVoices: { ...p.ttsVoices, [editingLang]: voiceName },
      }));
    }
  };

  const clearOverride = (lang: string) => {
    setLocal((p) => {
      const next = { ...p.ttsVoices };
      delete next[lang];
      return { ...p, ttsVoices: next };
    });
  };

  // Build a label lookup once so the override list shows friendly names.
  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of STT_LANGUAGES) map[l.code] = l.label;
    return map;
  }, []);

  const overrideEntries = Object.entries(local.ttsVoices).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const hasVoiceOverride = editingLang in local.ttsVoices;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Configure text-to-speech voice per language"
        >
          <Mic className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            Text-to-Speech Voice
          </DialogTitle>
          <DialogDescription className="text-foreground/60">
            Select a preferred voice for each language. When no override is set,
            the browser's default voice for that language is used.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Language selector */}
          <div className="space-y-1.5">
            <Label htmlFor="lang-select">Language</Label>
            <Select value={editingLang} onValueChange={setEditingLang}>
              <SelectTrigger
                id="lang-select"
                className="bg-background border-border"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {STT_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}{" "}
                    <span className="text-muted-foreground font-mono text-xs">
                      {lang.code}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice selector */}
          {voicesForLang.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="voice-select">
                Voice
                {hasVoiceOverride && (
                  <span className="text-xs text-muted-foreground ml-2">(custom)</span>
                )}
              </Label>
              <Select
                value={selectedVoiceName || DEFAULT_VOICE_SENTINEL}
                onValueChange={setVoiceForEditingLang}
              >
                <SelectTrigger
                  id="voice-select"
                  className="bg-background border-border"
                >
                  <SelectValue
                    placeholder={selectedVoice?.name || "Browser default"}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={DEFAULT_VOICE_SENTINEL}>
                    Browser default
                  </SelectItem>
                  {voicesForLang.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name}
                      {voice.default && " (system default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 rounded-lg border border-border/60 bg-background">
              No voices available for this language.
            </div>
          )}

          {/* List of saved overrides */}
          {overrideEntries.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Saved Overrides
              </p>
              <ul className="space-y-1">
                {overrideEntries.map(([lang, voiceName]) => {
                  const voice = availableVoices.find((v) => v.name === voiceName);
                  return (
                    <li
                      key={lang}
                      className="flex items-center justify-between rounded-md border border-border/40 bg-background px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {labelByCode[lang] || lang}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {voice?.name || voiceName}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => clearOverride(lang)}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        title="Remove override"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </li>
                  );
                })}
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
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-full font-bold font-sans bg-primary text-primary-foreground active:translate-y-[2px] transition-all duration-100 hover:-translate-y-0.5"
            style={{ boxShadow: "0 4px 0 0 var(--primary-shadow)" }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
