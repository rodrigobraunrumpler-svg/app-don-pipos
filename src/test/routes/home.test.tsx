import { render, screen } from "@testing-library/react-native";

import Home from "@/app/index";

test("la portada muestra el nombre de la app y la fase", async () => {
  await render(<Home />);
  expect(screen.getByText("Don Pipos")).toBeOnTheScreen();
  expect(screen.getByText("Fase 0 lista")).toBeOnTheScreen();
});
