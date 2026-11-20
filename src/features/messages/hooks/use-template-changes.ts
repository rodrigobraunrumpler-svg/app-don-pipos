import { useMutation } from "@tanstack/react-query";

import { messagesKeys } from "../queries/keys";
import { resetTemplateMutation, updateTemplateMutation } from "../queries/mutations";

// Guardar y volver al original esperan la respuesta y refrescan los mensajes, también si falla (pudo llegar otro antes)
export const useUpdateTemplate = () =>
  useMutation({ ...updateTemplateMutation, meta: { invalidates: [messagesKeys.all] } });

export const useResetTemplate = () =>
  useMutation({ ...resetTemplateMutation, meta: { invalidates: [messagesKeys.all] } });
