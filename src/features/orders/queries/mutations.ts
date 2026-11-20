import { mutationOptions } from "@tanstack/react-query";

import {
  addPayment,
  advanceOrder,
  cancelOrder,
  changePaymentMethod,
  createCounterSale,
  createOrder,
  editOrder,
  revertCancel,
  revertEdit,
  revertStatus,
} from "../api/orders";

// La fila de cada cambio (un «Deshacer» espera al cambio que deshace, de su mismo pedido), qué refresca y la respuesta
// al instante los ponen los hooks, que saben de qué pedido se trata y ven los otros módulos
export const createOrderMutation = mutationOptions({ mutationFn: createOrder });
export const createCounterSaleMutation = mutationOptions({ mutationFn: createCounterSale });
export const advanceOrderMutation = mutationOptions({ mutationFn: advanceOrder });
export const revertStatusMutation = mutationOptions({ mutationFn: revertStatus });
export const addPaymentMutation = mutationOptions({ mutationFn: addPayment });
export const editOrderMutation = mutationOptions({ mutationFn: editOrder });
export const revertEditMutation = mutationOptions({ mutationFn: revertEdit });
export const cancelOrderMutation = mutationOptions({ mutationFn: cancelOrder });
export const revertCancelMutation = mutationOptions({ mutationFn: revertCancel });
export const changePaymentMethodMutation = mutationOptions({ mutationFn: changePaymentMethod });
