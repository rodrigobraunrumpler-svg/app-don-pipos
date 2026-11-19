import { ActivityIndicator } from "react-native";
export function ColorNamedPropTernary({ tone }: { tone?: string }) {
  return <ActivityIndicator color={tone ?? "green"} />;
}
