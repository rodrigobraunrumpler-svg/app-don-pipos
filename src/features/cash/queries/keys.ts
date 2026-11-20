export const cashKeys = {
  all: ["cash"] as const,
  expected: (businessDate: string) => ["cash", "expected", businessDate] as const,
  latest: (businessDate: string) => ["cash", "latest", businessDate] as const,
};
