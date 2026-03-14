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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api, AdminProduct } from "@/lib/api";
import Colors from "@/constants/colors";

function EditField({ label, value, onChange, numeric }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        placeholderTextColor={Colors.dark.textTertiary}
        multiline={!numeric && label === "Description"}
      />
    </View>
  );
}

function ProductCard({ product, onEdit }: { product: AdminProduct; onEdit: (p: AdminProduct) => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.iconBox, { backgroundColor: product.icon_color + "25" }]}>
          <Text style={styles.iconEmoji}>{product.icon_emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>
            ₹{product.price_per_gram}/g{product.is_trial && <Text style={styles.trialBadge}> · Trial</Text>}
          </Text>
          <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
        </View>
        <Pressable style={styles.editBtn} onPress={() => onEdit(product)}>
          <Feather name="edit-2" size={16} color={Colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminProductsScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [isTrial, setIsTrial] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", user?.account_id],
    queryFn: () => api.adminProducts(user!.account_id),
    enabled: !!user?.account_id,
  });

  const { mutate: saveProduct, isPending } = useMutation({
    mutationFn: (updates: Partial<AdminProduct>) =>
      api.adminUpdateProduct(user!.account_id, editing!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setEditing(null);
    },
  });

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setIsTrial(p.is_trial);
    setForm({
      name: p.name,
      description: p.description,
      price_per_gram: String(p.price_per_gram),
      icon_emoji: p.icon_emoji,
      icon_color: p.icon_color,
      nutrition_energy_kcal: String(p.nutrition_energy_kcal ?? ""),
      nutrition_protein_g: String(p.nutrition_protein_g ?? ""),
      nutrition_fat_g: String(p.nutrition_fat_g ?? ""),
      nutrition_carbs_g: String(p.nutrition_carbs_g ?? ""),
      nutrition_fibre_g: String(p.nutrition_fibre_g ?? ""),
      nutrition_sugars_g: String(p.nutrition_sugars_g ?? ""),
    });
  };

  const handleSave = () => {
    const num = (k: string) => {
      const v = form[k];
      return v === "" || v === "null" ? null : Number(v);
    };
    saveProduct({
      name: form.name,
      description: form.description,
      price_per_gram: Number(form.price_per_gram),
      icon_emoji: form.icon_emoji,
      icon_color: form.icon_color,
      is_trial: isTrial,
      nutrition_energy_kcal: num("nutrition_energy_kcal"),
      nutrition_protein_g: num("nutrition_protein_g"),
      nutrition_fat_g: num("nutrition_fat_g"),
      nutrition_carbs_g: num("nutrition_carbs_g"),
      nutrition_fibre_g: num("nutrition_fibre_g"),
      nutrition_sugars_g: num("nutrition_sugars_g"),
    });
  };

  const f = (key: string) => (v: string) => setForm((prev) => ({ ...prev, [key]: v }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={data?.products ?? []}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <ProductCard product={item} onEdit={openEdit} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        />
      )}

      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditing(null)}>
                <Feather name="x" size={22} color={Colors.dark.text} />
              </Pressable>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={isPending}>
                {isPending ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.sectionLabel}>Basic Info</Text>
              <EditField label="Name" value={form.name ?? ""} onChange={f("name")} />
              <EditField label="Description" value={form.description ?? ""} onChange={f("description")} />
              <EditField label="Price per gram (₹)" value={form.price_per_gram ?? ""} onChange={f("price_per_gram")} numeric />
              <EditField label="Icon Emoji" value={form.icon_emoji ?? ""} onChange={f("icon_emoji")} />
              <EditField label="Icon Color (hex)" value={form.icon_color ?? ""} onChange={f("icon_color")} />

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Trial Product</Text>
                <Switch value={isTrial} onValueChange={setIsTrial} trackColor={{ true: Colors.primary }} thumbColor="#fff" />
              </View>

              <Text style={styles.sectionLabel}>Nutrition (per 100g)</Text>
              <EditField label="Energy (kcal)" value={form.nutrition_energy_kcal ?? ""} onChange={f("nutrition_energy_kcal")} numeric />
              <EditField label="Protein (g)" value={form.nutrition_protein_g ?? ""} onChange={f("nutrition_protein_g")} numeric />
              <EditField label="Total Fat (g)" value={form.nutrition_fat_g ?? ""} onChange={f("nutrition_fat_g")} numeric />
              <EditField label="Carbohydrates (g)" value={form.nutrition_carbs_g ?? ""} onChange={f("nutrition_carbs_g")} numeric />
              <EditField label="Dietary Fibre (g)" value={form.nutrition_fibre_g ?? ""} onChange={f("nutrition_fibre_g")} numeric />
              <EditField label="Total Sugars (g)" value={form.nutrition_sugars_g ?? ""} onChange={f("nutrition_sugars_g")} numeric />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  card: { backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.dark.border },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconEmoji: { fontSize: 24 },
  productName: { color: Colors.dark.text, fontWeight: "700", fontSize: 15 },
  productPrice: { color: Colors.primary, fontSize: 13, fontWeight: "600", marginTop: 2 },
  trialBadge: { color: Colors.dark.warning },
  productDesc: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 2 },
  editBtn: { padding: 8, backgroundColor: Colors.primary + "18", borderRadius: 8 },
  modalContainer: { flex: 1, backgroundColor: Colors.dark.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: { color: Colors.dark.text, fontWeight: "700", fontSize: 17 },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  saveBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
  modalContent: { padding: 20, paddingBottom: 60, gap: 8 },
  sectionLabel: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 12, marginBottom: 4 },
  fieldGroup: { gap: 4 },
  fieldLabel: { color: Colors.dark.textSecondary, fontSize: 13 },
  fieldInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 12,
    color: Colors.dark.text,
    fontSize: 14,
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
});
