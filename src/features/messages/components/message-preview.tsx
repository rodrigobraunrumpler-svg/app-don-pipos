import { useQuery } from "@tanstack/react-query";
import { Linking, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { waLink } from "@/lib/whatsapp";

import { templatesQuery } from "../queries/templates";
import { fillTemplate } from "../rules/fill";
import { MessageBubble } from "./message-bubble";
import type { Placeholder, TemplateKey } from "../rules/placeholders";

type Props = {
  templateKey: TemplateKey;
  context: Partial<Record<Placeholder, string>>;
  phone?: string | null;
  actionLabel?: string;
};

// Así le llega el mensaje al cliente: el texto del negocio lleno con los datos del pedido. Con teléfono, el botón abre
// WhatsApp con el texto listo (D17)
export function MessagePreview({ templateKey, context, phone, actionLabel = "Enviar por WhatsApp" }: Props) {
  const { data: templates } = useQuery(templatesQuery);
  const body = templates?.find((template) => template.key === templateKey)?.body;
  if (body === undefined) return null;
  const text = fillTemplate(body, context);
  return (
    <View className="gap-3">
      <MessageBubble text={text} />
      {phone ? (
        <Button
          variant="secondary"
          label={actionLabel}
          icon={<Icon name="whatsapp" />}
          onPress={() => void Linking.openURL(waLink(phone, text))}
        />
      ) : null}
    </View>
  );
}
