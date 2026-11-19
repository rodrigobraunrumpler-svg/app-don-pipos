import { createClient } from "@supabase/supabase-js";
export const supabase = { rpc: (name: string) => name, createClient };
