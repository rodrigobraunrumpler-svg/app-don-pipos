import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { SkeletonRows } from "./skeleton";

test("el lector de pantalla dice que está cargando", async () => {
  await renderWithProviders(<SkeletonRows rows={4} />);
  expect(screen.getByLabelText("Cargando")).toBeOnTheScreen();
});
