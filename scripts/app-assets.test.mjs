// Los íconos de la APK (fase 8): cada imagen con su tamaño, las que van sobre transparente con su canal alfa, y
// app.config.ts usándolas. Android pide el ícono de los avisos blanco sobre transparente, de 96 px
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import config from "../app.config.ts";

const ROOT = join(import.meta.dirname, "..");
const RGBA = 6;

// Ancho, alto y tipo de color, de la cabecera del PNG
function png(path) {
  const bytes = readFileSync(join(ROOT, path));
  assert.equal(bytes.toString("latin1", 1, 4), "PNG", `${path} no es un PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

test("cada imagen tiene su tamaño, y las que van sobre transparente tienen canal alfa", () => {
  assert.deepEqual(png("assets/icon.png").width, 1024);
  assert.deepEqual(png("assets/adaptive-icon.png"), { width: 1024, height: 1024, colorType: RGBA });
  assert.deepEqual(png("assets/splash-icon.png"), { width: 1024, height: 1024, colorType: RGBA });
  assert.deepEqual(png("assets/notification-icon.png"), { width: 96, height: 96, colorType: RGBA });
});

test("app.config.ts las usa: ícono adaptable sobre crema, la carga sobre verde y los avisos con su ícono", () => {
  assert.equal(config.icon, "./assets/icon.png");
  assert.deepEqual(config.android?.adaptiveIcon, {
    foregroundImage: "./assets/adaptive-icon.png",
    backgroundColor: "#FAF7E9",
  });
  assert.equal(config.android?.versionCode, 1);
  const plugin = (name) => config.plugins?.find((entry) => Array.isArray(entry) && entry[0] === name)?.[1];
  assert.deepEqual(plugin("expo-splash-screen"), {
    image: "./assets/splash-icon.png",
    imageWidth: 200,
    backgroundColor: "#354b2e",
  });
  assert.deepEqual(plugin("expo-notifications"), { icon: "./assets/notification-icon.png", color: "#354b2e" });
});

test("eas.json arma la APK de prueba y la de producción, cada una con su canal de actualizaciones", () => {
  const eas = JSON.parse(readFileSync(join(ROOT, "eas.json"), "utf8"));
  assert.deepEqual(eas.build.preview.android, { buildType: "apk" });
  assert.equal(eas.build.preview.channel, "prueba");
  assert.deepEqual(eas.build.production.android, { buildType: "apk" });
  assert.equal(eas.build.production.channel, "produccion");
});
