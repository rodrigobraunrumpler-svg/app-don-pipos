select plan(6);

select throws_ok($$select private.fail('invalid')$$, 'P0001', 'invalid', 'fail avisa invalid');
select throws_ok($$select private.fail('not_found')$$, 'P0001', 'not_found', 'fail avisa not_found');
select throws_ok($$select private.fail('forbidden')$$, 'P0001', 'forbidden', 'fail avisa forbidden');
select throws_ok($$select private.fail('conflict')$$, 'P0001', 'conflict', 'fail avisa conflict');
select throws_ok($$select private.fail('otro')$$, 'XX000', null, 'un código que no existe es un error interno');
select has_function('private', 'set_updated_at', 'existe el trigger común de updated_at');

select * from finish();
