import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";

import { ExportSheet } from "./export-sheet";

// Reportes, debajo del periodo: «Exportar a Excel», que abre su hoja
export function ExportRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow icon="download" label="Exportar a Excel" onPress={() => setOpen(true)} />
      {open ? <ExportSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
