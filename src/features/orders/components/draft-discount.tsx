import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { MoneyInput } from "@/components/ui/money-input";
import { Section } from "@/components/ui/section";
import { parseSoles } from "@/lib/money";

import type { DraftState } from "../schema/draft";

type Props = { discountCents: number; discountReason: string; onChange: (patch: Partial<DraftState>) => void };

// «Fidelidad» no va aquí: el premio se aplica con la tarjeta de sellos («Aplicar»), que gasta los sellos
const REASONS = ["Caja", "Cliente frecuente", "Otro"];

// El descuento, con su motivo (la maqueta): cerrado hasta que se pide
export function DraftDiscount({ discountCents, discountReason, onChange }: Props) {
  const [open, setOpen] = useState(discountCents > 0);
  const [text, setText] = useState(discountCents > 0 ? (discountCents / 100).toFixed(2) : "");
  return (
    <Section title="Descuento">
      {open ? (
        <>
          <MoneyInput
            label="Monto del descuento en soles"
            value={text}
            onChangeText={(value) => {
              setText(value);
              onChange({ discountCents: parseSoles(value) ?? 0 });
            }}
          />
          <View className="flex-row flex-wrap gap-2">
            {REASONS.map((reason) => (
              <Chip
                key={reason}
                label={reason}
                selected={discountReason === reason}
                onPress={() => onChange({ discountReason: reason })}
              />
            ))}
          </View>
          <View className="self-start">
            <Button
              variant="text"
              label="Quitar descuento"
              onPress={() => {
                setOpen(false);
                setText("");
                onChange({ discountCents: 0, discountReason: "" });
              }}
            />
          </View>
        </>
      ) : (
        <View className="self-start">
          <Button
            variant="text"
            label="Agregar descuento"
            icon={<Icon name="percent-outline" size={18} tone="accent" />}
            onPress={() => setOpen(true)}
          />
        </View>
      )}
    </Section>
  );
}
