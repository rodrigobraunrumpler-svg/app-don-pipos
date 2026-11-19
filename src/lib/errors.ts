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

const isOffline = (error: unknown): boolean =>
  error instanceof TypeError && /Network request failed|Failed to fetch/.test(error.message);

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
  return new AppError(kindFromServer(error) ?? "unexpected", { cause: error });
}

// El texto para el dueño. El error técnico queda en `cause`, para los registros; nunca se muestra
export function errorMessage(error: AppError): string {
  return MESSAGES[error.kind];
}

export function isRetryable(error: AppError): boolean {
  return error.kind === "offline" || error.kind === "unexpected";
}
