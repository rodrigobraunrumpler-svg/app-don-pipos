import { parseEnv } from "./env";

const GOOD = {
  EXPO_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  EXPO_PUBLIC_SUPABASE_KEY: "sb_publishable_1234567890abcdef",
};

test("con la URL y la llave publicable, vale", () => {
  expect(parseEnv(GOOD)).toEqual({
    ok: true,
    env: {
      supabaseUrl: GOOD.EXPO_PUBLIC_SUPABASE_URL,
      supabaseKey: GOOD.EXPO_PUBLIC_SUPABASE_KEY,
      supportWhatsapp: undefined,
    },
  });
});

test("el WhatsApp del equipo, si está, son solo números", () => {
  expect(parseEnv({ ...GOOD, EXPO_PUBLIC_SUPPORT_WHATSAPP: "51900000101" })).toMatchObject({
    ok: true,
    env: { supportWhatsapp: "51900000101" },
  });
  expect(parseEnv({ ...GOOD, EXPO_PUBLIC_SUPPORT_WHATSAPP: "" })).toMatchObject({
    ok: true,
    env: { supportWhatsapp: undefined },
  });
  expect(parseEnv({ ...GOOD, EXPO_PUBLIC_SUPPORT_WHATSAPP: "+51 900 000 101" })).toEqual({
    ok: false,
    problems: ["EXPO_PUBLIC_SUPPORT_WHATSAPP: solo números, con el código del país"],
  });
});

test.each([
  [
    { EXPO_PUBLIC_SUPABASE_KEY: GOOD.EXPO_PUBLIC_SUPABASE_KEY },
    "EXPO_PUBLIC_SUPABASE_URL tiene que ser la URL https del proyecto",
  ],
  [
    { ...GOOD, EXPO_PUBLIC_SUPABASE_URL: "http://abcdefghijklmnopqrst.supabase.co" },
    "EXPO_PUBLIC_SUPABASE_URL tiene que ser la URL https del proyecto",
  ],
  [
    { ...GOOD, EXPO_PUBLIC_SUPABASE_KEY: "sb_secret_1234567890" },
    "Esa es la llave secreta: en EXPO_PUBLIC_SUPABASE_KEY va la publicable (sb_publishable_…)",
  ],
  [
    { ...GOOD, EXPO_PUBLIC_SUPABASE_KEY: "eyJhbGciOi" },
    "EXPO_PUBLIC_SUPABASE_KEY tiene que ser la llave publicable (sb_publishable_…)",
  ],
])("%o no vale", (source, problem) => {
  expect(parseEnv(source)).toEqual({ ok: false, problems: [problem] });
});
