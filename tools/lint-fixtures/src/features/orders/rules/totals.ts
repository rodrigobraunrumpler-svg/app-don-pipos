import { ORDER_STATUSES } from "../constants";
import type { Order } from "../schema/order";
import { formatCents } from "../../../lib/money";
export const totalLabel = (order: Order): string => `${ORDER_STATUSES.length} ${formatCents(order.totalCents)}`;
