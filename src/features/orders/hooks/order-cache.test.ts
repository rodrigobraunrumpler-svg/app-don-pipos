import { loyaltyKeys } from "@/features/loyalty";

import { INVALIDATES } from "./order-cache";

test("cada cambio de un pedido también refresca la fidelidad: entregar, deshacer, anular o canjear mueve sellos", () => {
  expect(INVALIDATES).toContainEqual(loyaltyKeys.all);
});
