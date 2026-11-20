import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { CustomersScreen, customersKeys } from "@/features/customers";
import { MessageButton } from "@/features/messages";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

// Clientes. En «No vuelven», «Escribirle» abre WhatsApp con el mensaje «te extrañamos» (de messages), solo para quien
// aceptó promociones
export default function Customers() {
  useRefreshOnFocus(customersKeys.all);
  return (
    <Screen>
      <CustomersScreen
        onBack={() => router.back()}
        onOpen={(id) => router.navigate({ pathname: "/customers/[id]", params: { id } })}
        lapsedAction={(customer) =>
          customer.phone ? (
            <MessageButton
              templateKey="we_miss_you"
              context={{ nombre: customer.name.replace(/ .*/, "") }}
              phone={customer.phone}
              label="Escribirle"
            />
          ) : null
        }
      />
    </Screen>
  );
}
