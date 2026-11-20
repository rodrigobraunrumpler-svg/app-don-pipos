export const stockKeys = {
  all: ["stock"] as const,
  overview: ["stock", "overview"] as const,
  movements: (productId: string) => ["stock", "movements", productId] as const,
  suggestion: ["stock", "suggestion"] as const,
  weekdaySales: (productId: string) => ["stock", "weekday-sales", productId] as const,
};
