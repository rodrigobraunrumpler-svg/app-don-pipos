import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { FormHeader } from "@/components/ui/form-header";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Segmented } from "@/components/ui/segmented";
import { SkeletonRows } from "@/components/ui/skeleton";

import { rankingQuery } from "../queries/reports";
import type { RankBy } from "../rules/ranking";
import { Channels } from "./channels";
import { ProductProfit } from "./product-profit";
import { RankingList } from "./ranking-list";

type Props = { from: string; to: string; label: string; onBack: () => void; onProducts: () => void };

// Alfajores (PANTALLAS.ranking): los más vendidos del periodo en unidades o en soles, por dónde llegan los pedidos y
// cuánto deja cada alfajor. Cuentan los pedidos entregados, por su día de entrega
export function RankingScreen({ from, to, label, onBack, onProducts }: Props) {
  const { data, isError, refetch } = useQuery(rankingQuery(from, to));
  const [by, setBy] = useState<RankBy>("units");
  return (
    <View className="flex-1">
      <FormHeader title="Alfajores" subtitle={`${label}, pedidos entregados`} onBack={onBack} />
      {!data && isError ? (
        <LoadError what="los alfajores" onRetry={() => void refetch()} />
      ) : !data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : data.products.length === 0 ? (
        <View className="items-center px-5 pt-10">
          <Icon name="cookie-outline" size={42} tone="textMuted" />
          <Text className="mt-4 text-center text-base text-text-secondary">
            Todavía no hay alfajores entregados en este periodo.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-8">
          <Segmented
            label="Ver por"
            options={[
              ["units", "Unidades"],
              ["soles", "Soles"],
            ]}
            value={by}
            onChange={setBy}
          />
          <RankingList products={data.products} by={by} />
          <Channels channels={data.channels} />
          <ProductProfit products={data.products} onProducts={onProducts} />
        </ScrollView>
      )}
    </View>
  );
}
