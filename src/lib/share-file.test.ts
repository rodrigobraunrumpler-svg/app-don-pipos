import { shareCsv } from "./share-file";

const mockCreate = jest.fn();
const mockWrite = jest.fn(async () => undefined);
const mockShare = jest.fn(async () => undefined);
jest.mock("expo-file-system", () => ({
  Paths: { cache: { uri: "file:///cache/" } },
  File: jest.fn().mockImplementation((directory: { uri: string }, name: string) => ({
    uri: `${directory.uri}${name}`,
    create: mockCreate,
    write: mockWrite,
  })),
}));
jest.mock("expo-sharing", () => ({ shareAsync: (...args: unknown[]) => mockShare(...(args as [])) }));

test("el archivo se escribe en la caché (sobre uno anterior del mismo nombre) y se comparte como CSV", async () => {
  await shareCsv("don-pipos-2026-11-01-2026-11-18.csv", "\uFEFFTipo;Fecha\r\n");
  expect(mockCreate).toHaveBeenCalledWith({ overwrite: true });
  expect(mockWrite).toHaveBeenCalledWith("\uFEFFTipo;Fecha\r\n");
  expect(mockShare).toHaveBeenCalledWith("file:///cache/don-pipos-2026-11-01-2026-11-18.csv", {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "don-pipos-2026-11-01-2026-11-18.csv",
  });
});
