import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";

type Props = {
  visible: boolean;
  onClose: () => void;
  onOrder: () => void;
  onCounterSale: () => void;
  onProduction: () => void;
  onExpense: () => void;
};

// El botón + de las pestañas (hojaNuevo de la maqueta)
export function NewMenu({ visible, onClose, onOrder, onCounterSale, onProduction, onExpense }: Props) {
  const options: { icon: IconName; title: string; text: string; onPress: () => void }[] = [
    {
      icon: "clipboard-list-outline",
      title: "Un pedido",
      text: "Lo que lleva, la entrega y el pago",
      onPress: onOrder,
    },
    {
      icon: "storefront-outline",
      title: "Una venta de mostrador",
      text: "Sin cliente: eliges y cobras en un toque",
      onPress: onCounterSale,
    },
    { icon: "package-variant-closed", title: "La producción", text: "Lo que hiciste hoy", onPress: onProduction },
    {
      icon: "receipt-text-outline",
      title: "Un gasto",
      text: "El monto, el tipo y la foto de la boleta",
      onPress: onExpense,
    },
  ];
  return (
    <Sheet visible={visible} title="¿Qué quieres anotar?" onClose={onClose}>
      <View className="mb-2 overflow-hidden rounded-md border border-border bg-surface">
        {options.map((option) => (
          <Pressable
            key={option.title}
            accessibilityRole="button"
            accessibilityLabel={`${option.title}: ${option.text}`}
            onPress={option.onPress}
            className="min-h-16 flex-row items-center gap-3 border-b border-border px-4 py-3"
          >
            <Icon name={option.icon} size={24} tone="accent" />
            <View className="flex-1">
              <Text className="font-extrabold text-base text-text">{option.title}</Text>
              <Text className="text-[13px] text-text-secondary">{option.text}</Text>
            </View>
            <Icon name="chevron-right" size={22} tone="textMuted" />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
