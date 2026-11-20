import { useQuery } from "@tanstack/react-query";
import { Linking, Pressable, Text } from "react-native";

import { Icon } from "@/components/ui/icon";
import { waLink } from "@/lib/whatsapp";

import { templatesQuery } from "../queries/templates";
import { fillTemplate } from "../rules/fill";
import type { Placeholder, TemplateKey } from "../rules/placeholders";

type Props = { templateKey: TemplateKey; context: Partial<Record<Placeholder, string>>; phone: string; label: string };

// Un botón chico (el chip de WhatsApp de la maqueta) que abre WhatsApp con el mensaje del negocio ya lleno, sin
// mostrar el texto antes, como «Recordar a Ana» en Por cobrar
export function MessageButton({ templateKey, context, phone, label }: Props) {
  const { data: templates } = useQuery(templatesQuery);
  const body = templates?.find((template) => template.key === templateKey)?.body;
  if (body === undefined) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => void Linking.openURL(waLink(phone, fillTemplate(body, context)))}
      className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3"
    >
      <Icon name="whatsapp" size={16} tone="accent" />
      <Text numberOfLines={1} className="shrink font-bold text-[13px] text-text">
        {label}
      </Text>
    </Pressable>
  );
}
