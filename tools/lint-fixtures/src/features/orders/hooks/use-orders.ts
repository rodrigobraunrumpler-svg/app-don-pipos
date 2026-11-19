import { ordersQuery } from "../queries/orders";
import { totalLabel } from "../rules/totals";
export const useOrders = (): string[] => ordersQuery().queryFn().map(totalLabel);
