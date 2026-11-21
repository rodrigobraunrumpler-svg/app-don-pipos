import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/dates";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { customersQuery } from "../queries/customers";
import type { CustomerFilter, CustomerRow as Row } from "../schema/customer";
import { CustomerRow } from "./customer-row";

const FILTERS: [CustomerFilter, string][] = [
  ["all", "Todos"],
  ["top", "Los que más compran"],
  ["lapsed", "No vuelven"],
];

// header: la cabecera de la pestaña Pedidos (con «Pedidos | Clientes»); shortcuts: lo que la pantalla pone arriba de la
// lista (la fidelidad y «No vuelven», de otros módulos). customers no usa a nadie
type Props = {
  header: ReactNode;
  shortcuts?: ReactNode;
  onOpen: (customerId: string) => void;
  lapsedAction: (customer: Row) => ReactNode;
};

// Clientes (PANTALLAS.clientes), dentro de la pestaña Pedidos desde la fase 7c: buscar por nombre o teléfono, «Todos»,
// «Los que más compran» y «No vuelven», de 20 en 20. En «No vuelven», «Escribirle» lo pone quien llama (el mensaje es de
// messages)
export function CustomersScreen({ header, shortcuts, onOpen, lapsedAction }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const list = useInfiniteQuery(customersQuery(filter, search));
  const now = new Date();

  // Busca cuando el dueño deja de escribir
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const customers = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const everyone = filter === "all" && !search;
  const noneYet = everyone && list.data !== undefined && total === 0;
  const lapsed = filter === "lapsed";

  const footer = (
    <View className="gap-3 py-4">
      {list.hasNextPage ? (
        <View className="items-center gap-2">
          <Text className="text-[13px] text-text-secondary">{`Mostrando ${customers.length} de ${total}`}</Text>
          <Button
            variant="secondary"
            label={list.isFetchingNextPage ? "Cargando…" : `Cargar ${Math.min(20, total - customers.length)} más`}
            disabled={!online || list.isFetchingNextPage}
            onPress={() => void list.fetchNextPage()}
          />
        </View>
      ) : null}
      {lapsed ? (
        <View className="flex-row gap-2">
          <Icon name="information-outline" size={17} tone="textSecondary" />
          <Text className="flex-1 text-[13px] text-text-secondary">
            Solo puedes escribirles una promoción a quienes aceptaron recibirlas.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1">
      {header}
      {noneYet ? (
        <View className="items-center px-5 pt-10">
          <Icon name="account-group-outline" size={42} tone="textMuted" />
          <Text className="mt-4 text-center font-extrabold text-xl text-text">Todavía no hay clientes</Text>
          <Text className="mt-1.5 text-center text-base text-text-secondary">
            Se registran solos al anotar un pedido con su teléfono.
          </Text>
        </View>
      ) : (
        <>
          <View className="gap-3 pb-2">
            <View className="mx-5 min-h-[46px] flex-row items-center gap-2 rounded-full border-[1.5px] border-border-strong bg-surface px-4">
              <Icon name="magnify" size={20} tone="textMuted" />
              <TextInput
                accessibilityLabel="Buscar clientes"
                placeholder="Buscar por nombre o teléfono"
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={setText}
                returnKeyType="search"
                className="flex-1 text-base text-text"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
              {FILTERS.map(([key, label]) => (
                <Chip key={key} label={label} selected={filter === key} onPress={() => setFilter(key)} />
              ))}
            </ScrollView>
            {/* Mientras busca, los atajos se esconden: con el teclado abierto no quedaría espacio para los resultados */}
            {shortcuts && !text ? <View className="px-5">{shortcuts}</View> : null}
            {everyone && list.data ? (
              <Text className="px-5 text-[13px] text-text-secondary">{`${total} ${total === 1 ? "cliente" : "clientes"}`}</Text>
            ) : null}
            {online || !list.data ? null : (
              <View className="px-5">
                <Notice>{`Sin conexión. Ves los clientes de las ${formatTime(new Date(list.dataUpdatedAt))}.`}</Notice>
              </View>
            )}
          </View>
          {!list.data && list.isError ? (
            <LoadError what="los clientes" onRetry={() => void list.refetch()} />
          ) : !list.data ? (
            <View className="px-5 pt-2">
              <SkeletonRows rows={6} />
            </View>
          ) : customers.length === 0 ? (
            <Text className="px-5 pt-6 text-center text-base text-text-secondary">
              {search ? `Nadie con «${search}».` : "Nadie en esta lista."}
            </Text>
          ) : (
            <View className={`flex-1 ${list.isPlaceholderData ? "opacity-60" : ""}`}>
              <FlashList
                data={customers}
                keyExtractor={(customer) => customer.id}
                renderItem={({ item, index }) => (
                  <CustomerRow
                    customer={item}
                    now={now}
                    position={filter === "top" ? index + 1 : undefined}
                    lapsed={lapsed}
                    action={lapsed ? lapsedAction(item) : null}
                    onPress={() => onOpen(item.id)}
                  />
                )}
                ListFooterComponent={footer}
                onEndReached={() => {
                  if (online && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
                }}
                onEndReachedThreshold={0.5}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
