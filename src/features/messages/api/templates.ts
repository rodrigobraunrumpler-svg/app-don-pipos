import { toAppError } from "@/lib/errors";
import { parseResponse } from "@/lib/parse";
import { supabase } from "@/lib/supabase";

import { templateListSchema, type Template } from "../schema/template";

export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await supabase().rpc("list_templates");
  if (error) throw toAppError(error);
  return parseResponse(templateListSchema, data);
}
