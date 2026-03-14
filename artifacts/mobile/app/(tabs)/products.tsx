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
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
  key_benefits: string[];
  icon_color: string;
  icon_emoji: string;
};

export default function ProductsScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [grams, setGrams] = useState("500");
  const [isAdding, setIsAdding] = useState(false);

  const [trialVisible, setTrialVisible] = useState(false);
  const [trialSelections, setTrialSelections] = useState<number[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: api.getProducts,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const allProducts = data?.products ?? [];
  const regularProducts = allProducts.filter((p) => !p.is_trial);
  const trialPack = allProducts.find((p) => p.is_trial);

  const handleAddToCart = async (product: Product, g: number) => {
    if (!user) return;
    if (!g || g < 50) {
      Alert.alert("Invalid amount", "Minimum 50 grams required.");
      return;
    }
    setIsAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.addToCart({ account_id: user.account_id, product_id: product.id, grams: g });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setDetailProduct(null);
      Alert.alert("Added to Cart", `${product.name} added successfully!`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTrialProduct = (id: number) => {
    Haptics.selectionAsync();
    if (trialSelections.includes(id)) {
      setTrialSelections(trialSelections.filter((x) => x !== id));
    } else if (trialSelections.length < 2) {
      setTrialSelections([...trialSelections, id]);
    }
  };

  const handleAddTrialToCart = async () => {
    if (!user || !trialPack || trialSelections.length !== 2) return;
    
    // Check if trial pack is already in cart
    const cartRes = await api.getCart(user.account_id);
    const trialInCart = cartRes.items.some(item => item.product_id === trialPack.id);
    if (trialInCart) {
      Alert.alert("Trial Pack Limit", "You can only purchase the trial pack once. It's already in your cart!");
      return;
    }
    
    setIsAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.addToCart({ account_id: user.account_id, product_id: trialPack.id, grams: 350 });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setTrialVisible(false);
      const p1 = regularProducts.find((p) => p.id === trialSelections[0])?.name;
      const p2 = regularProducts.find((p) => p.id === trialSelections[1])?.name;
      Alert.alert("Trial Pack Added!", `${p1} + ${p2} (175g each) added to cart for ₹399.`);
      setTrialSelections([]);
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
    <View style={styles.container}>
      <FlatList
        data={regularProducts}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={() => (
          <View style={{ paddingTop: topPad + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
            <Text style={styles.title}>Products</Text>
            <Text style={styles.subtitle}>Premium natural nutrition powders</Text>

            {trialPack && (
              <Pressable
                style={({ pressed }) => [styles.trialBanner, pressed && { opacity: 0.85 }]}
                onPress={() => { Haptics.selectionAsync(); setTrialSelections([]); setTrialVisible(true); }}
              >
                <View style={styles.trialBannerLeft}>
                  <View style={styles.trialBannerIconWrap}>
                    {Platform.OS === "android" ? (
                      <Feather name="star" size={32} color={Colors.accent} />
                    ) : (
                      <MaterialCommunityIcons name="star-circle" size={32} color={Colors.accent} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.trialBannerTitle}>Try Nexo for 7 Days</Text>
                    <Text style={styles.trialBannerSub}>Pick any 2 products · 175g each · ₹399</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={Colors.accent} />
              </Pressable>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => { setGrams("500"); setDetailProduct(item); }} />
        )}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Product Detail Modal */}
      <Modal
        visible={!!detailProduct}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailProduct(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setDetailProduct(null)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {detailProduct && (
                <>
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailIconBig, { backgroundColor: detailProduct.icon_color + "20" }]}>
                      {Platform.OS === "android" ? (
                        <Feather name="droplet" size={34} color={detailProduct.icon_color} />
                      ) : (
                        <MaterialCommunityIcons name={detailProduct.icon_emoji as any} size={34} color={detailProduct.icon_color} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailName}>{detailProduct.name}</Text>
                      {detailProduct.goal_name ? (
                        <Text style={styles.detailGoal}>{detailProduct.goal_name}</Text>
                      ) : null}
                      <Text style={[styles.detailPrice, { color: detailProduct.icon_color }]}>
                        ₹{detailProduct.price_per_gram}/g
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detailDesc}>{detailProduct.description}</Text>

                  {detailProduct.key_benefits?.length > 0 && (
                    <View style={styles.benefitsSection}>
                      <Text style={styles.benefitsTitle}>Key Benefits</Text>
                      {detailProduct.key_benefits.map((b, i) => (
                        <View key={i} style={styles.benefitRow}>
                          <View style={[styles.benefitDot, { backgroundColor: detailProduct.icon_color }]} />
                          <Text style={styles.benefitText}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.gramsSection}>
                    <Text style={styles.gramsLabel}>Select Amount</Text>
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

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      ₹{(detailProduct.price_per_gram * (parseInt(grams) || 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.addBtn, { backgroundColor: detailProduct.icon_color }, pressed && { opacity: 0.85 }, isAdding && { opacity: 0.6 }]}
                    onPress={() => handleAddToCart(detailProduct, parseInt(grams) || 0)}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Feather name="shopping-cart" size={18} color="#fff" />
                        <Text style={styles.addBtnText}>Add to Cart</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Trial Pack Modal */}
      <Modal
        visible={trialVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTrialVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setTrialVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nexo Trial Pack ⭐</Text>
            <Text style={styles.modalSub}>
              Pick exactly 2 products · 175g each · 50g/day for 7 days
            </Text>
            <Text style={[styles.modalSub, { color: Colors.accent, fontFamily: "Inter_600SemiBold", marginTop: -4 }]}>
              Fixed price: ₹399
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {regularProducts.map((p) => {
                const sel = trialSelections.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.trialRow, sel && styles.trialRowSelected]}
                    onPress={() => toggleTrialProduct(p.id)}
                  >
                    <View style={[styles.trialIcon, { backgroundColor: p.icon_color + "20" }]}>
                      {Platform.OS === "android" ? (
                        <Feather name="droplet" size={22} color={p.icon_color} />
                      ) : (
                        <MaterialCommunityIcons name={p.icon_emoji as any} size={22} color={p.icon_color} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.trialProductName, sel && { color: Colors.primary }]}>{p.name}</Text>
                      <Text style={styles.trialProductSub}>175g · {p.goal_name}</Text>
                    </View>
                    {sel && (
                      <View style={styles.trialCheck}>
                        <Feather name="check" size={12} color="#000" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.trialCounter}>{trialSelections.length}/2 selected</Text>

            <Pressable
              style={[styles.addBtn, { backgroundColor: Colors.accent }, (isAdding || trialSelections.length !== 2) && { opacity: 0.5 }]}
              onPress={handleAddTrialToCart}
              disabled={isAdding || trialSelections.length !== 2}
            >
              {isAdding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="shopping-cart" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>Add Trial Pack · ₹399</Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
    >
      <View style={[styles.cardIcon, { backgroundColor: product.icon_color + "20" }]}>
        {Platform.OS === "android" ? (
          <Feather name="droplet" size={26} color={product.icon_color} />
        ) : (
          <MaterialCommunityIcons name={product.icon_emoji as any} size={26} color={product.icon_color} />
        )}
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{product.name}</Text>
          <Text style={[styles.cardPrice, { color: product.icon_color }]}>
            ₹{product.price_per_gram}/g
          </Text>
        </View>

        {product.goal_name ? (
          <Text style={styles.cardGoal}>{product.goal_name}</Text>
        ) : null}

        <Text
          style={styles.cardDesc}
          numberOfLines={expanded ? undefined : 2}
        >
          {product.description}
        </Text>

        <View style={styles.cardFooter}>
          <Pressable
            onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); setExpanded((v) => !v); }}
            style={styles.readMoreBtn}
          >
            <Text style={styles.readMoreText}>{expanded ? "Show less" : "Read more"}</Text>
            <Feather name={expanded ? "chevron-up" : "chevron-down"} size={13} color={Colors.blue} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cardAddBtn, { backgroundColor: product.icon_color }, pressed && { opacity: 0.8 }]}
            onPress={() => { Haptics.selectionAsync(); onPress(); }}
          >
            <Feather name="plus" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.dark.background, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.dark.text },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary, marginTop: 4, marginBottom: 16 },
  trialBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.accent + "15", borderWidth: 1, borderColor: Colors.accent + "40", borderRadius: 16, padding: 16 },
  trialBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  trialBannerIconWrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  trialBannerTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.dark.text },
  trialBannerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  card: { flexDirection: "row", backgroundColor: Colors.dark.surface, marginHorizontal: 20, marginBottom: 12, borderRadius: 18, borderWidth: 1, borderColor: Colors.dark.border, padding: 16, gap: 14 },
  cardIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardContent: { flex: 1, gap: 3 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.dark.text, flex: 1 },
  cardPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  cardGoal: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.dark.textSecondary, lineHeight: 19, marginTop: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  readMoreBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  readMoreText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.blue },
  cardAddBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.dark.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.dark.border, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.dark.text },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary },
  detailHeader: { flexDirection: "row", gap: 16, marginBottom: 16, alignItems: "flex-start" },
  detailIconBig: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  detailName: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.dark.text, lineHeight: 26 },
  detailGoal: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.dark.textSecondary, marginTop: 2 },
  detailPrice: { fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 4 },
  detailDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary, lineHeight: 22, marginBottom: 16 },
  benefitsSection: { backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 16, marginBottom: 16, gap: 10 },
  benefitsTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.dark.text, marginBottom: 4 },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  benefitDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  benefitText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.dark.textSecondary, lineHeight: 20, flex: 1 },
  gramsSection: { gap: 10, marginBottom: 12 },
  gramsLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.textSecondary, letterSpacing: 0.3 },
  gramsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  gramChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.surface },
  gramChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + "15" },
  gramChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.textSecondary },
  gramChipTextSelected: { color: Colors.primary },
  gramsInput: { backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.dark.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.dark.border, marginBottom: 8 },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.dark.textSecondary },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.dark.text },
  addBtn: { borderRadius: 16, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  trialRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.surface, marginBottom: 8 },
  trialRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + "10" },
  trialIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  trialProductName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.dark.text },
  trialProductSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  trialCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  trialCounter: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.textSecondary, textAlign: "center" },
});
