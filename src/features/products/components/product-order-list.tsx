import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/errors";

import { reorderProductsMutation } from "../queries/mutations";
import { productsQuery } from "../queries/products";
import type { Product } from "../schema/product";
import { ProductAvatar } from "./product-avatar";

// Ordenar: los ↑↓ cambian qué alfajor sale primero en la web; «Listo» lo guarda. Con «los más vendidos primero»
// prendido, las flechas se apagan: el orden lo pone la app
export function ProductOrderList({ locked, onDone }: { locked: boolean; onDone: () => void }) {
  const { data } = useQuery(productsQuery);
  const [order, setOrder] = useState<Product[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const reorder = useMutation(reorderProductsMutation);
  // Con «los más vendidos primero» manda la base: lo movido a mano antes no cuenta
  const items = (locked ? null : order) ?? data ?? [];

  function move(index: number, delta: number) {
    const next = [...items];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + delta, 0, item);
    setOrder(next);
  }

  async function done() {
    if (!order || locked) return onDone();
    try {
      await reorder.mutateAsync(order.map((product) => product.id));
      onDone();
    } catch (error) {
      setProblem(errorMessage(error));
    }
  }

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pb-6">
        <View className="mt-3 overflow-hidden rounded-md border border-border bg-surface">
          {items.map((product, index) => (
            <View
              key={product.id}
              className="min-h-[64px] flex-row items-center gap-3 border-b border-border px-4 py-2.5"
            >
              <ProductAvatar product={product} />
              <Text numberOfLines={1} className="flex-1 font-extrabold text-base text-text">
                {product.name}
              </Text>
              {[
                [-1, "chevron-up", `Subir ${product.name}`, index === 0],
                [1, "chevron-down", `Bajar ${product.name}`, index === items.length - 1],
              ].map(([delta, icon, label, end]) => (
                <Pressable
                  key={String(delta)}
                  accessibilityRole="button"
                  accessibilityLabel={String(label)}
                  accessibilityState={{ disabled: locked || Boolean(end) }}
                  disabled={locked || Boolean(end)}
                  onPress={() => move(index, Number(delta))}
                  className={`h-10 w-10 items-center justify-center rounded-full border border-border ${locked || end ? "opacity-30" : ""}`}
                >
                  <Icon name={icon as "chevron-up"} size={22} />
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        {problem ? <Text className="mt-3 font-bold text-sm text-danger">{problem}</Text> : null}
      </ScrollView>
      <View className="border-t border-border bg-surface px-5 pb-5 pt-3">
        <Button
          label={reorder.isPending ? "Guardando…" : "Listo"}
          disabled={reorder.isPending}
          onPress={() => void done()}
        />
      </View>
    </View>
  );
}
