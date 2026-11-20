import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { MoneyInput } from "@/components/ui/money-input";
import { Sheet } from "@/components/ui/sheet";
import { businessQuery, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/features/businesses";
import { formatWhen } from "@/lib/dates";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents, parseSoles } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { useAttachPhoto, useCorrectExpense, useVoidExpense } from "../hooks/use-expense-changes";
import { useTakePhoto } from "../hooks/use-take-photo";
import { expenseCategoriesQuery } from "../queries/expenses";
import type { Expense } from "../schema/expense";
import { CategoryChip } from "./category-chip";
import { ReceiptPhoto } from "./receipt-photo";

export type ExpenseDone = { text: string; undoId?: string };
type Props = { expense: Expense; onClose: () => void; onDone: (result: ExpenseDone) => void };

const CONFLICT_TEXT = "Este gasto cambió mientras lo corregías. Ciérralo y vuelve a abrirlo para ver cómo quedó.";
const VOID_REASON = "Anulado por el dueño";

// La hoja de un gasto (la maqueta): qué fue y la foto de la boleta (o «Agregar foto de la boleta»), y corregir el monto,
// el tipo, el medio o en qué, o anularlo. Nada se borra; el aviso trae «Deshacer»
export function ExpenseSheet({ expense, onClose, onDone }: Props) {
  const online = useOnline();
  const business = useQuery(businessQuery).data;
  const categories = useQuery({
    ...expenseCategoriesQuery,
    select: (list) => list.filter((item) => item.isActive || item.id === expense.categoryId),
  }).data;
  const correct = useCorrectExpense();
  const voidExpense = useVoidExpense();
  const attach = useAttachPhoto();
  const { take, denied } = useTakePhoto();
  const { requestId } = useRequestId();
  const [text, setText] = useState((expense.amountCents / 100).toFixed(2));
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [method, setMethod] = useState<PaymentMethod>(expense.method);
  const [description, setDescription] = useState(expense.description ?? "");
  const [failure, setFailure] = useState<string | null>(null);
  const amount = parseSoles(text) ?? 0;
  const methods = PAYMENT_METHODS.filter(
    (item) => item === expense.method || business?.settings.activePaymentMethods.includes(item),
  );
  const changed =
    amount !== expense.amountCents ||
    categoryId !== expense.categoryId ||
    method !== expense.method ||
    description.trim() !== (expense.description ?? "");
  const busy = correct.isPending || voidExpense.isPending || attach.isPending;
  const facts = [
    expense.categoryName,
    formatWhen(new Date(expense.spentAt), new Date()).toLowerCase(),
    PAYMENT_METHOD_LABELS[expense.method],
  ];

  async function run(action: () => Promise<ExpenseDone>) {
    setFailure(null);
    try {
      const result = await action();
      confirmTap();
      onDone(result);
    } catch (error) {
      setFailure(toAppError(error).kind === "conflict" ? CONFLICT_TEXT : errorMessage(error));
    }
  }

  async function addPhoto() {
    const photo = await take();
    if (!photo || !business) return;
    await run(async () => {
      await attach.mutateAsync({ businessId: business.id, expenseId: expense.id, photo });
      return { text: "Foto de la boleta guardada." };
    });
  }

  return (
    <Sheet visible title={expense.description ?? expense.categoryName} onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 pb-2">
        <Text className="text-sm text-text-secondary">
          {`${facts.join(", ")}${expense.receiptPath ? ", con foto de la boleta" : ""}.`}
        </Text>
        {expense.receiptPath ? (
          <ReceiptPhoto path={expense.receiptPath} />
        ) : (
          <Button
            variant="secondary"
            label={attach.isPending ? "Subiendo la foto…" : "Agregar foto de la boleta"}
            icon={<Icon name="camera-outline" size={18} />}
            disabled={!online || !business || busy}
            onPress={() => void addPhoto()}
          />
        )}
        {denied ? (
          <Text className="text-sm text-text-secondary">
            Para la foto, da permiso a la cámara en los ajustes del celular.
          </Text>
        ) : null}
        <Text className="font-bold text-sm text-text-secondary">Monto</Text>
        <MoneyInput label="Monto del gasto en soles" value={text} onChangeText={setText} />
        {expense.previousAmountCents !== null ? (
          <Text className="text-[13px] text-text-secondary">
            {`Ya se corrigió: antes era ${formatCents(expense.previousAmountCents)}.`}
          </Text>
        ) : null}
        <Text className="font-bold text-sm text-text-secondary">Tipo de gasto</Text>
        <View className="flex-row flex-wrap gap-2">
          {(categories ?? []).map((item) => (
            <CategoryChip
              key={item.id}
              name={item.name}
              icon={item.icon}
              selected={categoryId === item.id}
              onPress={() => setCategoryId(item.id)}
            />
          ))}
        </View>
        <Text className="font-bold text-sm text-text-secondary">Cómo pagaste</Text>
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
        <Field
          label="En qué se gastó"
          value={description}
          onChangeText={setDescription}
          maxLength={120}
          placeholder="En qué"
        />
        <View className="flex-row gap-2">
          <Icon name="lock-outline" size={16} tone="textSecondary" />
          <Text className="flex-1 text-[13px] text-text-secondary">
            Nada se borra: la corrección y la anulación quedan anotadas.
          </Text>
        </View>
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        <Button
          label={correct.isPending ? "Guardando…" : "Guardar corrección"}
          disabled={!online || !changed || amount < 1 || busy}
          onPress={() =>
            void run(async () => {
              const updated = await correct.mutateAsync({
                requestId,
                id: expense.id,
                categoryId,
                amountCents: amount,
                method,
                description: description.trim(),
              });
              return { text: `Gasto corregido: ${formatCents(updated.amountCents)}`, undoId: updated.id };
            })
          }
        />
        <Button
          variant="dangerText"
          label="Anular gasto"
          icon={<Icon name="close-circle-outline" size={18} tone={online ? "danger" : "textMuted"} />}
          disabled={!online || busy}
          onPress={() =>
            void run(async () => {
              await voidExpense.mutateAsync({ id: expense.id, reason: VOID_REASON });
              return { text: "Gasto anulado", undoId: expense.id };
            })
          }
        />
      </ScrollView>
    </Sheet>
  );
}
