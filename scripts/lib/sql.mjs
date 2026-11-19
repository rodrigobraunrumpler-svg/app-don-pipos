// Lo que el corredor de pruebas necesita saber de un archivo SQL o de su salida, sin tocar la base

// Un bloque $$…$$, un texto entre comillas, un comentario de línea o uno de bloque: lo primero que aparezca
const QUOTED_OR_COMMENT = /\$([A-Za-z_]*)\$[\s\S]*?\$\1\$|'(?:[^']|'')*'|--[^\n]*|\/\*[\s\S]*?\*\//g;
const TRANSACTION_WORDS = new Set(["begin", "start", "commit", "end", "rollback", "abort"]);

/** Cada sentencia del archivo, sin comentarios y con los textos y los bloques $$…$$ vaciados. */
export function statements(sql) {
  return sql
    .replace(QUOTED_OR_COMMENT, (match) => (match.startsWith("-") || match.startsWith("/") ? " " : "''"))
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/** Lanza si el archivo abre o cierra una transacción: el corredor es el único que lo hace, y siempre deshace. */
export function assertIsolated(sql, file) {
  for (const statement of statements(sql)) {
    const [first = "", second = ""] = statement.toLowerCase().split(/\s+/);
    // «prepare <nombre> as …» es de pgTAP; «prepare transaction» no
    if (TRANSACTION_WORDS.has(first) || (first === "prepare" && second === "transaction")) {
      throw new Error(`${file}: una prueba no abre ni cierra transacciones (${first})`);
    }
  }
}

/** Lee la salida de pgTAP: el plan, cuántas pasaron y cuáles fallaron. Lo que no es TAP se ignora. */
export function parseTap(lines) {
  let planned = null;
  let passed = 0;
  const failed = [];
  for (const raw of lines) {
    const line = raw.trim();
    const plan = /^1\.\.(\d+)$/.exec(line);
    if (plan) {
      planned = Number(plan[1]);
      continue;
    }
    const result = /^(not ok|ok) (\d+)(?: - (.*))?$/.exec(line);
    if (!result) continue;
    if (result[1] === "ok") passed += 1;
    else failed.push(result[3] ? `${result[2]} - ${result[3]}` : result[2]);
  }
  return { planned, passed, failed };
}
