export const customersKeys = {
  all: ["customers"] as const,
  byPhone: (phone: string) => ["customers", "phone", phone] as const,
};
