// La copia a la web de un alfajor (docs/spec/products.md §3, fase 8): solo su precio, si está disponible y si se ve, con
// los nombres de la web. Lo usa la función sync-to-web; aquí, sin Deno, para probarlo con node:test

export type WebSyncItem = {
  ids: number[];
  sanityId: string;
  attempts: number;
  payload: { priceMinor: number; isAvailable: boolean; isVisible: boolean };
};
export type SanityConfig = { projectId: string; dataset: string; token: string };

const API_VERSION = "v2025-02-19";

// El documento y, si alguien lo tiene abierto en Studio, su borrador: si no, publicar ese borrador devolvería el precio
// viejo. El del borrador va por consulta, que sin borrador no hace nada; el del documento falla si el id está mal
export function sanityMutation(item: WebSyncItem) {
  return {
    mutations: [
      { patch: { id: item.sanityId, set: item.payload } },
      { patch: { query: "*[_id == $draft]", params: { draft: `drafts.${item.sanityId}` }, set: item.payload } },
    ],
  };
}

// Manda un alfajor a Sanity, con 10 segundos de límite. null si salió bien; si no, el error recortado, que queda en el
// outbox para el próximo intento
export async function sendToSanity(
  fetchFn: typeof fetch,
  config: SanityConfig,
  item: WebSyncItem,
): Promise<string | null> {
  try {
    const response = await fetchFn(
      `https://${config.projectId}.api.sanity.io/${API_VERSION}/data/mutate/${config.dataset}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(sanityMutation(item)),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.ok) return null;
    return `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

// El secreto con que la base llama a la función, comparado sin cortar al primer carácter distinto
export function sameSecret(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let index = 0; index < b.length; index += 1) diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return diff === 0;
}
