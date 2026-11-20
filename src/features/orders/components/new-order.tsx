import { useState } from "react";
import { View } from "react-native";

import { FormHeader } from "@/components/ui/form-header";
import { SkeletonRows } from "@/components/ui/skeleton";

import { useOrderDraft } from "../hooks/use-order-draft";
import { DraftItems } from "./draft-items";

// Nuevo pedido: el paso 1 (qué lleva) y el 2 (el cliente, la entrega y el pago), con el borrador en el celular
export function NewOrder({ onBack }: { onBack: () => void }) {
  const { draft, ready, recoveredAt, setQuantity, clear } = useOrderDraft();
  const [step, setStep] = useState<1 | 2>(1);
  if (!ready)
    return (
      <View className="px-5 pt-3">
        <SkeletonRows rows={5} />
      </View>
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
  // El paso 2 llega en la tarea 10
  return <FormHeader title="Nuevo pedido" subtitle="Paso 2 de 2: cliente, entrega y pago" onBack={() => setStep(1)} />;
}
