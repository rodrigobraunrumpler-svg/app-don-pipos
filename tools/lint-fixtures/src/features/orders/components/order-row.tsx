import { Button } from "../../../components/ui/button";
import { useOrders } from "../hooks/use-orders";
import { ProductAvatar } from "../../products";
import { formatCents } from "../../../lib/money";
export function OrderRow() {
  const labels = useOrders();
  return (
    <div>
      <ProductAvatar name={labels[0] ?? formatCents(0)} />
      <Button label="ok" />
    </div>
  );
}
