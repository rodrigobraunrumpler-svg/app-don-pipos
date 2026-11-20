import { useQuery } from "@tanstack/react-query";

import { MenuRow } from "@/components/ui/menu-row";

import { templatesQuery } from "../queries/templates";

// Más → Ajustes: «Mensajes de WhatsApp», con cuántos son
export function MessagesRow({ onPress }: { onPress: () => void }) {
  const count = useQuery(templatesQuery).data?.length;
  return (
    <MenuRow
      icon="message-text-outline"
      label="Mensajes de WhatsApp"
      value={count === undefined ? null : String(count)}
      onPress={onPress}
    />
  );
}
