const VALID = {
  EXPO_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  EXPO_PUBLIC_SUPABASE_KEY: "sb_publishable_1234567890abcdef",
};

// Carga el módulo de nuevo con otras variables de entorno, y las devuelve como estaban
function load(env: Record<string, string | undefined>): typeof import("./supabase") {
  const saved = { ...process.env };
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  try {
    let loaded: typeof import("./supabase") | undefined;
    jest.isolateModules(() => {
      loaded = jest.requireActual<typeof import("./supabase")>("./supabase");
    });
    return loaded!;
  } finally {
    process.env = saved;
  }
}

test("con las variables bien, crea un solo cliente", () => {
  const { supabase } = load(VALID);
  expect(supabase()).toBe(supabase());
  expect(typeof supabase().auth.signOut).toBe("function");
});

test("sin variables válidas, dice qué falta configurar", () => {
  const { supabase } = load({ EXPO_PUBLIC_SUPABASE_URL: undefined, EXPO_PUBLIC_SUPABASE_KEY: "sb_secret_1234" });
  expect(() => supabase()).toThrow(/Falta configurar la app/);
});
