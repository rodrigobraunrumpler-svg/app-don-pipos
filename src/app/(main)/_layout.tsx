import { Stack } from "expo-router";

import { useRefreshAfterWrites } from "@/features/reports";

// Las pestañas abajo y, encima, cada pantalla que se abre desde ellas o desde el + (un pedido, una venta, la
// producción, un alfajor, Por cobrar, Ajustes), sin la barra de pestañas, como la maqueta. Así «Volver» siempre
// regresa con su animación a la pantalla de antes, y ninguna queda olvidada dentro de una pestaña. Entran
// deslizándose desde la derecha y salen hacia ella: el recorrido se ve (pedido del dueño: navegación suave)
export default function MainLayout() {
  // Inicio y Reportes se ponen al día después de cada guardado, se haga en la pantalla que se haga
  useRefreshAfterWrites();
  return <Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }} />;
}
