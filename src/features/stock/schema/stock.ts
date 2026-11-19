import { z } from "zod";

// El estado de cada alfajor, como lo calcula stock_overview (docs/spec/stock.md §3)
export const stockStateSchema = z.enum(["check", "owed", "out", "low", "ok"]);
export type StockState = z.infer<typeof stockStateSchema>;

export const movementKindSchema = z.enum(["production", "sale", "cancellation", "waste", "adjustment"]);
export type MovementKind = z.infer<typeof movementKindSchema>;

export const wasteReasonSchema = z.enum(["broken", "expired", "gift", "other"]);
export type WasteReason = z.infer<typeof wasteReasonSchema>;

// Un alfajor como lo devuelve stock_overview
export const stockItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  linkedToWeb: z.boolean(),
  minStock: z.number().int(),
  onHand: z.number().int(),
  reserved: z.number().int(),
  physical: z.number().int(),
  state: stockStateSchema,
});
export type StockItem = z.infer<typeof stockItemSchema>;

export const stockOverviewSchema = z.array(stockItemSchema);

const levelSchema = z.object({ productId: z.string(), onHand: z.number().int() });
const webProductSchema = z.object({ productId: z.string(), name: z.string() });

export const wasteResultSchema = z.object({ productId: z.string(), onHand: z.number().int(), outOnWeb: z.boolean() });
export type WasteResult = z.infer<typeof wasteResultSchema>;

export const countResultSchema = z.object({
  adjustments: z.number().int(),
  items: z.array(levelSchema),
  backOnWeb: z.array(webProductSchema),
  outOnWeb: z.array(webProductSchema),
});
export type CountResult = z.infer<typeof countResultSchema>;

export const revertResultSchema = z.object({ reverted: z.number().int(), items: z.array(levelSchema) });
export type RevertResult = z.infer<typeof revertResultSchema>;

export type WasteInput = { requestId: string; productId: string; quantity: number; reason: WasteReason };
export type CountInput = { requestId: string; counts: { productId: string; counted: number }[] };
