import { rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import {
  businessSchema,
  businessSettingsSchema,
  setupResultSchema,
  type Business,
  type BusinessSettings,
  type SettingsPatch,
  type SetupInput,
  type SetupResult,
} from "../schema/business";

export const getBusiness = (): Promise<Business> => rpcResult(businessSchema, supabase().rpc("get_business"));

// Cambiar uno o varios ajustes con la versión que se tenía: con otra, conflict
export const updateSettings = (expectedVersion: number, patch: SettingsPatch): Promise<BusinessSettings> =>
  rpcResult(
    businessSettingsSchema,
    supabase().rpc("update_settings", { p_expected_version: expectedVersion, p_patch: patch }),
  );

// Una sola vez por negocio: la segunda responde conflict
export const completeSetup = (input: SetupInput): Promise<SetupResult> =>
  rpcResult(
    setupResultSchema,
    supabase().rpc("complete_setup", {
      p_request_id: input.requestId,
      p_stock: input.stock,
      p_categories: input.categories,
    }),
  );
