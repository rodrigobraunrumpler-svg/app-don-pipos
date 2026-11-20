import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import type { ColorName } from "@/theme";

import { STATUS_LABELS } from "../constants";
import type { OrderStatus } from "../schema/order";

// Cada estado con su color y su ícono (las clases van completas: el compilador de estilos no arma nombres)
const STYLES: Record<OrderStatus, { box: string; text: string; tone: ColorName; icon: IconName }> = {
  new: { box: "bg-status-new-bg", text: "text-status-new-text", tone: "statusNewText", icon: "creation" },
  preparing: {
    box: "bg-status-preparing-bg",
    text: "text-status-preparing-text",
    tone: "statusPreparingText",
    icon: "chef-hat",
  },
  on_the_way: {
    box: "bg-status-on-the-way-bg",
    text: "text-status-on-the-way-text",
    tone: "statusOnTheWayText",
    icon: "moped",
  },
  ready: {
    box: "bg-status-ready-bg",
    text: "text-status-ready-text",
    tone: "statusReadyText",
    icon: "shopping-outline",
  },
  delivered: {
    box: "bg-status-delivered-bg",
    text: "text-status-delivered-text",
    tone: "statusDeliveredText",
    icon: "check-all",
  },
  cancelled: {
    box: "bg-status-cancelled-bg",
    text: "text-status-cancelled-text",
    tone: "statusCancelledText",
    icon: "close-circle-outline",
  },
};

export function StatusChip({ status }: { status: OrderStatus }) {
  const style = STYLES[status];
  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${style.box}`}>
      <Icon name={style.icon} size={14} tone={style.tone} />
      <Text className={`font-extrabold text-xs ${style.text}`}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}
