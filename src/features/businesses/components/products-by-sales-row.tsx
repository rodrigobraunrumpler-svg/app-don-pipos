import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { SwitchRow } from "@/components/ui/switch-row";
import { useOnline } from "@/lib/use-online";

import { useSaveSettings } from "../hooks/use-save-settings";
import { businessQuery } from "../queries/business";

// Ordenar › «Los más vendidos primero»: la app ordena los alfajores de la web por lo vendido en el mes (al prenderlo y
// el día 1 de cada mes). Quien la usa refresca su lista con onChanged
export function ProductsBySalesRow({ onChanged }: { onChanged: () => void }) {
  const online = useOnline();
  const settings = useQuery(businessQuery).data?.settings;
  const { save, saving, failure } = useSaveSettings();
  return (
    <View className="gap-1">
      <SwitchRow
        label="Los más vendidos primero"
        description="Se ordena sola cada mes, con lo que vendiste."
        value={settings?.productsBySales ?? false}
        disabled={!online || saving || !settings}
        onChange={(productsBySales) => void save({ productsBySales }).then((ok) => ok && onChanged())}
      />
      {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
    </View>
  );
}
