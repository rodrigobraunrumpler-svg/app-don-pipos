import { queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getBackupStatus } from "../api/backup";

// Su propia llave, fuera de la del negocio: guardar un ajuste no la cancela ni la vuelve a pedir. Cambia una vez al día
export const backupStatusQuery = queryOptions({
  queryKey: ["backup"],
  queryFn: getBackupStatus,
  staleTime: STALE_TIME.reports,
});
