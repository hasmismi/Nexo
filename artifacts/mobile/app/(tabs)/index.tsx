import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

export default function DashboardScreen() {
  const { user, logout } = useApp();
  const insets = useSafeAreaInsets();

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

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
  const totalGrams = data?.total_grams_per_month ?? 0;
  const gramsPerDay = data?.grams_per_day ?? 0;

  return (
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
          <Text style={styles.greeting}>Good morning</Text>
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
            onPress={() => { Haptics.selectionAsync(); logout(); router.replace("/"); }}
          >
            <Feather name="log-out" size={20} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* BMI Card */}
      {profile && (
        <View style={styles.bmiCard}>
          <View style={styles.bmiRow}>
            <MetricItem label="BMI" value={profile.bmi.toFixed(1)} accent />
            <MetricItem label="Height" value={`${profile.height_cm}cm`} />
            <MetricItem label="Weight" value={`${profile.weight_kg}kg`} />
            <MetricItem label="Age" value={String(profile.age)} />
          </View>
        </View>
      )}

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
                    <View style={styles.planDot} />
                    <View>
                      <Text style={styles.planProductName}>{rec.product_name}</Text>
                      <Text style={styles.planGoal}>{rec.goal_name.replace("_", " ")}</Text>
                    </View>
                  </View>
                  <View style={styles.planItemRight}>
                    <Text style={styles.planGrams}>{rec.grams}g</Text>
                    <Text style={styles.planPerDay}>{rec.grams_per_day}g/day</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Daily Serving */}
            <View style={styles.servingCard}>
              <View style={styles.servingIcon}>
                <Feather name="sun" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.servingLabel}>Daily Serving</Text>
                <Text style={styles.servingValue}>
                  {gramsPerDay.toFixed(0)}g total
                </Text>
                {recommendations.length > 1 && (
                  <Text style={styles.servingBreakdown}>
                    {recommendations.map((r) => `${r.grams_per_day}g ${r.product_name}`).join(" + ")}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.totalCard}>
              <View style={styles.servingIcon}>
                <Feather name="package" size={18} color={Colors.accent} />
              </View>
              <View>
                <Text style={styles.servingLabel}>Monthly Total</Text>
                <Text style={[styles.servingValue, { color: Colors.accent }]}>{totalGrams}g</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Navigation Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionCard icon="shopping-bag" label="Products" onPress={() => router.push("/(tabs)/products")} />
          <ActionCard icon="shopping-cart" label="Cart" badge={cartCount} onPress={() => router.push("/cart")} />
          <ActionCard icon="box" label="My Orders" onPress={() => router.push("/orders")} />
          <ActionCard icon="headphones" label="Support" onPress={() => router.push("/support")} />
        </View>
      </View>
    </ScrollView>
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

function ActionCard({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: string;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.75 }]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
    >
      <View style={styles.actionIconWrap}>
        <Feather name={icon as any} size={22} color={Colors.primary} />
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.dark.text,
    marginTop: 2,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#000",
  },
  bmiCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 20,
  },
  bmiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: { alignItems: "center", flex: 1 },
  metricValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.dark.text,
  },
  metricLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.dark.text,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textTertiary,
  },
  planCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    backgroundColor: Colors.primary + "08",
  },
  planHeaderText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  planItemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  planItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  planProductName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.dark.text,
  },
  planGoal: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
    marginTop: 2,
  },
  planItemRight: { alignItems: "flex-end" },
  planGrams: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.dark.text,
  },
  planPerDay: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  servingCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  totalCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  servingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  servingLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  servingValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.primary,
    marginTop: 2,
  },
  servingBreakdown: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "47%",
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    gap: 10,
  },
  actionIconWrap: { position: "relative", width: 40 },
  actionBadge: {
    position: "absolute",
    top: -5,
    right: -10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#000",
  },
  actionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.dark.text,
  },
});
