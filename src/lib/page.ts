import { z } from "zod";

// Una página de una lista larga (PROJECT_CONTEXT.md §14.3): sus filas y cómo pedir la siguiente
export type Page<T> = {
  items: T[];
  meta: { limit: number; total: number; hasMore: boolean; nextCursor: string | null };
};

const metaSchema = z.object({
  limit: z.number().int(),
  total: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export function pageSchema<T>(item: z.ZodType<T>): z.ZodType<Page<T>> {
  return z.object({ items: z.array(item), meta: metaSchema });
}
