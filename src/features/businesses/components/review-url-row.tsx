import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";

import { businessQuery } from "../queries/business";
import { ReviewUrlSheet } from "./review-url-sheet";

// Ajustes → Tus clientes: Reseñas de Google, con o sin enlace; se abre su hoja ahí mismo
export function ReviewUrlRow() {
  const settings = useQuery(businessQuery).data?.settings;
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow
        icon="star-outline"
        label="Reseñas de Google"
        value={settings ? (settings.reviewUrl ? "Con enlace" : "Sin enlace") : null}
        onPress={() => setOpen(true)}
      />
      {open ? <ReviewUrlSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
