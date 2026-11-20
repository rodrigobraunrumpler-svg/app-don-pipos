import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";

import { businessQuery } from "../queries/business";
import { deliveryLabel } from "../rules/settings-labels";
import { DeliverySheet } from "./delivery-sheet";

// Más → Ajustes: Delivery, con lo que se cobra; se abre su hoja ahí mismo
export function DeliveryRow() {
  const settings = useQuery(businessQuery).data?.settings;
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow
        icon="moped"
        label="Delivery"
        value={settings ? deliveryLabel(settings.deliveryFeeCents) : null}
        onPress={() => setOpen(true)}
      />
      {open ? <DeliverySheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
