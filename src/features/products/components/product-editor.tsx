import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormHeader } from "@/components/ui/form-header";
import { MoneyInput } from "@/components/ui/money-input";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { Stepper } from "@/components/ui/stepper";
import { SwitchRow } from "@/components/ui/switch-row";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { draftMissing, inputFrom, useProductDraft } from "../hooks/product-draft";
import { saveProblem, useSaveProduct } from "../hooks/use-save-product";
import { margin, marginLabel } from "../rules/margin";
import { parsePrice } from "../rules/price";
import { DESCRIPTION_MAX, webName } from "../rules/web";
import type { Product } from "../schema/product";
import { AllergenChips } from "./allergen-chips";
import { PhotoField } from "./photo-field";

type Props = {
  title: string;
  onBack: () => void;
  onPreview: () => void;
  onSaved: (product: Product, published: boolean) => void;
};

// Nuevo alfajor y Editar (maqueta alfajores-web.html): la foto, el nombre, el precio, la descripción, los alérgenos, el
// costo, el mínimo y «Se ve en la web», que se prende solo si no le falta nada. «Vista previa» muestra la tarjeta de la web
export function ProductEditor({ title, onBack, onPreview, onSaved }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const { draft, change } = useProductDraft();
  const { save, saving } = useSaveProduct();
  const [problem, setProblem] = useState<string | null>(null);
  const missing = draftMissing(draft);
  // Prenderlo pide que no le falte nada; uno que ya se veía se puede dejar prendido mientras llega su foto
  const canShow = missing === null || draft.wasOnWeb;
  const price = parsePrice(draft.priceText);
  const cost = parsePrice(draft.costText);
  const earns = price !== null && cost !== null ? margin(price, cost) : null;

  async function submit() {
    const result = inputFrom(draft, draft.showOnWeb);
    if ("problem" in result) {
      setProblem(result.problem);
      return;
    }
    setProblem(null);
    try {
      const product = await save(result.input, draft.photo);
      onSaved(product, result.input.showOnWeb && !draft.wasOnWeb);
    } catch (error) {
      setProblem(saveProblem(error, draft.id === null, draft.name.trim()));
    }
  }

  return (
    <View className="flex-1">
      <FormHeader title={title} subtitle="Se publica en la web de Don Pipos" onBack={onBack} />
      <ScrollView contentContainerClassName="px-5 pb-6" keyboardShouldPersistTaps="handled">
        {online ? null : <Notice>Sin conexión. Para guardar, espera la señal.</Notice>}
        <PhotoField
          photo={draft.photo}
          photoUrl={draft.photoUrl}
          hasPhoto={draft.hasPhoto}
          onPick={(photo) => change({ photo })}
        />
        <View className="mt-4 gap-1">
          <Field
            label="Nombre"
            value={draft.name}
            onChangeText={(name) => change({ name })}
            placeholder="Por ejemplo: Coqueta"
            maxLength={40}
          />
          {draft.name.trim() ? (
            <Text className="text-[13px] text-text-muted">{`En la web: «${webName(draft.name.trim())}»`}</Text>
          ) : null}
        </View>
        <View className="mt-3">
          <MoneyInput label="Precio" value={draft.priceText} onChangeText={(priceText) => change({ priceText })} />
        </View>
        <Section title="Descripción">
          <TextInput
            accessibilityLabel="Descripción"
            value={draft.description}
            onChangeText={(description) => change({ description })}
            placeholder="Qué relleno lleva, de qué es el baño…"
            placeholderTextColor={colors.textMuted}
            maxLength={DESCRIPTION_MAX}
            multiline
            className="min-h-[88px] rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-3 text-base text-text"
          />
          <View className="flex-row justify-between">
            <Text className="text-[13px] text-text-muted">La lee el cliente en la web</Text>
            <Text className="text-[13px] text-text-muted">{`${draft.description.length}/${DESCRIPTION_MAX}`}</Text>
          </View>
        </Section>
        <Section title="Alérgenos (opcional)">
          <AllergenChips value={draft.allergens} onChange={(allergens) => change({ allergens })} />
        </Section>
        <View className="mt-5">
          <MoneyInput
            label="Costo (opcional)"
            value={draft.costText}
            onChangeText={(costText) => change({ costText })}
          />
          {earns ? <Text className="mt-1.5 text-[13px] text-text-secondary">{marginLabel(earns)}</Text> : null}
        </View>
        <View className="mt-4 flex-row items-center gap-3">
          <Text numberOfLines={1} className="flex-1 font-bold text-base text-text">
            Stock mínimo
          </Text>
          <Stepper
            value={draft.minStock}
            onChange={(minStock) => change({ minStock })}
            label="stock mínimo"
            max={9999}
          />
        </View>
        <View className="mt-4">
          <SwitchRow
            label="Se ve en la web"
            description={
              missing === null
                ? draft.linked
                  ? "Si lo apagas, desaparece de la web."
                  : "Con la etiqueta «Nuevo» por 30 días."
                : canShow
                  ? "Sale en la web cuando tenga foto y descripción."
                  : missing
            }
            value={draft.showOnWeb && canShow}
            disabled={!canShow}
            onChange={(showOnWeb) => change({ showOnWeb })}
          />
        </View>
        {problem ? <Text className="mt-3 font-bold text-sm text-danger">{problem}</Text> : null}
      </ScrollView>
      <View className="flex-row gap-3 border-t border-border bg-surface px-5 pb-5 pt-3">
        <View className="flex-1">
          <Button variant="secondary" label="Vista previa" disabled={missing !== null} onPress={onPreview} />
        </View>
        <View className="flex-1">
          <Button
            label={saving ? "Guardando…" : "Guardar"}
            disabled={!online || saving}
            onPress={() => void submit()}
          />
        </View>
      </View>
    </View>
  );
}
