import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Feather name={icon as any} size={22} color={color} style={styles.statIcon} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NavCard({ label, icon, onPress, badge }: { label: string; icon: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable style={styles.navCard} onPress={onPress}>
      <Feather name={icon as any} size={22} color={Colors.primary} />
      <Text style={styles.navLabel}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={18} color={Colors.dark.textTertiary} style={{ marginLeft: "auto" }} />
    </Pressable>
  );
}

export default function AdminDashboard() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats", user?.account_id],
    queryFn: () => api.adminStats(user!.account_id),
    enabled: !!user?.account_id,
    refetchInterval: 30000,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <View style={styles.adminBadge}>
          <Feather name="shield" size={14} color={Colors.primary} />
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
        <Text style={styles.subtitle}>Nexo Admin Panel</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Total Users" value={data?.total_users ?? 0} color={Colors.blue} icon="users" />
            <StatCard label="Total Orders" value={data?.total_orders ?? 0} color={Colors.primary} icon="shopping-bag" />
            <StatCard label="Today's Orders" value={data?.today_orders ?? 0} color="#F5C518" icon="calendar" />
            <StatCard label="Pending" value={data?.pending_orders ?? 0} color={Colors.dark.warning} icon="clock" />
            <StatCard
              label="Total Revenue"
              value={`₹${(data?.total_revenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
              color="#A855F7"
              icon="trending-up"
            />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Manage</Text>
      <NavCard
        label="Orders"
        icon="shopping-bag"
        onPress={() => router.push("/admin/orders")}
        badge={data?.pending_orders}
      />
      <NavCard label="Offers & Promotions" icon="tag" onPress={() => router.push("/admin/offers")} />
      <NavCard label="Users" icon="users" onPress={() => router.push("/admin/users")} />
      <NavCard label="Products" icon="package" onPress={() => router.push("/admin/products")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: 20, gap: 8 },
  header: { marginBottom: 16 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.surface,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    marginBottom: 8,
  },
  adminBadgeText: { color: Colors.primary, fontSize: 12, fontWeight: "600" },
  subtitle: { color: Colors.dark.textSecondary, fontSize: 14 },
  sectionTitle: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 16, marginBottom: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: "44%",
    borderLeftWidth: 3,
    gap: 4,
  },
  statIcon: { marginBottom: 4 },
  statValue: { color: Colors.dark.text, fontSize: 22, fontWeight: "800" },
  statLabel: { color: Colors.dark.textSecondary, fontSize: 12 },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
  },
  navLabel: { color: Colors.dark.text, fontSize: 16, fontWeight: "600", flex: 1 },
  badge: {
    backgroundColor: Colors.dark.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#000", fontSize: 11, fontWeight: "800" },
});
