import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { errorMessage, toAppError } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";

import { CATEGORY_ICONS } from "../constants";
import { useSaveExpenseCategory, useSetCategoryActive } from "../hooks/use-expense-changes";
import type { ExpenseCategory } from "../schema/expense";
import { IconChoice } from "./icon-choice";

type Props = { category: ExpenseCategory | null; onDone: () => void };

// Un tipo de gasto nuevo o el que se toca: su nombre y su ícono, «Guardar» y, si ya existe, «Apagar» o «Encender»
export function CategoryForm({ category, onDone }: Props) {
  const online = useOnline();
  const save = useSaveExpenseCategory();
  const setActive = useSetCategoryActive();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<string | null>(category?.icon ?? null);
  const [failure, setFailure] = useState<string | null>(null);
  const busy = save.isPending || setActive.isPending;
  const conflictText = category
    ? "Ya hay un tipo de gasto con ese nombre, o cambió mientras lo editabas."
    : "Ya hay un tipo de gasto con ese nombre.";

  async function run(action: () => Promise<unknown>) {
    setFailure(null);
    try {
      await action();
      onDone();
    } catch (error) {
      setFailure(toAppError(error).kind === "conflict" ? conflictText : errorMessage(error));
    }
  }

  return (
    <View className="gap-3 pb-2">
      <Field label="Nombre del tipo de gasto" value={name} onChangeText={setName} maxLength={40} placeholder="Nombre" />
      <View className="flex-row flex-wrap gap-2">
        {CATEGORY_ICONS.map((item) => (
          <IconChoice
            key={item.name}
            icon={item.name}
            label={item.label}
            selected={icon === item.name}
            onPress={() => setIcon(item.name)}
          />
        ))}
      </View>
      {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
      <Button
        label={save.isPending ? "Guardando…" : "Guardar"}
        disabled={!online || !name.trim() || !icon || busy}
        onPress={() =>
          void run(() =>
            save.mutateAsync({
              id: category?.id ?? null,
              expectedVersion: category?.version ?? null,
              name: name.trim(),
              icon: icon ?? "",
            }),
          )
        }
      />
      {category ? (
        <Button
          variant="secondary"
          label={category.isActive ? "Apagar" : "Encender"}
          disabled={!online || busy}
          onPress={() =>
            void run(() =>
              setActive.mutateAsync({ id: category.id, expectedVersion: category.version, active: !category.isActive }),
            )
          }
        />
      ) : null}
      <Button variant="text" label="Volver a la lista" onPress={onDone} />
    </View>
  );
}
