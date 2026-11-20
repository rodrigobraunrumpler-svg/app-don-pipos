// Una línea del pedido con el plural de la maqueta (el mismo de la base): un nombre de una palabra suma «s»; uno de dos
// o más queda igual. Con 1, en singular
export function lineLabel(quantity: number, name: string): string {
  return `${quantity} ${quantity === 1 || name.includes(" ") ? name : `${name}s`}`;
}
