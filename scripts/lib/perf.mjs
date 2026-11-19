// Lo que el medidor decide sin tocar la base

/** Los problemas de un caso medido: tardó más del máximo o leyó una tabla entera. Sin problemas, una lista vacía. */
export function evaluate(result, maxMs) {
  const problems = [];
  if (result.ms > maxMs) problems.push(`${result.name}: tardó ${result.ms} ms (máximo ${maxMs})`);
  for (const [table, scans] of Object.entries(result.seqScans)) {
    if (scans > 0) problems.push(`${result.name}: leyó ${table} entera, sin índice`);
  }
  return problems;
}
