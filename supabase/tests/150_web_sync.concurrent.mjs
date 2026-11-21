// Dos llamadas a sync-to-web a la vez (el trigger y el cron): la segunda no toma nada mientras la primera manda, así un
// alfajor nunca sale dos veces ni en desorden. Usa dos conexiones; las dos terminan deshaciendo: no queda nada guardado.
const RUN_LOCK = "select pg_try_advisory_xact_lock(hashtext('sync-to-web')) as free";

export default async function webSyncRunsOneAtATime({ openSession, assert }) {
  const first = await openSession();
  const second = await openSession();

  await first.query("begin");
  await first.query("select private.claim_web_sync()");

  await second.query("begin");
  await second.query("set local lock_timeout = '400ms'");
  const { rows } = await second.query("select private.claim_web_sync() as items");
  assert.deepEqual(rows[0].items, [], "mientras la primera manda, la segunda vuelve sin nada y sin esperar");
  assert.equal((await second.query(RUN_LOCK)).rows[0].free, false, "porque la primera tiene la vez");

  await first.query("rollback");
  assert.equal((await second.query(RUN_LOCK)).rows[0].free, true, "cuando la primera termina, la siguiente sí puede");
  await second.query("rollback");
}
