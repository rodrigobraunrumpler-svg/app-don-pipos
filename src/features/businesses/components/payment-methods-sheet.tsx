import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { SkeletonRows } from "@/components/ui/skeleton";
import { SwitchRow } from "@/components/ui/switch-row";
import { useOnline } from "@/lib/use-online";

import { useSaveSettings } from "../hooks/use-save-settings";
import { businessQuery } from "../queries/business";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "../schema/payment-method";

// Ajustes → Medios de pago (la hoja de la maqueta): un interruptor por medio. El último encendido no se apaga: sin medios
// no se podría anotar un pago
export function PaymentMethodsSheet({ onClose }: { onClose: () => void }) {
  const online = useOnline();
  const settings = useQuery(businessQuery).data?.settings;
  const { save, failure } = useSaveSettings();
  const active = settings?.activePaymentMethods ?? [];

  return (
    <Sheet visible title="Medios de pago" onClose={onClose}>
      <Text className="text-sm text-text-secondary">Los que apagues dejan de aparecer al anotar pedidos y gastos.</Text>
      {online ? null : <Notice>Sin conexión. Los cambios esperan a que vuelva la señal.</Notice>}
      {settings ? (
        <View className="mt-2">
          {PAYMENT_METHODS.map((method) => {
            const on = active.includes(method);
            return (
              <SwitchRow
                key={method}
                label={PAYMENT_METHOD_LABELS[method]}
                value={on}
                disabled={!online || (on && active.length === 1)}
                onChange={(value) =>
                  void save({
                    activePaymentMethods: PAYMENT_METHODS.filter((m) => (m === method ? value : active.includes(m))),
                  })
                }
              />
            );
          })}
        </View>
      ) : (
        <SkeletonRows rows={4} />
      )}
      {active.length === 1 ? (
        <Text className="pt-2 text-sm text-text-secondary">Deja al menos uno encendido.</Text>
      ) : null}
      {failure ? <Text className="pb-2 pt-2 font-bold text-sm text-danger">{failure}</Text> : null}
    </Sheet>
  );
}
