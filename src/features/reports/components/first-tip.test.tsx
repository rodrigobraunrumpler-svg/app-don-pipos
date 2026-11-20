import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { renderWithProviders } from "@/test/render";

import { FirstTip } from "./first-tip";

const KEY = "donpipos.firstTip";

test("después de la puesta en marcha se ve una vez, y «Entendido» lo cierra para siempre", async () => {
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  await AsyncStorage.setItem(KEY, "pending");
  await renderWithProviders(<FirstTip />);
  expect(await screen.findByText("Anota tu primer pedido")).toBeOnTheScreen();
  expect(screen.getByText("Toca + abajo: eliges los alfajores, quién los pide y cómo paga.")).toBeOnTheScreen();
  // El lector de pantalla lo lee solo al aparecer
  expect(announce).toHaveBeenCalledWith(
    "Consejo: Anota tu primer pedido. Toca + abajo: eliges los alfajores, quién los pide y cómo paga.",
  );
  announce.mockRestore();
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
