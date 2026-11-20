import { orNull, rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import {
  loyaltyOverviewSchema,
  loyaltySettingsSchema,
  type LoyaltyOverview,
  type LoyaltySettings,
  type RewardKind,
  type StampUnit,
} from "../schema/loyalty";

export const getLoyaltySettings = (): Promise<LoyaltySettings> =>
  rpcResult(loyaltySettingsSchema, supabase().rpc("get_loyalty_settings"));

// Cambiar la fidelidad con la versión que se tenía: con otra, conflict
export const updateLoyaltySettings = (input: {
  expectedVersion: number;
  isActive: boolean;
  stampUnit: StampUnit;
  goal: number;
  rewardKind: RewardKind;
  rewardAmountCents: number | null;
  rewardText: string | null;
}): Promise<LoyaltySettings> =>
  rpcResult(
    loyaltySettingsSchema,
    supabase().rpc("update_loyalty_settings", {
      p_expected_version: input.expectedVersion,
      p_is_active: input.isActive,
      p_stamp_unit: input.stampUnit,
      p_goal: input.goal,
      p_reward_kind: input.rewardKind,
      p_reward_amount_cents: orNull(input.rewardAmountCents),
      p_reward_text: orNull(input.rewardText),
    }),
  );

// «Cerca del premio»: los que tienen la meta − 2 sellos o más
export const getLoyaltyOverview = (): Promise<LoyaltyOverview> =>
  rpcResult(loyaltyOverviewSchema, supabase().rpc("loyalty_overview", { p_limit: 10 }));
