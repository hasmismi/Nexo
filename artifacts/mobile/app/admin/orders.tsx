import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api, AdminOrder } from "@/lib/api";
import Colors from "@/constants/colors";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLOR: Record<Status, string> = {
  pending: Colors.dark.warning,
  confirmed: Colors.blue,
  processing: "#A855F7",
  shipped: "#06B6D4",
  delivered: Colors.primary,
  cancelled: Colors.dark.error,
};

const STATUS_ICON: Record<Status, string> = {
  pending: "clock",
  confirmed: "check-circle",
  processing: "settings",
  shipped: "truck",
  delivered: "package",
  cancelled: "x-circle",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status as Status] ?? Colors.dark.textSecondary;
  const icon = STATUS_ICON[status as Status] ?? "circle";
  return (
    <View style={[styles.badge, { backgroundColor: color + "20", borderColor: color + "50" }]}>
      <Feather name={icon as any} size={10} color={color} />
      <Text style={[styles.badgeText, { color }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
    </View>
  );
}

function OrderCard({
  order,
  onUpdateStatus,
}: {
  order: AdminOrder;
  onUpdateStatus: (id: number, status: string, tracking?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [trackingInput, setTrackingInput] = useState(order.tracking_link ?? "");

  const itemTotal = order.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = itemTotal + order.delivery_fee;
  const displayName = order.customer_name ?? order.email ?? `User ${order.account_id}`;

  const handleStatusSelect = (s: Status) => {
    if (s === "shipped") {
      setPendingStatus(s);
    } else {
      onUpdateStatus(order.id, s);
      setShowPicker(false);
    }
  };

  const confirmShipped = () => {
    onUpdateStatus(order.id, "shipped", trackingInput.trim() || undefined);
    setPendingStatus(null);
    setShowPicker(false);
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={() => setExpanded((v) => !v)}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.topRow}>
            <Text style={styles.orderId}>#{order.id}</Text>
            <StatusBadge status={order.order_status} />
            {order.tracking_link && (
              <View style={styles.trackingBadge}>
                <Feather name="navigation" size={10} color="#06B6D4" />
                <Text style={styles.trackingBadgeText}>Tracked</Text>
              </View>
            )}
          </View>
          <Text style={styles.customerName}>{displayName}</Text>
          <Text style={styles.meta}>
            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            {" · "}
            {(order.payment_method ?? "—").toUpperCase()}
            {" · ₹"}
            {total.toFixed(0)}
          </Text>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.dark.textTertiary} />
      </Pressable>

      {expanded && (
        <View style={styles.details}>
          <Text style={styles.detailSection}>Items</Text>
          {order.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product_name ?? "Product"}</Text>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
              <Text style={styles.itemPrice}>₹{(item.quantity * item.unit_price).toFixed(0)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>Delivery</Text>
            <Text style={styles.itemPrice}>₹{order.delivery_fee.toFixed(0)}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={[styles.itemName, { color: Colors.dark.text, fontWeight: "700" }]}>Total</Text>
            <Text style={[styles.itemPrice, { color: Colors.primary, fontWeight: "800" }]}>₹{total.toFixed(0)}</Text>
          </View>

          {order.delivery_address && (
            <>
              <Text style={[styles.detailSection, { marginTop: 12 }]}>Delivery To</Text>
              <View style={styles.addressBox}>
                <Feather name="map-pin" size={13} color={Colors.dark.textSecondary} />
                <View style={{ flex: 1 }}>
                  {order.delivery_name && <Text style={styles.addressName}>{order.delivery_name} · {order.delivery_phone}</Text>}
                  <Text style={styles.addressText}>
                    {[order.delivery_address, order.delivery_city, order.delivery_pincode].filter(Boolean).join(", ")}
                  </Text>
                </View>
              </View>
            </>
          )}

          {order.tracking_link && (
            <View style={styles.trackingBox}>
              <Feather name="navigation" size={13} color="#06B6D4" />
              <Text style={styles.trackingText}>{order.tracking_link}</Text>
            </View>
          )}

          {order.razorpay_payment_id && (
            <Text style={styles.razorpayId}>Razorpay: {order.razorpay_payment_id}</Text>
          )}

          <Pressable style={styles.updateBtn} onPress={() => setShowPicker(true)}>
            <Feather name="edit-2" size={14} color="#000" />
            <Text style={styles.updateBtnText}>Update Status</Text>
          </Pressable>
        </View>
      )}

      {/* Status Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => { setShowPicker(false); setPendingStatus(null); }}>
        <Pressable style={styles.overlay} onPress={() => { setShowPicker(false); setPendingStatus(null); }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable style={styles.picker} onPress={() => {}}>
              {pendingStatus === "shipped" ? (
                <>
                  <View style={styles.pickerHeader}>
                    <Pressable onPress={() => setPendingStatus(null)}>
                      <Feather name="arrow-left" size={20} color={Colors.dark.text} />
                    </Pressable>
                    <Text style={styles.pickerTitle}>Add Tracking ID</Text>
                  </View>
                  <Text style={styles.trackingHint}>Enter the tracking ID or link from your courier partner</Text>
                  <TextInput
                    style={styles.trackingField}
                    value={trackingInput}
                    onChangeText={setTrackingInput}
                    placeholder="e.g. DTDC123456789, or tracking URL"
                    placeholderTextColor={Colors.dark.textTertiary}
                    autoFocus
                  />
                  <Pressable style={styles.confirmBtn} onPress={confirmShipped}>
                    <Feather name="truck" size={16} color="#000" />
                    <Text style={styles.confirmBtnText}>Mark as Shipped</Text>
                  </Pressable>
                  <Pressable style={styles.skipBtn} onPress={() => { onUpdateStatus(order.id, "shipped"); setPendingStatus(null); setShowPicker(false); }}>
                    <Text style={styles.skipBtnText}>Skip — Mark Shipped Without Tracking</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.pickerTitle}>Order #{order.id} — Update Status</Text>
                  <Text style={styles.pickerSub}>{displayName}</Text>
                  {STATUSES.map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.statusOption, order.order_status === s && styles.statusOptionActive]}
                      onPress={() => handleStatusSelect(s)}
                    >
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[s] }]} />
                      <Feather name={STATUS_ICON[s] as any} size={16} color={STATUS_COLOR[s]} />
                      <Text style={styles.statusOptionText}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                      {s === "shipped" && <Text style={styles.statusHint}>(+ tracking ID)</Text>}
                      {order.order_status === s && <Feather name="check" size={15} color={Colors.primary} style={{ marginLeft: "auto" }} />}
                    </Pressable>
                  ))}
                </>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function AdminOrdersScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-orders", user?.account_id],
    queryFn: () => api.adminOrders(user!.account_id),
    enabled: !!user?.account_id,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status, tracking }: { id: number; status: string; tracking?: string }) =>
      api.adminUpdateOrderStatus(user!.account_id, id, status, tracking),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const filtered = useMemo(() => {
    let list = data?.orders ?? [];
    if (filter !== "all") list = list.filter((o) => o.order_status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          String(o.id).includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q) ||
          (o.email ?? "").toLowerCase().includes(q) ||
          (o.delivery_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const all = data?.orders ?? [];
    return STATUSES.reduce((acc, s) => ({ ...acc, [s]: all.filter((o) => o.order_status === s).length }), {} as Record<Status, number>);
  }, [data]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={Colors.dark.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email, or order #"
            placeholderTextColor={Colors.dark.textTertiary}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={Colors.dark.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          {isRefetching ? <ActivityIndicator size="small" color={Colors.primary} /> : <Feather name="refresh-cw" size={17} color={Colors.primary} />}
        </Pressable>
      </View>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
        <Pressable style={[styles.chip, filter === "all" && styles.chipActive]} onPress={() => setFilter("all")}>
          <Text style={[styles.chipText, filter === "all" && styles.chipTextActive]}>All ({data?.orders.length ?? 0})</Text>
        </Pressable>
        {STATUSES.map((s) => (
          <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive, filter === s && { borderColor: STATUS_COLOR[s] }]} onPress={() => setFilter(s)}>
            <View style={[styles.chipDot, { backgroundColor: STATUS_COLOR[s] }]} />
            <Text style={[styles.chipText, filter === s && { color: STATUS_COLOR[s] }]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {counts[s] > 0 && ` (${counts[s]})`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onUpdateStatus={(id, status, tracking) => updateStatus({ id, status, tracking })}
            />
          )}
          contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyText}>{search ? "No orders match your search" : "No orders yet"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 8 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: { flex: 1, color: Colors.dark.text, fontSize: 14 },
  refreshBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.dark.border },
  chipRow: { flexGrow: 0 },
  chipContent: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border },
  chipActive: { backgroundColor: Colors.dark.surfaceElevated },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "500" },
  chipTextActive: { color: Colors.dark.text },
  card: { backgroundColor: Colors.dark.surface, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.dark.border },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  orderId: { color: Colors.dark.text, fontWeight: "800", fontSize: 15 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  trackingBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#06B6D420", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  trackingBadgeText: { color: "#06B6D4", fontSize: 11, fontWeight: "600" },
  customerName: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: "500" },
  meta: { color: Colors.dark.textTertiary, fontSize: 12 },
  details: { borderTopWidth: 1, borderTopColor: Colors.dark.border, padding: 14, gap: 6 },
  detailSection: { color: Colors.dark.textTertiary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  itemRow: { flexDirection: "row", alignItems: "center" },
  itemName: { color: Colors.dark.textSecondary, fontSize: 13, flex: 1 },
  itemQty: { color: Colors.dark.textTertiary, fontSize: 13, width: 30, textAlign: "center" },
  itemPrice: { color: Colors.dark.text, fontSize: 13, fontWeight: "600", width: 64, textAlign: "right" },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: 6 },
  addressBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 2 },
  addressName: { color: Colors.dark.text, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  addressText: { color: Colors.dark.textSecondary, fontSize: 12, lineHeight: 18 },
  trackingBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#06B6D415", borderRadius: 8, padding: 10, marginTop: 4 },
  trackingText: { color: "#06B6D4", fontSize: 13, flex: 1, fontFamily: Platform.OS === "web" ? "monospace" : undefined },
  razorpayId: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 2 },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.primary, padding: 10, borderRadius: 8, marginTop: 10, alignSelf: "flex-start" },
  updateBtnText: { color: "#000", fontSize: 13, fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "#000C", justifyContent: "flex-end" },
  picker: { backgroundColor: Colors.dark.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 6 },
  pickerHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  pickerTitle: { color: Colors.dark.text, fontWeight: "700", fontSize: 16, marginBottom: 4 },
  pickerSub: { color: Colors.dark.textSecondary, fontSize: 13, marginBottom: 10 },
  statusOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10 },
  statusOptionActive: { backgroundColor: Colors.dark.surface },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { color: Colors.dark.text, fontSize: 15, flex: 1 },
  statusHint: { color: Colors.dark.textTertiary, fontSize: 12 },
  trackingHint: { color: Colors.dark.textSecondary, fontSize: 13, marginBottom: 12 },
  trackingField: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 12,
    color: Colors.dark.text,
    fontSize: 14,
    marginBottom: 12,
  },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.primary, padding: 14, borderRadius: 12 },
  confirmBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  skipBtn: { padding: 12, alignItems: "center" },
  skipBtnText: { color: Colors.dark.textTertiary, fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.dark.textTertiary, fontSize: 15 },
});
