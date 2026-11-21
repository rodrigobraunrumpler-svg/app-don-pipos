import { useState, type ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { useTheme } from "@/theme";

import { AUTO_LOCK_LABELS } from "../constants";
import { useUnlock } from "../hooks/use-unlock";
import { formatPhone } from "../rules/phone";
import { AutoLockSheet } from "./auto-lock-sheet";

const ROW = "min-h-[54px] flex-row items-center gap-3 border-b border-border px-4";

// Ajustes → Tu cuenta y este celular: el número, la huella, cuándo pedir huella o PIN, lo que agregue la pantalla
// (Recordatorios), cambiar el PIN y cerrar la sesión de este celular
export function AccountSection({ onChangePin, extra }: { onChangePin: () => void; extra?: ReactNode }) {
  const { phone, biometricsEnabled, setBiometricsEnabled, autoLockMinutes, setAutoLockMinutes, signOutHere } =
    useUnlock();
  const { colors } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const [noBiometrics, setNoBiometrics] = useState(false);

  const link = (icon: IconName, label: string, onPress: () => void, value?: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className={ROW}>
      <Icon name={icon} size={20} tone="olive" />
      <Text className="flex-1 font-semibold text-base text-text">{label}</Text>
      {value ? <Text className="text-sm text-text-secondary">{value}</Text> : null}
      <Icon name="chevron-right" size={20} tone="textMuted" />
    </Pressable>
  );

  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="px-1 font-extrabold text-sm text-text-secondary">
        Tu cuenta y este celular
      </Text>
      <View className="overflow-hidden rounded-md border border-border bg-surface">
        <View className={ROW}>
          <Icon name="cellphone" size={20} tone="olive" />
          <Text className="flex-1 font-semibold text-base text-text">Tu número</Text>
          <Text className="text-sm text-text-secondary">{phone ? formatPhone(phone) : "—"}</Text>
        </View>
        <View className={ROW}>
          <Icon name="fingerprint" size={20} tone="olive" />
          <Text className="flex-1 font-semibold text-base text-text">Entrar con huella</Text>
          <Switch
            accessibilityLabel="Entrar con huella"
            value={biometricsEnabled}
            onValueChange={async (value) => setNoBiometrics(!(await setBiometricsEnabled(value)))}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            thumbColor={colors.surface}
          />
        </View>
        {link("timer-outline", "Pedir huella o PIN", () => setChoosing(true), AUTO_LOCK_LABELS[autoLockMinutes])}
        {extra}
        {link("key-variant", "Cambiar PIN", onChangePin)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión en este celular"
          onPress={() => void signOutHere()}
          className="min-h-[54px] flex-row items-center gap-3 px-4"
        >
          <Icon name="logout" size={20} tone="danger" />
          <Text className="flex-1 font-semibold text-base text-danger">Cerrar sesión en este celular</Text>
        </Pressable>
      </View>
      {noBiometrics ? (
        <Text className="px-1 text-sm text-text-secondary">Este celular no tiene una huella registrada.</Text>
      ) : null}
      <AutoLockSheet
        visible={choosing}
        value={autoLockMinutes}
        onChoose={(minutes) => {
          void setAutoLockMinutes(minutes);
          setChoosing(false);
        }}
        onClose={() => setChoosing(false)}
      />
    </View>
  );
}
