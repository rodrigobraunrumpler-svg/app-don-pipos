import type { QueryKey } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { errorMessage, toAppError } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";

import { useUpdateCustomer } from "../hooks/use-customer-changes";
import type { Customer } from "../schema/customer";

type Props = { customer: Customer; alsoRefresh: QueryKey[]; onClose: () => void };

// Corregir el nombre, la dirección y la nota de un cliente, con la versión que se tenía
export function CustomerEditSheet({ customer, alsoRefresh, onClose }: Props) {
  const online = useOnline();
  const update = useUpdateCustomer(alsoRefresh);
  const [name, setName] = useState(customer.name);
  const [address, setAddress] = useState(customer.address ?? "");
  const [note, setNote] = useState(customer.note ?? "");
  const [failure, setFailure] = useState<string | null>(null);

  async function save() {
    setFailure(null);
    try {
      await update.mutateAsync({
        id: customer.id,
        expectedVersion: customer.version,
        name,
        address,
        note,
        acceptsPromotions: customer.acceptsPromotions,
      });
      onClose();
    } catch (error) {
      setFailure(
        toAppError(error).kind === "conflict"
          ? "Otro cambio llegó antes: se cargaron sus datos nuevos."
          : errorMessage(error),
      );
    }
  }

  return (
    <Sheet visible title="Corregir datos" onClose={onClose}>
      <View className="gap-2.5 pb-2">
        <Field label="Nombre" value={name} onChangeText={setName} maxLength={60} icon="account-outline" />
        <Field
          label="Dirección"
          value={address}
          onChangeText={setAddress}
          maxLength={200}
          icon="map-marker-outline"
          placeholder="Dirección de delivery"
        />
        <Field
          label="Nota"
          value={note}
          onChangeText={setNote}
          maxLength={300}
          icon="note-text-outline"
          placeholder="Una nota sobre el cliente"
        />
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        <Button
          label={update.isPending ? "Guardando…" : "Guardar"}
          disabled={!online || update.isPending || !name.trim()}
          onPress={() => void save()}
        />
      </View>
    </Sheet>
  );
}
