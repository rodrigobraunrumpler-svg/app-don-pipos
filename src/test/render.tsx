import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { ThemeProvider, type Scheme } from "@/theme";

export function renderWithProviders(ui: ReactElement, options?: { scheme?: Scheme }) {
  return render(<ThemeProvider forcedScheme={options?.scheme}>{ui}</ThemeProvider>);
}
