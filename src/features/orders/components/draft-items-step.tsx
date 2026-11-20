import { View } from "react-native";

import { SkeletonRows } from "@/components/ui/skeleton";

import { useDraft } from "../hooks/draft-context";
import { DraftItems } from "./draft-items";

// Nuevo pedido, paso 1, como pantalla: el borrador sale del recorrido (OrderDraftProvider)
export function DraftItemsStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { draft, ready, recoveredAt, setQuantity, clear } = useDraft();
  if (!ready)
    return (
      <View className="px-5 pt-3">
        <SkeletonRows rows={5} />
      </View>
    );
  return (
    <DraftItems
      quantities={draft.quantities}
      onQuantity={setQuantity}
      recoveredAt={recoveredAt}
      onStartOver={clear}
      onBack={onBack}
      onNext={onNext}
    />
  );
}
