// Crea un módulo en src/features a partir de templates/feature: pnpm new:feature <nombre>
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, "..", "templates", "feature");
const VALID_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Crea el módulo `name` dentro de `root` y devuelve los archivos que escribió. */
export function createFeature(name, root) {
  if (!VALID_NAME.test(name)) {
    throw new Error(`«${name}» no vale. Uso: pnpm new:feature <nombre>, con el nombre en kebab-case (cash-counts).`);
  }
  const target = join(root, name);
  if (existsSync(target)) throw new Error(`El módulo «${name}» ya existe en ${target}.`);

  const camel = name.replace(/-(.)/g, (_, letter) => letter.toUpperCase());
  const created = [];
  for (const entry of readdirSync(TEMPLATE, { recursive: true, withFileTypes: true })) {
    const source = join(entry.parentPath, entry.name);
    const out = join(target, relative(TEMPLATE, source));
    if (entry.isDirectory()) mkdirSync(out, { recursive: true });
    if (!entry.name.endsWith(".tpl")) continue; // los .gitkeep solo guardan las carpetas de la plantilla en git
    const file = out.slice(0, -".tpl".length);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, readFileSync(source, "utf8").replaceAll("__name__", name).replaceAll("__camel__", camel));
    created.push(file);
  }
  return created;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const created = createFeature(process.argv[2] ?? "", join(HERE, "..", "src", "features"));
    console.log(created.map((file) => relative(process.cwd(), file)).join("\n"));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
