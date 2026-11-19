import { supabase } from "../lib/supabase";
export default function Screen() {
  return <p>{supabase.rpc("x")}</p>;
}
