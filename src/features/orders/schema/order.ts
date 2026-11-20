import { z } from "zod";

// Los valores de un pedido, como los guarda la base (docs/spec/orders.md §2)
export const orderStatusSchema = z.enum(["new", "preparing", "on_the_way", "ready", "delivered", "cancelled"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const fulfillmentSchema = z.enum(["delivery", "pickup", "counter"]);
export type Fulfillment = z.infer<typeof fulfillmentSchema>;

export const channelSchema = z.enum(["whatsapp", "local", "web"]);
export type Channel = z.infer<typeof channelSchema>;

export const paymentMethodSchema = z.enum(["cash", "yape", "plin", "transfer"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const orderFilterSchema = z.enum(["today", "to_deliver", "upcoming", "to_collect", "all"]);
export type OrderFilter = z.infer<typeof orderFilterSchema>;

// Un pedido como lo devuelven get_order y las funciones que escriben (docs/spec/orders.md §3). Las fechas quedan como
// texto ISO: la caché se guarda en el celular como JSON
export const orderSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  status: orderStatusSchema,
  fulfillment: fulfillmentSchema,
  channel: channelSchema,
  customerId: z.string().nullable(),
  customerName: z.string().nullable(),
  promisedAt: z.string().nullable(),
  scheduledFor: z.string().nullable(),
  dueDate: z.string(),
  deliveryAddress: z.string().nullable(),
  deliveryFeeCents: z.number().int(),
  discountCents: z.number().int(),
  discountReason: z.string().nullable(),
  subtotalCents: z.number().int(),
  totalCents: z.number().int(),
  paidCents: z.number().int(),
  deliveredAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  note: z.string().nullable(),
  itemsSummary: z.string(),
  itemsCount: z.number().int(),
  version: z.number().int(),
  createdAt: z.string(),
  lines: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number().int(),
      unitPriceCents: z.number().int(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["payment", "refund"]),
      method: paymentMethodSchema,
      amountCents: z.number().int(),
      paidAt: z.string(),
      voidedAt: z.string().nullable(),
    }),
  ),
  timeline: z.array(z.object({ status: orderStatusSchema, at: z.string() })),
  customer: z
    .object({
      id: z.string(),
      name: z.string(),
      phone: z.string().nullable(),
      address: z.string().nullable(),
      // Sus sellos de hoy (para el mensaje de entregado); un pedido guardado en el celular antes no los trae
      stamps: z.number().int().optional(),
    })
    .nullable(),
});
export type Order = z.infer<typeof orderSchema>;
export type Payment = Order["payments"][number];

// Una fila de la lista (list_orders)
export const orderSummarySchema = orderSchema.pick({
  id: true,
  number: true,
  status: true,
  fulfillment: true,
  customerName: true,
  itemsSummary: true,
  totalCents: true,
  paidCents: true,
  promisedAt: true,
  dueDate: true,
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

// Los pedidos que vienen, del más próximo al más lejano (upcoming_orders): para los recordatorios y la campana
export const upcomingOrdersSchema = z.object({ items: z.array(orderSummarySchema) });

export const orderCountsSchema = z.object({
  today: z.number().int(),
  toDeliver: z.number().int(),
  upcoming: z.number().int(),
  toCollect: z.number().int(),
  all: z.number().int(),
});
export type OrderCounts = z.infer<typeof orderCountsSchema>;

export type OrderLineInput = { productId: string; quantity: number };

// Lo que recibe create_order. El mostrador va por create_counter_sale
export type OrderDraft = {
  customer: { phone: string; name?: string };
  channel?: Channel;
  fulfillment: "delivery" | "pickup";
  deliveryAddress?: string;
  scheduledFor?: string;
  promisedAt?: string;
  discountCents?: number;
  discountReason?: string;
  redeemReward?: boolean;
  note?: string;
  payment?: { method: PaymentMethod; amountCents: number };
  lines: OrderLineInput[];
};

// Una fila de Por cobrar (list_receivables). «remind»: ya se entregó o hay un adelanto
export const receivableSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  fulfillment: fulfillmentSchema,
  status: orderStatusSchema,
  totalCents: z.number().int(),
  paidCents: z.number().int(),
  dueDate: z.string(),
  scheduledFor: z.string().nullable(),
  remind: z.boolean(),
});
export type Receivable = z.infer<typeof receivableSchema>;

export const receivablesPageSchema = z.object({
  items: z.array(receivableSchema),
  meta: z.object({
    limit: z.number().int(),
    total: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    totalDueCents: z.number().int(),
  }),
});
export type ReceivablesPage = z.infer<typeof receivablesPageSchema>;

// Una devolución en la misma operación (editar por debajo de lo pagado, anular)
export type RefundInput = { cents: number; method: PaymentMethod } | null;
