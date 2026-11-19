import type { MovementKind } from "../schema/stock";
import { movementLabel, movementTime } from "./movement";

// Hoy es miércoles 18 de noviembre de 2026, 11:40 en Lima
const NOW = new Date("2026-11-18T16:40:00Z");

test.each([
  ["2026-11-18T13:10:00Z", "Hoy 08:10"],
  ["2026-11-17T22:30:00Z", "Ayer 17:30"],
  ["2026-11-16T23:00:00Z", "Lunes 18:00"],
  ["2026-11-12T22:30:00Z", "Jueves 17:30"],
  ["2026-11-11T22:30:00Z", "11 nov 17:30"],
  // 04:59 UTC del 19 todavía es el 18 en Lima
  ["2026-11-19T04:59:00Z", "Hoy 23:59"],
])("%s → %s", (iso, text) => expect(movementTime(new Date(iso), NOW)).toBe(text));

test.each([
  ["production", null, "Producción"],
  ["waste", "broken", "Merma: rota"],
  ["waste", "expired", "Merma: vencida"],
  ["waste", "gift", "Merma: regalo"],
  ["waste", "other", "Merma: otro"],
  ["waste", null, "Merma"],
  ["adjustment", "count", "Conteo"],
  ["adjustment", "initial", "Stock inicial"],
  ["adjustment", "undo", "Deshacer"],
  ["adjustment", null, "Ajuste"],
  ["sale", null, "Venta"],
  ["cancellation", null, "Pedido anulado"],
])("%s %s → %s", (kind, reason, text) => expect(movementLabel(kind as MovementKind, reason)).toBe(text));
