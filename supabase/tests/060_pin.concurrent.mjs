// Dos intentos a la vez con el mismo número: el segundo espera al primero, así el contador no se salta ninguno.
// Usa dos conexiones; las dos terminan deshaciendo, así que no queda nada guardado.
const PHONE = "+51900000988";
const CHECK = "select private.check_pin($1, '000001') as result";

export default async function attemptsUnderConcurrency({ openSession, assert }) {
  const first = await openSession();
  const second = await openSession();

  await first.query("begin");
  const { rows } = await first.query(CHECK, [PHONE]);
  assert.deepEqual(rows[0].result, { status: "wrong_pin", attemptsLeft: 4 }, "el primer intento cuenta");

  await second.query("begin");
  await second.query("set local lock_timeout = '400ms'");
  await assert.rejects(second.query(CHECK, [PHONE]), { code: "55P03" }, "el segundo intento espera al primero");

  await first.query("rollback");
  await second.query("rollback");
}
