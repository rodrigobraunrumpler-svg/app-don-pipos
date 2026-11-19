import type { ReactNode } from "react";

import { UnlockContext } from "../hooks/unlock-context";
import { useAutoLock } from "../hooks/use-auto-lock";
import { useSession } from "../hooks/use-session";
import { useUnlockState } from "../hooks/use-unlock-state";

// Une la sesión, el candado y el bloqueo automático, y los pone al alcance de toda la app
export function UnlockProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const unlock = useUnlockState({ sessionStatus: status });
  useAutoLock({
    minutes: unlock.autoLockMinutes,
    enabled: status === "signed-in" && !unlock.locked,
    onLock: unlock.lock,
  });
  return <UnlockContext.Provider value={{ ...unlock, sessionStatus: status }}>{children}</UnlockContext.Provider>;
}
