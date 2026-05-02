import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { getT, type Locale } from "@/lib/i18n";

type TFunction = (key: string, ...args: string[]) => string;

/**
 * Context that holds the current translation function.
 * Default is Hebrew (the app's configured default UI language).
 */
const I18nContext = createContext<TFunction>(getT("he"));

/**
 * Wrap any subtree to make translations available via useT().
 * Each page (Home, Story) renders this around its content so that
 * child components like dialogs and switchers can call useT() without
 * receiving a locale prop.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const t = useMemo(() => getT(locale), [locale]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

/**
 * Returns the current translation function.
 * Must be called inside an I18nProvider subtree.
 */
export function useT(): TFunction {
  return useContext(I18nContext);
}
