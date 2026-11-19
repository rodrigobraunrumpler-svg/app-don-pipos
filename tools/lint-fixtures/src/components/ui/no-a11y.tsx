import { Pressable, TouchableOpacity } from "react-native";
export function NoA11y({ onPress }: { onPress: () => void }) {
  return (
    <>
      <TouchableOpacity onPress={onPress} />
      <Pressable onPress={onPress} />
    </>
  );
}
