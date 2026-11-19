import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import type { Database } from "@/types/database";

import { appEnv } from "./env";
import { createSecureSessionStorage } from "./secure-session-storage";

// Dónde guarda Supabase la sesión en este celular (cifrada). Fija, para poder preguntar si hay una sin pasar por la red
const SESSION_KEY = "donpipos.session";
const sessionStorage = createSecureSessionStorage();
let client: SupabaseClient<Database> | undefined;

// El cliente de Supabase, creado la primera vez que se pide. Solo lo importa la carpeta api/ de un módulo (lo revisa el lint)
export function supabase(): SupabaseClient<Database> {
  if (!appEnv.ok) throw new Error(`Falta configurar la app: ${appEnv.problems.join("; ")}`);
  if (!client) {
    client = createClient<Database>(appEnv.env.supabaseUrl, appEnv.env.supabaseKey, {
      auth: {
        storage: sessionStorage,
        storageKey: SESSION_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    const { auth } = client;
    // La sesión se renueva sola mientras la app está en primer plano (recomendación de Supabase para React Native)
    AppState.addEventListener("change", (state) => {
      if (state === "active") void auth.startAutoRefresh();
      else void auth.stopAutoRefresh();
    });
  }
  return client;
}

// ¿Hay una sesión guardada en este celular? Sin señal y con el token vencido, Supabase la guarda pero avisa «sin sesión».
// Se lee directo del almacenamiento: no espera a la red
export async function hasStoredSession(): Promise<boolean> {
  return (await sessionStorage.getItem(SESSION_KEY)) !== null;
}
