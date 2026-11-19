import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import type { Database } from "@/types/database";

import { appEnv } from "./env";
import { createSecureSessionStorage } from "./secure-session-storage";

let client: SupabaseClient<Database> | undefined;

// El cliente de Supabase, creado la primera vez que se pide. Solo lo importa la carpeta api/ de un módulo (lo revisa el lint)
export function supabase(): SupabaseClient<Database> {
  if (!appEnv.ok) throw new Error(`Falta configurar la app: ${appEnv.problems.join("; ")}`);
  if (!client) {
    client = createClient<Database>(appEnv.env.supabaseUrl, appEnv.env.supabaseKey, {
      auth: {
        storage: createSecureSessionStorage(),
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
