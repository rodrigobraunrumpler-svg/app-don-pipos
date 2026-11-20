import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme";

import { customerByPhoneQuery } from "../queries/customers";
import { lastOrderLabel } from "../rules/last-order";
import { normalizePhone } from "../rules/phone";
import type { RepeatLine } from "../schema/customer";

type Props = {
  phone: string;
  onPhoneChange: (phone: string) => void;
  name: string;
  onNameChange: (name: string) => void;
  onRepeat: (lines: RepeatLine[]) => void;
};

const INPUT =
  "min-h-[50px] flex-row items-center gap-2.5 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5";
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

// El cliente por su teléfono (D14). Con los 9 dígitos lo busca: si ya pidió, completa su nombre y ofrece repetir su
// último pedido; si es nuevo, pide el nombre. Un nombre completado se borra si el teléfono cambia a otro cliente
export function CustomerLookup({ phone, onPhoneChange, name, onNameChange, onRepeat }: Props) {
  const { colors } = useTheme();
  const normalized = normalizePhone(phone);
  const { data, isPending } = useQuery(customerByPhoneQuery(normalized));
  const found = normalized ? (data ?? null) : null;
  const filled = useRef<string | null>(null);

  useEffect(() => {
    if (found) {
      // También al volver a la pantalla con el nombre ya completado: así un teléfono corregido lo borra
      filled.current = found.name;
      if (name !== found.name) onNameChange(found.name);
    } else if (filled.current !== null && name === filled.current) {
      filled.current = null;
      onNameChange("");
    }
  }, [found, name, onNameChange]);

  return (
    <View className="gap-3">
      <View>
        <Text className="mb-2 font-extrabold text-sm text-text-secondary">Teléfono</Text>
        <View className={INPUT}>
          <Text className="font-extrabold text-base text-text-secondary">+51</Text>
          <TextInput
            accessibilityLabel="Teléfono del cliente"
            value={phone}
            onChangeText={onPhoneChange}
            keyboardType="number-pad"
            maxLength={11}
            placeholder="900 000 000"
            placeholderTextColor={colors.textMuted}
            className="flex-1 font-bold text-base text-text"
          />
        </View>
      </View>
      {found ? (
        <View className="gap-1 rounded-sm border-[1.5px] border-dashed border-border-strong px-3 pt-2.5">
          <Text className="font-extrabold text-base text-text">{found.name}</Text>
          {found.lastOrderAt ? (
            <Text className="text-sm text-text-secondary">
              {`Su último pedido: ${lowerFirst(lastOrderLabel(new Date(found.lastOrderAt), new Date()))}`}
            </Text>
          ) : null}
          {found.lastOrder ? (
            <Button variant="text" label="Repetir" onPress={() => onRepeat(found.lastOrder?.lines ?? [])} />
          ) : null}
        </View>
      ) : normalized && !isPending ? (
        <View>
          <Text className="mb-2 font-extrabold text-sm text-text-secondary">Nombre</Text>
          <View className={INPUT}>
            <TextInput
              accessibilityLabel="Nombre del cliente"
              value={name}
              onChangeText={onNameChange}
              maxLength={60}
              autoCapitalize="words"
              placeholder="Cliente nuevo: su nombre"
              placeholderTextColor={colors.textMuted}
              className="flex-1 font-bold text-base text-text"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
