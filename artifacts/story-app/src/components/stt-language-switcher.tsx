import { Languages, Sparkles, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STT_LANGUAGES } from "@/config/stt";
import { useT } from "@/lib/i18n-context";

export const VIEW_OFF = "off" as const;

interface Props {
  value: string;
  onChange: (lang: string) => void;
  variant?: "stt" | "ai" | "view";
  label?: string;
  ariaLabel?: string;
  title?: string;
  testId?: string;
}

export function SttLanguageSwitcher({
  value,
  onChange,
  variant = "stt",
  label,
  ariaLabel,
  title,
  testId,
}: Props) {
  const t = useT();
  const Icon =
    variant === "ai" ? Sparkles : variant === "view" ? Eye : Languages;

  const defaultAria =
    variant === "ai"
      ? t("langSwitcher.aiResponseLanguage")
      : variant === "view"
        ? t("langSwitcher.translationLanguage")
        : t("langSwitcher.speechLanguage");

  const displayValue = value === VIEW_OFF ? t("langSwitcher.original") : value;

  const defaultTitle =
    variant === "ai"
      ? t("langSwitcher.aiTitle", value)
      : variant === "view"
        ? value === VIEW_OFF
          ? t("langSwitcher.translationOff")
          : t("langSwitcher.translateTo", value)
        : t("langSwitcher.sttTitle", value);

  const defaultTestId =
    variant === "ai"
      ? "select-ai-language-quick"
      : variant === "view"
        ? "select-view-language-quick"
        : "select-stt-language-quick";

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel ?? defaultAria}
        title={title ?? defaultTitle}
        data-testid={testId ?? defaultTestId}
        className="h-8 gap-1 px-2 border-border/60 bg-transparent text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent/40 [&>svg:last-child]:hidden focus:ring-0 focus:ring-offset-0 w-auto min-w-0"
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label && (
          <span className="text-[10px] uppercase tracking-wide font-sans font-medium opacity-70 leading-none">
            {label}
          </span>
        )}
        <SelectValue>{displayValue}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {variant === "view" && (
          <SelectItem value={VIEW_OFF}>
            {t("langSwitcher.original")}{" "}
            <span className="text-muted-foreground font-mono text-xs">
              (off)
            </span>
          </SelectItem>
        )}
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
  );
}
