import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";

import { movementLabel, movementTime } from "../rules/movement";
import type { Movement } from "../schema/stock";

const MINUS = "−";

function iconOf({ kind, reason }: Movement): IconName {
  if (kind === "production") return "package-variant-closed-check";
  if (kind === "waste") return "delete-outline";
  if (kind === "sale") return "shopping-outline";
  if (kind === "cancellation") return "rotate-left";
  return reason === "undo" ? "undo" : "clipboard-check-outline";
}

// Un movimiento: qué fue, cuándo y cuánto, con su signo
export function MovementRow({ movement, now }: { movement: Movement; now: Date }) {
  const adds = movement.quantity > 0;
  return (
    <View className="min-h-[56px] flex-row items-center gap-3 border-b border-border py-2.5">
      <View className={`h-9 w-9 items-center justify-center rounded-full ${adds ? "bg-olive-soft" : "bg-sunken"}`}>
        <Icon name={iconOf(movement)} size={18} tone={adds ? "olive" : "textSecondary"} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-base text-text">{movementLabel(movement.kind, movement.reason)}</Text>
        <Text className="text-[13px] text-text-secondary">{movementTime(new Date(movement.happenedAt), now)}</Text>
      </View>
      <Text className={`font-extrabold text-base ${adds ? "text-olive" : "text-danger"}`}>
        {adds ? `+${movement.quantity}` : `${MINUS}${-movement.quantity}`}
      </Text>
    </View>
  );
}
