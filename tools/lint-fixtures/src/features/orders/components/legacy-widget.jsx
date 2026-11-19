import { listOrders } from "../api/orders";
export function LegacyWidget() {
  return <p>{listOrders().length}</p>;
}
