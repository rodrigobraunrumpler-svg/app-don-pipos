import { supabase } from "../../../lib/supabase";
import type { Order } from "../schema/order";
export const listOrders = (): Order[] => (supabase.rpc("list_orders") ? [] : []);
