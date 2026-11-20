import type { QueryKey } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Linking, Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { errorMessage, toAppError } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";
import { waLink } from "@/lib/whatsapp";
import { useTheme } from "@/theme";

import { useUpdateCustomer } from "../hooks/use-customer-changes";
import type { Customer } from "../schema/customer";
import { CustomerEditSheet } from "./customer-edit-sheet";
import { CustomerStats } from "./customer-stats";
import { EraseCustomerSheet } from "./erase-customer-sheet";

type Props = { customer: Customer; stamps?: ReactNode; orders?: ReactNode; alsoRefresh?: QueryKey[] };

// La ficha del cliente (PANTALLAS.cliente): WhatsApp y Llamar, sus números, su tarjeta de sellos y sus pedidos (los ponen
// quien llama: son de loyalty y de orders), su favorito, su dirección, su nota, el permiso de promociones, corregir sus
// datos y borrarlos. Un cliente borrado se ve sin datos
export function CustomerCard({ customer, stamps, orders, alsoRefresh = [] }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const update = useUpdateCustomer(alsoRefresh);
  const [sheet, setSheet] = useState<"edit" | "erase" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const now = new Date();

  if (customer.anonymizedAt)
    return (
      <View className="gap-3">
        <View className="flex-row gap-2.5 rounded-md bg-sunken px-4 py-3">
          <Icon name="shield-check-outline" size={20} tone="textSecondary" />
          <Text className="flex-1 text-sm text-text">
            Datos borrados a pedido del cliente. Sus pedidos siguen en las cuentas como «Cliente eliminado».
          </Text>
        </View>
        <CustomerStats customer={customer} now={now} />
      </View>
    );

  async function setPromotions(acceptsPromotions: boolean) {
    setFailure(null);
    try {
      await update.mutateAsync({
        id: customer.id,
        expectedVersion: customer.version,
        name: customer.name,
        address: customer.address ?? "",
        note: customer.note ?? "",
        acceptsPromotions,
      });
    } catch (error) {
      setFailure(
        toAppError(error).kind === "conflict"
          ? "Otro cambio llegó antes: se cargaron sus datos nuevos."
          : errorMessage(error),
      );
    }
  }

  const phone = customer.phone ?? "";
  const details = [
    customer.favorite ? `Su favorito: ${customer.favorite.name}.` : "",
    customer.address ? `Dirección: ${customer.address}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <View className="gap-3">
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Button
            label="WhatsApp"
            icon={<Icon name="whatsapp" size={18} tone="onPrimary" />}
            onPress={() => void Linking.openURL(waLink(phone, "").replace(/\?text=$/, ""))}
          />
        </View>
        <View className="flex-1">
          <Button
            variant="secondary"
            label="Llamar"
            icon={<Icon name="phone-outline" size={18} />}
            onPress={() => void Linking.openURL(`tel:${phone}`)}
          />
        </View>
      </View>
      <CustomerStats customer={customer} now={now} />
      {stamps}
      {details ? (
        <View className="flex-row gap-2">
          <Icon name="heart-outline" size={17} tone="textSecondary" />
          <Text className="flex-1 text-sm text-text-secondary">{details}</Text>
        </View>
      ) : null}
      {customer.note ? (
        <View className="flex-row gap-2">
          <Icon name="pencil-outline" size={17} tone="textSecondary" />
          <Text className="flex-1 text-sm text-text-secondary">{customer.note}</Text>
        </View>
      ) : null}
      <View className="flex-row items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <View className="flex-1">
          <Text className="font-bold text-base text-text">Acepta recibir promociones</Text>
          <Text className="text-[13px] text-text-secondary">Si no, solo se le escribe por sus pedidos.</Text>
        </View>
        <Switch
          accessibilityLabel="Acepta recibir promociones"
          value={customer.acceptsPromotions}
          disabled={!online || update.isPending}
          onValueChange={(value) => void setPromotions(value)}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
        />
      </View>
      {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
      <Button variant="secondary" label="Corregir datos" disabled={!online} onPress={() => setSheet("edit")} />
      {orders}
      <Button
        variant="dangerText"
        label="Borrar datos de este cliente"
        disabled={!online}
        onPress={() => setSheet("erase")}
      />
      <View className="flex-row gap-2">
        <Icon name="information-outline" size={17} tone="textSecondary" />
        <Text className="flex-1 text-[13px] text-text-secondary">
          Si un cliente pide que borren sus datos, la ley de datos personales le da ese derecho.
        </Text>
      </View>
      {sheet === "edit" ? (
        <CustomerEditSheet customer={customer} alsoRefresh={alsoRefresh} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === "erase" ? (
        <EraseCustomerSheet customer={customer} alsoRefresh={alsoRefresh} onClose={() => setSheet(null)} />
      ) : null}
    </View>
  );
}
