import { colors } from "../../theme/tokens";
export function Button({ label }: { label: string }) {
  return <button style={{ color: colors.forest }}>{label}</button>;
}
