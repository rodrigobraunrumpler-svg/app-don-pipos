// El negocio de ejemplo para las pruebas, con todos sus ajustes como los devuelve get_business
import type { Business } from "@/features/businesses";

export const TEST_BUSINESS: Business = {
  id: "00000000-0000-4000-8000-0000000000b1",
  name: "Don Pipos (DEMO)",
  modules: ["orders", "stock", "expenses"],
  setupDone: true,
  settings: {
    activePaymentMethods: ["cash", "yape", "plin", "transfer"],
    deliveryFeeCents: 500,
    deliveryZone: null,
    productionIntervalDays: 7,
    lapsedAfterDays: 30,
    reminders: { scheduled: true, stock: true, balances: true },
    productsBySales: false,
    reviewUrl: null,
    version: 1,
  },
};
