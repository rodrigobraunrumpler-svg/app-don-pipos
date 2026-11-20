import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { messagesKeys } from "../queries/keys";
import { resetTemplateMutation, updateTemplateMutation } from "../queries/mutations";
import type { Template } from "../schema/template";

// El texto que devolvió la base reemplaza al de su plantilla en la lista, al instante
const keep = (queryClient: QueryClient) => (saved: Template) =>
  queryClient.setQueryData<Template[]>(messagesKeys.templates, (list) =>
    list?.map((template) => (template.key === saved.key ? saved : template)),
  );

// Guardar y volver al original esperan la respuesta y refrescan los mensajes, también si falla (pudo llegar otro antes)
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateTemplateMutation,
    meta: { invalidates: [messagesKeys.all] },
    onSuccess: keep(queryClient),
  });
}

export function useResetTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    ...resetTemplateMutation,
    meta: { invalidates: [messagesKeys.all] },
    onSuccess: keep(queryClient),
  });
}
