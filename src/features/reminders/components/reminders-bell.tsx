import { useState } from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";

import { useReminderList } from "../hooks/use-reminder-list";
import { ReminderListSheet } from "./reminder-list-sheet";

// La campana de la cabecera de Inicio (la maqueta), con un punto si hay avisos. Abre su lista
export function RemindersBell({ onOpen }: { onOpen: (href: string) => void }) {
  const reminders = useReminderList();
  const [open, setOpen] = useState(false);
  const count = reminders.length;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `Avisos, ${count}` : "Avisos"}
        onPress={() => setOpen(true)}
        className="h-11 w-11 items-center justify-center"
      >
        <Icon name="bell-outline" size={24} />
        {count > 0 ? (
          <View className="absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-background bg-danger" />
        ) : null}
      </Pressable>
      {open ? (
        <ReminderListSheet
          reminders={reminders}
          onClose={() => setOpen(false)}
          onOpen={(href) => {
            setOpen(false);
            onOpen(href);
          }}
        />
      ) : null}
    </>
  );
}
