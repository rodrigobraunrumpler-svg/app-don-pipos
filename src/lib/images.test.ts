import { shrinkPhoto } from "./images";

const mockResize = jest.fn();
const mockSave = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: () => {
      const context = {
        resize: (size: unknown) => {
          mockResize(size);
          return context;
        },
        renderAsync: async () => ({ saveAsync: (options: unknown) => mockSave(options) }),
      };
      return context;
    },
  },
}));

beforeEach(() => {
  mockResize.mockReset();
  mockSave.mockReset().mockResolvedValue({ uri: "file:///boleta.jpg", width: 1600, height: 1200, base64: "QUJD" });
});

test("la foto de la boleta: el lado mayor en 1600 px, en JPEG 0,7, como texto base64", async () => {
  await expect(shrinkPhoto({ uri: "file:///foto.jpg", width: 4000, height: 3000 })).resolves.toBe("QUJD");
  expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
  expect(mockSave).toHaveBeenCalledWith({ compress: 0.7, format: "jpeg", base64: true });
  await shrinkPhoto({ uri: "file:///foto.jpg", width: 3000, height: 4000 });
  expect(mockResize).toHaveBeenLastCalledWith({ height: 1600 });
});

test("una foto chica no se agranda", async () => {
  await shrinkPhoto({ uri: "file:///foto.jpg", width: 1200, height: 900 });
  expect(mockResize).not.toHaveBeenCalled();
});
