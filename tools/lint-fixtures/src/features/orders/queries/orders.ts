import { listOrders } from "../api/orders";
import type { Order } from "../schema/order";
export const ordersQuery = (): { queryFn: () => Order[] } => ({ queryFn: listOrders });
