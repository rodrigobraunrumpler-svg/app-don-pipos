// Una petición que no responde en 20 s se corta: en Android la red de React Native no tiene tiempo límite, y una
// conexión muerta dejaba «Guardando…» para siempre. Llega como «sin conexión» y el reintento usa el mismo código
export function fetchWithTimeout(timeoutMs = 20_000): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Si quien llama ya trae su propia señal, también corta
    init?.signal?.addEventListener("abort", () => controller.abort());
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}
