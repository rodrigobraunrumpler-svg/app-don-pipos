import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { useSaveSettings } from "../hooks/use-save-settings";
import { businessQuery } from "../queries/business";

// Ajustes → Reseñas de Google: el enlace que Google da en el Perfil de Empresa para que un cliente deje su opinión. Con
// él, cada pedido entregado ofrece «Pedir reseña» (fase 9). Vacío, se quita
export function ReviewUrlSheet({ onClose }: { onClose: () => void }) {
  const online = useOnline();
  const { colors } = useTheme();
  const settings = useQuery(businessQuery).data?.settings;
  const { save, saving, failure } = useSaveSettings();
  const [edited, setEdited] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const text = edited ?? settings?.reviewUrl ?? "";

  async function submit() {
    const url = text.trim();
    if (url !== "" && !/^https:\/\/\S+$/.test(url)) {
      setProblem("Pega el enlace completo, que empieza con https://");
      return;
    }
    setProblem(null);
    if (await save({ reviewUrl: url || null })) onClose();
  }

  return (
    <Sheet visible title="Reseñas de Google" onClose={onClose}>
      <Text className="text-sm text-text-secondary">
        En tu Perfil de Empresa de Google, «Pedir reseñas» te da un enlace. Pégalo aquí y cada pedido entregado tendrá
        «Pedir reseña».
      </Text>
      {online ? null : <Notice>Sin conexión. Los cambios esperan a que vuelva la señal.</Notice>}
      <View className="gap-3 pb-2 pt-4">
        <TextInput
          accessibilityLabel="Enlace para dejar una reseña"
          value={text}
          onChangeText={setEdited}
          placeholder="https://g.page/r/…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="min-h-[50px] rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 text-base text-text"
        />
        {problem ? <Text className="text-sm text-danger">{problem}</Text> : null}
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        <Button label={saving ? "Guardando…" : "Guardar"} disabled={!online || saving} onPress={() => void submit()} />
      </View>
    </Sheet>
  );
}
