import { View } from "react-native";

// Las filas grises mientras llegan los datos (solo la primera vez: después se ve lo guardado)
export function SkeletonRows({ rows }: { rows: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Cargando" className="gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} className="h-16 rounded-md bg-sunken" />
      ))}
    </View>
  );
}
