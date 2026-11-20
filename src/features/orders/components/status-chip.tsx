import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { ColorName } from "@/theme";

import { STATUS_ICONS, STATUS_LABELS, STATUS_SHORT_LABELS } from "../constants";
import type { OrderStatus } from "../schema/order";

// Cada estado con su color y su ícono (las clases van completas: el compilador de estilos no arma nombres)
const STYLES: Record<OrderStatus, { box: string; text: string; tone: ColorName }> = {
  new: { box: "bg-status-new-bg", text: "text-status-new-text", tone: "statusNewText" },
  preparing: {
    box: "bg-status-preparing-bg",
    text: "text-status-preparing-text",
    tone: "statusPreparingText",
  },
  on_the_way: {
    box: "bg-status-on-the-way-bg",
    text: "text-status-on-the-way-text",
    tone: "statusOnTheWayText",
  },
  ready: {
    box: "bg-status-ready-bg",
    text: "text-status-ready-text",
    tone: "statusReadyText",
  },
  delivered: {
    box: "bg-status-delivered-bg",
    text: "text-status-delivered-text",
    tone: "statusDeliveredText",
  },
  cancelled: {
    box: "bg-status-cancelled-bg",
    text: "text-status-cancelled-text",
    tone: "statusCancelledText",
  },
};

export function StatusChip({ status, short = false }: { status: OrderStatus; short?: boolean }) {
  const style = STYLES[status];
  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${style.box}`}>
      <Icon name={STATUS_ICONS[status]} size={14} tone={style.tone} />
      <Text className={`font-extrabold text-xs ${style.text}`}>
        {(short ? STATUS_SHORT_LABELS : STATUS_LABELS)[status]}
      </Text>
    </View>
  );
}
