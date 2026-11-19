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
