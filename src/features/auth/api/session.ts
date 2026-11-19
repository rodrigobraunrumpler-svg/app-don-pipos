import { toAppError } from "@/lib/errors";
import { hasStoredSession, supabase } from "@/lib/supabase";

export type SessionState = "signed-in" | "signed-out";

// Hay sesión si está guardada en este celular. Sin señal y con el token vencido, Supabase no la puede renovar y avisa
// «sin sesión», pero la guarda: el dueño entra con su PIN o su huella, y la sesión se renueva al volver la señal
export async function getSessionState(): Promise<SessionState> {
  return (await hasStoredSession()) ? "signed-in" : "signed-out";
}

// Avisa cada cambio de sesión (ingresó, se renovó, se cerró, el servidor la rechazó). Devuelve cómo dejar de escuchar.
// No trae la sesión: el aviso inicial llega vacío cuando no hay señal, aunque la sesión siga guardada
export function onSessionChange(listener: () => void): () => void {
  const { data } = supabase().auth.onAuthStateChange(() => listener());
  return () => data.subscription.unsubscribe();
}

// Cierra la sesión solo en este celular. Supabase la borra del celular antes de avisar al servidor: sin señal devuelve
// el error, pero la sesión ya no está, y eso es lo que cuenta
export async function signOutHere(): Promise<void> {
  const { error } = await supabase().auth.signOut({ scope: "local" });
  if (await hasStoredSession()) throw toAppError(error ?? new Error("La sesión sigue guardada en el celular"));
}
