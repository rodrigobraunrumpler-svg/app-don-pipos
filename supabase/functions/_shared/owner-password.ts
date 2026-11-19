// La contraseña interna de la cuenta del dueño: un HMAC-SHA256 de su id con un secreto que solo tienen el servidor
// y los scripts del equipo. Nadie la escribe ni la ve; cambiar el secreto obliga a un `pnpm owner reset-pin`.
export async function ownerPassword(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(userId)));
  return btoa(String.fromCharCode(...signature))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
