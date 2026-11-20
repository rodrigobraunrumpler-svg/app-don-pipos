import { useState } from "react";
import { Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { MoneyInput } from "@/components/ui/money-input";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { parseSoles } from "@/lib/money";

import { PAYMENT_METHOD_LABELS } from "../constants";
import type { DraftState } from "../schema/draft";
import type { PaymentMethod } from "../schema/order";

type Props = { draft: DraftState; methods: PaymentMethod[]; onChange: (patch: Partial<DraftState>) => void };

// El pago de ahora: todo, una parte (el adelanto) o nada, y con qué medio (solo los activos del negocio)
export function DraftPayment({ draft, methods, onChange }: Props) {
  const [text, setText] = useState(draft.paymentCents > 0 ? (draft.paymentCents / 100).toFixed(2) : "");
  return (
    <Section title="Pago">
      <Text className="font-bold text-sm text-text-secondary">Paga ahora</Text>
      <Segmented
        label="Cuánto paga ahora"
        options={[
          ["all", "Todo"],
          ["part", "Una parte"],
          ["none", draft.fulfillment === "pickup" ? "Al recoger" : "Al recibir"],
        ]}
        value={draft.paymentMode}
        onChange={(paymentMode) => onChange({ paymentMode })}
      />
      {draft.paymentMode === "part" ? (
        <MoneyInput
          label="Monto del adelanto en soles"
          value={text}
          onChangeText={(value) => {
            setText(value);
            onChange({ paymentCents: parseSoles(value) ?? 0 });
          }}
        />
      ) : null}
      {draft.paymentMode === "none" ? null : (
        <View className="flex-row flex-wrap gap-2">
          {methods.map((method) => (
            <Chip
              key={method}
              label={PAYMENT_METHOD_LABELS[method]}
              selected={draft.paymentMethod === method}
              onPress={() => onChange({ paymentMethod: method })}
            />
          ))}
        </View>
      )}
    </Section>
  );
}
