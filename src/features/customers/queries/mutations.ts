import { mutationOptions } from "@tanstack/react-query";

import { anonymizeCustomer, updateCustomer } from "../api/customers";

export const updateCustomerMutation = mutationOptions({ mutationFn: updateCustomer });
export const anonymizeCustomerMutation = mutationOptions({ mutationFn: anonymizeCustomer });
