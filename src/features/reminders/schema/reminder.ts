// Lo que necesitan las cuentas de los avisos, con la forma mínima de cada fila: las de pedidos, Por cobrar y Stock
// encajan tal cual (las cuentas no importan otros módulos)
export type UpcomingOrder = {
  id: string;
  status: string;
  fulfillment: string;
  customerName: string | null;
  itemsSummary: string;
  totalCents: number;
  paidCents: number;
  promisedAt: string | null;
  dueDate: string;
};
export type StockLevel = { productId: string; name: string; onHand: number; state: string };
export type Debt = {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  totalCents: number;
  paidCents: number;
  dueDate: string;
  remind: boolean;
};

// Los interruptores de Más → Recordatorios (business_settings.reminders)
export type ReminderSwitches = { scheduled: boolean; stock: boolean; balances: boolean };

export type ReminderData = {
  upcoming: UpcomingOrder[];
  stock: StockLevel[];
  receivables: Debt[];
  // Los avisos de «ahora» que ya salieron hoy (sus ids: «stock:<alfajor>»)
  notifiedToday: string[];
};

export type ReminderTarget =
  { screen: "order"; orderId: string } | { screen: "production" } | { screen: "receivables" };

// Un aviso: «at» es cuándo sale (null = ahora)
export type Reminder = {
  id: string;
  kind: keyof ReminderSwitches;
  title: string;
  body: string;
  at: Date | null;
  target: ReminderTarget;
};
