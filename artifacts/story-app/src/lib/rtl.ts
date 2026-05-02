/**
 * BCP-47 language base tags whose natural writing direction is right-to-left.
 * We check only the primary language subtag (everything before the first "-")
 * so "he-IL", "he-IL-u-nu-latn", "ar", "ar-SA", etc. all match correctly.
 */
const RTL_BASES = new Set([
  "ar", // Arabic
  "he", // Hebrew
  "fa", // Persian / Farsi
  "ur", // Urdu
  "ps", // Pashto
  "ug", // Uyghur
  "yi", // Yiddish
  "dv", // Divehi / Maldivian
  "syr", // Syriac
  "ku", // Kurdish (Sorani uses RTL script)
]);

/**
 * Returns true when the BCP-47 tag refers to a right-to-left language.
 *
 * @example
 * isRtlLanguage("he-IL")  // true
 * isRtlLanguage("ar")     // true
 * isRtlLanguage("en-US")  // false
 * isRtlLanguage("")       // false
 */
export function isRtlLanguage(bcp47: string): boolean {
  if (!bcp47) return false;
  const base = bcp47.split("-")[0].toLowerCase();
  return RTL_BASES.has(base);
}
