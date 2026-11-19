import { Pressable } from "react-native";
export function NoA11y({ onPress }: { onPress: () => void }) {
  return <Pressable onPress={onPress} />;
}
