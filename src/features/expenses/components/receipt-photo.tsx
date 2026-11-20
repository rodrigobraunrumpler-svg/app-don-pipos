import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";

import { receiptUrlQuery } from "../queries/expenses";

// La foto de la boleta de un gasto, con un enlace firmado que vale 10 minutos
export function ReceiptPhoto({ path }: { path: string }) {
  const { data: url, isError, refetch } = useQuery(receiptUrlQuery(path));
  if (isError)
    return (
      <View className="mt-3 rounded-md bg-sunken px-3 py-2">
        <Text className="text-sm text-text-secondary">No se pudo abrir la foto de la boleta.</Text>
        <View className="self-start">
          <Button variant="text" label="Reintentar" onPress={() => void refetch()} />
        </View>
      </View>
    );
  return (
    <View className="mt-3 h-56 overflow-hidden rounded-md bg-sunken">
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          accessibilityLabel="Foto de la boleta"
        />
      ) : null}
    </View>
  );
}
