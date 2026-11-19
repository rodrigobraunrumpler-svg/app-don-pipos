import { createContext } from "react";

import type { SessionStatus, UnlockState } from "./use-unlock-state";

export type AccessState = UnlockState & { sessionStatus: SessionStatus };

export const UnlockContext = createContext<AccessState | null>(null);
