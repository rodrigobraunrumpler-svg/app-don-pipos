import { vars } from "nativewind";
import type { ReactNode } from "react";
import { useColorScheme, View } from "react-native";

import { toCssVars } from "./css-vars";
import { ThemeContext, type Scheme } from "./theme-context";
import { darkColors, lightColors } from "./tokens";

export function ThemeProvider({ children, forcedScheme }: { children: ReactNode; forcedScheme?: Scheme }) {
  const system = useColorScheme();
  const scheme: Scheme = forcedScheme ?? (system === "dark" ? "dark" : "light");
  const colors = scheme === "dark" ? darkColors : lightColors;
  return (
    <ThemeContext.Provider value={{ scheme, colors }}>
      <View testID="theme-root" style={[{ flex: 1 }, vars(toCssVars(colors))]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
