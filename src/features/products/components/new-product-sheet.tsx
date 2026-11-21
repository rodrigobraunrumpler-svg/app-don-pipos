import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { errorMessage, toAppError } from "@/lib/errors";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { saveProductMutation } from "../queries/mutations";
import { parsePrice } from "../rules/price";

type Props = { onClose: () => void; onSaved: (message: string) => void };

// Agregar un producto: nombre y precio. La foto y la descripción se agregan después, en Productos y precios
export function NewProductSheet({ onClose, onSaved }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const save = useMutation(saveProductMutation);
  const [name, setName] = useState("");
  const [priceText, setPriceText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  async function submit() {
    const price = parsePrice(priceText);
    if (name.trim() === "") {
      setProblem("Escribe el nombre.");
      return;
    }
    if (price === null) {
      setProblem("Escribe un precio mayor que cero.");
      return;
    }
    setProblem(null);
    try {
      const saved = await save.mutateAsync({
        id: null,
        expectedVersion: null,
        name: name.trim(),
        priceCents: price,
        costCents: null,
        minStock: 0,
        showOnWeb: true,
      });
      onSaved(`${saved.name} agregado: ${formatCents(saved.priceCents)}.`);
    } catch (error) {
      setProblem(toAppError(error).kind === "conflict" ? "Ya tienes un producto con ese nombre." : errorMessage(error));
    }
  }

  return (
    <Sheet visible title="Agregar producto" onClose={onClose}>
      {online ? null : <Notice>Sin conexión. Para cambiar precios, espera la señal.</Notice>}
      <Text className="mb-2 mt-3.5 font-extrabold text-sm text-text-secondary">Nombre</Text>
      <View className="min-h-[50px] justify-center rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5">
        <TextInput
          accessibilityLabel="Nombre del producto"
          value={name}
          onChangeText={setName}
          maxLength={40}
          autoCapitalize="words"
          placeholder="Alfajor Tropi"
          placeholderTextColor={colors.textMuted}
          className="font-bold text-base text-text"
        />
      </View>
      <Text className="mb-2 mt-3.5 font-extrabold text-sm text-text-secondary">Precio</Text>
      <MoneyInput label="Precio en soles" value={priceText} onChangeText={setPriceText} />
      <Text className="mt-2 text-[13px] text-text-secondary">
        La foto y la descripción se agregan después, en Productos y precios.
      </Text>
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
