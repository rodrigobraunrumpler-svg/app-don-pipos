import { useState } from "react";

import { errorMessage, toAppError } from "@/lib/errors";

import type { SettingsPatch } from "../schema/business";
import { useUpdateSettings } from "./use-update-settings";

// Guardar un ajuste desde su hoja: true si quedó guardado; si no, el porqué en `failure`
export function useSaveSettings() {
  const update = useUpdateSettings();
  const [failure, setFailure] = useState<string | null>(null);

  async function save(patch: SettingsPatch): Promise<boolean> {
    setFailure(null);
    try {
      await update.mutateAsync(patch);
      return true;
    } catch (error) {
      setFailure(
        toAppError(error).kind === "conflict"
          ? "Otro cambio llegó antes: revisa los ajustes y vuelve a guardar."
          : errorMessage(error),
      );
      return false;
    }
  }

  return { save, saving: update.isPending, failure };
}
