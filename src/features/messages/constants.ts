// El nombre de cada mensaje (la maqueta), en el orden de un pedido
export const TEMPLATE_TITLES = {
  confirmation: "Confirmación del pedido",
  on_the_way: "En camino",
  ready: "Listo para recoger",
  delivered: "Entregado",
  balance_reminder: "Recordatorio de saldo",
  we_miss_you: "Te extrañamos (solo con permiso)",
} as const;

// «Así le llega (con el pedido #0042)»: los datos de ejemplo de la vista previa (2 Coquetas, 1 Pipo Crush y el
// delivery, con un adelanto)
export const SAMPLE_CONTEXT = {
  nombre: "Ana",
  numero: "#0042",
  detalle: "2 Coquetas, 1 Pipo Crush",
  total: "S/ 42.00",
  adelanto: "Recibimos tu adelanto de S/ 20.00; faltan S/ 22.00.",
  entrega: "Te avisamos cuando salga.",
  pago: "Total a pagar: S/ 22.00 (Yape, Plin, transferencia o efectivo).",
  falta: "S/ 22.00",
  sellos: "Llevas 7 de 10 sellos para tu premio.",
} as const;
