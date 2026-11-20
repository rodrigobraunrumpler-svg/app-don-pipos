import { Image, View } from "react-native";

// El logo redondo. El tamaño va en el contenedor: en la web, una imagen local impone su tamaño original sobre las clases
const BOX = { tiny: "h-9 w-9", small: "h-16 w-16", large: "h-[92px] w-[92px]" } as const;

export function Logo({ size = "large" }: { size?: keyof typeof BOX }) {
  return (
    <View className={`self-center overflow-hidden rounded-full ${BOX[size]}`}>
      <Image
        source={require("../../../assets/icon.png")}
        style={{ width: "100%", height: "100%" }}
        accessibilityLabel="Logo de Don Pipos"
      />
    </View>
  );
}
