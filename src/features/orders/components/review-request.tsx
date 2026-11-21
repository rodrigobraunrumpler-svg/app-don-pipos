import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { businessQuery } from "@/features/businesses";
import { MessageButton } from "@/features/messages";

// En un pedido entregado con teléfono: «Pedir reseña» abre WhatsApp con el mensaje y el enlace del negocio para opinar en
// Google. Sin el enlace guardado en Ajustes, no sale. El dueño lo manda cliente por cliente
export function ReviewRequest({ name, phone }: { name: string; phone: string }) {
  const reviewUrl = useQuery(businessQuery).data?.settings.reviewUrl;
  if (!reviewUrl) return null;
  return (
    <View className="mt-4">
      <MessageButton
        templateKey="ask_review"
        context={{ nombre: name.split(" ")[0] ?? "", enlace: reviewUrl }}
        phone={phone}
        label="Pedir reseña"
      />
    </View>
  );
}
