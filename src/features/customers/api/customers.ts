import { pageSchema, type Page } from "@/lib/page";
import { orNull, rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import {
  customerMatchSchema,
  customerRowSchema,
  customerSchema,
  type Customer,
  type CustomerFilter,
  type CustomerMatch,
  type CustomerRow,
} from "../schema/customer";

// El teléfono ya normalizado (+51 y 9 dígitos)
export const findCustomerByPhone = (phone: string): Promise<CustomerMatch> =>
  rpcResult(customerMatchSchema, supabase().rpc("find_customer_by_phone", { p_phone: phone }));

// Clientes de 20 en 20, con el texto (nombre sin tildes o teléfono) y el filtro; el cursor lo da la página anterior
export const searchCustomers = (input: {
  filter: CustomerFilter;
  search: string;
  cursor: string | null;
}): Promise<Page<CustomerRow>> =>
  rpcResult(
    pageSchema(customerRowSchema),
    supabase().rpc("search_customers", {
      p_q: orNull(input.search || null),
      p_filter: input.filter,
      p_limit: 20,
      p_cursor: orNull(input.cursor),
    }),
  );

export const getCustomer = (id: string): Promise<Customer> =>
  rpcResult(customerSchema, supabase().rpc("get_customer", { p_id: id }));

// Corregir sus datos con la versión que se tenía: con otra, conflict
export const updateCustomer = (input: {
  id: string;
  expectedVersion: number;
  name: string;
  address: string;
  note: string;
  acceptsPromotions: boolean;
}): Promise<Customer> =>
  rpcResult(
    customerSchema,
    supabase().rpc("update_customer", {
      p_id: input.id,
      p_expected_version: input.expectedVersion,
      p_name: input.name,
      p_address: input.address,
      p_note: input.note,
      p_accepts_promotions: input.acceptsPromotions,
    }),
  );

// Borrar sus datos, a su pedido (Ley 29733)
export const anonymizeCustomer = (id: string): Promise<Customer> =>
  rpcResult(customerSchema, supabase().rpc("anonymize_customer", { p_id: id }));
