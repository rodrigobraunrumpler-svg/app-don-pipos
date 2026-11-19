import { supabase } from "./supabase";
export const smoke = supabase.rpc("x");
