import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { MoneyInput } from "@/components/ui/money-input";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { SkeletonRows } from "@/components/ui/skeleton";
import { businessDate, formatLongDate } from "@/lib/dates";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents, parseSoles } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { useCloseCashDay } from "../hooks/use-close-cash-day";
import { cashExpectedQuery, latestCashCountQuery } from "../queries/cash";
import { cashDifference, expectedCash } from "../rules/difference";
import type { CashCount } from "../schema/cash";
import { CashClosed } from "./cash-closed";
import { OtherMethods } from "./other-methods";

const TONES = { ok: "bg-olive-soft", short: "bg-danger-soft", over: "bg-warning-soft" } as const;
const CONFLICT_TEXT = "Ese cierre ya se había guardado con otros números. Vuelve a contar para guardar uno nuevo.";

// Cuadre de caja (PANTALLAS.caja): con cuánto abrió (el último cierre, por defecto), lo cobrado y lo gastado en efectivo
// y «Debería haber»; lo contado con su resultado en color; Yape, Plin y transferencias aparte; y «Cerrar el día» fijo
// abajo. Sin señal se cuenta igual, pero el cierre espera
export function CashCountView({ onBack }: { onBack: () => void }) {
  const online = useOnline();
  const today = businessDate(new Date());
  const expected = useQuery(cashExpectedQuery(today)).data;
  const latest = useQuery(latestCashCountQuery(today));
  const close = useCloseCashDay();
  const { requestId, renew } = useRequestId();
  const [openingText, setOpeningText] = useState<string | null>(null);
  const [countedText, setCountedText] = useState("");
  const [closed, setClosed] = useState<CashCount | null>(null);
  const [recount, setRecount] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const longDate = formatLongDate(new Date());
  const opening = openingText === null ? (expected?.lastOpeningCents ?? 0) : (parseSoles(openingText) ?? 0);
  const counted = parseSoles(countedText);
  const shouldHave = expected ? expectedCash(opening, expected.cashInCents, expected.cashOutCents) : 0;
  const result = counted === null ? null : cashDifference(counted, shouldHave);
  const lastCount = closed ?? latest.data ?? null;

  async function closeDay() {
    if (counted === null) return;
    setFailure(null);
    try {
      const saved = await close.mutateAsync({
        requestId,
        businessDate: today,
        openingCents: opening,
        countedCents: counted,
      });
      renew();
      confirmTap();
      setClosed(saved);
      setRecount(false);
      setCountedText("");
    } catch (error) {
      const conflict = toAppError(error).kind === "conflict";
      if (conflict) renew();
      setFailure(conflict ? CONFLICT_TEXT : errorMessage(error));
    }
  }

  const header = (
    <FormHeader
      title="Cuadre de caja"
      subtitle={`Hoy, ${longDate.charAt(0).toLowerCase()}${longDate.slice(1)}`}
      onBack={onBack}
    />
  );
  if (!expected || latest.isPending)
    return (
      <View className="flex-1">
        {header}
        <View className="px-5 pt-3">
          <SkeletonRows rows={4} />
        </View>
      </View>
    );
  if (lastCount && !recount)
    return (
      <View className="flex-1">
        {header}
        <CashClosed count={lastCount} onRecount={() => setRecount(true)} />
      </View>
    );

  return (
    <View className="flex-1">
      {header}
      <ScrollView contentContainerClassName="px-5 pb-6" keyboardShouldPersistTaps="handled">
        {online ? null : <Notice>Sin conexión. Puedes contar; el cierre se guarda cuando vuelva la señal.</Notice>}
        <View className="mt-3 gap-2.5 rounded-md border border-border bg-surface px-4 py-4">
          <Text accessibilityRole="header" className="font-extrabold text-base text-text">
            Efectivo
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="flex-1 text-sm text-text-secondary">Abriste con</Text>
            <View className="w-36">
              <MoneyInput
                label="Con cuánto abriste la caja, en soles"
                value={openingText ?? (opening / 100).toFixed(2)}
                onChangeText={setOpeningText}
              />
            </View>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-text-secondary">Cobrado en efectivo</Text>
            <Text className="font-bold text-sm text-text">{`+ ${formatCents(expected.cashInCents)}`}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-text-secondary">Gastos pagados en efectivo</Text>
            <Text className="font-bold text-sm text-text">{`− ${formatCents(expected.cashOutCents)}`}</Text>
          </View>
          <View className="flex-row justify-between border-t border-border pt-2.5">
            <Text className="font-extrabold text-base text-text">Debería haber</Text>
            <Text className="font-extrabold text-base text-text">{formatCents(shouldHave)}</Text>
          </View>
        </View>
        <Section title="¿Cuánto hay en la caja?">
          <MoneyInput
            label="Cuánto hay en la caja, en soles"
            value={countedText}
            onChangeText={setCountedText}
            placeholder="Cuenta billetes y monedas"
          />
        </Section>
        {result ? (
          <View accessibilityRole="alert" className={`mt-3 rounded-md px-4 py-3 ${TONES[result.tone]}`}>
            <Text className="font-extrabold text-base text-text">{result.title}</Text>
            <Text className="text-sm text-text">{result.hint}</Text>
          </View>
        ) : null}
        <OtherMethods others={expected.otherMethods} />
        {failure ? <Text className="mt-4 font-bold text-sm text-danger">{failure}</Text> : null}
      </ScrollView>
      <View className="border-t border-border bg-background px-5 py-3">
        <Button
          label={close.isPending ? "Guardando…" : "Cerrar el día"}
          disabled={!online || counted === null || close.isPending}
          onPress={() => void closeDay()}
        />
      </View>
    </View>
  );
}
