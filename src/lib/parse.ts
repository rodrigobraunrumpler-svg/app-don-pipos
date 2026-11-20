import type { z } from "zod";

import { AppError } from "./errors";

// Lo que responde la base, revisado con su esquema: si no calza, la app y la base no coinciden (falla inesperada)
export function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  return parsed.data;
}
