import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";

import { REMINDER_ICONS } from "../constants";
import { targetHref } from "../rules/target";
import type { Reminder } from "../schema/reminder";

type Props = { reminders: Reminder[]; onClose: () => void; onOpen: (href: string) => void };

// «Avisos», la hoja de la campana: cada aviso con su título y su texto; tocarlo abre su pantalla
export function ReminderListSheet({ reminders, onClose, onOpen }: Props) {
  return (
    <Sheet visible title="Avisos" onClose={onClose}>
      {reminders.length === 0 ? (
        <Text className="pb-4 text-base text-text-secondary">No hay avisos por ahora.</Text>
      ) : (
        <ScrollView>
          {reminders.map((reminder) => (
            <Pressable
              key={reminder.id}
              accessibilityRole="button"
              accessibilityLabel={`${reminder.title}. ${reminder.body}`}
              onPress={() => onOpen(targetHref(reminder.target))}
              className="min-h-[64px] flex-row items-center gap-3 border-b border-border py-2.5"
            >
              <Icon name={REMINDER_ICONS[reminder.kind]} size={20} tone="olive" />
              <View className="flex-1">
                <Text className="font-bold text-base text-text">{reminder.title}</Text>
                <Text className="text-sm text-text-secondary">{reminder.body}</Text>
              </View>
              <Icon name="chevron-right" size={20} tone="textMuted" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Sheet>
  );
}
