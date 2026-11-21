import { Modal, Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

import { AUTO_LOCK_CHOICES, AUTO_LOCK_LABELS, type AutoLockMinutes } from "../constants";

type Props = {
  visible: boolean;
  value: AutoLockMinutes;
  onChoose: (minutes: AutoLockMinutes) => void;
  onClose: () => void;
};

// La hoja «Pedir huella o PIN» de Ajustes → Tu cuenta y este celular
export function AutoLockSheet({ visible, value, onChoose, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onClose}
          className="absolute inset-0 bg-text opacity-40"
        />
        <View className="rounded-t-xl bg-surface px-5 pb-8 pt-5">
          <Text className="font-extrabold text-xl text-text">Pedir huella o PIN</Text>
          <Text className="mt-1 text-sm text-text-secondary">
            Cuánto tiempo puede quedar la app en segundo plano antes de pedirlos otra vez.
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-2">
            {AUTO_LOCK_CHOICES.map((minutes) => (
              <Pressable
                key={minutes}
                accessibilityRole="button"
                accessibilityLabel={AUTO_LOCK_LABELS[minutes]}
                accessibilityState={{ selected: minutes === value }}
                onPress={() => onChoose(minutes)}
                className={`rounded-full border-[1.5px] px-4 py-2.5 ${minutes === value ? "border-primary bg-primary" : "border-border-strong bg-surface"}`}
              >
                <Text className={`font-bold text-sm ${minutes === value ? "text-on-primary" : "text-text"}`}>
                  {AUTO_LOCK_LABELS[minutes]}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-4 flex-row gap-2">
            <Icon name="shield-check-outline" size={18} tone="olive" />
            <Text className="flex-1 text-sm text-text-secondary">
              Aunque el celular esté desbloqueado, la app pide tu huella o PIN al volver.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
