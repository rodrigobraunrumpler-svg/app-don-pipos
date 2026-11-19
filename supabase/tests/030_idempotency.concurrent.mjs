// Dos reintentos a la vez con el mismo código: el segundo espera al primero y no crea otra cosa.
// Usa dos conexiones; las dos terminan deshaciendo, así que no queda nada guardado.
const BUSINESS = "00000000-0000-4000-8000-0000000000a1";
const REQUEST = "00000000-0000-4000-8000-000000000901";
const CLAIM = "select private.claim_request($1, $2, 'create_order') as response";

export default async function idempotencyUnderConcurrency({ openSession, assert }) {
  const first = await openSession();
  const second = await openSession();

  await first.query("begin");
  const claimed = await first.query(CLAIM, [BUSINESS, REQUEST]);
  assert.equal(claimed.rows[0].response, null, "la primera llamada no encuentra nada guardado");

  await second.query("begin");
  await second.query("set local lock_timeout = '400ms'");
  await assert.rejects(
    second.query(CLAIM, [BUSINESS, REQUEST]),
    { code: "55P03" },
    "la segunda llamada espera a la primera",
  );

  await first.query("rollback");
  await second.query("rollback");

  await second.query("begin");
  const retried = await second.query(CLAIM, [BUSINESS, REQUEST]);
  assert.equal(retried.rows[0].response, null, "cuando la primera se deshace, la segunda sigue como si fuera nueva");
  await second.query("rollback");
}
