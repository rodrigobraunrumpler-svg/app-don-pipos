import { router } from "expo-router";
import { ScrollView, Text } from "react-native";

import { MenuSection } from "@/components/ui/menu-section";
import { Screen } from "@/components/ui/screen";
import { AccountSection } from "@/features/auth";
import { ExpenseCategoriesRow, ExpensesRow } from "@/features/expenses";
import { IncomeRow } from "@/features/income";
import { ReceivablesRow } from "@/features/orders";
import { ProductsRow } from "@/features/products";

// Más (la maqueta): «Tu negocio» y «Ajustes», y la cuenta. Cada fila lleva a su pantalla
export default function More() {
  return (
    <Screen bottom={false}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-4">
        <Text className="font-extrabold text-3xl text-text">Más</Text>
        <MenuSection title="Tu negocio">
          <ExpensesRow onPress={() => router.navigate("/expenses")} />
          <IncomeRow onPress={() => router.navigate("/income")} />
          <ReceivablesRow onPress={() => router.navigate("/orders/receivables")} />
        </MenuSection>
        <MenuSection title="Ajustes">
          <ProductsRow onPress={() => router.navigate("/more/products")} />
          <ExpenseCategoriesRow />
        </MenuSection>
        <AccountSection onChangePin={() => router.navigate("/more/change-pin")} />
      </ScrollView>
    </Screen>
  );
}
