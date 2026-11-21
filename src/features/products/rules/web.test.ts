import { ALLERGENS, isSmallPhoto, missingForWeb, pageUrl, shareText, webName } from "./web";

test("el nombre en la web lleva «Alfajor» adelante, salvo que ya lo tenga", () => {
  expect(webName("Coqueta")).toBe("Alfajor Coqueta");
  expect(webName("Alfajor de Manteadita")).toBe("Alfajor de Manteadita");
  expect(webName("alfajor Tropi")).toBe("alfajor Tropi");
});

test("qué le falta para salir en la web: uno que ya está ahí no necesita nada", () => {
  expect(missingForWeb({ linked: false, hasPhoto: false, description: "" })).toBe("Falta la foto y la descripción");
  expect(missingForWeb({ linked: false, hasPhoto: true, description: "  " })).toBe("Falta la descripción");
  expect(missingForWeb({ linked: false, hasPhoto: false, description: "Frutos rojos" })).toBe("Falta la foto");
  expect(missingForWeb({ linked: false, hasPhoto: true, description: "Frutos rojos" })).toBeNull();
  expect(missingForWeb({ linked: true, hasPhoto: false, description: "" })).toBeNull();
});

test("una foto es chica si su lado menor no llega a 1080 px", () => {
  expect(isSmallPhoto(1000, 2000)).toBe(true);
  expect(isSmallPhoto(1080, 1080)).toBe(false);
});

test("la dirección de su página, solo con la web configurada y su dirección guardada", () => {
  expect(pageUrl("https://varmar.pe", "alfajor-coqueta")).toBe("https://varmar.pe/don-pipos/alfajor-coqueta");
  expect(pageUrl(undefined, "alfajor-coqueta")).toBeNull();
  expect(pageUrl("https://varmar.pe", null)).toBeNull();
  expect(shareText("Coqueta", "https://varmar.pe/don-pipos/alfajor-coqueta")).toBe(
    "Nuevo en Don Pipos: Alfajor Coqueta https://varmar.pe/don-pipos/alfajor-coqueta",
  );
});

test("los alérgenos son los mismos 13 de la web, con sus nombres", () => {
  expect(ALLERGENS).toHaveLength(13);
  expect(ALLERGENS[1]).toEqual(["lacteos", "Lácteos"]);
});
