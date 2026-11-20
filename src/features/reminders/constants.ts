// A qué hora salen los avisos programados (de Lima): el pedido, el día antes; los saldos, cada mañana
export const REMINDER_TIMES = { scheduled: "18:00", balances: "09:00" } as const;

// Más → Recordatorios: cada interruptor con su explicación (la maqueta). El de los alfajores dice también el mínimo:
// avisa con el estado «bajo» de Stock (decidido en la fase 7b)
export const REMINDER_ROWS = [
  { kind: "scheduled", title: "Pedidos para otro día", description: "El día antes, a las 18:00" },
  { kind: "stock", title: "Alfajores que se acaban", description: "Cuando llegan al mínimo o quedan para un día" },
  { kind: "balances", title: "Saldos pendientes", description: "Si alguien debe desde hace un día" },
] as const;

// El ícono de cada aviso en la lista de la campana
export const REMINDER_ICONS = { scheduled: "calendar-clock", stock: "cookie-outline", balances: "cash-clock" } as const;
