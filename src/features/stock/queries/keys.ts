export const stockKeys = {
  all: ["stock"] as const,
  overview: ["stock", "overview"] as const,
  movements: (productId: string) => ["stock", "movements", productId] as const,
};
