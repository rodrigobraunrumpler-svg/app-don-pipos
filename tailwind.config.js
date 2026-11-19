const colors = require("./src/theme/colors.json");
const { radii, fonts } = require("./src/theme/scales.json");

// El mismo nombre que arma src/theme/css-vars.ts; una prueba comprueba que coincidan
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    // Aquí, y no en «extend»: así desaparece la paleta que trae Tailwind (bg-red-500, text-white, text-black…)
    // y las únicas clases de color son las del tema, que cambian solas entre claro y oscuro
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ...Object.fromEntries(Object.keys(colors.light).map((name) => [kebab(name), `var(--color-${kebab(name)})`])),
    },
    extend: {
      fontFamily: Object.fromEntries(Object.entries(fonts).map(([name, family]) => [name, [family]])),
      borderRadius: Object.fromEntries(Object.entries(radii).map(([name, px]) => [name, `${px}px`])),
    },
  },
  plugins: [],
};
