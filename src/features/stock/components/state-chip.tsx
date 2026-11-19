import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import type { ColorName } from "@/theme";

import { STOCK_STATE_LABELS } from "../constants";
import type { StockState } from "../schema/stock";

const LOOK: Record<StockState, { box: string; text: string; icon: IconName; tone: ColorName }> = {
  ok: { box: "bg-olive-soft", text: "text-olive", icon: "check-circle-outline", tone: "olive" },
  low: { box: "bg-warning-soft", text: "text-warning", icon: "alert-outline", tone: "warning" },
  owed: { box: "bg-warning-soft", text: "text-warning", icon: "alert-outline", tone: "warning" },
  out: { box: "bg-danger-soft", text: "text-danger", icon: "close-circle-outline", tone: "danger" },
  check: { box: "bg-danger-soft", text: "text-danger", icon: "alert-circle-outline", tone: "danger" },
};

// El estado de un alfajor, con su color: Alcanza, Poco, Faltan, Agotado o Revisar
export function StateChip({ state }: { state: StockState }) {
  const look = LOOK[state];
  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${look.box}`}>
      <Icon name={look.icon} size={13} tone={look.tone} />
      <Text className={`font-bold text-xs ${look.text}`}>{STOCK_STATE_LABELS[state]}</Text>
    </View>
  );
}
