import { router } from "expo-router";
import { ScrollView, Text } from "react-native";

import { MenuSection } from "@/components/ui/menu-section";
import { Screen } from "@/components/ui/screen";
import { AccountSection } from "@/features/auth";
import { DeliveryRow, LapsedRow, PaymentMethodsRow, ProductionRow } from "@/features/businesses";
import { CashRow } from "@/features/cash";
import { CustomersRow } from "@/features/customers";
import { ExpenseCategoriesRow, ExpensesRow } from "@/features/expenses";
import { IncomeRow } from "@/features/income";
import { LoyaltyRow } from "@/features/loyalty";
import { MessagesRow } from "@/features/messages";
import { ReceivablesRow } from "@/features/orders";
import { RemindersRow } from "@/features/reminders";
import { ProductsRow } from "@/features/products";
import { ExportRow, ReportsRow } from "@/features/reports";

// Más (la maqueta): «Tu negocio», «Ajustes», la cuenta y «Ayuda». Cada fila lleva a su pantalla o abre su hoja
export default function More() {
  return (
    <Screen bottom={false}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-4">
        <Text className="font-extrabold text-3xl text-text">Más</Text>
        <MenuSection title="Tu negocio">
          <ExpensesRow onPress={() => router.navigate("/expenses")} />
          <ReportsRow onPress={() => router.navigate("/reports")} />
          <CustomersRow onPress={() => router.navigate("/customers")} />
          <IncomeRow onPress={() => router.navigate("/income")} />
          <ReceivablesRow onPress={() => router.navigate("/orders/receivables")} />
          <CashRow onPress={() => router.navigate("/cash")} />
        </MenuSection>
        <MenuSection title="Ajustes">
          <ProductsRow onPress={() => router.navigate("/more/products")} />
          <ExpenseCategoriesRow />
          <PaymentMethodsRow />
          <DeliveryRow />
          <ProductionRow />
          <RemindersRow />
          <LapsedRow />
          <MessagesRow onPress={() => router.navigate("/more/messages")} />
          <LoyaltyRow onPress={() => router.navigate("/more/loyalty")} />
        </MenuSection>
        <AccountSection onChangePin={() => router.navigate("/more/change-pin")} />
        <MenuSection title="Ayuda">
          <ExportRow />
        </MenuSection>
      </ScrollView>
    </Screen>
  );
}
