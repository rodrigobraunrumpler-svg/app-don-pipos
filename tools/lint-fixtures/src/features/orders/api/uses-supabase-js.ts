import type { PostgrestError } from "@supabase/supabase-js";
export const isDuplicate = (error: PostgrestError): boolean => error.code === "23505";
