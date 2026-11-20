// Dos pedidos a la vez en el mismo negocio: el segundo espera al primero (el contador queda bloqueado), y si el primero
// se deshace, el siguiente toma su número: no quedan huecos. Usa el negocio DEMO del proyecto de desarrollo y dos
// conexiones que terminan deshaciendo, así que no queda nada guardado.
const DEMO_PHONE = "+51900000101";
const SALE = "select public.create_counter_sale(gen_random_uuid(), $1::jsonb, 'cash') as sale";

export default async function orderNumbersUnderConcurrency({ openSession, assert }) {
  const first = await openSession();
  const second = await openSession();
  const { rows } = await first.query(
    `select c.user_id, (select p.id from public.products p where p.business_id = b.id and p.is_active order by p.sort_order limit 1) as product_id
     from private.pin_credentials c join public.businesses b on b.owner_id = c.user_id where c.phone = $1`,
    [DEMO_PHONE],
  );
  assert.ok(
    rows[0]?.product_id,
    "hace falta el negocio DEMO con sus alfajores: pnpm owner create --demo y pnpm demo:data",
  );
  const items = JSON.stringify([{ productId: rows[0].product_id, quantity: 1 }]);
  const login = async (session) => {
    await session.query(
      "select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
      [rows[0].user_id],
    );
    await session.query("set local role authenticated");
  };

  await first.query("begin");
  await login(first);
  const created = await first.query(SALE, [items]);
  const number = created.rows[0].sale.number;

  await second.query("begin");
  await login(second);
  await second.query("set local lock_timeout = '400ms'");
  await assert.rejects(second.query(SALE, [items]), { code: "55P03" }, "el segundo pedido espera al primero");

  await first.query("rollback");
  await second.query("rollback");

  await second.query("begin");
  await login(second);
  const next = await second.query(SALE, [items]);
  assert.equal(next.rows[0].sale.number, number, "el primero se deshizo: el siguiente toma su número, sin hueco");
  await second.query("rollback");
}
