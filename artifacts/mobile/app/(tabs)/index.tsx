import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
  Alert,
  TextInput,
} from "react-native";
import { ConfirmModal, Toast } from "@/components/AppAlert";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

const GOALS_LIST = [
  { id: 6,  name: "Muscle Gain",                      mci: "weight-lifter",  color: "#D9342B" },
  { id: 7,  name: "Weight Loss",                       mci: "run",            color: "#A8A8B3" },
  { id: 8,  name: "Improved Brain Performance",        mci: "brain",          color: "#F5C518" },
  { id: 9,  name: "Increase Energy Levels",            mci: "lightning-bolt", color: "#1A6FBF" },
  { id: 10, name: "Kids Health",                       mci: "account-child",  color: "#FF8C00" },
  { id: 11, name: "Overall Senior Health Improvement", mci: "heart",          color: "#6A0DAD" },
  { id: 13, name: "Blood Sugar Management",            mci: "water-plus",     color: "#008080" },
];

export default function DashboardScreen() {
  const { user, logout, setUser } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [editGoalsVisible, setEditGoalsVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<{ id: number; rank: number }[]>([]);
  const [newHeight, setNewHeight] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [cartToast, setCartToast] = useState(false);
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const claimAdmin = async () => {
    if (!user) return;
    setClaimingAdmin(true);
    try {
      const result = await api.adminBootstrap(user.account_id);
      if (result.success) {
        setUser({ ...user, is_admin: true });
        setAdminToast("You are now an admin!");
      }
    } catch (err: any) {
      setAdminToast(err.message ?? "Failed to claim admin");
    } finally {
      setClaimingAdmin(false);
    }
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard", user?.account_id],
    queryFn: () => api.getDashboard(user!.account_id),
    enabled: !!user,
  });

  const { data: cartData } = useQuery({
    queryKey: ["cart", user?.account_id],
    queryFn: () => api.getCart(user!.account_id),
    enabled: !!user,
  });

  const cartCount = cartData?.items?.length ?? 0;
  const handleRefresh = useCallback(() => { refetch(); }, [refetch]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const openEditGoals = () => {
    const current = (data?.user_goals ?? []).map((g) => ({ id: g.goal_id, rank: g.rank }));
    setSelectedGoals(current);
    setEditGoalsVisible(true);
  };

  const toggleGoal = (id: number) => {
    Haptics.selectionAsync();
    const existing = selectedGoals.find((g) => g.id === id);
    if (existing) {
      setSelectedGoals(selectedGoals.filter((g) => g.id !== id));
    } else if (selectedGoals.length < 2) {
      setSelectedGoals([...selectedGoals, { id, rank: selectedGoals.length + 1 }]);
    }
  };

  const saveGoals = async () => {
    if (!user || selectedGoals.length === 0) return;
    setIsSavingGoals(true);
    try {
      await api.updateGoals({
        account_id: user.account_id,
        goals: selectedGoals.map((g) => ({ goal_id: g.id, rank: g.rank })),
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setEditGoalsVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setIsSavingGoals(false);
    }
  };

  const openEditProfile = () => {
    setNewHeight(String(data?.profile?.height_cm ?? ""));
    setNewWeight(String(data?.profile?.weight_kg ?? ""));
    setEditProfileVisible(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await api.updateProfile({
        account_id: user.account_id,
        height_cm: parseFloat(newHeight),
        weight_kg: parseFloat(newWeight),
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setEditProfileVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const addPlanToCart = async () => {
    if (!user || !data?.recommendations?.length) return;
    setIsAddingToCart(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      for (const rec of data.recommendations) {
        await api.addToCart({
          account_id: user.account_id,
          product_id: rec.product_id,
          grams: rec.grams,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setCartToast(true);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPad }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Building your plan...</Text>
      </View>
    );
  }

  const profile = data?.profile;
  const recommendations = data?.recommendations ?? [];
  const userGoals = data?.user_goals ?? [];
  const totalGrams = data?.total_grams_per_month ?? 0;
  const gramsPerDay = data?.grams_per_day ?? 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 96 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>{profile?.name ?? "—"}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/cart"); }}
            >
              <Feather name="shopping-cart" size={20} color={Colors.dark.text} />
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={styles.headerBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setLogoutVisible(true);
              }}
            >
              <Feather name="log-out" size={20} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Certifications Strip */}
        <View style={styles.certStrip}>
          <CertBadge emoji="❤️" text="Made with Love" />
          <CertBadge emoji="🌱" text="Vegan" />
          <CertBadge emoji="🐇" text="Cruelty Free" />
          <CertBadge emoji="✅" text="FSSAI Approved" />
        </View>

        {/* BMI Card */}
        {profile && (
          <View style={styles.bmiCard}>
            <View style={styles.bmiHeader}>
              <Text style={styles.bmiTitle}>Your Stats</Text>
              <Pressable onPress={openEditProfile} style={styles.editBtn}>
                <Feather name="edit-2" size={13} color={Colors.blue} />
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.bmiRow}>
              <MetricItem label="BMI" value={profile.bmi.toFixed(1)} accent />
              <MetricItem label="Height" value={`${profile.height_cm}cm`} />
              <MetricItem label="Weight" value={`${profile.weight_kg}kg`} />
              <MetricItem label="Age" value={String(profile.age)} />
            </View>
          </View>
        )}

        {/* Nutrition Goals */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Your Nutrition Goals</Text>
            <Pressable onPress={openEditGoals} style={styles.editBtn}>
              <Feather name="edit-2" size={13} color={Colors.blue} />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          </View>
          <View style={styles.goalsRow}>
            {userGoals.length === 0 ? (
              <Text style={styles.noGoals}>No goals selected</Text>
            ) : (
              userGoals.map((g) => {
                const meta = GOALS_LIST.find((gl) => gl.id === g.goal_id);
                return (
                  <View key={g.goal_id} style={[styles.goalChip, { borderColor: (meta?.color ?? Colors.primary) + "50" }]}>
                    {Platform.OS === "android" ? (
                      <Feather name="circle" size={15} color={meta?.color ?? Colors.primary} />
                    ) : (
                      <MaterialCommunityIcons name={(meta?.mci ?? "star") as any} size={15} color={meta?.color ?? Colors.primary} />
                    )}
                    <Text style={styles.goalChipText}>{g.goal_name}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Recommended Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Nutrition Plan</Text>

          {recommendations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="alert-circle" size={24} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyText}>No recommendations yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Feather name="calendar" size={16} color={Colors.primary} />
                  <Text style={styles.planHeaderText}>30-Day Supply</Text>
                </View>
                {recommendations.map((rec, i) => (
                  <View key={rec.product_id} style={[styles.planItem, i > 0 && styles.planItemBorder]}>
                    <View style={styles.planItemLeft}>
                      <View style={[styles.planIconWrap, { backgroundColor: (rec.icon_color ?? Colors.primary) + "22" }]}>
                        {Platform.OS === "android" ? (
                          <Feather name="droplet" size={20} color={rec.icon_color ?? Colors.primary} />
                        ) : (
                          <MaterialCommunityIcons name={(rec.icon_emoji ?? "pill") as any} size={20} color={rec.icon_color ?? Colors.primary} />
                        )}
                      </View>
                      <View>
                        <Text style={styles.planProductName}>{rec.product_name}</Text>
                        <Text style={styles.planGoal}>{rec.goal_name}</Text>
                      </View>
                    </View>
                    <View style={styles.planItemRight}>
                      <Text style={styles.planGrams}>{rec.grams}g</Text>
                      <Text style={styles.planPerDay}>{rec.grams_per_day}g/day</Text>
                      <Text style={styles.planPrice}>₹{(rec.price_per_gram * rec.grams).toFixed(0)}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.servingCard}>
                <View style={styles.servingIcon}>
                  <Feather name="sun" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.servingLabel}>Daily Serving</Text>
                  <Text style={styles.servingValue}>{gramsPerDay.toFixed(0)}g total</Text>
                  {recommendations.length > 1 && (
                    <Text style={styles.servingBreakdown}>
                      {recommendations.map((r) => `${r.grams_per_day}g ${r.product_name}`).join(" + ")}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.totalCard}>
                <View style={[styles.servingIcon, { backgroundColor: Colors.accent + "15" }]}>
                  <Feather name="package" size={18} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.servingLabel}>Monthly Total</Text>
                  <Text style={[styles.servingValue, { color: Colors.accent }]}>{totalGrams}g</Text>
                </View>
              </View>

              {(() => {
                const hasNutrition = recommendations.some((r: any) => r.nutrition_energy_kcal != null);
                if (!hasNutrition) return null;
                const totalEnergy = recommendations.reduce((s: number, r: any) => s + (r.nutrition_energy_kcal ?? 0) * (r.grams_per_day / 100), 0);
                const totalProtein = recommendations.reduce((s: number, r: any) => s + (r.nutrition_protein_g ?? 0) * (r.grams_per_day / 100), 0);
                const totalCarbs = recommendations.reduce((s: number, r: any) => s + (r.nutrition_carbs_g ?? 0) * (r.grams_per_day / 100), 0);
                const totalFat = recommendations.reduce((s: number, r: any) => s + (r.nutrition_fat_g ?? 0) * (r.grams_per_day / 100), 0);
                const totalFibre = recommendations.reduce((s: number, r: any) => s + (r.nutrition_fibre_g ?? 0) * (r.grams_per_day / 100), 0);
                return (
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionCardTitle}>Daily Nutrition Summary</Text>
                    <Text style={styles.nutritionCardSub}>Based on your {gramsPerDay.toFixed(0)}g/day plan</Text>
                    <View style={styles.nutritionGrid}>
                      <NutrientPill label="Energy" value={`${totalEnergy.toFixed(0)} kcal`} color={Colors.accent} />
                      <NutrientPill label="Protein" value={`${totalProtein.toFixed(1)}g`} color="#00C27B" />
                      <NutrientPill label="Carbs" value={`${totalCarbs.toFixed(1)}g`} color="#F5C518" />
                      <NutrientPill label="Fat" value={`${totalFat.toFixed(1)}g`} color="#FF8C00" />
                      <NutrientPill label="Fibre" value={`${totalFibre.toFixed(1)}g`} color="#6A9AC4" />
                    </View>
                  </View>
                );
              })()}

              <Pressable
                style={({ pressed }) => [styles.addPlanBtn, pressed && { opacity: 0.85 }, isAddingToCart && { opacity: 0.6 }]}
                onPress={addPlanToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Feather name="shopping-cart" size={18} color="#000" />
                    <Text style={styles.addPlanBtnText}>Add Plan to Cart</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionCard icon="shopping-bag" label="Products" onPress={() => router.push("/(tabs)/products")} />
            <ActionCard icon="shopping-cart" label="Cart" badge={cartCount} onPress={() => router.push("/cart")} />
            <ActionCard icon="box" label="My Orders" onPress={() => router.push("/orders")} />
            <ActionCard icon="headphones" label="Support" onPress={() => router.push("/support")} />
            {user?.is_admin ? (
              <ActionCard icon="shield" label="Admin Panel" onPress={() => router.push("/admin")} color={Colors.primary} />
            ) : (
              <ActionCard
                icon="shield"
                label={claimingAdmin ? "Claiming…" : "Claim Admin"}
                onPress={claimAdmin}
                color={Colors.dark.textTertiary}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Goals Modal */}
      <Modal visible={editGoalsVisible} animationType="slide" transparent onRequestClose={() => setEditGoalsVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setEditGoalsVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Nutrition Goals</Text>
            <Text style={styles.modalSub}>Select up to 2 goals</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.goalsGrid}>
                {GOALS_LIST.map((goal) => {
                  const sel = selectedGoals.find((g) => g.id === goal.id);
                  return (
                    <Pressable
                      key={goal.id}
                      style={[styles.goalCard, !!sel && styles.goalCardSelected]}
                      onPress={() => toggleGoal(goal.id)}
                    >
                      <View style={[styles.goalCardIconWrap, { backgroundColor: goal.color + "22" }]}>
                        {Platform.OS === "android" ? (
                          <Feather name="circle" size={22} color={goal.color} />
                        ) : (
                          <MaterialCommunityIcons name={goal.mci as any} size={22} color={goal.color} />
                        )}
                      </View>
                      <Text style={[styles.goalCardName, !!sel && { color: Colors.primary }]}>{goal.name}</Text>
                      {sel && (
                        <View style={styles.checkCircle}>
                          <Feather name="check" size={10} color="#000" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable
              style={[styles.saveBtn, (isSavingGoals || selectedGoals.length === 0) && { opacity: 0.6 }]}
              onPress={saveGoals}
              disabled={isSavingGoals || selectedGoals.length === 0}
            >
              {isSavingGoals ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Goals</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editProfileVisible} animationType="slide" transparent onRequestClose={() => setEditProfileVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setEditProfileVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Update Measurements</Text>
            <Text style={styles.modalSub}>Your plan adjusts to your current stats</Text>
            <View style={styles.profileRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.profileInput}
                  value={newHeight}
                  onChangeText={setNewHeight}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.dark.textTertiary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.profileInput}
                  value={newWeight}
                  onChangeText={setNewWeight}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.dark.textTertiary}
                />
              </View>
            </View>
            <Pressable
              style={[styles.saveBtn, isSavingProfile && { opacity: 0.6 }]}
              onPress={saveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={logoutVisible}
        title="Log Out"
        message="Are you sure you want to log out?"
        onDismiss={() => setLogoutVisible(false)}
        buttons={[
          { text: "Cancel", style: "cancel" },
          { text: "Log Out", style: "destructive", onPress: () => logout() },
        ]}
      />

      <Toast
        visible={cartToast}
        message="Added to cart!"
        icon="shopping-cart"
        onHide={() => setCartToast(false)}
      />
      <Toast
        visible={!!adminToast}
        message={adminToast ?? ""}
        icon="shield"
        onHide={() => setAdminToast(null)}
      />
    </>
  );
}

function NutrientPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.nutrientPill, { borderColor: color + "40" }]}>
      <Text style={[styles.nutrientValue, { color }]}>{value}</Text>
      <Text style={styles.nutrientLabel}>{label}</Text>
    </View>
  );
}

function CertBadge({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.certBadge}>
      <Text style={styles.certEmoji}>{emoji}</Text>
      <Text style={styles.certText}>{text}</Text>
    </View>
  );
}

function MetricItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.metricItem}>
      <Text style={[styles.metricValue, accent && { color: Colors.primary }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, label, badge, onPress, color }: { icon: string; label: string; badge?: number; onPress: () => void; color?: string }) {
  const iconColor = color ?? Colors.primary;
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.75 }]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
    >
      <View style={styles.actionIconWrap}>
        <Feather name={icon as any} size={22} color={iconColor} />
        {!!badge && badge > 0 && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.dark.background, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.dark.textSecondary },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 16 },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary },
  userName: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.dark.text, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.dark.border },
  badge: { position: "absolute", top: -4, right: -4, backgroundColor: Colors.primary, borderRadius: 8, width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#000" },
  certStrip: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 20, flexWrap: "wrap" },
  certBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  certEmoji: { fontSize: 13 },
  certText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.dark.textSecondary },
  bmiCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: Colors.dark.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.border, padding: 18 },
  bmiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  bmiTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.dark.textSecondary },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.blue + "15", borderWidth: 1, borderColor: Colors.blue + "30" },
  editBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.blue },
  bmiRow: { flexDirection: "row", justifyContent: "space-between" },
  metricItem: { alignItems: "center", flex: 1 },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.dark.text },
  metricLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.dark.textSecondary, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: Colors.dark.text },
  goalsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  noGoals: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.dark.textTertiary },
  goalChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.primary + "40", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  goalChipEmoji: { fontSize: 16 },
  goalChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.text },
  emptyCard: { backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.border, padding: 32, alignItems: "center", gap: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textTertiary },
  planCard: { backgroundColor: Colors.dark.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.border, overflow: "hidden", marginBottom: 12 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.primary + "08" },
  planHeaderText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary, letterSpacing: 0.3 },
  planItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  planItemBorder: { borderTopWidth: 1, borderTopColor: Colors.dark.border },
  planItemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  planIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planProductName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.dark.text },
  planGoal: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  planItemRight: { alignItems: "flex-end" },
  planGrams: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.dark.text },
  planPerDay: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  planPrice: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary, marginTop: 2 },
  servingCard: { backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  totalCard: { backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  servingIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary + "15", alignItems: "center", justifyContent: "center" },
  servingLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.dark.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  servingValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.primary, marginTop: 2 },
  servingBreakdown: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  addPlanBtn: { backgroundColor: Colors.primary, borderRadius: 16, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  addPlanBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#000" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: { width: "47%", backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.border, padding: 18, gap: 10 },
  actionIconWrap: { position: "relative", width: 40 },
  actionBadge: { position: "absolute", top: -5, right: -10, backgroundColor: Colors.primary, borderRadius: 8, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  actionBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#000" },
  actionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.dark.text },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.dark.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, maxHeight: "85%" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.dark.border, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.dark.text },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary, marginBottom: 8 },
  goalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 8 },
  goalCard: { width: "47%", backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 14, padding: 14, alignItems: "flex-start", gap: 6 },
  goalCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + "10" },
  goalCardIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  goalCardName: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.dark.text, lineHeight: 17 },
  checkCircle: { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#000" },
  profileRow: { flexDirection: "row", gap: 12 },
  profileLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.textSecondary, marginBottom: 8 },
  profileInput: { backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.dark.text },
  nutritionCard: { backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.border, padding: 16, gap: 12, marginBottom: 12 },
  nutritionCardTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.dark.text },
  nutritionCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary, marginTop: -6, marginBottom: 2 },
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nutrientPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: Colors.dark.surfaceElevated, alignItems: "center", minWidth: 72 },
  nutrientValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  nutrientLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.dark.textSecondary, marginTop: 2 },
});
