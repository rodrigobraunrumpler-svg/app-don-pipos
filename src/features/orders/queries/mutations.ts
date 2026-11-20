import { mutationOptions } from "@tanstack/react-query";

import { addPayment, advanceOrder, createCounterSale, createOrder, revertStatus } from "../api/orders";

// Los pedidos van en fila (`scope`): un «Deshacer» espera al cambio que deshace. Qué refrescan (pedidos, stock y
// clientes) y la respuesta al instante los ponen los hooks, que ven los otros módulos y el cliente de consultas
export const createOrderMutation = mutationOptions({ mutationFn: createOrder, scope: { id: "orders" } });
export const createCounterSaleMutation = mutationOptions({ mutationFn: createCounterSale, scope: { id: "orders" } });
export const advanceOrderMutation = mutationOptions({ mutationFn: advanceOrder, scope: { id: "orders" } });
export const revertStatusMutation = mutationOptions({ mutationFn: revertStatus, scope: { id: "orders" } });
export const addPaymentMutation = mutationOptions({ mutationFn: addPayment, scope: { id: "orders" } });
