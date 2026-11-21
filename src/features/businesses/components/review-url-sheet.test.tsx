import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { TEST_BUSINESS } from "@/test/business";
import { renderWithProviders } from "@/test/render";

import { ReviewUrlSheet } from "./review-url-sheet";

const mockUpdate = jest.fn();
jest.mock("../api/business", () => ({
  getBusiness: async () => jest.requireActual("@/test/business").TEST_BUSINESS,
  updateSettings: (version: number, patch: unknown) => mockUpdate(version, patch),
}));

beforeEach(() =>
  mockUpdate
    .mockReset()
    .mockResolvedValue({ ...TEST_BUSINESS.settings, reviewUrl: "https://g.page/r/demo/review", version: 2 }),
);

test("el enlace de reseñas de Google se guarda solo si empieza con https://", async () => {
  const onClose = jest.fn();
  await renderWithProviders(<ReviewUrlSheet onClose={onClose} />);
  await fireEvent.changeText(await screen.findByLabelText("Enlace para dejar una reseña"), "g.page/r/demo/review");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(screen.getByText("Pega el enlace completo, que empieza con https://")).toBeOnTheScreen();
  expect(mockUpdate).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Enlace para dejar una reseña"), " https://g.page/r/demo/review ");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(1, { reviewUrl: "https://g.page/r/demo/review" }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});
