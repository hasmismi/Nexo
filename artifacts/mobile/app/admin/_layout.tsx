import { Stack } from "expo-router";
import Colors from "@/constants/colors";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.dark.text, fontWeight: "700" },
        contentStyle: { backgroundColor: Colors.dark.background },
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Admin Panel" }} />
      <Stack.Screen name="orders" options={{ title: "All Orders" }} />
      <Stack.Screen name="users" options={{ title: "Users" }} />
      <Stack.Screen name="products" options={{ title: "Products" }} />
    </Stack>
  );
}
