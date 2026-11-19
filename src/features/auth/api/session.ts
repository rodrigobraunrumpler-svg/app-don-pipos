import type { Session } from "@supabase/supabase-js";

import { toAppError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase().auth.getSession();
  if (error) throw toAppError(error);
  return data.session;
}

// Avisa cada cambio de sesión (ingresó, se renovó, se cerró). Devuelve cómo dejar de escuchar
export function onSessionChange(listener: (session: Session | null) => void): () => void {
  const { data } = supabase().auth.onAuthStateChange((_event, session) => listener(session));
  return () => data.subscription.unsubscribe();
}

// Cierra la sesión solo en este celular
export async function signOutHere(): Promise<void> {
  const { error } = await supabase().auth.signOut({ scope: "local" });
  if (error) throw toAppError(error);
}
