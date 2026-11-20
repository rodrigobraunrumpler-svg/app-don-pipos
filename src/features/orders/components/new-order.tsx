import { useState } from "react";
import { View } from "react-native";

import { SkeletonRows } from "@/components/ui/skeleton";

import { useOrderDraft } from "../hooks/use-order-draft";
import type { Order } from "../schema/order";
import { DraftDetails } from "./draft-details";
import { DraftItems } from "./draft-items";
import { OrderSaved } from "./order-saved";

// Nuevo pedido: el paso 1 (qué lleva), el 2 (el cliente, la entrega y el pago) y el pedido guardado. El borrador vive
// en el celular hasta guardarlo
export function NewOrder({ onBack }: { onBack: () => void }) {
  const { draft, ready, recoveredAt, update, setQuantity, clear } = useOrderDraft();
  const [step, setStep] = useState<1 | 2>(1);
  const [saved, setSaved] = useState<Order | null>(null);
  if (!ready)
    return (
      <View className="px-5 pt-3">
        <SkeletonRows rows={5} />
      </View>
    );
  if (saved)
    return (
      <OrderSaved
        order={saved}
        onAnother={() => {
          setSaved(null);
          setStep(1);
        }}
      />
    );
  if (step === 1)
    return (
      <DraftItems
        quantities={draft.quantities}
        onQuantity={setQuantity}
        recoveredAt={recoveredAt}
        onStartOver={clear}
        onBack={onBack}
        onNext={() => setStep(2)}
      />
    );
  return (
    <DraftDetails
      draft={draft}
      onChange={update}
      onBack={() => setStep(1)}
      onSaved={(order) => {
        clear();
        setSaved(order);
      }}
    />
  );
}
