import { z } from "zod";

// La fidelidad como la devuelve la base (docs/spec/loyalty.md §3)
export const stampUnitSchema = z.enum(["order", "item"]);
export type StampUnit = z.infer<typeof stampUnitSchema>;
export const rewardKindSchema = z.enum(["free_item", "discount", "other"]);
export type RewardKind = z.infer<typeof rewardKindSchema>;

export const loyaltySettingsSchema = z.object({
  isActive: z.boolean(),
  stampUnit: stampUnitSchema,
  goal: z.number().int(),
  rewardKind: rewardKindSchema,
  rewardAmountCents: z.number().int().nullable(),
  rewardText: z.string().nullable(),
  version: z.number().int(),
});
export type LoyaltySettings = z.infer<typeof loyaltySettingsSchema>;
// Lo que usan las cuentas: la regla, sin su versión
export type LoyaltyRule = Omit<LoyaltySettings, "version">;

export const loyaltyOverviewSchema = z.object({
  goal: z.number().int(),
  customers: z.array(z.object({ customerId: z.string(), name: z.string(), stamps: z.number().int() })),
});
export type LoyaltyOverview = z.infer<typeof loyaltyOverviewSchema>;
