import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { useOnline } from "@/lib/use-online";

import { inputFrom, publishes, useProductDraft } from "../hooks/product-draft";
import { saveProblem, useSaveProduct } from "../hooks/use-save-product";
import { productsQuery } from "../queries/products";
import { parsePrice } from "../rules/price";
import type { Product } from "../schema/product";
import { WebPreviewCard } from "./web-preview-card";

type Props = { onBack: () => void; onSaved: (product: Product, published: boolean) => void };

// «Así se verá en la web»: la tarjeta con lo que tiene el borrador, «Publicar» (lo guarda con «Se ve en la web») y
// «Seguir editando»
export function ProductPreview({ onBack, onSaved }: Props) {
  const online = useOnline();
  const { draft } = useProductDraft();
  const { save, saving } = useSaveProduct();
  const { data: products } = useQuery(productsQuery);
  const [problem, setProblem] = useState<string | null>(null);

  async function publish() {
    const result = inputFrom(draft, true);
    if ("problem" in result) {
      setProblem(result.problem);
      return;
    }
    setProblem(null);
    try {
      onSaved(await save(result.input, draft.photo), publishes(draft, result.input));
    } catch (error) {
      setProblem(saveProblem(error, draft.id, draft.name.trim(), products));
    }
  }

  return (
    <View className="flex-1">
      <FormHeader title="Así se verá en la web" subtitle="Revisa la foto y el texto" onBack={onBack} />
      <ScrollView contentContainerClassName="px-5 pb-6 pt-1">
        <WebPreviewCard
          name={draft.name}
          description={draft.description}
          priceCents={parsePrice(draft.priceText)}
          photoUri={draft.photo?.uri ?? draft.photoUrl}
          isNew={!draft.linked}
        />
        {problem ? <Text className="mt-3 font-bold text-sm text-danger">{problem}</Text> : null}
      </ScrollView>
      <View className="gap-2 border-t border-border bg-surface px-5 pb-5 pt-3">
        <Button
          label={saving ? "Publicando…" : "Publicar"}
          disabled={!online || saving}
          onPress={() => void publish()}
        />
        <Button variant="text" label="Seguir editando" onPress={onBack} />
      </View>
    </View>
  );
}
