import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// El consejo de la primera vez («Anota tu primer pedido»): la puesta en marcha deja una marca en el celular y Inicio lo
// muestra hasta «Entendido». Vive en lib porque lo escribe businesses y lo lee reports
const KEY = "donpipos.firstTip";

export async function markFirstTip(): Promise<void> {
  await AsyncStorage.setItem(KEY, "pending");
}

export function useFirstTip(): { visible: boolean; dismiss: () => void } {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY).then((value) => {
      if (active) setVisible(value === "pending");
    });
    return () => {
      active = false;
    };
  }, []);
  return {
    visible,
    dismiss: () => {
      setVisible(false);
      void AsyncStorage.removeItem(KEY);
    },
  };
}
