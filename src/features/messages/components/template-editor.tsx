import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { errorMessage, toAppError } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { SAMPLE_CONTEXT, TEMPLATE_TITLES } from "../constants";
import { useResetTemplate, useUpdateTemplate } from "../hooks/use-template-changes";
import { insertPlaceholder, templateProblem } from "../rules/edit";
import { fillTemplate } from "../rules/fill";
import type { Template } from "../schema/template";
import { MessageBubble } from "./message-bubble";
import { PlaceholderChips } from "./placeholder-chips";

type Props = { template: Template; onDone: (text: string) => void };

// Un mensaje abierto: su texto, los marcadores para insertar donde está el cursor, cómo le llega al cliente (con el
// pedido de ejemplo, mientras se escribe), «Guardar» y «Volver al texto original». Si otro cambio llegó antes, lo
// escrito queda en el campo
export function TemplateEditor({ template, onDone }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const update = useUpdateTemplate();
  const reset = useResetTemplate();
  const [text, setText] = useState(template.body);
  const [selection, setSelection] = useState({ start: template.body.length, end: template.body.length });
  const [failure, setFailure] = useState<string | null>(null);
  const problem = templateProblem(template.key, text);
  const busy = update.isPending || reset.isPending;
  const title = TEMPLATE_TITLES[template.key];

  function insert(name: string) {
    const next = insertPlaceholder(text, selection, name);
    setText(next.body);
    setSelection({ start: next.cursor, end: next.cursor });
  }

  async function run(action: () => Promise<Template>, done: string) {
    setFailure(null);
    try {
      const saved = await action();
      setText(saved.body);
      onDone(done);
    } catch (error) {
      setFailure(
        toAppError(error).kind === "conflict"
          ? "Otro cambio llegó antes: se cargó el texto nuevo."
          : errorMessage(error),
      );
    }
  }

  return (
    <View className="gap-3 px-4 pb-4">
      <TextInput
        accessibilityLabel={`Texto del mensaje ${title}`}
        value={text}
        onChangeText={setText}
        selection={selection}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        multiline
        maxLength={600}
        placeholderTextColor={colors.textMuted}
        className="min-h-[96px] rounded-sm border-[1.5px] border-border-strong bg-surface px-3 py-2.5 text-base text-text"
        textAlignVertical="top"
      />
      <PlaceholderChips templateKey={template.key} onInsert={insert} />
      <Text className="font-extrabold text-sm text-text">Así le llega (con el pedido #0042)</Text>
      <MessageBubble text={fillTemplate(text, SAMPLE_CONTEXT)} />
      {problem ? <Text className="font-bold text-sm text-warning">{problem}</Text> : null}
      {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
      <Button
        label={update.isPending ? "Guardando…" : "Guardar"}
        disabled={!online || busy || problem !== null || text.trim() === template.body}
        onPress={() =>
          void run(
            () => update.mutateAsync({ key: template.key, expectedVersion: template.version, body: text }),
            "Mensaje guardado",
          )
        }
      />
      {template.isDefault ? null : (
        <Button
          variant="text"
          label="Volver al texto original"
          disabled={!online || busy}
          onPress={() => void run(() => reset.mutateAsync(template.key), "Volvió al texto original")}
        />
      )}
    </View>
  );
}
