import { rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import { templateListSchema, templateSchema, type Template } from "../schema/template";

export const listTemplates = (): Promise<Template[]> => rpcResult(templateListSchema, supabase().rpc("list_templates"));

// Cambiar un mensaje con la versión que se tenía: con otra, conflict; con un marcador que no vale, invalid
export const updateTemplate = (input: {
  key: Template["key"];
  expectedVersion: number;
  body: string;
}): Promise<Template> =>
  rpcResult(
    templateSchema,
    supabase().rpc("update_template", {
      p_key: input.key,
      p_expected_version: input.expectedVersion,
      p_body: input.body,
    }),
  );

export const resetTemplate = (key: Template["key"]): Promise<Template> =>
  rpcResult(templateSchema, supabase().rpc("reset_template", { p_key: key }));
