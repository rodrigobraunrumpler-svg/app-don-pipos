// El color de cada medio de pago (la maqueta), en «Cobrado hoy» y en «Por medio de pago»
export const METHOD_COLORS = {
  cash: "bg-method-cash",
  yape: "bg-method-yape",
  plin: "bg-method-plin",
  transfer: "bg-method-transfer",
} as const;

// Por dónde llegan los pedidos, en el orden de la maqueta: el nombre, su ícono y la clase de su color
export const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", icon: "whatsapp", swatch: "bg-accent" },
  { key: "local", label: "En el local", icon: "storefront-outline", swatch: "bg-caramel" },
  { key: "web", label: "Desde la web", icon: "web", swatch: "bg-olive" },
] as const;
