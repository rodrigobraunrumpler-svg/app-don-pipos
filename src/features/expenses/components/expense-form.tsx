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
import { formatLongDate } from "@/lib/dates";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents, parseSoles } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { useAttachPhoto, useCreateExpense } from "../hooks/use-expense-changes";
import { expenseCategoriesQuery } from "../queries/expenses";
import { expenseSaveLabel } from "../rules/expense";
import { CategoryChip } from "./category-chip";
import { ExpenseCategoriesSheet } from "./expense-categories-sheet";
import { ReceiptPicker, type Photo } from "./receipt-picker";

type Message = { text: string; onRetry?: () => void };

// El mismo código ya se guardó con otros datos (una respuesta perdida y después un cambio): no invita a repetir
const CONFLICT_TEXT = "Este gasto ya se había guardado antes de tu cambio. Revisa Gastos antes de anotarlo otra vez.";

// Anotar gasto (PANTALLAS.gasto): el monto grande, el tipo, en qué, cómo pagaste y la foto de la boleta. Al guardar, la
// foto sube después del gasto (si falla, el aviso deja reintentar y la hoja del gasto, agregarla después) y el
// formulario queda listo para el siguiente, con el tipo y el medio de antes
export function ExpenseForm({ onBack }: { onBack: () => void }) {
  const online = useOnline();
  const categories = useQuery({ ...expenseCategoriesQuery, select: (list) => list.filter((item) => item.isActive) });
  const business = useQuery(businessQuery).data;
  const create = useCreateExpense();
  const attach = useAttachPhoto();
  const { requestId, renew } = useRequestId();
  const [text, setText] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [sheet, setSheet] = useState(false);
  const hideMessage = useCallback(() => setMessage(null), []);
  const amount = parseSoles(text) ?? 0;
  const methods = PAYMENT_METHODS.filter((item) => business?.settings.activePaymentMethods.includes(item));
  const ready =
    online && Boolean(business) && amount >= 1 && Boolean(categoryId) && Boolean(method) && !create.isPending;
  const today = formatLongDate(new Date());

  function upload(expenseId: string, taken: Photo, done: string, failed: string) {
    if (!business) return;
    setMessage({ text: "Subiendo la foto de la boleta…" });
    attach.mutate(
      { businessId: business.id, expenseId, photo: taken },
      {
        onSuccess: () => setMessage({ text: done }),
        onError: () =>
          setMessage({
            text: failed,
            onRetry: () => upload(expenseId, taken, "Foto de la boleta guardada.", "La foto no se subió."),
          }),
      },
    );
  }

  async function save() {
    if (!ready || !categoryId || !method) return;
    setFailure(null);
    try {
      const expense = await create.mutateAsync({
        requestId,
        categoryId,
        amountCents: amount,
        method,
        description: description.trim(),
      });
      renew();
      confirmTap();
      const saved = `Gasto guardado: ${formatCents(expense.amountCents)}`;
      const taken = photo;
      setText("");
      setDescription("");
      setPhoto(null);
      if (taken) upload(expense.id, taken, saved, `${saved}. La foto no se subió.`);
      else setMessage({ text: saved });
    } catch (error) {
      const conflict = toAppError(error).kind === "conflict";
      if (conflict) renew();
      setFailure(conflict ? CONFLICT_TEXT : errorMessage(error));
    }
  }

  return (
    <View className="flex-1">
      <FormHeader
        title="Anotar gasto"
        subtitle={`Hoy, ${today.charAt(0).toLowerCase()}${today.slice(1)}`}
        onBack={onBack}
      />
      <ScrollView contentContainerClassName="px-5 pb-6" keyboardShouldPersistTaps="handled">
        {online ? null : <Notice>Sin conexión. Para guardar, espera la señal.</Notice>}
        <View className="mt-3">
          <MoneyInput large label="Monto del gasto en soles" value={text} onChangeText={setText} placeholder="0.00" />
        </View>
        <Section title="Tipo de gasto">
          {categories.data?.length === 0 ? (
            <View className="gap-2">
              <Text className="text-sm text-text-secondary">Agrega tus tipos de gasto para anotar.</Text>
              <Button variant="secondary" label="Agregar tipos de gasto" onPress={() => setSheet(true)} />
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {(categories.data ?? []).map((item) => (
                <CategoryChip
                  key={item.id}
                  name={item.name}
                  icon={item.icon}
                  selected={categoryId === item.id}
                  onPress={() => setCategoryId(item.id)}
                />
              ))}
            </View>
          )}
          <Text className="text-[13px] text-text-secondary">Los tipos de gasto se cambian en Más.</Text>
        </Section>
        <Section title="En qué">
          <Field
            label="En qué se gastó"
            value={description}
            onChangeText={setDescription}
            icon="notebook-edit-outline"
            maxLength={120}
            placeholder="Por ejemplo, chocolate de cobertura"
          />
        </Section>
        <Section title="Cómo pagaste">
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
        <Section title="Boleta">
          <ReceiptPicker photo={photo} onChange={setPhoto} />
        </Section>
        {failure ? <Text className="mt-4 font-bold text-sm text-danger">{failure}</Text> : null}
      </ScrollView>
      <View className="border-t border-border bg-background px-5 py-3">
        <Button
          label={create.isPending ? "Guardando…" : expenseSaveLabel(amount)}
          disabled={!ready}
          onPress={() => void save()}
        />
      </View>
      {sheet ? <ExpenseCategoriesSheet onClose={() => setSheet(false)} /> : null}
      {message ? (
        <Toast
          message={message.text}
          actionLabel={message.onRetry ? "Reintentar" : undefined}
          onAction={message.onRetry}
          onHide={hideMessage}
        />
      ) : null}
    </View>
  );
}
