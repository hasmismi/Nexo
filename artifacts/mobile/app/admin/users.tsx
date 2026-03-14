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
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api, AdminUser } from "@/lib/api";
import Colors from "@/constants/colors";

function UserCard({ user: u, onToggleAdmin, isSelf }: { user: AdminUser; onToggleAdmin: () => void; isSelf: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const confirmToggle = () => {
    const msg = u.is_admin
      ? `Remove admin rights from ${u.email}?`
      : `Grant admin rights to ${u.email}?`;
    if (Platform.OS === "web") {
      if (window.confirm(msg)) onToggleAdmin();
    } else {
      Alert.alert("Confirm", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: onToggleAdmin },
      ]);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(u.name ?? u.email)[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{u.name ?? "(no profile)"}</Text>
            {u.is_admin && (
              <View style={styles.adminBadge}>
                <Feather name="shield" size={11} color={Colors.primary} />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.email}>{u.email}</Text>
          <Text style={styles.meta}>{u.order_count} order{u.order_count !== 1 ? "s" : ""} · Joined {new Date(u.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</Text>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.dark.textTertiary} />
      </Pressable>

      {expanded && (
        <View style={styles.details}>
          {u.age != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age</Text>
              <Text style={styles.detailValue}>{u.age} · {u.gender}</Text>
            </View>
          )}
          {u.phone_number && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{u.phone_number}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Onboarding</Text>
            <Text style={[styles.detailValue, { color: u.onboarding_completed ? Colors.primary : Colors.dark.warning }]}>
              {u.onboarding_completed ? "Complete" : "Pending"}
            </Text>
          </View>

          {!isSelf && (
            <Pressable style={[styles.toggleBtn, u.is_admin && styles.toggleBtnDanger]} onPress={confirmToggle}>
              <Feather name={u.is_admin ? "shield-off" : "shield"} size={14} color={u.is_admin ? Colors.dark.error : Colors.primary} />
              <Text style={[styles.toggleBtnText, u.is_admin && { color: Colors.dark.error }]}>
                {u.is_admin ? "Remove Admin" : "Make Admin"}
              </Text>
            </Pressable>
          )}
          {isSelf && (
            <Text style={styles.selfNote}>This is your account — cannot change your own admin status.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function AdminUsersScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", user?.account_id],
    queryFn: () => api.adminUsers(user!.account_id),
    enabled: !!user?.account_id,
  });

  const { mutate: toggleAdmin } = useMutation({
    mutationFn: (target_id: number) => api.adminToggleAdmin(user!.account_id, target_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const filtered = (data?.users ?? []).filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={Colors.dark.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email…"
          placeholderTextColor={Colors.dark.textTertiary}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={Colors.dark.textTertiary} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          renderItem={({ item }) => (
            <UserCard user={item} onToggleAdmin={() => toggleAdmin(item.id)} isSelf={item.id === user?.account_id} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={36} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.surface,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: { flex: 1, color: Colors.dark.text, fontSize: 14 },
  card: { backgroundColor: Colors.dark.surface, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.dark.border },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarText: { color: Colors.primary, fontWeight: "800", fontSize: 17 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  name: { color: Colors.dark.text, fontWeight: "700", fontSize: 15 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.primary + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: "700" },
  email: { color: Colors.dark.textSecondary, fontSize: 13 },
  meta: { color: Colors.dark.textTertiary, fontSize: 12, marginTop: 2 },
  details: { borderTopWidth: 1, borderTopColor: Colors.dark.border, padding: 14, gap: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { color: Colors.dark.textSecondary, fontSize: 13 },
  detailValue: { color: Colors.dark.text, fontSize: 13, fontWeight: "600" },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary + "15",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  toggleBtnDanger: { backgroundColor: Colors.dark.error + "15" },
  toggleBtnText: { color: Colors.primary, fontSize: 13, fontWeight: "600" },
  selfNote: { color: Colors.dark.textTertiary, fontSize: 12, fontStyle: "italic", marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.dark.textTertiary, fontSize: 15 },
});
