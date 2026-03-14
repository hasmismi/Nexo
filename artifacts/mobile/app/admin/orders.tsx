import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
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

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status as Status] ?? Colors.dark.textSecondary;
  return (
    <View style={[styles.badge, { backgroundColor: color + "20", borderColor: color + "60" }]}>
      <Text style={[styles.badgeText, { color }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
    </View>
  );
}

function OrderItem({ order, onUpdateStatus }: { order: AdminOrder; onUpdateStatus: (id: number, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const itemTotal = order.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = itemTotal + order.delivery_fee;

  return (
    <View style={styles.orderCard}>
      <Pressable style={styles.orderHeader} onPress={() => setExpanded((v) => !v)}>
        <View style={{ flex: 1 }}>
          <View style={styles.orderTopRow}>
            <Text style={styles.orderId}>#{order.id}</Text>
            <StatusBadge status={order.order_status} />
          </View>
          <Text style={styles.customerName}>{order.customer_name ?? order.email ?? `Account ${order.account_id}`}</Text>
          <Text style={styles.orderMeta}>
            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
            {order.payment_method?.toUpperCase()} · ₹{total.toFixed(0)}
          </Text>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.dark.textTertiary} />
      </Pressable>

      {expanded && (
        <View style={styles.orderDetails}>
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
            <Text style={[styles.itemPrice, { color: Colors.primary, fontWeight: "700" }]}>₹{total.toFixed(0)}</Text>
          </View>

          {order.delivery_address && (
            <View style={styles.addressBox}>
              <Feather name="map-pin" size={13} color={Colors.dark.textSecondary} />
              <Text style={styles.addressText}>
                {[order.delivery_name, order.delivery_address, order.delivery_city, order.delivery_pincode].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}

          {order.razorpay_payment_id && (
            <Text style={styles.paymentId}>Razorpay: {order.razorpay_payment_id}</Text>
          )}

          <Pressable style={styles.statusBtn} onPress={() => setShowStatusPicker(true)}>
            <Feather name="edit-2" size={14} color={Colors.dark.text} />
            <Text style={styles.statusBtnText}>Update Status</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>Update Order #{order.id}</Text>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                style={[styles.pickerOption, order.order_status === s && styles.pickerOptionActive]}
                onPress={() => {
                  onUpdateStatus(order.id, s);
                  setShowStatusPicker(false);
                }}
              >
                <View style={[styles.dot, { backgroundColor: STATUS_COLOR[s] }]} />
                <Text style={styles.pickerOptionText}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                {order.order_status === s && <Feather name="check" size={16} color={Colors.primary} style={{ marginLeft: "auto" }} />}
              </Pressable>
            ))}
          </View>
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

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", user?.account_id],
    queryFn: () => api.adminOrders(user!.account_id),
    enabled: !!user?.account_id,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.adminUpdateOrderStatus(user!.account_id, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const orders = (data?.orders ?? []).filter((o) => filter === "all" || o.order_status === filter);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {(["all", ...STATUSES] as const).map((s) => (
          <Pressable key={s} style={[styles.filterChip, filter === s && styles.filterChipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.filterChipText, filter === s && styles.filterChipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          renderItem={({ item }) => (
            <OrderItem order={item} onUpdateStatus={(id, status) => updateStatus({ id, status })} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  filterRow: { flexGrow: 0 },
  filterContent: { padding: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border },
  filterChipActive: { backgroundColor: Colors.primary + "20", borderColor: Colors.primary },
  filterChipText: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: "500" },
  filterChipTextActive: { color: Colors.primary },
  orderCard: { backgroundColor: Colors.dark.surface, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.dark.border },
  orderHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  orderTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  orderId: { color: Colors.dark.text, fontWeight: "800", fontSize: 15 },
  customerName: { color: Colors.dark.textSecondary, fontSize: 13, marginBottom: 2 },
  orderMeta: { color: Colors.dark.textTertiary, fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  orderDetails: { borderTopWidth: 1, borderTopColor: Colors.dark.border, padding: 14, gap: 6 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { color: Colors.dark.textSecondary, fontSize: 13, flex: 1 },
  itemQty: { color: Colors.dark.textTertiary, fontSize: 13, width: 28, textAlign: "center" },
  itemPrice: { color: Colors.dark.text, fontSize: 13, fontWeight: "600", width: 60, textAlign: "right" },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: 4 },
  addressBox: { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "flex-start" },
  addressText: { color: Colors.dark.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
  paymentId: { color: Colors.dark.textTertiary, fontSize: 11, fontFamily: "monospace", marginTop: 2 },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.surfaceElevated,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  statusBtnText: { color: Colors.dark.text, fontSize: 13, fontWeight: "600" },
  overlay: { flex: 1, backgroundColor: "#000A", justifyContent: "center", alignItems: "center", padding: 32 },
  picker: { backgroundColor: Colors.dark.surfaceElevated, borderRadius: 16, padding: 20, width: "100%", gap: 4 },
  pickerTitle: { color: Colors.dark.text, fontWeight: "700", fontSize: 16, marginBottom: 12 },
  pickerOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10 },
  pickerOptionActive: { backgroundColor: Colors.primary + "15" },
  pickerOptionText: { color: Colors.dark.text, fontSize: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.dark.textTertiary, fontSize: 15 },
});
