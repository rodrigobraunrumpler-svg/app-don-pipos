// Los argumentos de pnpm owner, revisados antes de tocar nada
import { normalizePhone } from "../../supabase/functions/_shared/phone.ts";

const COMMANDS = ["create", "reset-pin", "sign-out-everywhere"];

export function parseOwnerArgs(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command))
    throw new Error(`Uso: pnpm owner <comando> --phone <9 números>. comandos: ${COMMANDS.join(", ")}`);

  const value = (flag) => {
    const index = rest.indexOf(flag);
    return index === -1 ? undefined : rest[index + 1];
  };
  const rawPhone = value("--phone");
  if (!rawPhone) throw new Error("falta --phone <9 números>");
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error(`el número no vale: «${rawPhone}». Son 9 números, con o sin +51`);

  const parsed = {
    command,
    phone,
    modules: value("--modules")?.split(",").filter(Boolean) ?? [],
    demo: rest.includes("--demo"),
  };
  if (command !== "create") return parsed;

  const business = value("--business");
  if (!business) throw new Error('falta --business "<nombre del negocio>"');
  return { command, phone, business, modules: parsed.modules, demo: parsed.demo };
}
