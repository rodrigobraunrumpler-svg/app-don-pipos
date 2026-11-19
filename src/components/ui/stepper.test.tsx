import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { Stepper } from "./stepper";

test("suma y resta de a uno", async () => {
  const onChange = jest.fn();
  await renderWithProviders(<Stepper value={5} onChange={onChange} label="Coqueta" />);
  expect(screen.getByLabelText("Cantidad de Coqueta")).toHaveDisplayValue("5");
  await fireEvent.press(screen.getByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Menos Coqueta" }));
  expect(onChange.mock.calls).toEqual([[6], [4]]);
});

test("en el mínimo no resta, y en el máximo no suma", async () => {
  const onChange = jest.fn();
  await renderWithProviders(<Stepper value={0} onChange={onChange} label="Coqueta" />);
  expect(screen.getByRole("button", { name: "Menos Coqueta" })).toBeDisabled();
  await renderWithProviders(<Stepper value={3} onChange={onChange} label="Morenita" min={1} max={3} />);
  expect(screen.getByRole("button", { name: "Más Morenita" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Menos Morenita" })).toBeEnabled();
});

test("el número se puede escribir: 145 de una vez, sin tocar 145 veces", async () => {
  const onChange = jest.fn();
  await renderWithProviders(<Stepper value={0} onChange={onChange} label="Coqueta" max={200} />);
  await fireEvent.changeText(screen.getByLabelText("Cantidad de Coqueta"), "145");
  expect(onChange).toHaveBeenLastCalledWith(145);
  await fireEvent.changeText(screen.getByLabelText("Cantidad de Coqueta"), "999");
  expect(onChange).toHaveBeenLastCalledWith(200);
  await fireEvent.changeText(screen.getByLabelText("Cantidad de Coqueta"), "");
  expect(onChange).toHaveBeenLastCalledWith(0);
  onChange.mockClear();
  await fireEvent.changeText(screen.getByLabelText("Cantidad de Coqueta"), "1a");
  expect(onChange).not.toHaveBeenCalled();
});
