// Módulo products: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { margin, marginLabel } from "./rules/margin";
export { parsePrice } from "./rules/price";
export { NewProductSheet } from "./components/new-product-sheet";
export { ProductAvatar } from "./components/product-avatar";
export { ProductList } from "./components/product-list";
export { ProductsRow } from "./components/products-row";
export { productsQuery } from "./queries/products";
export type { Product } from "./schema/product";
export { ProductDraftProvider } from "./components/product-draft-provider";
export { ProductEditor } from "./components/product-editor";
export { ProductPreview } from "./components/product-preview";
export { draftFrom, emptyDraft, useProductDraft } from "./hooks/product-draft";
export type { ListNotice, ProductDraft } from "./hooks/product-draft";
export { WEB_STATES } from "./schema/product";
export type { WebState } from "./schema/product";
export { ProductOrderList } from "./components/product-order-list";
