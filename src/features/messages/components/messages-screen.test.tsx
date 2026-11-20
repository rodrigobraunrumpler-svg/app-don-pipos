import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import { MessagesScreen } from "./messages-screen";

const mockList = jest.fn();
const mockUpdate = jest.fn();
const mockReset = jest.fn();
jest.mock("../api/templates", () => ({
  listTemplates: () => mockList(),
  updateTemplate: (input: unknown) => mockUpdate(input),
  resetTemplate: (key: string) => mockReset(key),
}));

const ON_THE_WAY = "Hola {nombre}, tu pedido {numero} va en camino. {pago}";
const TEMPLATES = [
  {
    key: "confirmation",
    body: "Hola {nombre}, recibimos tu pedido {numero}: {detalle}. Total: {total}.",
    version: 1,
    isDefault: true,
  },
  { key: "on_the_way", body: ON_THE_WAY, version: 3, isDefault: false },
  { key: "delivered", body: "¡Gracias por tu compra, {nombre}! {sellos}", version: 1, isDefault: true },
];

beforeEach(() => {
  mockList.mockReset().mockResolvedValue(TEMPLATES);
  mockUpdate.mockReset().mockImplementation(async (input: { key: string; body: string }) => ({
    key: input.key,
    body: input.body,
    version: 4,
    isDefault: false,
  }));
  mockReset.mockReset().mockResolvedValue({
    ...TEMPLATES[1],
    body: "Hola {nombre}, tu pedido {numero} va en camino. {pago}",
    version: 4,
    isDefault: true,
  });
});

async function openOnTheWay() {
  await renderWithProviders(<MessagesScreen onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: /^En camino/ }));
  return screen.getByLabelText("Texto del mensaje En camino");
}

test("cada mensaje se abre con su texto; escribir cambia la vista previa con el pedido de ejemplo", async () => {
  const input = await openOnTheWay();
  expect(screen.getByText(/^Hola Ana, tu pedido #0042 va en camino\. Total a pagar/)).toBeOnTheScreen();
  await fireEvent.changeText(input, "Ya salió tu pedido {numero}, {nombre}.");
  expect(screen.getByText("Ya salió tu pedido #0042, Ana.")).toBeOnTheScreen();
});

test("un marcador se inserta donde está el cursor; solo los que vale ese mensaje", async () => {
  const input = await openOnTheWay();
  await fireEvent.changeText(input, "Hola , va en camino.");
  await fireEvent(input, "selectionChange", { nativeEvent: { selection: { start: 5, end: 5 } } });
  await fireEvent.press(screen.getByRole("button", { name: "Insertar {nombre}" }));
  expect(screen.getByLabelText("Texto del mensaje En camino").props.value).toBe("Hola {nombre}, va en camino.");
  expect(screen.queryByRole("button", { name: "Insertar {sellos}" })).toBeNull();
});

test("un marcador que no vale apaga «Guardar» y lo dice; si vale, guarda con su versión", async () => {
  const input = await openOnTheWay();
  await fireEvent.changeText(input, "Llevas {sellos}");
  expect(screen.getByText("«{sellos}» no se puede usar en este mensaje.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  await fireEvent.changeText(input, "Ya salió tu pedido {numero}. {pago}");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith({
      key: "on_the_way",
      expectedVersion: 3,
      body: "Ya salió tu pedido {numero}. {pago}",
    }),
  );
  expect(await screen.findByText("Mensaje guardado")).toBeOnTheScreen();
});

test("volver al texto original; si otro cambio llegó antes, lo escrito no se pierde", async () => {
  const input = await openOnTheWay();
  await fireEvent.press(screen.getByRole("button", { name: "Volver al texto original" }));
  await waitFor(() => expect(mockReset).toHaveBeenCalledWith("on_the_way"));
  mockUpdate.mockRejectedValue(new AppError("conflict"));
  await fireEvent.changeText(input, "Va en camino, {nombre}.");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Otro cambio llegó antes: se cargó el texto nuevo.")).toBeOnTheScreen();
  expect(screen.getByLabelText("Texto del mensaje En camino").props.value).toBe("Va en camino, {nombre}.");
});
