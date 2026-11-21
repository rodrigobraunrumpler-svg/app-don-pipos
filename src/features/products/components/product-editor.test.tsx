import { act, fireEvent, screen } from "@testing-library/react-native";
import { useEffect, type ReactNode } from "react";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";
import { TEST_PRODUCTS } from "@/test/products";

import { draftFrom, emptyDraft, useProductDraft, type ProductDraft } from "../hooks/product-draft";
import { ProductDraftProvider } from "./product-draft-provider";
import { ProductEditor } from "./product-editor";

const NBSP = " ";
const mockSave = jest.fn();
jest.mock("../api/products", () => ({ saveProduct: (input: unknown) => mockSave(input) }));
jest.mock("@/lib/images", () => ({ shrinkPhoto: async () => "QUJD" }));

const COQUETA = { ...TEST_PRODUCTS[0]!, costCents: 510, linkedToWeb: true };

function Start({ draft, children }: { draft: ProductDraft; children: ReactNode }) {
  const { start } = useProductDraft();
  useEffect(() => start(draft), [draft, start]);
  return children;
}
async function render(draft: ProductDraft, onSaved = jest.fn()) {
  await renderWithProviders(
    <ProductDraftProvider businessId="b1">
      <Start draft={draft}>
        <ProductEditor title="Editar" onBack={jest.fn()} onPreview={jest.fn()} onSaved={onSaved} />
      </Start>
    </ProductDraftProvider>,
  );
  return onSaved;
}

beforeEach(() => mockSave.mockReset());

test("con precio y costo, dice cuánto gana por alfajor", async () => {
  await render(draftFrom(COQUETA));
  expect(await screen.findByText(`Ganas S/${NBSP}6.90 por alfajor (57,5${NBSP}%)`)).toBeOnTheScreen();
});

test("un precio de 0 no se guarda", async () => {
  await render({ ...draftFrom(COQUETA), priceText: "0" });
  await fireEvent.press(await screen.findByRole("button", { name: "Guardar" }));
  expect(screen.getByText("Escribe un precio mayor que cero.")).toBeOnTheScreen();
  expect(mockSave).not.toHaveBeenCalled();
});

test("uno nuevo con un nombre que ya existe lo dice", async () => {
  mockSave.mockRejectedValue(new AppError("conflict"));
  await render({ ...emptyDraft(), name: "Coqueta", priceText: "12" });
  await fireEvent.press(await screen.findByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Ya tienes un alfajor con ese nombre.")).toBeOnTheScreen();
});

test("si al guardar otro cambio llegó antes, lo dice", async () => {
  mockSave.mockRejectedValue(new AppError("conflict"));
  await render(draftFrom(COQUETA));
  await act(async () => fireEvent.press(await screen.findByRole("button", { name: "Guardar" })));
  expect(
    await screen.findByText("Coqueta ya tenía otro cambio guardado: vuelve a abrirlo y guarda otra vez."),
  ).toBeOnTheScreen();
});
