export const reportsKeys = {
  all: ["reports"] as const,
  home: () => ["reports", "home"] as const,
  summary: (from: string, to: string, previousFrom: string) => ["reports", "summary", from, to, previousFrom] as const,
  ranking: (from: string, to: string) => ["reports", "ranking", from, to] as const,
  exportRows: (from: string, to: string) => ["reports", "export", from, to] as const,
};
