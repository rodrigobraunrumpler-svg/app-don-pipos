import { Image } from "expo-image";
import { Text, View } from "react-native";

type Size = "small" | "medium" | "large";

const PIXELS: Record<Size, number> = { small: 40, medium: 48, large: 72 };
const BOX: Record<Size, string> = { small: "h-10 w-10", medium: "h-12 w-12", large: "h-[72px] w-[72px]" };
const LETTER: Record<Size, string> = { small: "text-base", medium: "text-lg", large: "text-3xl" };
// El color de las iniciales sale del nombre: el mismo alfajor tiene siempre el mismo
const TONES = [
  "bg-caramel-soft text-caramel-text",
  "bg-olive-soft text-olive",
  "bg-sunken text-text-secondary",
] as const;

type Props = { product: { name: string; imageUrl: string | null }; size?: Size };

// La foto del alfajor (la de la web) o su inicial. El nombre siempre va al lado: el lector de pantalla no la lee
export function ProductAvatar({ product, size = "medium" }: Props) {
  if (product.imageUrl) {
    const pixels = PIXELS[size];
    return (
      <Image
        source={{ uri: product.imageUrl }}
        style={{ width: pixels, height: pixels, borderRadius: pixels / 2 }}
        contentFit="cover"
        accessible={false}
      />
    );
  }
  const tone = TONES[[...product.name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % TONES.length]!;
  const [background, text] = tone.split(" ");
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`${BOX[size]} items-center justify-center rounded-full ${background}`}
    >
      <Text className={`font-extrabold ${LETTER[size]} ${text}`}>{product.name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}
