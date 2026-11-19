import { listOrders } from "../api/orders";
export function UsesApi() {
  return <p>{listOrders().length}</p>;
}
