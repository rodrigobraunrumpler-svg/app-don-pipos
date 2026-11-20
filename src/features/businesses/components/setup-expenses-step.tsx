import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { productsQuery } from "@/features/products";
import { errorMessage } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";

import { SETUP_EXPENSE_CATEGORIES } from "../constants";
import { useCompleteSetup } from "../hooks/use-complete-setup";
import { useSetupDraft } from "../hooks/use-setup-draft";
import { SetupHeader } from "./setup-header";
import { SetupTitle } from "./setup-title";

// Paso 3, «Tus tipos de gasto»: chips con los de la maqueta. «Terminar» guarda todo de una vez (complete_setup), con
// todos los alfajores (los que quedaron en 0 también) y los tipos marcados
export function SetupExpensesStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const online = useOnline();
  const products = useQuery(productsQuery).data?.filter((product) => product.isActive);
  const { countOf, chosen, toggle, requestId, stock } = useSetupDraft();
  const complete = useCompleteSetup();
  const [failure, setFailure] = useState<string | null>(null);
  // Dos toques seguidos llegan antes de que se vea «Guardando…»: el segundo no hace nada
  const busy = useRef(false);

  async function finish() {
    if (busy.current || !products || !stock.ready) return;
    busy.current = true;
    setFailure(null);
    try {
      await complete.mutateAsync({
        requestId,
        stock: products.map((product) => ({ productId: product.id, counted: countOf(product.id) })),
        categories: SETUP_EXPENSE_CATEGORIES.filter((category) => chosen[category.name]).map(({ name, icon }) => ({
          name,
          icon,
        })),
      });
      onDone();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      busy.current = false;
    }
  }

  return (
    <View className="flex-1">
      <SetupHeader step={3} onBack={onBack} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-4">
        <SetupTitle
          title="Tus tipos de gasto"
          text="Elige los que usas para anotar tus compras. Puedes agregar otros."
        />
        <View className="flex-row flex-wrap gap-2">
          {SETUP_EXPENSE_CATEGORIES.map((category) => (
            <Chip
              key={category.name}
              label={category.name}
              selected={chosen[category.name] ?? false}
              onPress={() => toggle(category.name)}
            />
          ))}
        </View>
        {online ? null : <Notice>Sin conexión. Para terminar necesitas internet.</Notice>}
        {failure ? <Text className="pt-3 font-bold text-sm text-danger">{failure}</Text> : null}
      </ScrollView>
      <View className="px-5 pb-3 pt-2">
        <Button
          label={complete.isPending ? "Guardando…" : "Terminar"}
          disabled={!online || complete.isPending || !products || !stock.ready}
          onPress={() => void finish()}
        />
      </View>
    </View>
  );
}
