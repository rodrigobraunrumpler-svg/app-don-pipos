import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, Tabs, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { NewMenu } from "@/features/orders";
import { fonts, useTheme } from "@/theme";

// Las pestañas: Inicio, Pedidos, +, Stock y Más. El + abre «¿Qué quieres anotar?»
export default function TabsLayout() {
  const { colors } = useTheme();
  const [menu, setMenu] = useState(false);
  const go = (href: Href) => {
    setMenu(false);
    router.navigate(href);
  };
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          // Las pestañas se deslizan un poco hacia el lado de la que se toca: nunca un salto seco
          animation: "shift",
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
          name="orders"
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Anotar"
                onPress={() => setMenu(true)}
                className="flex-1 items-center justify-center"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                  <MaterialCommunityIcons name="plus" size={26} color={colors.onPrimary} />
                </View>
              </Pressable>
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
      <NewMenu
        visible={menu}
        onClose={() => setMenu(false)}
        onOrder={() => go("/orders/new")}
        onCounterSale={() => go("/orders/counter")}
        onProduction={() => go("/stock/production")}
      />
    </>
  );
}
