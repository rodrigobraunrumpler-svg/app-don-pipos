import { createContext } from "react";

import type { ThemeColors } from "./tokens";

export type Scheme = "light" | "dark";
export type Theme = { scheme: Scheme; colors: ThemeColors };

export const ThemeContext = createContext<Theme | null>(null);
