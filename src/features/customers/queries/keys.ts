import type { CustomerFilter } from "../schema/customer";

export const customersKeys = {
  all: ["customers"] as const,
  byPhone: (phone: string) => ["customers", "phone", phone] as const,
  list: (filter: CustomerFilter, search: string) => ["customers", "list", filter, search] as const,
  detail: (id: string) => ["customers", "detail", id] as const,
};
