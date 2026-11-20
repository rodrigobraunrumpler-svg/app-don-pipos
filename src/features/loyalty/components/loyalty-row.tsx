import { useQuery } from "@tanstack/react-query";

import { MenuRow } from "@/components/ui/menu-row";

import { loyaltySettingsQuery } from "../queries/loyalty";

// Más → Ajustes: «Fidelidad», con su meta o «Apagada»
export function LoyaltyRow({ onPress }: { onPress: () => void }) {
  const settings = useQuery(loyaltySettingsQuery).data;
  const value = settings === undefined ? null : settings.isActive ? `${settings.goal} sellos` : "Apagada";
  return <MenuRow icon="star-outline" label="Fidelidad" value={value} onPress={onPress} />;
}
