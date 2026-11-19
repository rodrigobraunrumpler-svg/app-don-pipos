import type { Href } from "expo-router";

// Esta prueba se decide al compilar (pnpm typecheck), no al correr. Los tipos de las rutas se generan desde src/app:
// sin ellos, cualquier texto vale como enlace, la línea marcada deja de ser un error y TypeScript avisa que la marca sobra
test("un enlace a una pantalla que no existe no compila", () => {
  const home: Href = "/";
  // @ts-expect-error: «/no-existe» no es una pantalla. Si esto ya no falla, faltan los tipos de las rutas
  const missing: Href = "/no-existe";
  expect([home, missing]).toHaveLength(2);
});
