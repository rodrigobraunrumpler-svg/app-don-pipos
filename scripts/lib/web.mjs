// Los argumentos de pnpm web y el enlace de cada alfajor con su documento de la web, revisados antes de tocar nada

const COMMANDS = ["connect", "status"];
const DATASETS = ["production", "development"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseWebArgs(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command))
    throw new Error(
      "Uso: pnpm web connect --dataset <production|development> --business <id del negocio> | pnpm web status",
    );
  if (command === "status") return { command };
  const value = (flag) => {
    const index = rest.indexOf(flag);
    return index === -1 ? undefined : rest[index + 1];
  };
  const dataset = value("--dataset");
  if (!DATASETS.includes(dataset)) throw new Error("falta --dataset: production o development");
  const business = value("--business");
  if (!business || !UUID.test(business)) throw new Error("falta --business <id del negocio> (el uuid de businesses)");
  return { command, dataset, business };
}

// «Alfajor de Manteadita» y «Manteadita» son el mismo: sin «Alfajor», sin «de», sin tildes ni mayúsculas
function key(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^alfajor\s+/, "")
    .replace(/^de\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchProducts(products, docs) {
  const byKey = new Map(docs.map((doc) => [key(doc.name), doc]));
  const links = [];
  const missing = [];
  for (const product of products) {
    const doc = byKey.get(key(product.name));
    if (!doc) {
      missing.push(product.name);
      continue;
    }
    byKey.delete(key(product.name));
    links.push({ productId: product.id, name: product.name, sanityId: doc._id, imageUrl: doc.imageUrl ?? null });
  }
  return { links, missing, unused: [...byKey.values()].map((doc) => doc.name) };
}
