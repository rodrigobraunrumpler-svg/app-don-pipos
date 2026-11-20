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
    .object({ id: z.string(), name: z.string(), phone: z.string().nullable(), address: z.string().nullable() })
    .nullable(),
});
export type Order = z.infer<typeof orderSchema>;

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
  note?: string;
  payment?: { method: PaymentMethod; amountCents: number };
  lines: OrderLineInput[];
};
