import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";

import { customRange, type Period } from "../rules/period";

export type PeriodChoice = "week" | "month" | "custom";

type Props = {
  choice: PeriodChoice;
  today: string;
  onChoice: (choice: PeriodChoice) => void;
  onCustom: (period: Period) => void;
};

// Semana, Mes o Elegir fechas: «Desde» y «Hasta» escritos como día/mes (cada uno, la última vez que llegó ese día)
export function PeriodPicker({ choice, today, onChoice, onCustom }: Props) {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const result = customRange(fromText, toText, today);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    onCustom(result);
  }

  return (
    <View className="mt-1">
      <Segmented
        label="Periodo"
        options={[
          ["week", "Semana"],
          ["month", "Mes"],
          ["custom", "Elegir fechas"],
        ]}
        value={choice}
        onChange={onChoice}
      />
      {choice === "custom" ? (
        <View className="mt-3 gap-2">
          <View className="flex-row gap-2">
            {[["Desde", fromText, setFromText] as const, ["Hasta", toText, setToText] as const].map(
              ([label, value, onChange]) => (
                <View key={label} className="flex-1 gap-1">
                  <Text className="font-bold text-[13px] text-text-secondary">{label}</Text>
                  <Field
                    label={label}
                    value={value}
                    onChangeText={onChange}
                    placeholder="1/11"
                    maxLength={10}
                    keyboardType="numbers-and-punctuation"
                    icon="calendar-blank-outline"
                  />
                </View>
              ),
            )}
          </View>
          {error ? (
            <Text accessibilityRole="alert" className="font-bold text-sm text-danger">
              {error}
            </Text>
          ) : null}
          <Button label="Ver" variant="secondary" onPress={apply} />
        </View>
      ) : null}
    </View>
  );
}
