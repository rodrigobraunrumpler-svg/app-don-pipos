import { useContext } from "react";

import { ThemeContext, type Theme } from "./theme-context";

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme necesita un ThemeProvider");
  return theme;
}
