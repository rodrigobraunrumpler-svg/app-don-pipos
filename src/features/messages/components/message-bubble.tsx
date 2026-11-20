import { Text, View } from "react-native";

// La burbuja del mensaje, como se ve en WhatsApp
export function MessageBubble({ text }: { text: string }) {
  return (
    <View className="rounded-md bg-sunken px-3 py-3.5">
      <View className="ml-auto max-w-[92%] rounded-sm rounded-tr bg-olive-soft px-3 py-2.5">
        <Text className="text-sm leading-5 text-text">{text}</Text>
      </View>
    </View>
  );
}
