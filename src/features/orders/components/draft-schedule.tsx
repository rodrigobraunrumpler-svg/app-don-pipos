import { ScrollView, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Section } from "@/components/ui/section";
import { businessDate, formatLongDate, formatTime } from "@/lib/dates";

import { dueDayLabel, parseDayMonth } from "../rules/day";
import type { DraftState } from "../schema/draft";

type Props = {
  scheduledFor: string | null;
  otherDay: string;
  promisedTime: string;
  onChange: (patch: Partial<DraftState>) => void;
};

const DAY_MS = 86_400_000;
const STEP_MS = 5 * 60_000;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Dentro de 30 minutos, redondeado a los 5 siguientes
const inHalfAnHour = (now: Date) => formatTime(new Date(Math.ceil((now.getTime() + 30 * 60_000) / STEP_MS) * STEP_MS));

// Cuándo: hoy, uno de los 6 días que siguen (con los días de Lima) u otra fecha escrita como día/mes (los pedidos de
// eventos se anotan con semanas), y la hora acordada si la hay
export function DraftSchedule({ scheduledFor, otherDay, promisedTime, onChange }: Props) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => businessDate(new Date(now.getTime() + index * DAY_MS)));
  const today = days[0] ?? businessDate(now);
  return (
    <Section title="Cuándo">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {days.map((day, index) => (
          <Chip
            key={day}
            label={index === 0 ? "Hoy" : capitalize(dueDayLabel(day, now))}
            selected={(scheduledFor ?? days[0]) === day}
            onPress={() => onChange({ scheduledFor: index === 0 ? null : day, otherDay: "" })}
          />
        ))}
      </ScrollView>
      <Field
        label="Otra fecha"
        icon="calendar-blank-outline"
        value={otherDay}
        onChangeText={(text) => {
          const date = parseDayMonth(text, today);
          onChange({ otherDay: text, ...(date ? { scheduledFor: date === today ? null : date } : {}) });
        }}
        maxLength={10}
        keyboardType="numbers-and-punctuation"
        placeholder="Otra fecha (día/mes)"
      />
      {scheduledFor && !days.includes(scheduledFor) ? (
        <Text className="font-bold text-sm text-text">
          {formatLongDate(new Date(`${scheduledFor}T12:00:00-05:00`))}
        </Text>
      ) : null}
      {scheduledFor ? (
        <Text className="text-[13px] text-text-secondary">Aparece en «Próximos» hasta ese día.</Text>
      ) : null}
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Field
            label="Hora acordada"
            icon="clock-outline"
            value={promisedTime}
            onChangeText={(text) => onChange({ promisedTime: text.trim() })}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
            placeholder="Hora (opcional)"
          />
        </View>
        {scheduledFor ? null : (
          <Chip label="En 30 min" selected={false} onPress={() => onChange({ promisedTime: inHalfAnHour(now) })} />
        )}
      </View>
    </Section>
  );
}
