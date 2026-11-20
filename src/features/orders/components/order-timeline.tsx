import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { formatTime } from "@/lib/dates";

import { STATUS_ICONS, STATUS_LABELS } from "../constants";
import { statusFlow } from "../rules/status";
import type { Order } from "../schema/order";

// La línea de tiempo (lineaTiempo de la maqueta): cada paso de la entrega, hecho, actual o pendiente, con su hora.
// Un pedido anulado no tiene paso actual
export function OrderTimeline({ order }: { order: Order }) {
  const steps = statusFlow(order.fulfillment);
  const current = order.status === "cancelled" ? -1 : steps.indexOf(order.status);
  return (
    <View className="mt-4 gap-3">
      {steps.map((status, index) => {
        const done = index < current;
        const isCurrent = index === current;
        const event = order.timeline.filter((item) => item.status === status).at(-1);
        const time = event && index <= current ? formatTime(new Date(event.at)) : "Pendiente";
        return (
          <View key={status} className="flex-row items-center gap-3">
            <View
              className={`h-8 w-8 items-center justify-center rounded-full ${done ? "bg-primary" : isCurrent ? "bg-caramel-soft" : "bg-sunken"}`}
            >
              <Icon
                name={done ? "check" : STATUS_ICONS[status]}
                size={16}
                tone={done ? "onPrimary" : isCurrent ? "caramelText" : "textMuted"}
              />
            </View>
            <View>
              <Text className={`font-bold text-base ${index <= current ? "text-text" : "text-text-muted"}`}>
                {STATUS_LABELS[status]}
              </Text>
              <Text className="text-[13px] text-text-secondary">{time}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
