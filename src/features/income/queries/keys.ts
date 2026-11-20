export const incomeKeys = {
  all: ["income"] as const,
  list: ["income", "list"] as const,
  summary: (from: string, to: string) => ["income", "summary", from, to] as const,
};
