import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api, AdminOffer } from "@/lib/api";
import Colors from "@/constants/colors";

type OfferForm = {
  title: string;
  description: string;
  code: string;
  discount_type: "percent" | "flat";
  discount_value: string;
  min_order_amount: string;
  max_uses: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

const EMPTY_FORM: OfferForm = {
  title: "",
  description: "",
  code: "",
  discount_type: "percent",
  discount_value: "",
  min_order_amount: "0",
  max_uses: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function OfferStatusTag({ offer }: { offer: AdminOffer }) {
  const now = new Date();
  if (!offer.is_active) return <View style={[styles.tag, { backgroundColor: Colors.dark.textTertiary + "30" }]}><Text style={[styles.tagText, { color: Colors.dark.textTertiary }]}>Inactive</Text></View>;
  if (offer.ends_at && new Date(offer.ends_at) < now) return <View style={[styles.tag, { backgroundColor: Colors.dark.error + "25" }]}><Text style={[styles.tagText, { color: Colors.dark.error }]}>Expired</Text></View>;
  if (offer.starts_at && new Date(offer.starts_at) > now) return <View style={[styles.tag, { backgroundColor: Colors.dark.warning + "25" }]}><Text style={[styles.tagText, { color: Colors.dark.warning }]}>Scheduled</Text></View>;
  return <View style={[styles.tag, { backgroundColor: Colors.primary + "25" }]}><Text style={[styles.tagText, { color: Colors.primary }]}>Active</Text></View>;
}

function OfferCard({ offer, onEdit, onToggle, onDelete }: { offer: AdminOffer; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const discountLabel = offer.discount_type === "percent"
    ? `${offer.discount_value}% off`
    : `₹${offer.discount_value} off`;

  const confirmDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete offer "${offer.title}"?`)) onDelete();
    } else {
      Alert.alert("Delete Offer", `Delete "${offer.title}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]);
    }
  };

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerTop}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.offerTitleRow}>
            <Text style={styles.offerTitle}>{offer.title}</Text>
            <OfferStatusTag offer={offer} />
          </View>
          {offer.code && (
            <View style={styles.codeChip}>
              <Feather name="tag" size={12} color={Colors.primary} />
              <Text style={styles.codeText}>{offer.code}</Text>
            </View>
          )}
          <Text style={styles.discountText}>{discountLabel}</Text>
          {offer.min_order_amount > 0 && (
            <Text style={styles.minText}>Min. order ₹{offer.min_order_amount}</Text>
          )}
        </View>
        <Switch
          value={offer.is_active}
          onValueChange={onToggle}
          trackColor={{ true: Colors.primary, false: Colors.dark.border }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.offerMeta}>
        {offer.starts_at && (
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={Colors.dark.textTertiary} />
            <Text style={styles.metaText}>From {formatDate(offer.starts_at)}</Text>
          </View>
        )}
        {offer.ends_at && (
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={Colors.dark.textTertiary} />
            <Text style={styles.metaText}>Until {formatDate(offer.ends_at)}</Text>
          </View>
        )}
        {offer.max_uses && (
          <View style={styles.metaItem}>
            <Feather name="users" size={12} color={Colors.dark.textTertiary} />
            <Text style={styles.metaText}>{offer.uses_count}/{offer.max_uses} uses</Text>
          </View>
        )}
      </View>

      {offer.description.length > 0 && (
        <Text style={styles.offerDesc}>{offer.description}</Text>
      )}

      <View style={styles.offerActions}>
        <Pressable style={styles.editOfferBtn} onPress={onEdit}>
          <Feather name="edit-2" size={14} color={Colors.dark.text} />
          <Text style={styles.editOfferBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteOfferBtn} onPress={confirmDelete}>
          <Feather name="trash-2" size={14} color={Colors.dark.error} />
          <Text style={styles.deleteOfferBtnText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OfferFormModal({
  visible,
  onClose,
  onSave,
  initial,
  isSaving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (form: OfferForm) => void;
  initial: OfferForm;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<OfferForm>(initial);
  const f = (key: keyof OfferForm) => (v: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  React.useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);

  const Field = ({ label, field, numeric, placeholder }: { label: string; field: keyof OfferForm; numeric?: boolean; placeholder?: string }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={String(form[field])}
        onChangeText={f(field) as (v: string) => void}
        keyboardType={numeric ? "decimal-pad" : "default"}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.textTertiary}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={Colors.dark.text} />
            </Pressable>
            <Text style={styles.modalTitle}>{initial.title ? "Edit Offer" : "New Offer"}</Text>
            <Pressable style={styles.saveBtn} onPress={() => onSave(form)} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.sectionLabel}>Details</Text>
            <Field label="Title *" field="title" placeholder="e.g. New Year Sale" />
            <Field label="Description" field="description" placeholder="Short description shown to customers" />
            <Field label="Coupon Code (optional)" field="code" placeholder="e.g. SAVE20 — leave blank for automatic" />

            <Text style={styles.sectionLabel}>Discount</Text>
            <View style={styles.discountTypeRow}>
              {(["percent", "flat"] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeBtn, form.discount_type === t && styles.typeBtnActive]}
                  onPress={() => setForm((p) => ({ ...p, discount_type: t }))}
                >
                  <Text style={[styles.typeBtnText, form.discount_type === t && styles.typeBtnTextActive]}>
                    {t === "percent" ? "% Percentage" : "₹ Flat Amount"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field
              label={form.discount_type === "percent" ? "Discount %" : "Discount ₹"}
              field="discount_value"
              numeric
              placeholder={form.discount_type === "percent" ? "e.g. 20" : "e.g. 100"}
            />
            <Field label="Minimum Order Amount (₹)" field="min_order_amount" numeric placeholder="0 = no minimum" />
            <Field label="Max Uses (optional)" field="max_uses" numeric placeholder="Leave blank for unlimited" />

            <Text style={styles.sectionLabel}>Duration (optional)</Text>
            <Field label="Start Date (YYYY-MM-DD)" field="starts_at" placeholder="e.g. 2026-01-01 or leave blank" />
            <Field label="End Date (YYYY-MM-DD)" field="ends_at" placeholder="e.g. 2026-01-31 or leave blank" />

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Active (show to customers)</Text>
              <Switch
                value={form.is_active}
                onValueChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                trackColor={{ true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AdminOffersScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers", user?.account_id],
    queryFn: () => api.adminOffers(user!.account_id),
    enabled: !!user?.account_id,
  });

  const { mutate: createOffer, isPending: isCreating } = useMutation({
    mutationFn: (form: OfferForm) =>
      api.adminCreateOffer(user!.account_id, {
        title: form.title,
        description: form.description,
        code: form.code || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount || 0),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-offers"] }); setShowForm(false); },
  });

  const { mutate: updateOffer, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, form }: { id: number; form: OfferForm }) =>
      api.adminUpdateOffer(user!.account_id, id, {
        title: form.title,
        description: form.description,
        code: form.code || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount || 0),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-offers"] }); setEditingOffer(null); },
  });

  const { mutate: deleteOffer } = useMutation({
    mutationFn: (id: number) => api.adminDeleteOffer(user!.account_id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-offers"] }),
  });

  const { mutate: toggleOffer } = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.adminUpdateOffer(user!.account_id, id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-offers"] }),
  });

  const toForm = (o: AdminOffer): OfferForm => ({
    title: o.title,
    description: o.description,
    code: o.code ?? "",
    discount_type: o.discount_type as "percent" | "flat",
    discount_value: String(o.discount_value),
    min_order_amount: String(o.min_order_amount),
    max_uses: o.max_uses ? String(o.max_uses) : "",
    is_active: o.is_active,
    starts_at: o.starts_at ? o.starts_at.split("T")[0] : "",
    ends_at: o.ends_at ? o.ends_at.split("T")[0] : "",
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={data?.offers ?? []}
          keyExtractor={(o) => String(o.id)}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              onEdit={() => setEditingOffer(item)}
              onToggle={() => toggleOffer({ id: item.id, is_active: !item.is_active })}
              onDelete={() => deleteOffer(item.id)}
            />
          )}
          contentContainerStyle={{ padding: 14, paddingBottom: 100, gap: 12 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="tag" size={40} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyTitle}>No offers yet</Text>
              <Text style={styles.emptySubtitle}>Create your first discount or promotion</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => setShowForm(true)}>
        <Feather name="plus" size={24} color="#000" />
        <Text style={styles.fabText}>New Offer</Text>
      </Pressable>

      <OfferFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={(form) => createOffer(form)}
        initial={EMPTY_FORM}
        isSaving={isCreating}
      />
      <OfferFormModal
        visible={!!editingOffer}
        onClose={() => setEditingOffer(null)}
        onSave={(form) => editingOffer && updateOffer({ id: editingOffer.id, form })}
        initial={editingOffer ? toForm(editingOffer) : EMPTY_FORM}
        isSaving={isUpdating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  offerCard: { backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.dark.border, gap: 8 },
  offerTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  offerTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 2 },
  offerTitle: { color: Colors.dark.text, fontWeight: "700", fontSize: 15 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: "700" },
  codeChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: Colors.primary + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  codeText: { color: Colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  discountText: { color: Colors.dark.text, fontWeight: "600", fontSize: 14 },
  minText: { color: Colors.dark.textTertiary, fontSize: 12 },
  offerMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: Colors.dark.textTertiary, fontSize: 12 },
  offerDesc: { color: Colors.dark.textSecondary, fontSize: 13, lineHeight: 18 },
  offerActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  editOfferBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.dark.surfaceElevated, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editOfferBtnText: { color: Colors.dark.text, fontSize: 13, fontWeight: "600" },
  deleteOfferBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.dark.error + "15", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  deleteOfferBtnText: { color: Colors.dark.error, fontSize: 13, fontWeight: "600" },
  fab: { position: "absolute", right: 20, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, elevation: 6, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  fabText: { color: "#000", fontWeight: "800", fontSize: 15 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { color: Colors.dark.text, fontWeight: "700", fontSize: 16 },
  emptySubtitle: { color: Colors.dark.textTertiary, fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: Colors.dark.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  modalTitle: { color: Colors.dark.text, fontWeight: "700", fontSize: 17 },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  saveBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
  modalBody: { padding: 20, paddingBottom: 60, gap: 10 },
  sectionLabel: { color: Colors.dark.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 12 },
  fieldGroup: { gap: 4 },
  fieldLabel: { color: Colors.dark.textSecondary, fontSize: 13 },
  fieldInput: { backgroundColor: Colors.dark.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.border, padding: 12, color: Colors.dark.text, fontSize: 14 },
  discountTypeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, padding: 11, borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.surface, alignItems: "center" },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "15" },
  typeBtnText: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: "600" },
  typeBtnTextActive: { color: Colors.primary },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
});
