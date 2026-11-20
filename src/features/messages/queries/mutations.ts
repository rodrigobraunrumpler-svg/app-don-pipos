import { mutationOptions } from "@tanstack/react-query";

import { resetTemplate, updateTemplate } from "../api/templates";

export const updateTemplateMutation = mutationOptions({ mutationFn: updateTemplate });
export const resetTemplateMutation = mutationOptions({ mutationFn: resetTemplate });
