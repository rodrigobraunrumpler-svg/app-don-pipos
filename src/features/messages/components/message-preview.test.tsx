import { fireEvent, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { renderWithProviders } from "@/test/render";

import { MessagePreview } from "./message-preview";

jest.mock("../api/templates", () => ({
  listTemplates: async () => [
    {
      key: "confirmation",
      body: "Hola {nombre}, recibimos tu pedido {numero}: {detalle}. Total: {total}. {adelanto} {entrega} ¡Gracias!",
      version: 1,
    },
    { key: "on_the_way", body: "Hola {nombre}, tu pedido {numero} va en camino. {pago}", version: 1 },
  ],
}));

const CONTEXT = {
  nombre: "Ana",
  numero: "#0042",
  detalle: "2 Coquetas, 1 Pipo Crush",
  total: "S/ 42.00",
  entrega: "Te lo llevamos hoy.",
};
const TEXT = "Hola Ana, recibimos tu pedido #0042: 2 Coquetas, 1 Pipo Crush. Total: S/ 42.00. Te lo llevamos hoy. ¡Gracias!";

test("la burbuja se llena con los datos del pedido y el botón abre WhatsApp con ese texto", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await renderWithProviders(<MessagePreview templateKey="confirmation" context={CONTEXT} phone="+51900000990" />);
  expect(await screen.findByText(TEXT)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Enviar por WhatsApp" }));
  expect(open).toHaveBeenCalledWith(`https://wa.me/51900000990?text=${encodeURIComponent(TEXT)}`);
});

test("sin teléfono, solo la burbuja", async () => {
  await renderWithProviders(<MessagePreview templateKey="on_the_way" context={{ nombre: "Ana", numero: "#0042" }} phone={null} />);
  expect(await screen.findByText("Hola Ana, tu pedido #0042 va en camino.")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Enviar por WhatsApp" })).toBeNull();
});
