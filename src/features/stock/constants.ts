// Lo que dice el chip de cada estado (la maqueta, más «Faltan» para lo que falta producir para pedidos)
export const STOCK_STATE_LABELS = {
  check: "Revisar",
  owed: "Faltan",
  out: "Agotado",
  low: "Poco",
  ok: "Alcanza",
} as const;

// Los motivos de una merma, en el orden de la maqueta
export const WASTE_REASONS = [
  ["broken", "Rota"],
  ["expired", "Vencida"],
  ["gift", "Regalo"],
  ["other", "Otro"],
] as const;

// Cuando el mismo código ya se guardó con otros datos (la respuesta se perdió y el dueño cambió el formulario)
export const STOCK_CONFLICT_TEXT = "Esto ya se había guardado con otros datos. Revisa el stock y vuelve a intentar.";

// Los motivos de un ajuste
export const ADJUSTMENT_LABELS = { count: "Conteo", initial: "Stock inicial", undo: "Deshacer" } as const;
