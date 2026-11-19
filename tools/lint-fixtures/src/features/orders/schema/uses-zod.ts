import { z } from "zod";
export const orderSchema = z.object({ id: z.string(), totalCents: z.number().int() });
