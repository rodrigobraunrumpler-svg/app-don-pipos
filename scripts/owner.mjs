// Los scripts del equipo para los dueños (docs/spec/auth.md §3). Hoy solo contra el proyecto de desarrollo.
//   pnpm owner create --phone <9 números> --business "<nombre>" [--modules a,b,c] [--demo]
//   pnpm owner reset-pin --phone <9 números> [--demo]
//   pnpm owner sign-out-everywhere --phone <9 números>
// Con --demo el PIN no se imprime: queda en .env.local como DEMO_OWNER_PHONE y DEMO_OWNER_PIN.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT } from "./lib/guard.mjs";
import { parseOwnerArgs } from "./lib/owner-args.mjs";
import { createOwner, randomPin, resetOwnerPin, signOutEverywhere } from "./lib/owners.mjs";

function saveDemo(phone, pin) {
  const file = join(ROOT, ".env.local");
  const kept = (existsSync(file) ? readFileSync(file, "utf8") : "")
    .split("\n")
    .filter((line) => !line.startsWith("DEMO_OWNER_"));
  while (kept.at(-1) === "") kept.pop();
  kept.push(
    "",
    "# Dueño DEMO del proyecto de desarrollo, para probar el ingreso en Expo Go",
    `DEMO_OWNER_PHONE=${phone}`,
    `DEMO_OWNER_PIN=${pin}`,
    "",
  );
  writeFileSync(file, kept.join("\n"));
}

function report(phone, pin, demo) {
  if (demo) {
    saveDemo(phone, pin);
    console.log(`Listo: ${phone}. El PIN quedó en .env.local (DEMO_OWNER_PIN).`);
  } else {
    console.log(`Listo: ${phone}. PIN: ${pin}. Entrégalo en persona y no lo guardes en otro lado.`);
  }
}

try {
  const args = parseOwnerArgs(process.argv.slice(2));
  if (args.command === "create") {
    const pin = await randomPin(args.phone);
    await createOwner({ phone: args.phone, business: args.business, modules: args.modules, pin });
    report(args.phone, pin, args.demo);
  } else if (args.command === "reset-pin") {
    const pin = await randomPin(args.phone);
    await resetOwnerPin(args.phone, pin);
    report(args.phone, pin, args.demo);
  } else {
    const closed = await signOutEverywhere(args.phone);
    console.log(`Listo: ${closed} sesiones cerradas para ${args.phone}.`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
