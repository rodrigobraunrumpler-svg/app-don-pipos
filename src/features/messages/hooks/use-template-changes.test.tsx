import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { createTestQueryClient } from "@/test/render";

import { messagesKeys } from "../queries/keys";
import type { Template } from "../schema/template";
import { useResetTemplate, useUpdateTemplate } from "./use-template-changes";

const mockUpdate = jest.fn();
const mockReset = jest.fn();
jest.mock("../api/templates", () => ({
  updateTemplate: (input: unknown) => mockUpdate(input),
  resetTemplate: (key: string) => mockReset(key),
}));

const LIST: Template[] = [
  { key: "on_the_way", body: "Hola {nombre}, va en camino.", version: 1, isDefault: true },
  { key: "ready", body: "Hola {nombre}, listo.", version: 1, isDefault: true },
];

function setup() {
  const client = createTestQueryClient();
  client.setQueryData(messagesKeys.templates, LIST);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

test("guardar y volver al original dejan al instante el texto que devuelve la base, sin tocar los otros", async () => {
  const { client, wrapper } = setup();
  mockUpdate.mockResolvedValue({ key: "on_the_way", body: "Ya salió, {nombre}.", version: 2, isDefault: false });
  const { result } = await renderHook(() => ({ update: useUpdateTemplate(), reset: useResetTemplate() }), { wrapper });
  await act(async () => {
    await result.current.update.mutateAsync({ key: "on_the_way", expectedVersion: 1, body: "Ya salió, {nombre}." });
  });
  expect(client.getQueryData<Template[]>(messagesKeys.templates)).toEqual([
    { key: "on_the_way", body: "Ya salió, {nombre}.", version: 2, isDefault: false },
    LIST[1],
  ]);
  mockReset.mockResolvedValue({ ...LIST[0], version: 3 });
  await act(async () => {
    await result.current.reset.mutateAsync("on_the_way");
  });
  expect(client.getQueryData<Template[]>(messagesKeys.templates)?.[0]).toMatchObject({ isDefault: true, version: 3 });
});
