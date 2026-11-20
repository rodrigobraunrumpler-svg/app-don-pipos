import { Stack } from "expo-router";

// Las pestañas abajo y, encima, cada pantalla que se abre desde ellas o desde el + (un pedido, una venta, la
// producción, un alfajor, Ajustes), sin la barra de pestañas, como la maqueta. Así «Volver» siempre regresa con su
// animación a la pantalla de antes, y ninguna queda olvidada dentro de una pestaña
export default function MainLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
