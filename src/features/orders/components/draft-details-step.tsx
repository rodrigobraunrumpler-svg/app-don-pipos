import { View } from "react-native";

import { SkeletonRows } from "@/components/ui/skeleton";

import { useDraft } from "../hooks/draft-context";
import type { Order } from "../schema/order";
import { DraftDetails } from "./draft-details";

// Nuevo pedido, paso 2, como pantalla. Al guardar, el borrador se vacía antes de dejar el recorrido
export function DraftDetailsStep({ onBack, onSaved }: { onBack: () => void; onSaved: (order: Order) => void }) {
  const { draft, ready, update, clear } = useDraft();
  if (!ready)
    return (
      <View className="px-5 pt-3">
        <SkeletonRows rows={5} />
      </View>
    );
  return (
    <DraftDetails
      draft={draft}
      onChange={update}
      onBack={onBack}
      onSaved={(order) => {
        clear();
        onSaved(order);
      }}
    />
  );
}
