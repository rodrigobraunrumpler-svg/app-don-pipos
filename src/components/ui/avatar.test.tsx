import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { Avatar, initials } from "./avatar";

test("las iniciales de un nombre, sin saber del negocio", () => {
  expect(initials("Lucía R.")).toBe("LR");
  expect(initials("  ana  ")).toBe("A");
  expect(initials("María del Carmen")).toBe("MD");
  expect(initials("")).toBe("?");
});

test("el avatar muestra las iniciales y el lector de pantalla lo salta (el nombre va al lado)", async () => {
  await renderWithProviders(<Avatar name="Lucía R." />);
  expect(screen.getByText("LR", { includeHiddenElements: true })).toBeOnTheScreen();
});
