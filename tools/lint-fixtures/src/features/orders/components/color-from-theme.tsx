import { colors } from "../../../theme/tokens";
// Un color que sale del tema pasa limpio, y también una propiedad que no es de color
export function ColorFromTheme() {
  return <p style={{ color: colors.forest, textAlign: "center" }}>x</p>;
}
