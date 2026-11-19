import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test/render";

import { Sheet } from "./sheet";

test("muestra el título y su contenido, y se cierra con «Cerrar»", async () => {
  const onClose = jest.fn();
  await renderWithProviders(
    <Sheet visible title="Anotar merma" onClose={onClose}>
      <Text>Motivo</Text>
    </Sheet>,
  );
  expect(screen.getByRole("header", { name: "Anotar merma" })).toBeOnTheScreen();
  expect(screen.getByText("Motivo")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("cerrada, no muestra nada", async () => {
  await renderWithProviders(
    <Sheet visible={false} title="Anotar merma" onClose={jest.fn()}>
      <Text>Motivo</Text>
    </Sheet>,
  );
  expect(screen.queryByText("Motivo")).toBeNull();
});
