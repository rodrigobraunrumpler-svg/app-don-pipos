import { z } from "zod";
export const PAGE_SIZE = z.number().int().parse(20);
