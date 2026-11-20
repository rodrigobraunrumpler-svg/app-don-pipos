import { mutationOptions, type QueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/errors";

import { completeSetup, updateSettings } from "../api/business";
import type { Business, SettingsPatch, SetupInput } from "../schema/business";
import { businessesKeys } from "./keys";

// Los ajustes se guardan de a uno (scope): cada cambio sale con la versión que dejó el anterior, así dos interruptores
// tocados seguidos no chocan entre sí
export const updateSettingsMutation = (queryClient: QueryClient) =>
  mutationOptions({
    scope: { id: "business-settings" },
    mutationFn: (patch: SettingsPatch) =>
      updateSettings(queryClient.getQueryData<Business>(businessesKeys.all)?.settings.version ?? 0, patch),
  });

// Si ya estaba hecha (otro celular, o la app se cerró en «Todo listo»), la base responde conflict: para el dueño es
// lo mismo que terminarla
export const completeSetupMutation = mutationOptions({
  mutationFn: async (input: SetupInput): Promise<{ alreadyDone: boolean }> => {
    try {
      await completeSetup(input);
      return { alreadyDone: false };
    } catch (error) {
      if (error instanceof AppError && error.kind === "conflict") return { alreadyDone: true };
      throw error;
    }
  },
});
