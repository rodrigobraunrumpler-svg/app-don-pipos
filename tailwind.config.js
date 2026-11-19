const colors = require("./src/theme/colors.json");
const { radii, fonts } = require("./src/theme/scales.json");

// El mismo nombre que arma src/theme/css-vars.ts; una prueba comprueba que coincidan
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: Object.fromEntries(Object.keys(colors.light).map((name) => [kebab(name), `var(--color-${kebab(name)})`])),
      fontFamily: Object.fromEntries(Object.entries(fonts).map(([name, family]) => [name, [family]])),
      borderRadius: Object.fromEntries(Object.entries(radii).map(([name, px]) => [name, `${px}px`])),
    },
  },
  plugins: [],
};
