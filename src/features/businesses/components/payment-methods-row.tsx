import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";

import { businessQuery } from "../queries/business";
import { methodsLabel } from "../rules/settings-labels";
import { PaymentMethodsSheet } from "./payment-methods-sheet";

// Más → Ajustes: Medios de pago, con cuántos están encendidos; se abre su hoja ahí mismo
export function PaymentMethodsRow() {
  const settings = useQuery(businessQuery).data?.settings;
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow
        icon="wallet-outline"
        label="Medios de pago"
        value={settings ? methodsLabel(settings.activePaymentMethods) : null}
        onPress={() => setOpen(true)}
      />
      {open ? <PaymentMethodsSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
