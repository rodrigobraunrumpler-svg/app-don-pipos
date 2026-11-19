import { listOrders } from "../features/orders/api/orders";
export default function Screen() {
  return <p>{listOrders().length}</p>;
}
