// Lo mínimo de Deno y de los módulos `npm:` que usan las funciones, para que `tsc -p supabase/functions` revise también
// cada index.ts (en Supabase corren en Deno, que trae sus propios tipos). Aquí se revisa nuestro código: que cada
// función llame bien a lo de `_shared` y use bien lo que le vuelve de la base
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "npm:postgres@3" {
  type Row = Record<string, unknown>;
  export interface Sql {
    <T extends Row = Row>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
    // Un valor para una columna o un parámetro jsonb (sin esto, un texto ya convertido se volvería a convertir)
    json(value: unknown): unknown;
    begin<T>(run: (tx: Sql) => Promise<T>): Promise<T>;
  }
  export default function postgres(url: string, options?: Record<string, unknown>): Sql;
}
