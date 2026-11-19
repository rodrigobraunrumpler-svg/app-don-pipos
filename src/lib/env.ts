import { z } from "zod";

// Las variables de la app, revisadas al arrancar: si falta una, la app lo dice en vez de fallar en silencio
export type AppEnv = { supabaseUrl: string; supabaseKey: string; supportWhatsapp: string | undefined };

const URL_PROBLEM = "EXPO_PUBLIC_SUPABASE_URL tiene que ser la URL https del proyecto";

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string({ error: URL_PROBLEM })
    .trim()
    .regex(/^https:\/\/[^\s/]+\S*$/, URL_PROBLEM),
  EXPO_PUBLIC_SUPABASE_KEY: z
    .string({ error: "Falta EXPO_PUBLIC_SUPABASE_KEY" })
    .trim()
    .superRefine((key, context) => {
      if (key.startsWith("sb_secret_")) {
        context.addIssue({
          code: "custom",
          message: "Esa es la llave secreta: en EXPO_PUBLIC_SUPABASE_KEY va la publicable (sb_publishable_…)",
        });
      } else if (!key.startsWith("sb_publishable_")) {
        context.addIssue({
          code: "custom",
          message: "EXPO_PUBLIC_SUPABASE_KEY tiene que ser la llave publicable (sb_publishable_…)",
        });
      }
    }),
  EXPO_PUBLIC_SUPPORT_WHATSAPP: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine(
      (value) => value === undefined || /^\d{8,15}$/.test(value),
      "EXPO_PUBLIC_SUPPORT_WHATSAPP: solo números, con el código del país",
    ),
});

export function parseEnv(
  source: Record<string, string | undefined>,
): { ok: true; env: AppEnv } | { ok: false; problems: string[] } {
  const parsed = schema.safeParse(source);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((issue) => issue.message) };
  const {
    EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
    EXPO_PUBLIC_SUPABASE_KEY: supabaseKey,
    EXPO_PUBLIC_SUPPORT_WHATSAPP: supportWhatsapp,
  } = parsed.data;
  return { ok: true, env: { supabaseUrl, supabaseKey, supportWhatsapp } };
}

// Cada variable escrita completa: Expo solo reemplaza las que encuentra así al armar la app
export const appEnv = parseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  EXPO_PUBLIC_SUPPORT_WHATSAPP: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP,
});
