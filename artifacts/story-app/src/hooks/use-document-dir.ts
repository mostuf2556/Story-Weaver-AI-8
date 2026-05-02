import { useEffect } from "react";
import { isRtlLanguage } from "@/lib/rtl";

/**
 * Synchronises `<html dir>` and `<html lang>` with the active BCP-47 language.
 *
 * Setting `dir` on the root element activates Tailwind's `rtl:*` variants for
 * the entire page, which handles mirroring of paddings, margins, borders, and
 * absolute positioning that use logical-property equivalents (e.g. `ps-*`,
 * `border-s-*`, `start-*`, `end-*`).
 *
 * The `lang` attribute helps browsers choose the correct hyphenation rules and
 * screen readers pick the right pronunciation dictionary.
 *
 * Call this once at the top of each page component that holds a language
 * setting (e.g. `home.tsx`, `story.tsx`).
 */
export function useDocumentDir(bcp47: string) {
  useEffect(() => {
    const dir = isRtlLanguage(bcp47) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    if (bcp47) document.documentElement.lang = bcp47;
    return () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    };
  }, [bcp47]);
}
