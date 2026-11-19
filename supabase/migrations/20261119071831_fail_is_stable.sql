-- private.fail solo lanza el error: no cambia nada en la base.
-- Marcada como stable, las funciones stable (como current_business_id) pueden llamarla sin que el revisor avise.
alter function private.fail(text) stable;
