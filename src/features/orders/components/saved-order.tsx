import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { LoadError } from "@/components/ui/load-error";
import { SkeletonRows } from "@/components/ui/skeleton";

import { orderQuery } from "../queries/orders";
import { OrderSaved } from "./order-saved";

// El pedido recién guardado, como pantalla: crear lo deja en la caché, así abre al instante
export function SavedOrder({ orderId, onAnother }: { orderId: string; onAnother: () => void }) {
  const { data, isError, refetch } = useQuery(orderQuery(orderId));
  if (!data)
    return isError ? (
      <LoadError what="el pedido" onRetry={() => void refetch()} />
    ) : (
      <View className="px-5 pt-3">
        <SkeletonRows rows={5} />
      </View>
    );
  return <OrderSaved order={data} onAnother={onAnother} />;
}
