import type { OrderFilter } from "../schema/order";

export const ordersKeys = {
  all: ["orders"] as const,
  list: (filter: OrderFilter, search: string) => ["orders", "list", filter, search] as const,
  counts: ["orders", "counts"] as const,
  detail: (orderId: string) => ["orders", "detail", orderId] as const,
};
