// Módulo products: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { margin, marginLabel } from "./rules/margin";
export { parsePrice } from "./rules/price";
export { ProductAvatar } from "./components/product-avatar";
export { ProductList } from "./components/product-list";
export { ProductsRow } from "./components/products-row";
export { productsQuery } from "./queries/products";
export type { Product } from "./schema/product";
