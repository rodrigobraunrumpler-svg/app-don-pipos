import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { FormHeader } from "@/components/ui/form-header";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useOnline } from "@/lib/use-online";

import { TEMPLATE_TITLES } from "../constants";
import { templatesQuery } from "../queries/templates";
import type { TemplateKey } from "../rules/placeholders";
import { TemplateEditor } from "./template-editor";

const ORDER = Object.keys(TEMPLATE_TITLES) as TemplateKey[];

// Mensajes de WhatsApp (PANTALLAS.mensajes): cada mensaje como un acordeón, en el orden de un pedido. Se abre uno a la vez
export function MessagesScreen({ onBack }: { onBack: () => void }) {
  const online = useOnline();
  const templates = useQuery(templatesQuery);
  const [open, setOpen] = useState<TemplateKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const list = ORDER.flatMap((key) => templates.data?.find((template) => template.key === key) ?? []);
  return (
    <View className="flex-1">
      <FormHeader title="Mensajes de WhatsApp" subtitle="Lo que le llega al cliente en cada paso" onBack={onBack} />
      {!templates.data && templates.isError ? (
        <LoadError what="los mensajes" onRetry={() => void templates.refetch()} />
      ) : !templates.data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={6} />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 px-5 pb-8">
          {online ? null : <Notice>Sin conexión. Los cambios esperan a que vuelva la señal.</Notice>}
          {list.map((template) => {
            const expanded = open === template.key;
            const title = TEMPLATE_TITLES[template.key];
            return (
              <View key={template.key} className="overflow-hidden rounded-md border border-border bg-surface">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={title}
                  accessibilityState={{ expanded }}
                  onPress={() => setOpen(expanded ? null : template.key)}
                  className="min-h-14 flex-row items-center gap-3 px-4 py-3"
                >
                  <View className="flex-1">
                    <Text className="font-extrabold text-base text-text">{title}</Text>
                    {expanded ? null : (
                      <Text numberOfLines={1} className="text-[13px] text-text-secondary">
                        {template.body}
                      </Text>
                    )}
                  </View>
                  <Icon name={expanded ? "chevron-up" : "chevron-down"} size={22} tone="textSecondary" />
                </Pressable>
                {expanded ? <TemplateEditor template={template} onDone={setMessage} /> : null}
              </View>
            );
          })}
        </ScrollView>
      )}
      {message ? <Toast message={message} onHide={() => setMessage(null)} /> : null}
    </View>
  );
}
