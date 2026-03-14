import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Platform,
} from "react-native";

import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api, CartItem } from "@/lib/api";
import Colors from "@/constants/colors";

export default function CartScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["cart", user?.account_id],
    queryFn: () => api.getCart(user!.account_id),
    enabled: !!user,
  });

  const items = data?.items ?? [];
  const totalPrice = data?.total_price ?? 0;

  const handleRemove = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.removeCartItem(id);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleCheckout = () => {
    if (!user || items.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/checkout");
  };

  return (
    <View style={[styles.container]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Cart</Text>
        <View style={{ width: 42 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="shopping-cart" size={48} color={Colors.dark.textTertiary} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add products to get started</Text>
          <Pressable style={styles.browseBtn} onPress={() => router.replace("/(tabs)/products")}>
            <Text style={styles.browseBtnText}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <CartItemCard item={item} onRemove={() => handleRemove(item.id)} />
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
          />

          <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>₹{totalPrice.toLocaleString()}</Text>
              </View>
              <View style={styles.deliveryNotice}>
                <Feather name="truck" size={12} color={Colors.primary} />
                <Text style={styles.deliveryNoticeText}>+₹99 delivery{"\n"}Free in Chennai &gt;1 kg</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.checkoutBtn, pressed && { opacity: 0.85 }]}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
              <Feather name="arrow-right" size={18} color="#000" />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function CartItemCard({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  return (
    <View style={styles.cartCard}>
      <View style={styles.cartIcon}>
        <Feather name="package" size={20} color={Colors.primary} />
      </View>
      <View style={styles.cartInfo}>
        <Text style={styles.cartName}>{item.product_name}</Text>
        <Text style={styles.cartGrams}>{item.grams}g</Text>
        <Text style={styles.cartPrice}>₹{item.price.toLocaleString()}</Text>
      </View>
      <Pressable onPress={onRemove} style={styles.removeBtn}>
        <Feather name="trash-2" size={16} color={Colors.dark.error} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.dark.text,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: Colors.dark.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  browseBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  browseBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#000",
  },
  cartCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  cartIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  cartInfo: { flex: 1, gap: 3 },
  cartName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.dark.text,
  },
  cartGrams: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  cartPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.primary,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dark.error + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    padding: 20,
    gap: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.dark.text,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkoutBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#000",
  },
  deliveryNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary + "10",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary + "25",
    maxWidth: 150,
  },
  deliveryNoticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.primary,
    lineHeight: 16,
  },
});
