import { useState } from "react";

import { errorMessage, toAppError } from "@/lib/errors";

import type { SettingsPatch } from "../schema/business";
import { useUpdateSettings } from "./use-update-settings";

// Guardar un ajuste desde su hoja: true si quedó guardado; si no, el porqué en `failure`. Con `conflict` la hoja
// muestra lo guardado ahora (el negocio se vuelve a pedir solo)
export function useSaveSettings() {
  const update = useUpdateSettings();
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  async function save(patch: SettingsPatch): Promise<boolean> {
    setFailure(null);
    setConflict(false);
    try {
      await update.mutateAsync(patch);
      return true;
    } catch (error) {
      const lost = toAppError(error).kind === "conflict";
      setConflict(lost);
      setFailure(lost ? "Otro cambio llegó antes: revisa los ajustes y vuelve a guardar." : errorMessage(error));
      return false;
    }
  }

  return { save, saving: update.isPending, failure, conflict };
}
