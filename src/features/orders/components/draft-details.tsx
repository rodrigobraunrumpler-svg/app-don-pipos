import { useQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormHeader } from "@/components/ui/form-header";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { businessQuery } from "@/features/businesses";
import { CustomerLookup, normalizePhone } from "@/features/customers";
import { productsQuery } from "@/features/products";
import { businessDate } from "@/lib/dates";
import { toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { useCreateOrder } from "../hooks/use-order-changes";
import { collectionText, draftProblem, toOrderDraft } from "../rules/draft";
import { draftTotal } from "../rules/totals";
import type { DraftState } from "../schema/draft";
import type { Order, PaymentMethod } from "../schema/order";
import { DraftDiscount } from "./draft-discount";
import { DraftPayment } from "./draft-payment";
import { DraftSchedule } from "./draft-schedule";
import { SummaryRow } from "./summary-row";

type Props = {
  draft: DraftState;
  onChange: (patch: Partial<DraftState>) => void;
  onBack: () => void;
  onSaved: (order: Order) => void;
};

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
const CONFLICT_TEXT =
  "Este pedido ya se había guardado antes de tu último cambio. Revisa Pedidos y, si no está, vuelve a guardar.";

// Nuevo pedido, paso 2 (pedido2 de la maqueta): el cliente por su teléfono, la entrega, el día y la hora, el descuento
// y el pago de ahora, con el resumen. Guardar espera la respuesta («Guardando…») y sin señal se apaga
export function DraftDetails({ draft, onChange, onBack, onSaved }: Props) {
  const online = useOnline();
  const products = useQuery({ ...productsQuery, select: (list) => list.filter((product) => product.isActive) });
  const settings = useQuery({ ...businessQuery, select: (business) => business.settings });
  const create = useCreateOrder();
  const [failure, setFailure] = useState<string | null>(null);
  const today = businessDate(new Date());

  const phone = normalizePhone(draft.phone);
  const lines = (products.data ?? [])
    .filter((product) => (draft.quantities[product.id] ?? 0) > 0)
    .map((product) => ({
      productId: product.id,
      quantity: draft.quantities[product.id] ?? 0,
      unitPriceCents: product.priceCents,
    }));
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const fee = draft.fulfillment === "delivery" ? (settings.data?.deliveryFeeCents ?? 0) : 0;
  const { subtotalCents, totalCents } = draftTotal({
    lines,
    deliveryFeeCents: fee,
    discountCents: draft.discountCents,
  });
  const methods = METHODS.filter((method) => settings.data?.activePaymentMethods.includes(method));
  const missing = draftProblem(draft, {
    phone,
    hasItems: lines.length > 0,
    totals: { subtotalCents, deliveryFeeCents: fee, totalCents },
    today,
    methods: settings.data ? methods : null,
  });

  async function save() {
    if (!phone || missing) return;
    setFailure(null);
    try {
      // El código viaja con el borrador: el reintento después de una respuesta perdida, aunque se haya cerrado la app,
      // devuelve el mismo pedido. Al guardar, el borrador se vacía y el siguiente trae otro código
      const order = await create.mutateAsync({
        requestId: draft.requestId,
        draft: toOrderDraft(draft, {
          phone,
          today,
          totalCents,
          lines: lines.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      });
      confirmTap();
      onSaved(order);
    } catch (error) {
      // El mismo código ya se guardó con otros datos: se explica y el siguiente intento es otro pedido
      const conflict = toAppError(error).kind === "conflict";
      if (conflict) onChange({ requestId: randomUUID() });
      setFailure(conflict ? CONFLICT_TEXT : "No se pudo guardar el pedido. Tus datos siguen aquí: vuelve a intentar.");
    }
  }

  return (
    <View className="flex-1">
      <FormHeader title="Entrega y pago" subtitle="Paso 2 de 2" onBack={onBack} />
      <ScrollView contentContainerClassName="px-5 pb-6" keyboardShouldPersistTaps="handled">
        {online ? null : (
          <Notice>Sin conexión. El pedido queda en borrador y lo guardas cuando vuelva la señal.</Notice>
        )}
        <Section title="Cliente">
          <CustomerLookup
            phone={draft.phone}
            onPhoneChange={(text) => onChange({ phone: text })}
            name={draft.name}
            onNameChange={(name) => onChange({ name })}
            onRepeat={(repeated) =>
              onChange({ quantities: Object.fromEntries(repeated.map((line) => [line.productId, line.quantity])) })
            }
          />
        </Section>
        <Section title="Entrega">
          <Segmented
            label="Entrega"
            options={[
              ["pickup", "Recoge"],
              ["delivery", "Delivery"],
            ]}
            value={draft.fulfillment}
            onChange={(fulfillment) => onChange({ fulfillment })}
          />
          {draft.fulfillment === "delivery" ? (
            <>
              <Field
                label="Dirección de entrega"
                icon="map-marker-outline"
                value={draft.address}
                onChangeText={(address) => onChange({ address })}
                maxLength={200}
                placeholder="Calle, número y referencia"
              />
              <Text className="text-[13px] text-text-secondary">
                {`Delivery: ${formatCents(settings.data?.deliveryFeeCents ?? 0)}. El monto lo cambia el dueño en Ajustes.`}
              </Text>
            </>
          ) : null}
        </Section>
        <DraftSchedule
          scheduledFor={draft.scheduledFor}
          otherDay={draft.otherDay}
          promisedTime={draft.promisedTime}
          onChange={onChange}
        />
        <DraftDiscount discountCents={draft.discountCents} discountReason={draft.discountReason} onChange={onChange} />
        <DraftPayment draft={draft} methods={methods} onChange={onChange} />
        <View accessibilityLabel="Resumen" className="mt-5 rounded-md border border-border bg-surface px-4 py-3">
          <SummaryRow label={`${units} ${units === 1 ? "alfajor" : "alfajores"}`} value={formatCents(subtotalCents)} />
          {fee ? <SummaryRow label="Delivery" value={formatCents(fee)} /> : null}
          {draft.discountCents > 0 ? (
            <SummaryRow
              label={`Descuento${draft.discountReason ? ` (${draft.discountReason.toLowerCase()})` : ""}`}
              value={`−${formatCents(draft.discountCents)}`}
            />
          ) : null}
          <SummaryRow label="Total" value={formatCents(totalCents)} strong />
          <Text className="mt-1 text-sm text-text-secondary">{collectionText(draft, totalCents)}</Text>
        </View>
      </ScrollView>
      <View className="gap-2 border-t border-border bg-background px-5 py-3">
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        {missing && !failure ? <Text className="text-sm text-text-secondary">{missing}</Text> : null}
        <Button
          label={create.isPending ? "Guardando…" : `Guardar pedido de ${formatCents(totalCents)}`}
          disabled={!online || Boolean(missing) || create.isPending || !products.data}
          onPress={() => void save()}
        />
      </View>
    </View>
  );
}
