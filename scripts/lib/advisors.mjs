// Los consejos de Supabase sobre la base que se aceptan a conciencia, cada uno con su motivo.
// Cualquier otro aviso o error hace fallar pnpm db:advisors.
export const ACCEPTED_ADVICE = {
  auth_leaked_password_protection:
    "Las contraseñas de las cuentas son internas: un HMAC de 256 bits que nadie escribe (docs/spec/auth.md). Revisarlas contra HaveIBeenPwned no agrega nada.",
};

/** Los consejos de nivel WARN o ERROR que no están aceptados. */
export function pendingAdvice(results) {
  return results.filter((advice) => ["WARN", "ERROR"].includes(advice.level) && !(advice.name in ACCEPTED_ADVICE));
}
