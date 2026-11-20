import { z } from "zod";

// El cuadre como lo devuelve la base (docs/spec/cash.md §3)
export const cashExpectedSchema = z.object({
  businessDate: z.string(),
  cashInCents: z.number().int(),
  cashOutCents: z.number().int(),
  otherMethods: z.object({ yape: z.number().int(), plin: z.number().int(), transfer: z.number().int() }),
  lastOpeningCents: z.number().int(),
});
export type CashExpected = z.infer<typeof cashExpectedSchema>;

export const cashCountSchema = z.object({
  id: z.string(),
  businessDate: z.string(),
  openingCents: z.number().int(),
  cashInCents: z.number().int(),
  cashOutCents: z.number().int(),
  expectedCents: z.number().int(),
  countedCents: z.number().int(),
  differenceCents: z.number().int(),
  closedAt: z.string(),
});
export type CashCount = z.infer<typeof cashCountSchema>;
