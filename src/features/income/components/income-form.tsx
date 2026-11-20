import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { FormHeader } from "@/components/ui/form-header";
import { MoneyInput } from "@/components/ui/money-input";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { Toast } from "@/components/ui/toast";
import { businessQuery, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/features/businesses";
import { businessDate, previousDay } from "@/lib/dates";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents, parseSoles } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { useCreateManualIncome } from "../hooks/use-income-changes";
import { incomeSaveLabel } from "../rules/income";

// El mismo código ya se guardó con otros datos (una respuesta perdida y después un cambio): no invita a repetir
const CONFLICT_TEXT =
  "Este ingreso ya se había guardado antes de tu cambio. Revisa Ingresos antes de anotarlo otra vez.";

// Anotar ingreso (con la forma de Anotar gasto): el monto, en qué, cómo te pagaron y si fue hoy o ayer. Queda listo
// para el siguiente
export function IncomeForm({ onBack }: { onBack: () => void }) {
  const online = useOnline();
  const business = useQuery(businessQuery).data;
  const create = useCreateManualIncome();
  const { requestId, renew } = useRequestId();
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [yesterday, setYesterday] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hideMessage = useCallback(() => setMessage(null), []);
  const amount = parseSoles(text) ?? 0;
  const methods = PAYMENT_METHODS.filter((item) => business?.settings.activePaymentMethods.includes(item));
  const ready = online && amount >= 1 && Boolean(description.trim()) && Boolean(method) && !create.isPending;

  async function save() {
    if (!ready || !method) return;
    setFailure(null);
    try {
      const income = await create.mutateAsync({
        requestId,
        description: description.trim(),
        amountCents: amount,
        method,
        receivedOn: yesterday ? previousDay(businessDate(new Date())) : null,
      });
      renew();
      confirmTap();
      setText("");
      setDescription("");
      // El siguiente vuelve a ser de hoy: «Ayer» puesto sin que se note fechaba mal el siguiente y el cuadre
      setYesterday(false);
      setMessage(`Ingreso guardado: ${formatCents(income.amountCents)}`);
    } catch (error) {
      const conflict = toAppError(error).kind === "conflict";
      if (conflict) renew();
      setFailure(conflict ? CONFLICT_TEXT : errorMessage(error));
    }
  }

  return (
    <View className="flex-1">
      <FormHeader title="Anotar ingreso" subtitle="Lo que entra por fuera de los pedidos" onBack={onBack} />
      <ScrollView contentContainerClassName="px-5 pb-6" keyboardShouldPersistTaps="handled">
        {online ? null : <Notice>Sin conexión. Para guardar, espera la señal.</Notice>}
        <View className="mt-3">
          <MoneyInput large label="Monto del ingreso en soles" value={text} onChangeText={setText} placeholder="0.00" />
        </View>
        <Section title="En qué">
          <Field
            label="En qué entró"
            value={description}
            onChangeText={setDescription}
            icon="notebook-edit-outline"
            maxLength={120}
            placeholder="Por ejemplo, venta a un café"
          />
        </Section>
        <Section title="Cómo te pagaron">
          <View className="flex-row flex-wrap gap-2">
            {methods.map((item) => (
              <Chip
                key={item}
                label={PAYMENT_METHOD_LABELS[item]}
                selected={method === item}
                onPress={() => setMethod(item)}
              />
            ))}
          </View>
        </Section>
        <Section title="Cuándo">
          <View className="flex-row gap-2">
            <Chip label="Hoy" selected={!yesterday} onPress={() => setYesterday(false)} />
            <Chip label="Ayer" selected={yesterday} onPress={() => setYesterday(true)} />
          </View>
        </Section>
        {failure ? <Text className="mt-4 font-bold text-sm text-danger">{failure}</Text> : null}
      </ScrollView>
      <View className="border-t border-border bg-background px-5 py-3">
        <Button
          label={create.isPending ? "Guardando…" : incomeSaveLabel(amount)}
          disabled={!ready}
          onPress={() => void save()}
        />
      </View>
      {message ? <Toast message={message} onHide={hideMessage} /> : null}
    </View>
  );
}
