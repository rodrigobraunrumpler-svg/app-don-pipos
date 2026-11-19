import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode };

// Una hoja que sube desde abajo (Anotar merma, Contar stock, Editar producto). Se cierra tocando el fondo o con «atrás».
// El fondo es un botón «Cerrar» que el lector de pantalla de Android alcanza (Modal abre su propia ventana)
export function Sheet({ visible, title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {/* Con el teclado abierto, la hoja sube: el campo y «Guardar» quedan a la vista */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onClose}
          className="absolute inset-0 bg-text opacity-40"
        />
        <View
          className="max-h-[90%] rounded-t-lg bg-background px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-border-strong" />
          <Text accessibilityRole="header" className="mb-3 font-extrabold text-xl text-text">
            {title}
          </Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
