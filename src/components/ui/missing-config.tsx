import { Text, View } from "react-native";

// Si faltan variables de entorno, la app lo dice en vez de fallar en silencio (lib/env.ts)
export function MissingConfig({ problems }: { problems: string[] }) {
  return (
    <View className="flex-1 justify-center gap-3 bg-background px-6">
      <Text className="font-extrabold text-3xl text-text">Falta configurar la app</Text>
      {problems.map((problem) => (
        <Text key={problem} className="text-base text-text-secondary">
          {problem}
        </Text>
      ))}
    </View>
  );
}
