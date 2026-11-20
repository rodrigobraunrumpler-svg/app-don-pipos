import type { QueryKey } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { errorMessage } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";

import { useAnonymizeCustomer } from "../hooks/use-customer-changes";
import type { Customer } from "../schema/customer";

type Props = { customer: Customer; alsoRefresh: QueryKey[]; onClose: () => void };

// Borrar los datos de un cliente que lo pidió (Ley 29733): se confirma aquí porque no se puede deshacer
export function EraseCustomerSheet({ customer, alsoRefresh, onClose }: Props) {
  const online = useOnline();
  const erase = useAnonymizeCustomer(alsoRefresh);
  const [failure, setFailure] = useState<string | null>(null);

  async function confirm() {
    setFailure(null);
    try {
      await erase.mutateAsync(customer.id);
      onClose();
    } catch (error) {
      setFailure(errorMessage(error));
    }
  }

  return (
    <Sheet visible title="Borrar datos del cliente" onClose={onClose}>
      <Text className="font-extrabold text-base text-text">{`Borrar los datos de ${customer.name}`}</Text>
      <Text className="mt-1 text-sm text-text-secondary">
        Se borran su nombre, teléfono, dirección y notas. Sus pedidos quedan en las cuentas como «Cliente eliminado». No
        se puede deshacer.
      </Text>
      <View className="mt-4 gap-2 pb-2">
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        <Button
          variant="danger"
          label={erase.isPending ? "Borrando…" : "Borrar sus datos"}
          icon={<Icon name="trash-can-outline" size={18} tone="danger" />}
          disabled={!online || erase.isPending}
          onPress={() => void confirm()}
        />
        <Button variant="text" label="Cancelar" onPress={onClose} />
      </View>
    </Sheet>
  );
}
