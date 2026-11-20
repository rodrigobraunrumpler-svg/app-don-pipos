import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";

import { businessQuery } from "../queries/business";
import { productionLabel } from "../rules/settings-labels";
import { ProductionSheet } from "./production-sheet";

// Más → Ajustes: Producción, cada cuántos días; se abre su hoja ahí mismo
export function ProductionRow() {
  const settings = useQuery(businessQuery).data?.settings;
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow
        icon="chef-hat"
        label="Producción"
        value={settings ? productionLabel(settings.productionIntervalDays) : null}
        onPress={() => setOpen(true)}
      />
      {open ? <ProductionSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
