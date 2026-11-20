import { randomUUID } from "expo-crypto";
import { useState } from "react";

// El código de una intención del dueño (una merma, un conteo, un pedido, un cobro): el mismo en cada reintento, así
// la base no registra dos veces si la respuesta se perdió. Se renueva solo después de guardar bien
export function useRequestId(): { requestId: string; renew: () => void } {
  const [requestId, setRequestId] = useState(() => randomUUID());
  return { requestId, renew: () => setRequestId(randomUUID()) };
}
