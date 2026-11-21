import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";

import { businessQuery } from "../queries/business";
import { lapsedLabel } from "../rules/settings-labels";
import { LapsedSheet } from "./lapsed-sheet";

// Ajustes y Pedidos › Clientes: Clientes que no vuelven, a los cuántos días; se abre su hoja ahí mismo
export function LapsedRow() {
  const settings = useQuery(businessQuery).data?.settings;
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow
        icon="account-clock-outline"
        label="Clientes que no vuelven"
        value={settings ? lapsedLabel(settings.lapsedAfterDays) : null}
        onPress={() => setOpen(true)}
      />
      {open ? <LapsedSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
