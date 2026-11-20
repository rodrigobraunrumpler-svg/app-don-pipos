import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatWhen } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { useVoidManualIncome } from "../hooks/use-income-changes";
import type { IncomeItem } from "../schema/income";

type Props = { item: IncomeItem; onClose: () => void; onDone: (text: string) => void };

// Anular un ingreso anotado a mano: se confirma aquí (no tiene «Deshacer»). Los pagos se corrigen en su pedido
export function VoidIncomeSheet({ item, onClose, onDone }: Props) {
  const online = useOnline();
  const voidIncome = useVoidManualIncome();
  const [failure, setFailure] = useState<string | null>(null);

  async function confirm() {
    setFailure(null);
    try {
      await voidIncome.mutateAsync({ id: item.id, reason: "Anulado por el dueño" });
      confirmTap();
      onDone("Ingreso anulado");
    } catch (error) {
      setFailure(errorMessage(error));
    }
  }

  return (
    <Sheet visible title="Anular ingreso" onClose={onClose}>
      <Text className="text-base text-text">
        {`${String(item.description)}, ${formatCents(item.amountCents)}, ${formatWhen(new Date(item.at), new Date()).toLowerCase()}.`}
      </Text>
      <Text className="mt-1 text-sm text-text-secondary">
        Deja de contar en los ingresos y en la caja. Nada se borra.
      </Text>
      <View className="mt-4 gap-2 pb-2">
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        <Button
          variant="danger"
          label={voidIncome.isPending ? "Anulando…" : "Anular ingreso"}
          disabled={!online || voidIncome.isPending}
          onPress={() => void confirm()}
        />
        <Button variant="text" label="No, dejarlo como está" onPress={onClose} />
      </View>
    </Sheet>
  );
}
