import { ScrollView, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";

import { clampGoal, GOAL_RANGE, type LoyaltyDraft } from "../rules/draft";
import type { RewardKind } from "../schema/loyalty";

const REWARDS: [RewardKind, string][] = [
  ["free_item", "1 alfajor gratis"],
  ["discount", "Descuento"],
  ["other", "Otro premio"],
];

type Props = { draft: LoyaltyDraft; problem: string | null; onChange: (patch: Partial<LoyaltyDraft>) => void };

// La regla: cada compra o cada alfajor suma un sello, la meta con + y − (en su rango) y el premio en chips, con el monto
// del descuento o el texto del otro premio
export function LoyaltyRuleForm({ draft, problem, onChange }: Props) {
  const [min, max] = GOAL_RANGE[draft.stampUnit];
  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="font-extrabold text-base text-text">Sellos para el premio</Text>
        <Segmented
          label="Cada sello"
          options={[
            ["order", "Por compra"],
            ["item", "Por alfajor"],
          ]}
          value={draft.stampUnit}
          onChange={(stampUnit) => onChange({ stampUnit, goal: clampGoal(draft.goal, stampUnit) })}
        />
        <View className="flex-row items-center gap-3">
          <Text className="flex-1 text-sm text-text-secondary">
            {draft.stampUnit === "order" ? "Cada compra suma un sello" : "Cada alfajor suma un sello"}
          </Text>
          <Stepper
            value={draft.goal}
            onChange={(goal) => onChange({ goal: clampGoal(goal, draft.stampUnit) })}
            label="sellos para el premio"
            min={min}
            max={max}
          />
        </View>
      </View>
      <View className="gap-2">
        <Text className="font-extrabold text-base text-text">Premio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {REWARDS.map(([kind, label]) => (
            <Chip
              key={kind}
              label={label}
              selected={draft.rewardKind === kind}
              onPress={() => onChange({ rewardKind: kind })}
            />
          ))}
        </ScrollView>
        {draft.rewardKind === "discount" ? (
          <MoneyInput
            label="Monto del descuento"
            value={draft.amountText}
            onChangeText={(amountText) => onChange({ amountText })}
            placeholder="0.00"
          />
        ) : null}
        {draft.rewardKind === "other" ? (
          <Field
            label="Premio"
            value={draft.rewardText}
            onChangeText={(rewardText) => onChange({ rewardText })}
            placeholder="Escribe el premio"
            maxLength={60}
          />
        ) : null}
        {problem ? <Text className="font-bold text-sm text-warning">{problem}</Text> : null}
      </View>
    </View>
  );
}
