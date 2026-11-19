import { mutationOptions } from "@tanstack/react-query";

import { saveProduct } from "../api/products";
import { productKeys } from "./keys";

// Cambiar un precio espera la respuesta («Guardando…»): se copia a la web (PROJECT_CONTEXT.md §14.2)
export const saveProductMutation = mutationOptions({
  mutationFn: saveProduct,
  meta: { invalidates: [productKeys.all] },
});
