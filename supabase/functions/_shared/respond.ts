// Una respuesta JSON con su código HTTP
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

// La primera llave de las que entrega Supabase a cada función (SUPABASE_PUBLISHABLE_KEYS es un JSON: {"default": "…"})
export function firstKey(raw: string | undefined): string {
  const keys = Object.values(JSON.parse(raw ?? "{}") as Record<string, string>);
  if (!keys[0]) throw new Error("La función no tiene llave publicable");
  return keys[0];
}
