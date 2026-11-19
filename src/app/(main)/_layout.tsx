import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { View } from "react-native";

import { fonts, useTheme } from "@/theme";

// Las pestañas: Inicio, Pedidos, +, Stock y Más. El + se ve, pero se activa con los pedidos (fase 4)
export default function MainLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bold },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name="home-outline"
              color={focused ? colors.primary : colors.textMuted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              color={focused ? colors.primary : colors.textMuted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: "Anotar",
          tabBarButton: () => (
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel="Anotar"
              accessibilityState={{ disabled: true }}
              className="flex-1 items-center justify-center opacity-45"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                <MaterialCommunityIcons name="plus" size={26} color={colors.onPrimary} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name="package-variant-closed"
              color={focused ? colors.primary : colors.textMuted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Más",
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name="dots-horizontal"
              color={focused ? colors.primary : colors.textMuted}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
