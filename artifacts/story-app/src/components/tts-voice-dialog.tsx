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
import { useT } from "@/lib/i18n-context";

interface Props {
  settings: StorySettings;
  onSave: (patch: Partial<StorySettings>) => void;
}

export function TtsVoiceDialog({ settings, onSave }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<StorySettings>(settings);
  const [editingLang, setEditingLang] = useState<string>(
    settings.stt.language || "en-US",
  );
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return;
    const updateVoices = () => setAvailableVoices(synth.getVoices());
    updateVoices();
    synth.addEventListener("voiceschanged", updateVoices);
    return () => synth.removeEventListener("voiceschanged", updateVoices);
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

  const voicesForLang = useMemo(() => {
    if (!availableVoices.length) return [];
    const target = editingLang.toLowerCase();
    const targetBase = target.split("-")[0];
    const exact = availableVoices.filter((v) => v.lang.toLowerCase() === target);
    const baseMatches = availableVoices.filter(
      (v) => v.lang.toLowerCase().split("-")[0] === targetBase && !exact.includes(v),
    );
    return [...exact, ...baseMatches];
  }, [availableVoices, editingLang]);

  const DEFAULT_VOICE_SENTINEL = "__browser_default__";
  const selectedVoiceName = local.ttsVoices[editingLang];
  const selectedVoice = availableVoices.find((v) => v.name === selectedVoiceName);

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
          title={t("ttsVoice.configureTitle")}
        >
          <Mic className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="font-sans bg-card border-card-border w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {t("ttsVoice.title")}
          </DialogTitle>
          <DialogDescription className="text-foreground/60">
            {t("ttsVoice.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="lang-select">{t("ttsVoice.language")}</Label>
            <Select value={editingLang} onValueChange={setEditingLang}>
              <SelectTrigger id="lang-select" className="bg-background border-border">
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

          {voicesForLang.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="voice-select">
                {t("ttsVoice.voice")}
                {hasVoiceOverride && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("ttsVoice.custom")}
                  </span>
                )}
              </Label>
              <Select
                value={selectedVoiceName || DEFAULT_VOICE_SENTINEL}
                onValueChange={setVoiceForEditingLang}
              >
                <SelectTrigger id="voice-select" className="bg-background border-border">
                  <SelectValue
                    placeholder={selectedVoice?.name || t("ttsVoice.browserDefault")}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={DEFAULT_VOICE_SENTINEL}>
                    {t("ttsVoice.browserDefault")}
                  </SelectItem>
                  {voicesForLang.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name}
                      {voice.default && t("ttsVoice.systemDefault")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 rounded-lg border border-border/60 bg-background">
              {t("ttsVoice.noVoices")}
            </div>
          )}

          {overrideEntries.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("ttsVoice.savedOverrides")}
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
                        title={t("ttsVoice.removeOverride")}
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
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-full font-bold font-sans bg-primary text-primary-foreground active:translate-y-[2px] transition-all duration-100 hover:-translate-y-0.5"
            style={{ boxShadow: "0 4px 0 0 var(--primary-shadow)" }}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
