import { fireEvent, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { TEST_ORDER } from "@/test/orders";
import { renderWithProviders } from "@/test/render";

import { OrderSaved } from "./order-saved";

jest.mock("@/features/messages/api/templates", () => ({
  listTemplates: async () => [
    {
      key: "confirmation",
      body: "Hola {nombre}, recibimos tu pedido {numero}: {detalle}. Total: {total}. {adelanto} {entrega} ¡Gracias!",
      version: 1,
    },
  ],
}));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 500, version: 1 },
  }),
}));

test("guardado: el número, el detalle, lo que falta cobrar y la confirmación llena con el pedido", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const onAnother = jest.fn();
  await renderWithProviders(<OrderSaved order={TEST_ORDER} onAnother={onAnother} />);
  expect(screen.getByText("Pedido #0042 guardado")).toBeOnTheScreen();
  expect(screen.getByText("Ana (DEMO), delivery hoy")).toBeOnTheScreen();
  for (const text of ["2 Coquetas", "1 Pipo Crush", "Delivery", "Falta cobrar S/ 22.00", "Así le llega a Ana"])
    expect(screen.getByText(text)).toBeOnTheScreen();
  expect(
    await screen.findByText(
      "Hola Ana, recibimos tu pedido #0042: 2 Coquetas, 1 Pipo Crush. Total: S/ 42.00. Recibimos tu adelanto de S/ 20.00; faltan S/ 22.00. Te avisamos cuando salga. ¡Gracias!",
    ),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Avisar por WhatsApp" }));
  expect(open).toHaveBeenCalledWith(
    expect.stringMatching(/^https:\/\/wa\.me\/51900000990\?text=Hola%20Ana%2C%20recibimos/),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Anotar otro pedido" }));
  expect(onAnother).toHaveBeenCalled();
});
