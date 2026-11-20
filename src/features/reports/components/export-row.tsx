import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";

import { ExportSheet } from "./export-sheet";

// Más → Ayuda: «Exportar a Excel», que abre su hoja
export function ExportRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow icon="download" label="Exportar a Excel" onPress={() => setOpen(true)} />
      {open ? <ExportSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
