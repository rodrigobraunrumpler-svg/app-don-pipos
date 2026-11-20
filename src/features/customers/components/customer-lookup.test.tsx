import { fireEvent, screen } from "@testing-library/react-native";
import { useState } from "react";

import { renderWithProviders } from "@/test/render";

import { CustomerLookup } from "./customer-lookup";

const mockFind = jest.fn();
jest.mock("../api/customers", () => ({ findCustomerByPhone: (phone: string) => mockFind(phone) }));

beforeEach(() => mockFind.mockReset());

function Lookup({ onRepeat = jest.fn(), onName = jest.fn() }: { onRepeat?: jest.Mock; onName?: jest.Mock }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  return (
    <CustomerLookup
      phone={phone}
      onPhoneChange={setPhone}
      name={name}
      onNameChange={(value) => {
        setName(value);
        onName(value);
      }}
      onRepeat={onRepeat}
    />
  );
}

test("el cliente aparece al escribir el noveno dígito, con su último pedido, y «Repetir» devuelve sus líneas", async () => {
  const lines = [{ productId: "00000000-0000-4000-8000-000000000a01", quantity: 2 }];
  mockFind.mockResolvedValue({
    id: "00000000-0000-4000-8000-0000000000c1",
    name: "Ana (DEMO)",
    address: "Jr. Lima 123",
    ordersCount: 3,
    lastOrderAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    lastOrder: { lines },
  });
  const onRepeat = jest.fn();
  const onName = jest.fn();
  await renderWithProviders(<Lookup onRepeat={onRepeat} onName={onName} />);
  await fireEvent.changeText(screen.getByLabelText("Teléfono del cliente"), "90000099");
  expect(mockFind).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Teléfono del cliente"), "900 000 990");
  expect(await screen.findByText("Ana (DEMO)")).toBeOnTheScreen();
  expect(mockFind).toHaveBeenCalledWith("+51900000990");
  expect(screen.getByText("Su último pedido: hace 3 días")).toBeOnTheScreen();
  expect(onName).toHaveBeenLastCalledWith("Ana (DEMO)");
  expect(screen.queryByLabelText("Nombre del cliente")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Repetir" }));
  expect(onRepeat).toHaveBeenCalledWith(lines);
});

test("un teléfono nuevo pide el nombre", async () => {
  mockFind.mockResolvedValue(null);
  const onName = jest.fn();
  await renderWithProviders(<Lookup onName={onName} />);
  await fireEvent.changeText(screen.getByLabelText("Teléfono del cliente"), "900000991");
  await fireEvent.changeText(await screen.findByLabelText("Nombre del cliente"), "Luis");
  expect(onName).toHaveBeenLastCalledWith("Luis");
  expect(screen.queryByRole("button", { name: "Repetir" })).toBeNull();
});
