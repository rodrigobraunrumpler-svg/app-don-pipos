// El número del pedido como lo ve el dueño: «#0042»
export function orderNumber(number: number): string {
  return `#${String(number).padStart(4, "0")}`;
}
