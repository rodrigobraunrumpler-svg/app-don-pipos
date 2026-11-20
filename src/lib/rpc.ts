import type { z } from "zod";

import { toAppError } from "./errors";
import { parseResponse } from "./parse";

// Los tipos generados piden cada argumento de una función de la base aunque acepte null (sin valor por defecto).
// Esto pasa el null tal cual: la base lo recibe y decide (por ejemplo, «sin id» = crear)
export const orNull = <T>(value: T | null): T => value as T;

// La respuesta de una llamada a la base: su error como AppError, o sus datos revisados con el esquema
export async function rpcResult<T>(
  schema: z.ZodType<T>,
  request: PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T> {
  const { data, error } = await request;
  if (error) throw toAppError(error);
  return parseResponse(schema, data);
}
