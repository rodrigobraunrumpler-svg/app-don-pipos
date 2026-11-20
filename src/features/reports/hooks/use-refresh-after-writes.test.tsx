import { useQuery } from "@tanstack/react-query";
import { act, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test/render";

import { homeSummaryQuery } from "../queries/reports";
import { useRefreshAfterWrites } from "./use-refresh-after-writes";

const mockSummary = jest.fn();
jest.mock("../api/reports", () => ({ getHomeSummary: () => mockSummary() }));

function Probe() {
  useRefreshAfterWrites();
  const { data } = useQuery(homeSummaryQuery);
  return <Text>{data ? String(data.collectedTodayCents) : "…"}</Text>;
}

test("después de cualquier guardado (también si su respuesta se perdió), Inicio se vuelve a pedir; exportar no cuenta", async () => {
  mockSummary
    .mockResolvedValueOnce({ collectedTodayCents: 100 })
    .mockResolvedValueOnce({ collectedTodayCents: 200 })
    .mockResolvedValueOnce({ collectedTodayCents: 300 });
  const { queryClient } = await renderWithProviders(<Probe />);
  expect(await screen.findByText("100")).toBeOnTheScreen();
  const run = (options: { meta?: { invalidates: string[][] }; fail?: boolean }) =>
    act(async () => {
      await queryClient
        .getMutationCache()
        .build(queryClient, {
          mutationFn: async () => {
            if (options.fail) throw new Error("sin respuesta");
            return 1;
          },
          meta: options.meta,
        })
        .execute(undefined)
        .catch(() => undefined);
    });
  // Exportar no guarda nada: no lleva meta.invalidates
  await run({});
  expect(mockSummary).toHaveBeenCalledTimes(1);
  // Un pago, un pedido o un gasto sí
  await run({ meta: { invalidates: [["orders"]] } });
  expect(await screen.findByText("200")).toBeOnTheScreen();
  await run({ meta: { invalidates: [["expenses"]] }, fail: true });
  expect(await screen.findByText("300")).toBeOnTheScreen();
});
