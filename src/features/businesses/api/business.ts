import { toAppError } from "@/lib/errors";
import { parseResponse } from "@/lib/parse";
import { supabase } from "@/lib/supabase";

import { businessSchema, type Business } from "../schema/business";

export async function getBusiness(): Promise<Business> {
  const { data, error } = await supabase().rpc("get_business");
  if (error) throw toAppError(error);
  return parseResponse(businessSchema, data);
}
