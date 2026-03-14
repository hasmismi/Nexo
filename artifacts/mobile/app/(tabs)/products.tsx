import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

type Product = {
  id: number;
  name: string;
  description: string;
  price_per_gram: number;
  goal_id: number;
  goal_name: string;
  is_trial: boolean;
  trial_price?: number;
};

export default function ProductsScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [grams, setGrams] = useState("500");
  const [isAdding, setIsAdding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: api.getProducts,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const products = data?.products ?? [];

  const getPrice = (p: Product, g: number) => {
    if (p.is_trial) return 399;
    return parseFloat((p.price_per_gram * g).toFixed(2));
  };

  const handleAddToCart = async () => {
    if (!selectedProduct || !user) return;
    const g = parseInt(grams);
    if (!g || g < 100) {
      Alert.alert("Invalid amount", "Minimum 100 grams required.");
      return;
    }
    setIsAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.addToCart({ account_id: user.account_id, product_id: selectedProduct.id, grams: g });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setSelectedProduct(null);
      Alert.alert("Added to Cart", `${selectedProduct.name} added successfully!`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPad }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={() => (
          <View style={{ paddingTop: topPad + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
            <Text style={styles.title}>Products</Text>
            <Text style={styles.subtitle}>Premium nutrition powders, science-backed</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ProductCard product={item} onAddToCart={() => setSelectedProduct(item)} />
        )}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      />

      {/* Add to Cart Modal */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedProduct(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectedProduct(null)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.modalHandle} />

            {selectedProduct && (
              <>
                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                <Text style={styles.modalGoal}>{selectedProduct.goal_name.replace("_", " ")}</Text>

                {selectedProduct.is_trial ? (
                  <View style={styles.trialBadge}>
                    <Feather name="star" size={14} color={Colors.accent} />
                    <Text style={styles.trialText}>Trial Pack — Fixed ₹399</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.priceRate}>
                      ₹{selectedProduct.price_per_gram}/gram
                    </Text>
                    <View style={styles.gramsSection}>
                      <Text style={styles.gramsLabel}>Grams</Text>
                      <View style={styles.gramsRow}>
                        {[250, 500, 750, 1000, 1500].map((g) => (
                          <Pressable
                            key={g}
                            style={[styles.gramChip, grams === String(g) && styles.gramChipSelected]}
                            onPress={() => { Haptics.selectionAsync(); setGrams(String(g)); }}
                          >
                            <Text style={[styles.gramChipText, grams === String(g) && styles.gramChipTextSelected]}>
                              {g}g
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <TextInput
                        style={styles.gramsInput}
                        value={grams}
                        onChangeText={setGrams}
                        keyboardType="numeric"
                        placeholder="Custom grams"
                        placeholderTextColor={Colors.dark.textTertiary}
                      />
                    </View>
                  </>
                )}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    ₹{getPrice(selectedProduct, parseInt(grams) || 0).toLocaleString()}
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }, isAdding && { opacity: 0.6 }]}
                  onPress={handleAddToCart}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Feather name="shopping-cart" size={18} color="#000" />
                      <Text style={styles.addBtnText}>Add to Cart</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const goalColors: Record<string, string> = {
    weight_loss: "#FF6B35",
    muscle_gain: "#4ECDC4",
    immunity: "#45B7D1",
    energy: "#FFA07A",
    vitamins: "#98D8C8",
  };
  const color = goalColors[product.goal_name] ?? Colors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.cardIcon, { backgroundColor: color + "20" }]}>
          <Feather
            name={product.is_trial ? "star" : "package"}
            size={24}
            color={color}
          />
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{product.name}</Text>
          {product.is_trial && (
            <View style={styles.trialTag}>
              <Text style={styles.trialTagText}>TRIAL</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{product.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>
            {product.is_trial ? "₹399 flat" : `₹${product.price_per_gram}/g`}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.cardAddBtn, pressed && { opacity: 0.8 }]}
            onPress={() => { Haptics.selectionAsync(); onAddToCart(); }}
          >
            <Feather name="plus" size={16} color="#000" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.dark.text,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  card: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    gap: 14,
  },
  cardLeft: { justifyContent: "flex-start" },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.dark.text,
    flex: 1,
  },
  trialTag: {
    backgroundColor: Colors.accent + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trialTagText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1,
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  cardPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.primary,
  },
  cardAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.dark.text,
  },
  modalGoal: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accent + "15",
    borderRadius: 12,
    padding: 12,
  },
  trialText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
  priceRate: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.primary,
  },
  gramsSection: { gap: 10 },
  gramsLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    letterSpacing: 0.3,
  },
  gramsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  gramChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  gramChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "15",
  },
  gramChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  gramChipTextSelected: { color: Colors.primary },
  gramsInput: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.dark.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  totalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.dark.text,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#000",
  },
});
