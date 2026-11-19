import { createClient } from "@supabase/supabase-js";
export function UsesSupabaseJs() {
  return <p>{typeof createClient}</p>;
}
