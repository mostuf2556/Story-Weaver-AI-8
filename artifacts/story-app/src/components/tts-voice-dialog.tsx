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
    // If the sentinel is selected, clear the override for this language
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Text-to-Speech Voice</DialogTitle>
          <DialogDescription>
            Select a preferred voice for each language. When no override is set,
            the browser's default voice for that language is used.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language selector */}
          <div className="space-y-2">
            <Label htmlFor="lang-select">Language</Label>
            <Select value={editingLang} onValueChange={setEditingLang}>
              <SelectTrigger id="lang-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STT_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice selector */}
          {voicesForLang.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="voice-select">
                Voice
                {hasVoiceOverride && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (custom)
                  </span>
                )}
              </Label>
              <Select
                value={selectedVoiceName || DEFAULT_VOICE_SENTINEL}
                onValueChange={setVoiceForEditingLang}
              >
                <SelectTrigger id="voice-select">
                  <SelectValue
                    placeholder={
                      selectedVoice?.name || "Browser default"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
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
            <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
              No voices available for this language.
            </div>
          )}

          {/* List of saved overrides */}
          {overrideEntries.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label className="text-xs font-semibold">Saved Overrides</Label>
              <div className="space-y-1">
                {overrideEntries.map(([lang, voiceName]) => {
                  const voice = availableVoices.find((v) => v.name === voiceName);
                  return (
                    <div
                      key={lang}
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <div>
                        <div className="font-medium">
                          {labelByCode[lang] || lang}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {voice?.name || voiceName}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearOverride(lang)}
                        title="Remove override"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
