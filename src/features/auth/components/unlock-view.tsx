import { useState } from "react";

import { useUnlock } from "../hooks/use-unlock";
import { UnlockBiometrics } from "./unlock-biometrics";
import { UnlockPin } from "./unlock-pin";

// Entrar: con la huella si está activa; si no, o si la pide el dueño, con el PIN
export function UnlockView() {
  const { biometricsEnabled } = useUnlock();
  const [mode, setMode] = useState<"biometrics" | "pin">(biometricsEnabled ? "biometrics" : "pin");
  if (mode === "biometrics") return <UnlockBiometrics onUsePin={() => setMode("pin")} />;
  return <UnlockPin onUseBiometrics={biometricsEnabled ? () => setMode("biometrics") : undefined} />;
}
