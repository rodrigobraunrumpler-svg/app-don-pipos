-- private.stock_items devuelve como mucho 50 alfajores. Sin decirlo, la base calcula 1,000 filas y, al juntarlas con
-- products, prefiere leer la tabla entera (el medidor lo marcó en create_order con 25,000 productos)
alter function private.stock_items(uuid, jsonb, text, integer, integer) rows 50;
