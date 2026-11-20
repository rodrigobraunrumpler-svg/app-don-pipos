export const expensesKeys = {
  all: ["expenses"] as const,
  categories: ["expenses", "categories"] as const,
  list: ["expenses", "list"] as const,
  summary: (from: string, to: string) => ["expenses", "summary", from, to] as const,
  receipt: (path: string) => ["expenses", "receipt", path] as const,
  // Las subidas de fotos: las que fallaron se avisan en Gastos aunque se haya salido del formulario
  attach: ["expenses", "attach"] as const,
};
