import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";

import { FormHeader } from "@/components/ui/form-header";
import { Screen } from "@/components/ui/screen";
import { customerQuery, formatPhone } from "@/features/customers";

// La ficha del cliente (se completa en la tarea 7 del plan de la fase 7a)
export default function CustomerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useQuery(customerQuery(id)).data;
  return (
    <Screen>
      <FormHeader
        title={customer?.name ?? "Cliente"}
        subtitle={customer?.phone ? formatPhone(customer.phone) : undefined}
        onBack={() => router.back()}
      />
    </Screen>
  );
}
