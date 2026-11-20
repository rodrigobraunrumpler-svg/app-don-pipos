import { queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { listTemplates } from "../api/templates";
import { messagesKeys } from "./keys";

// Los textos cambian poco (en Ajustes, fase 7): frescos por 30 minutos
export const templatesQuery = queryOptions({
  queryKey: messagesKeys.templates,
  queryFn: listTemplates,
  staleTime: STALE_TIME.catalog,
});
