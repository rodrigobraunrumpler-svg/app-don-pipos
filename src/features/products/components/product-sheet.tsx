import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { MoneyInput } from "@/components/ui/money-input";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { errorMessage } from "@/lib/errors";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { saveProductMutation } from "../queries/mutations";
import { margin, marginLabel } from "../rules/margin";
import { parsePrice } from "../rules/price";
import type { Product } from "../schema/product";

const toText = (cents: number | null): string => (cents === null ? "" : (cents / 100).toFixed(2));

type Props = { product: Product; onClose: () => void; onSaved: (message: string) => void };

// La hoja de un producto: precio, costo, stock mínimo y, si está enlazado, si se ve en la web
export function ProductSheet({ product, onClose, onSaved }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const save = useMutation(saveProductMutation);
  const [priceText, setPriceText] = useState(toText(product.priceCents));
  const [costText, setCostText] = useState(toText(product.costCents));
  const [minStock, setMinStock] = useState(product.minStock);
  const [showOnWeb, setShowOnWeb] = useState(product.showOnWeb);
  const [problem, setProblem] = useState<string | null>(null);

  const price = parsePrice(priceText);
  const costIsEmpty = costText.trim() === "";
  const cost = costIsEmpty ? null : parsePrice(costText);
  const preview = price !== null && cost !== null ? margin(price, cost) : null;

  async function submit() {
    if (price === null) {
      setProblem("Escribe un precio mayor que cero.");
      return;
    }
    if (!costIsEmpty && cost === null) {
      setProblem("Escribe un costo mayor que cero, o déjalo vacío.");
      return;
    }
    setProblem(null);
    try {
      const saved = await save.mutateAsync({
        id: product.id,
        expectedVersion: product.version,
        name: product.name,
        priceCents: price,
        costCents: cost,
        minStock,
        showOnWeb,
      });
      const web = saved.linkedToWeb ? " En la web se ve en unos segundos." : "";
      onSaved(`${saved.name} guardado: ${formatCents(saved.priceCents)}.${web}`);
    } catch (error) {
      setProblem(errorMessage(error));
    }
  }

  return (
    <Sheet visible title={product.name} onClose={onClose}>
      {online ? null : <Notice>Sin conexión. Para cambiar precios, espera la señal.</Notice>}
      <Text className="mb-2 mt-3.5 font-extrabold text-sm text-text-secondary">Precio</Text>
      <MoneyInput label="Precio en soles" value={priceText} onChangeText={setPriceText} />
      <Text className="mb-2 mt-3.5 font-extrabold text-sm text-text-secondary">Costo aproximado</Text>
      <MoneyInput
        label="Costo aproximado en soles"
        value={costText}
        onChangeText={setCostText}
        placeholder="Para ver tu ganancia"
      />
      {preview ? <Text className="mt-1.5 text-sm text-text-secondary">{marginLabel(preview)}</Text> : null}
      <View className="mt-3.5 flex-row items-center justify-between">
        <Text className="font-extrabold text-sm text-text-secondary">Stock mínimo</Text>
        <Stepper value={minStock} onChange={setMinStock} label="stock mínimo" max={9999} />
      </View>
      {product.linkedToWeb ? (
        <View className="mt-3.5 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="font-bold text-base text-text">Mostrar en la web</Text>
            <Text className="text-[13px] text-text-secondary">Si lo apagas, desaparece de la web.</Text>
          </View>
          <Switch
            accessibilityLabel="Mostrar en la web"
            value={showOnWeb}
            onValueChange={setShowOnWeb}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
          />
        </View>
      ) : null}
      <View className="mt-3.5 flex-row items-center gap-2">
        <Icon name="lock-outline" size={16} tone="textMuted" />
        <Text className="flex-1 text-[13px] text-text-secondary">Los pedidos ya anotados mantienen su precio.</Text>
      </View>
      {problem ? <Text className="mt-2 font-bold text-sm text-danger">{problem}</Text> : null}
      <View className="mt-4">
        <Button
          label={save.isPending ? "Guardando…" : "Guardar"}
          onPress={() => void submit()}
          disabled={!online || save.isPending}
        />
      </View>
    </Sheet>
  );
}
