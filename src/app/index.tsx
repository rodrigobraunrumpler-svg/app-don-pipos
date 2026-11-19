import { Image, Text, View } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
      {/* El tamaño va en el contenedor: en la web, una imagen local impone su tamaño original sobre las clases */}
      <View className="h-24 w-24 overflow-hidden rounded-full">
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: "100%", height: "100%" }}
          accessibilityLabel="Logo de Don Pipos"
        />
      </View>
      <Text className="font-extrabold text-3xl text-text">Don Pipos</Text>
      <Text className="font-medium text-base text-text-secondary">Fase 0 lista</Text>
    </View>
  );
}
