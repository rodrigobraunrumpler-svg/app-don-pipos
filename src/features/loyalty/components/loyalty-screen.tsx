import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { errorMessage, toAppError } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { useUpdateLoyaltySettings } from "../hooks/use-update-loyalty";
import { loyaltySettingsQuery } from "../queries/loyalty";
import { draftFromSettings, draftProblem, draftToInput, type LoyaltyDraft } from "../rules/draft";
import { LoyaltyRuleForm } from "./loyalty-rule-form";
import { NearReward } from "./near-reward";
import { StampsCard } from "./stamps-card";

const QUESTION =
  "¿Quieres premiar a tus clientes frecuentes? Por ejemplo, por cada 10 compras, o por cada 10 alfajores, 1 gratis. ¿Qué premio darías y cada cuánto?";

// Fidelidad (PANTALLAS.fidelidad): encenderla, la regla (por compra o por alfajor, la meta y el premio), cómo se ve la
// tarjeta y quiénes están cerca del premio. Apagada, explica cómo funciona y deja la pregunta para decidir la regla (D15)
export function LoyaltyScreen({ onBack }: { onBack: () => void }) {
  const online = useOnline();
  const { colors } = useTheme();
  const settings = useQuery(loyaltySettingsQuery);
  const update = useUpdateLoyaltySettings();
  const [edited, setEdited] = useState<LoyaltyDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const draft = edited ?? (settings.data ? draftFromSettings(settings.data) : null);

  function change(patch: Partial<LoyaltyDraft>) {
    if (draft) setEdited({ ...draft, ...patch });
  }

  async function save() {
    if (!draft || !settings.data) return;
    setFailure(null);
    try {
      await update.mutateAsync({ ...draftToInput(draft), expectedVersion: settings.data.version });
      setEdited(null);
      setMessage("Fidelidad guardada");
    } catch (error) {
      setFailure(
        toAppError(error).kind === "conflict"
          ? "Otro cambio llegó antes: se cargó la fidelidad nueva."
          : errorMessage(error),
      );
    }
  }

  const problem = draft?.isActive ? draftProblem(draft) : null;
  const rule = draft ? draftToInput(draft) : null;
  return (
    <View className="flex-1">
      <FormHeader title="Fidelidad" subtitle="Tarjeta de sellos" onBack={onBack} />
      {!settings.data && settings.isError ? (
        <LoadError what="la fidelidad" onRetry={() => void settings.refetch()} />
      ) : !draft || !rule ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={4} />
        </View>
      ) : (
        <>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-5 pb-6">
            {online ? null : <Notice>Sin conexión. Los cambios esperan a que vuelva la señal.</Notice>}
            <View className="flex-row items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
              <View className="flex-1">
                <Text className="font-extrabold text-base text-text">Fidelidad activa</Text>
                <Text className="text-[13px] text-text-secondary">Tú defines la meta y el premio.</Text>
              </View>
              <Switch
                accessibilityLabel="Fidelidad activa"
                value={draft.isActive}
                onValueChange={(isActive) => change({ isActive })}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
              />
            </View>
            {draft.isActive ? (
              <>
                <LoyaltyRuleForm draft={draft} problem={problem} onChange={change} />
                <View className="gap-2">
                  <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
                    Así la ve el cliente
                  </Text>
                  <StampsCard rule={rule} stamps={Math.min(6, draft.goal - 1)} />
                  <Text className="text-[13px] text-text-secondary">
                    Al completarla, el premio se aplica como descuento con el motivo «Fidelidad».
                  </Text>
                </View>
                {settings.data?.isActive ? <NearReward rule={rule} /> : null}
              </>
            ) : (
              <View className="items-center gap-2 pt-4">
                <Icon name="star-outline" size={42} tone="textMuted" />
                <Text className="text-center font-extrabold text-xl text-text">La fidelidad está apagada</Text>
                <Text className="text-center text-base text-text-secondary">
                  Enciéndela cuando decidas la meta y el premio. Mientras tanto, no aparece en los pedidos ni en las
                  fichas.
                </Text>
                <Text className="mt-2 text-center text-sm text-text">{QUESTION}</Text>
              </View>
            )}
          </ScrollView>
          <View className="gap-2 border-t border-border bg-background px-5 py-3">
            {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
            <Button
              label={update.isPending ? "Guardando…" : "Guardar"}
              disabled={!online || update.isPending || problem !== null}
              onPress={() => void save()}
            />
          </View>
        </>
      )}
      {message ? <Toast message={message} onHide={() => setMessage(null)} /> : null}
    </View>
  );
}
