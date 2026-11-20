import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { SkeletonRows } from "@/components/ui/skeleton";

import { expenseCategoriesQuery } from "../queries/expenses";
import { iconFor } from "../rules/category";
import type { ExpenseCategory } from "../schema/expense";
import { CategoryForm } from "./category-form";

// Más → Tipos de gasto (la hoja de la maqueta): cada tipo con su ícono; tocarlo lo edita o lo apaga, y se agregan otros.
// Un tipo apagado no sale al anotar un gasto; nada se borra
export function ExpenseCategoriesSheet({ onClose }: { onClose: () => void }) {
  const { data } = useQuery(expenseCategoriesQuery);
  const [editing, setEditing] = useState<ExpenseCategory | "new" | null>(null);

  if (editing)
    return (
      <Sheet visible title={editing === "new" ? "Nuevo tipo de gasto" : "Editar tipo de gasto"} onClose={onClose}>
        <CategoryForm category={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      </Sheet>
    );

  return (
    <Sheet visible title="Tipos de gasto" onClose={onClose}>
      <Text className="text-sm text-text-secondary">Los que eliges al anotar un gasto.</Text>
      {data ? (
        <ScrollView className="mt-2">
          {data.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={category.isActive ? category.name : `${category.name}, apagado`}
              onPress={() => setEditing(category)}
              className="min-h-[52px] flex-row items-center gap-3 border-b border-border py-2"
            >
              <Icon
                name={iconFor(category.icon) as IconName}
                size={20}
                tone={category.isActive ? "olive" : "textMuted"}
              />
              <Text
                numberOfLines={1}
                className={`flex-1 font-bold text-base ${category.isActive ? "text-text" : "text-text-muted"}`}
              >
                {category.name}
              </Text>
              {category.isActive ? null : <Text className="shrink-0 text-sm text-text-muted">Apagado</Text>}
              <Icon name="pencil-outline" size={18} tone="textMuted" />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <SkeletonRows rows={3} />
      )}
      <View className="pb-2 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Agregar tipo de gasto"
          onPress={() => setEditing("new")}
          className="min-h-11 flex-row items-center gap-2"
        >
          <Icon name="plus" size={20} tone="accent" />
          <Text className="font-extrabold text-sm text-accent">Agregar tipo de gasto</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
