export type AppErrorKind = "offline" | "notFound" | "forbidden" | "invalid" | "conflict" | "unexpected";

export class AppError extends Error {
  readonly kind: AppErrorKind;

  constructor(kind: AppErrorKind, options?: { cause?: unknown }) {
    super(kind, options);
    this.name = "AppError";
    this.kind = kind;
  }
}

// Los códigos que avisan las funciones de la base: raise exception using errcode = 'P0001', message = '<código>'
const DATABASE_CODES = new Map<string, AppErrorKind>([
  ["invalid", "invalid"],
  ["not_found", "notFound"],
  ["forbidden", "forbidden"],
  ["conflict", "conflict"],
]);

// Códigos de Postgres y de la API de Supabase que tienen un significado claro para el dueño
const SERVER_CODES = new Map<string, AppErrorKind>([
  ["42501", "forbidden"],
  ["PGRST301", "forbidden"],
  ["23505", "conflict"],
  ["PGRST116", "notFound"],
]);

const MESSAGES: Record<AppErrorKind, string> = {
  offline: "Sin conexión. Revisa tu señal y vuelve a intentar.",
  notFound: "No encontramos lo que buscabas. Puede que ya no exista.",
  forbidden: "No tienes permiso para hacer esto. Vuelve a ingresar.",
  invalid: "Hay un dato que no es válido. Revísalo y vuelve a intentar.",
  conflict: "Alguien cambió esto antes. Actualiza y vuelve a intentar.",
  unexpected: "Algo salió mal de nuestro lado. Vuelve a intentar en un momento.",
};

const NETWORK_MESSAGE = /Network request failed|Network request timed out|Failed to fetch/;
// Los nombres que usa supabase-js cuando la petición ni siquiera llegó al servidor
// AbortError: la petición se cortó a los 20 s (lib/fetch-timeout.ts); para el dueño es lo mismo que no tener señal
const NETWORK_ERROR_NAMES = new Set(["FunctionsFetchError", "AuthRetryableFetchError", "AbortError"]);
const ABORTED_MESSAGE = /^AbortError\b/;

function isOffline(error: unknown): boolean {
  if (error instanceof TypeError) return NETWORK_MESSAGE.test(error.message);
  if (typeof error !== "object" || error === null) return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  // PostgREST devuelve la falla de red como un objeto: { message: "TypeError: Network request failed", code: "" }
  return (
    (typeof name === "string" && NETWORK_ERROR_NAMES.has(name)) ||
    (typeof message === "string" && (NETWORK_MESSAGE.test(message) || ABORTED_MESSAGE.test(message)))
  );
}

// Una Edge Function que respondió 401 o 403: la sesión ya no vale
function isRejectedSession(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, context } = error as { name?: unknown; context?: { status?: unknown } };
  return name === "FunctionsHttpError" && (context?.status === 401 || context?.status === 403);
}

function kindFromServer(error: unknown): AppErrorKind | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code !== "string") return undefined;
  if (code === "P0001") return DATABASE_CODES.get(String(message));
  return SERVER_CODES.get(code);
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isOffline(error)) return new AppError("offline", { cause: error });
  if (isRejectedSession(error)) return new AppError("forbidden", { cause: error });
  return new AppError(kindFromServer(error) ?? "unexpected", { cause: error });
}

// El texto para el dueño. El error técnico queda en `cause`, para los registros; nunca se muestra.
// Recibe cualquier cosa: lo que entrega una consulta no siempre pasó antes por toAppError
export function errorMessage(error: unknown): string {
  return MESSAGES[toAppError(error).kind];
}

export function isRetryable(error: unknown): boolean {
  const { kind } = toAppError(error);
  return kind === "offline" || kind === "unexpected";
}
