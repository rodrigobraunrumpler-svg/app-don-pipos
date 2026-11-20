import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";
import { businessQuery, remindersLabel } from "@/features/businesses";

import { RemindersSheet } from "./reminders-sheet";

// Más → Ajustes: «Recordatorios», con cuántos están encendidos; se abre su hoja ahí mismo
export function RemindersRow() {
  const reminders = useQuery(businessQuery).data?.settings.reminders;
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow
        icon="bell-outline"
        label="Recordatorios"
        value={reminders ? remindersLabel(reminders) : null}
        onPress={() => setOpen(true)}
      />
      {open ? <RemindersSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
