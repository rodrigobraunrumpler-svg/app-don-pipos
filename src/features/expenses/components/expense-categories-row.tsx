import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MenuRow } from "@/components/ui/menu-row";

import { expenseCategoriesQuery } from "../queries/expenses";
import { ExpenseCategoriesSheet } from "./expense-categories-sheet";

// Más → Ajustes: «Tipos de gasto», con cuántos hay; se abre su hoja ahí mismo
export function ExpenseCategoriesRow() {
  const count = useQuery(expenseCategoriesQuery).data?.length;
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuRow
        icon="tag-outline"
        label="Tipos de gasto"
        value={count === undefined ? null : `${count} ${count === 1 ? "tipo" : "tipos"}`}
        onPress={() => setOpen(true)}
      />
      {open ? <ExpenseCategoriesSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
