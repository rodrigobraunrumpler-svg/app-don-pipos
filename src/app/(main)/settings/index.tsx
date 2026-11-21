import { router } from "expo-router";
import { ScrollView } from "react-native";

import { FormHeader } from "@/components/ui/form-header";
import { MenuSection } from "@/components/ui/menu-section";
import { Screen } from "@/components/ui/screen";
import { AccountSection } from "@/features/auth";
import { BackupStatus, DeliveryRow, LapsedRow, PaymentMethodsRow, ProductionRow } from "@/features/businesses";
import { ExpenseCategoriesRow } from "@/features/expenses";
import { LoyaltyRow } from "@/features/loyalty";
import { MessagesRow } from "@/features/messages";
import { ProductsRow } from "@/features/products";
import { RemindersRow } from "@/features/reminders";

// Ajustes (el ⚙ de Inicio, fase 7c): arriba la copia de seguridad (fase 8), y lo del negocio, lo de los clientes y lo
// de este celular. Cada fila abre su hoja ahí
// mismo o su pantalla encima, y «Volver» regresa
export default function Settings() {
  return (
    <Screen>
      <FormHeader title="Ajustes" subtitle="Tu negocio y tu cuenta" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2">
        <BackupStatus />
        <MenuSection title="Tu negocio">
          <ProductsRow onPress={() => router.navigate("/settings/products")} />
          <PaymentMethodsRow />
          <DeliveryRow />
          <ProductionRow />
          <ExpenseCategoriesRow />
        </MenuSection>
        <MenuSection title="Tus clientes">
          <LoyaltyRow onPress={() => router.navigate("/settings/loyalty")} />
          <MessagesRow onPress={() => router.navigate("/settings/messages")} />
          <LapsedRow />
        </MenuSection>
        <AccountSection onChangePin={() => router.navigate("/settings/change-pin")} extra={<RemindersRow />} />
      </ScrollView>
    </Screen>
  );
}
