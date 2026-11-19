import { z } from "zod";

// El estado de cada alfajor, como lo calcula stock_overview (docs/spec/stock.md §3)
export const stockStateSchema = z.enum(["check", "owed", "out", "low", "ok"]);
export type StockState = z.infer<typeof stockStateSchema>;

export const movementKindSchema = z.enum(["production", "sale", "cancellation", "waste", "adjustment"]);
export type MovementKind = z.infer<typeof movementKindSchema>;

export const wasteReasonSchema = z.enum(["broken", "expired", "gift", "other"]);
export type WasteReason = z.infer<typeof wasteReasonSchema>;
