select plan(5);

select pass('pgTAP corre dentro de la transacción de prueba');

select tests.make_user('00000000-0000-4000-8000-000000000001');
select tests.login_as('00000000-0000-4000-8000-000000000001');
select is(auth.uid(), '00000000-0000-4000-8000-000000000001'::uuid, 'la sesión de prueba es la del usuario');
select is(current_user::text, 'authenticated', 'y corre con el rol authenticated');

select tests.logout();
select is(current_user::text, 'postgres', 'al salir vuelve a postgres');
select is(auth.uid(), null::uuid, 'y ya no hay sesión');

select * from finish();
