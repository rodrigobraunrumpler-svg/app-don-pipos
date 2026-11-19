import { supabase } from "./supabase";
export const rpc = (name: string): string => supabase.rpc(name);
