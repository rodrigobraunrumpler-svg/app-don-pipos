import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const COMMENT = "# Dueño DEMO del proyecto de desarrollo, para probar el ingreso en Expo Go";

// Guarda el dueño DEMO en .env.local sin tocar las demás líneas. Escribe un temporal y lo cambia de nombre: si algo falla
// a medias, .env.local queda como estaba (AUTH_PASSWORD_SECRET no se puede volver a leer de Supabase)
export function saveDemo(file, phone, pin) {
  const kept = (existsSync(file) ? readFileSync(file, "utf8") : "")
    .split("\n")
    .filter((line) => !line.startsWith("DEMO_OWNER_") && line !== COMMENT);
  while (kept.at(-1) === "") kept.pop();
  kept.push("", COMMENT, `DEMO_OWNER_PHONE=${phone}`, `DEMO_OWNER_PIN=${pin}`, "");
  const temp = `${file}.tmp`;
  writeFileSync(temp, kept.join("\n"), { mode: 0o600 });
  renameSync(temp, file);
}
