import { Image, View } from "react-native";

// El logo redondo. El tamaño va en el contenedor: en la web, una imagen local impone su tamaño original sobre las clases
export function Logo({ size = "large" }: { size?: "small" | "large" }) {
  return (
    <View
      className={`self-center overflow-hidden rounded-full ${size === "small" ? "h-16 w-16" : "h-[92px] w-[92px]"}`}
    >
      <Image
        source={require("../../../assets/icon.png")}
        style={{ width: "100%", height: "100%" }}
        accessibilityLabel="Logo de Don Pipos"
      />
    </View>
  );
}
