import { Text, View } from "react-native";

// El título de un paso y lo que pide, con los textos de la maqueta
export function SetupTitle({ title, text }: { title: string; text: string }) {
  return (
    <View className="gap-1 pb-3 pt-5">
      <Text accessibilityRole="header" className="font-extrabold text-[26px] text-text">
        {title}
      </Text>
      <Text className="text-base text-text-secondary">{text}</Text>
    </View>
  );
}
