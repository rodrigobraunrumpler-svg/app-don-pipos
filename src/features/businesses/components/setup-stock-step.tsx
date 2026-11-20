import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { ProductAvatar, productsQuery } from "@/features/products";

import { useSetupDraft } from "../hooks/use-setup-draft";
import { SetupHeader } from "./setup-header";
import { SetupTitle } from "./setup-title";

// Paso 2, «Tu stock de hoy»: cuántos tiene ahora de cada alfajor. Desde aquí la app lleva la cuenta
export function SetupStockStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const products = useQuery(productsQuery).data?.filter((product) => product.isActive);
  const { counts, setCount } = useSetupDraft();

  return (
    <View className="flex-1">
      <SetupHeader step={2} onBack={onBack} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-4" keyboardShouldPersistTaps="handled">
        <SetupTitle
          title="Tu stock de hoy"
          text="¿Cuántos tienes de cada uno ahora mismo? Desde aquí la app lleva la cuenta."
        />
        {products ? (
          products.map((product) => (
            <View key={product.id} className="min-h-[64px] flex-row items-center gap-3 border-b border-border py-2">
              <ProductAvatar product={product} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-bold text-base text-text">
                  {product.name}
                </Text>
                <Text className="text-sm text-text-secondary">En stock</Text>
              </View>
              <Stepper
                value={counts[product.id] ?? 0}
                onChange={(value) => setCount(product.id, value)}
                label={product.name}
              />
            </View>
          ))
        ) : (
          <SkeletonRows rows={5} />
        )}
      </ScrollView>
      <View className="px-5 pb-3 pt-2">
        <Button label="Siguiente" onPress={onNext} />
      </View>
    </View>
  );
}
