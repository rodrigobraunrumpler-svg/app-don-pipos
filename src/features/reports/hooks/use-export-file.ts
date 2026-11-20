import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PAYMENT_METHOD_LABELS } from "@/features/businesses";
import { orderNumber, statusLabel } from "@/features/orders";
import { shareCsv } from "@/lib/share-file";

import { exportRowsQuery } from "../queries/reports";
import { toCsv, type CsvNames } from "../rules/csv";

const NAMES: CsvNames = { method: (method) => PAYMENT_METHOD_LABELS[method], status: statusLabel, orderNumber };

// Exportar a Excel: pide las filas del periodo, arma el archivo y abre «Compartir» con «don-pipos-<desde>-<hasta>.csv».
// Devuelve cuántas filas llevó: con 0 no había nada y no se comparte
export function useExportFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }): Promise<number> => {
      const rows = await queryClient.fetchQuery(exportRowsQuery(from, to));
      if (rows.length > 0) await shareCsv(`don-pipos-${from}-${to}.csv`, toCsv(rows, NAMES));
      return rows.length;
    },
  });
}
