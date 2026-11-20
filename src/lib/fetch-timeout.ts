// Una petición que no responde en 20 s se corta: en Android la red de React Native no tiene tiempo límite, y una
// conexión muerta dejaba «Guardando…» para siempre. Llega como «sin conexión» y el reintento usa el mismo código.
// Subir la foto de una boleta (Storage) tiene 60 s: unos 300 KB con mala señal tardan más que una consulta
export function fetchWithTimeout(timeoutMs = 20_000, storageTimeoutMs = 60_000): typeof fetch {
  return (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), url.includes("/storage/v1/") ? storageTimeoutMs : timeoutMs);
    // Si quien llama ya trae su propia señal, también corta
    init?.signal?.addEventListener("abort", () => controller.abort());
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}
