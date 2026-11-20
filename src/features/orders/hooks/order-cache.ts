import type { QueryClient } from "@tanstack/react-query";

import { customersKeys } from "@/features/customers";
import { stockKeys } from "@/features/stock";

import { ordersKeys } from "../queries/keys";
import type { Order } from "../schema/order";

// Cada cambio de un pedido refresca los pedidos, el stock (una venta resta, un pedido aparta) y el último pedido del
// cliente. El pedido que devuelve la base queda listo para abrirlo
export const INVALIDATES = [ordersKeys.all, stockKeys.all, customersKeys.all];

export const keepOrder = (queryClient: QueryClient) => (order: Order) =>
  queryClient.setQueryData(ordersKeys.detail(order.id), order);

// Los cambios de un mismo pedido van en fila; los de pedidos distintos, no se esperan entre sí
export const orderScope = (orderId: string) => ({ id: `order:${orderId}` });
