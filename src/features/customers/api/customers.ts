import { toAppError } from "@/lib/errors";
import { parseResponse } from "@/lib/parse";
import { supabase } from "@/lib/supabase";

import { customerMatchSchema, type CustomerMatch } from "../schema/customer";

// El teléfono ya normalizado (+51 y 9 dígitos)
export async function findCustomerByPhone(phone: string): Promise<CustomerMatch> {
  const { data, error } = await supabase().rpc("find_customer_by_phone", { p_phone: phone });
  if (error) throw toAppError(error);
  return parseResponse(customerMatchSchema, data);
}
