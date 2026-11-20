import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

import { CHANNELS } from "../constants";
import { ordersText } from "../rules/ranking";
import type { Ranking } from "../schema/report";

// «Por dónde llegan los pedidos»: WhatsApp, el local y la web, con una barra repartida
export function Channels({ channels }: { channels: Ranking["channels"] }) {
  const total = channels.whatsapp + channels.local + channels.web;
  return (
    <View className="mt-6">
      <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
        Por dónde llegan los pedidos
      </Text>
      <View className="mt-2 rounded-md border border-border bg-surface p-4">
        {total > 0 ? (
          <View className="mb-3 h-2.5 flex-row overflow-hidden rounded-full">
            {CHANNELS.map((channel) =>
              channels[channel.key] > 0 ? (
                <View key={channel.key} style={{ flex: channels[channel.key] }} className={channel.swatch} />
              ) : null,
            )}
          </View>
        ) : null}
        <View className="gap-2">
          {CHANNELS.map((channel) => (
            <View key={channel.key} className="flex-row items-center gap-2">
              <View className={`h-2.5 w-2.5 rounded-full ${channel.swatch}`} />
              <Icon name={channel.icon} size={18} tone="textSecondary" />
              <Text className="text-sm text-text">{channel.label}</Text>
              <Text className="ml-auto font-extrabold text-sm text-text">{ordersText(channels[channel.key])}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
