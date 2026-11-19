import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "./icon";

type Props = { message: string; actionLabel?: string; onAction?: () => void; onHide: () => void; duration?: number };

// El aviso de abajo, como «Merma anotada» con «Deshacer». Se oculta solo
export function Toast({ message, actionLabel, onAction, onHide, duration = 6000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onHide, duration);
    return () => clearTimeout(timer);
  }, [message, onHide, duration]);

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="absolute bottom-4 left-4 right-4 flex-row items-center gap-3 rounded-md bg-text px-4 py-3"
    >
      <Icon name="information-outline" size={18} tone="background" />
      <Text className="flex-1 font-semibold text-sm text-background">{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={10}>
          <Text className="font-extrabold text-sm text-caramel">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
