import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { ProductAvatar } from "@/features/products";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { STOCK_CONFLICT_TEXT, WASTE_REASONS } from "../constants";
import { useRegisterWaste } from "../hooks/use-stock-changes";
import { stockOverviewQuery } from "../queries/stock";
import type { StockChangeDone, WasteReason } from "../schema/stock";

type Props = { productId: string | null; onClose: () => void; onDone: (done: StockChangeDone) => void };

// Anotar merma: el alfajor (desde Stock se elige; desde Un alfajor ya viene), cuántos y el motivo, que es obligatorio
export function WasteSheet({ productId, onClose, onDone }: Props) {
  const online = useOnline();
  const { data } = useQuery(stockOverviewQuery);
  const waste = useRegisterWaste();
  const { requestId, renew } = useRequestId();
  const [chosen, setChosen] = useState<string | null>(productId);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<WasteReason | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const item = data?.find((candidate) => candidate.productId === chosen);

  async function submit() {
    if (!item || !reason) return;
    setProblem(null);
    try {
      await waste.mutateAsync({ requestId, productId: item.productId, quantity, reason });
      renew();
      confirmTap();
      onDone({ requestId, message: `Merma anotada: ${quantity} ${item.name}.` });
    } catch (error) {
      // El mismo código ya se guardó con otros datos: se explica y el siguiente intento es otro registro
      if (toAppError(error).kind === "conflict") renew();
      setProblem(toAppError(error).kind === "conflict" ? STOCK_CONFLICT_TEXT : errorMessage(error));
    }
  }

  return (
    <Sheet visible title="Anotar merma" onClose={onClose}>
      {online ? null : <Notice>Sin conexión. Para registrar, espera la señal.</Notice>}
      {productId === null ? (
        <View>
          <Text className="mb-2 mt-3 font-extrabold text-sm text-text-secondary">Alfajor</Text>
          <View className="flex-row flex-wrap gap-2">
            {data?.map((candidate) => (
              <Chip
                key={candidate.productId}
                label={candidate.name}
                selected={candidate.productId === chosen}
                onPress={() => setChosen(candidate.productId)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {item ? (
        <View className="mt-3.5 flex-row items-center gap-3">
          <ProductAvatar product={item} size="small" />
          <Text className="flex-1 font-bold text-base text-text">{item.name}</Text>
          <Stepper value={quantity} onChange={setQuantity} label={item.name} min={1} />
        </View>
      ) : null}
      <Text className="mb-2 mt-3.5 font-extrabold text-sm text-text-secondary">Motivo</Text>
      <View className="flex-row flex-wrap gap-2">
        {WASTE_REASONS.map(([code, label]) => (
          <Chip key={code} label={label} selected={reason === code} onPress={() => setReason(code)} />
        ))}
      </View>
      {problem ? <Text className="mt-2 font-bold text-sm text-danger">{problem}</Text> : null}
      <View className="mt-4">
        <Button
          label={waste.isPending ? "Guardando…" : "Guardar merma"}
          onPress={() => void submit()}
          disabled={!item || !reason || !online || waste.isPending}
        />
      </View>
    </Sheet>
  );
}
