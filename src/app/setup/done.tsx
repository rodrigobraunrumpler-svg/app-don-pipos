import { useLocalSearchParams, usePreventRemove } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { Screen } from "@/components/ui/screen";
import { SetupDone, useFinishSetup } from "@/features/businesses";

// «Todo listo» es el final: lo puesto ya se guardó, así que atrás no vuelve a los pasos (corregir un número ahí no se
// guardaría) y hace lo mismo que «Ir a Inicio». Primero se suelta el freno y después se termina: la puerta del layout
// raíz lleva a Inicio sin que este freno la detenga
export default function SetupDoneRoute() {
  const { already } = useLocalSearchParams<{ already?: string }>();
  const finish = useFinishSetup();
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);
  usePreventRemove(!leaving, () => setLeaving(true));
  useEffect(() => {
    if (!leaving || started.current) return;
    started.current = true;
    void finish();
  }, [leaving, finish]);
  return (
    <Screen>
      <SetupDone alreadyDone={already === "1"} onHome={() => setLeaving(true)} />
    </Screen>
  );
}
