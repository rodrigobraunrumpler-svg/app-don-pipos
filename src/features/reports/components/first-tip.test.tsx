import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { FirstTip } from "./first-tip";

const KEY = "donpipos.firstTip";

test("después de la puesta en marcha se ve una vez, y «Entendido» lo cierra para siempre", async () => {
  await AsyncStorage.setItem(KEY, "pending");
  await renderWithProviders(<FirstTip />);
  expect(await screen.findByText("Anota tu primer pedido")).toBeOnTheScreen();
  expect(screen.getByText("Toca + abajo: eliges los alfajores, quién los pide y cómo paga.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Entendido" }));
  expect(screen.queryByText("Anota tu primer pedido")).toBeNull();
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

test("sin la marca no se ve (un dueño que ya tenía la app)", async () => {
  await AsyncStorage.removeItem(KEY);
  await renderWithProviders(<FirstTip />);
  await act(async () => undefined);
  expect(screen.queryByText("Anota tu primer pedido")).toBeNull();
});
