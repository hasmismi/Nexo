import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { api, CartItem } from "@/lib/api";
import Colors from "@/constants/colors";
import { Toast } from "@/components/AppAlert";
import { RazorpayCheckout, RazorpayOptions } from "@/components/RazorpayCheckout";

type PaymentMethod = "upi" | "card" | "cod";

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: string; sub: string }[] = [
  { id: "upi", label: "UPI", icon: "smartphone", sub: "Pay via any UPI app" },
  { id: "card", label: "Card", icon: "credit-card", sub: "Debit or credit card" },
  { id: "cod", label: "Cash on Delivery", icon: "package", sub: "Pay when delivered" },
];

export default function CheckoutScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [razorpayOpts, setRazorpayOpts] = useState<RazorpayOptions | null>(null);
  const [showRazorpay, setShowRazorpay] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["cart", user?.account_id],
    queryFn: () => api.getCart(user!.account_id),
    enabled: !!user,
  });

  const DELIVERY_FEE = 99;

  const items: CartItem[] = data?.items ?? [];
  const subtotal = data?.total_price ?? 0;
  const totalGrams = items.reduce((s, i) => s + i.grams, 0);
  const isChennai = city.trim().toLowerCase() === "chennai";
  const deliveryFee = isChennai && totalGrams >= 1000 ? 0 : DELIVERY_FEE;
  const grandTotal = subtotal + deliveryFee;

  const handleUseLocation = async () => {
    try {
      setLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setToast("Location permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setCoords({ lat: latitude, lng: longitude });

      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo.length > 0) {
        const g = geo[0];
        if (g.street) setAddress(g.street + (g.streetNumber ? " " + g.streetNumber : ""));
        if (g.city || g.subregion) setCity(g.city ?? g.subregion ?? "");
        if (g.postalCode) setPincode(g.postalCode);
      }
    } catch {
      setToast("Could not get location");
    } finally {
      setLocLoading(false);
    }
  };

  const validate = () => {
    if (!name.trim()) { setToast("Please enter your name"); return false; }
    if (!phone.trim() || phone.trim().length < 10) { setToast("Enter a valid phone number"); return false; }
    if (!address.trim()) { setToast("Please enter your address"); return false; }
    if (!city.trim()) { setToast("Please enter your city"); return false; }
    if (!pincode.trim() || pincode.trim().length < 6) { setToast("Enter a valid 6-digit pincode"); return false; }
    return true;
  };

  const placeOrder = async (razorpayPaymentId?: string) => {
    try {
      await api.checkout({
        account_id: user!.account_id,
        delivery_name: name.trim(),
        delivery_phone: phone.trim(),
        delivery_address: address.trim(),
        delivery_city: city.trim(),
        delivery_pincode: pincode.trim(),
        payment_method: paymentMethod,
        delivery_lat: coords?.lat,
        delivery_lng: coords?.lng,
        delivery_fee: deliveryFee,
        razorpay_payment_id: razorpayPaymentId,
      });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.replace("/order-success");
    } catch (err: any) {
      setToast(err.message ?? "Order failed");
    } finally {
      setIsPlacing(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user || items.length === 0) return;
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (paymentMethod === "cod") {
      setIsPlacing(true);
      await placeOrder();
      return;
    }

    setIsPlacing(true);
    try {
      const amountPaise = Math.round(grandTotal * 100);
      const result = await api.createPaymentOrder({
        amount_paise: amountPaise,
        receipt: `order_${user.account_id}_${Date.now()}`,
      });
      setRazorpayOpts({
        key: result.key_id,
        amount: result.amount,
        currency: result.currency,
        order_id: result.order_id,
        name: "Nexo Nutrition",
        description: `${items.length} product${items.length > 1 ? "s" : ""}`,
        prefill: { name: name.trim(), contact: phone.trim() },
      });
      setShowRazorpay(true);
      setIsPlacing(false);
    } catch (err: any) {
      setToast(err.message ?? "Could not initiate payment");
      setIsPlacing(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string, _orderId: string, signature: string) => {
    setShowRazorpay(false);
    setIsPlacing(true);
    try {
      await api.verifyPayment({
        razorpay_order_id: razorpayOpts!.order_id,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });
      await placeOrder(paymentId);
    } catch {
      setToast("Payment could not be verified. Please contact support.");
      setIsPlacing(false);
    }
  };

  const handlePaymentFailure = (reason: string) => {
    setShowRazorpay(false);
    setIsPlacing(false);
    setToast(`Payment failed: ${reason}`);
  };

  const handlePaymentDismiss = () => {
    setShowRazorpay(false);
    setIsPlacing(false);
  };

  const mapUrl =
    coords
      ? `https://staticmap.openstreetmap.de/staticmap.php?center=${coords.lat},${coords.lng}&zoom=15&size=600x200&markers=${coords.lat},${coords.lng},red-pushpin`
      : null;

  if (isLoading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order Summary */}
        <SectionHeader icon="shopping-cart" title="Order Summary" />
        <View style={styles.card}>
          {items.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <View style={styles.summaryDot} />
                <Text style={styles.summaryName}>{item.product_name}</Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryGrams}>{item.grams}g</Text>
                <Text style={styles.summaryPrice}>₹{item.price.toLocaleString()}</Text>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>₹{subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Feather name="truck" size={13} color={deliveryFee === 0 ? "#00C27B" : Colors.dark.textSecondary} />
              <Text style={[styles.subtotalLabel, deliveryFee === 0 && { color: "#00C27B" }]}>
                Delivery Fee
              </Text>
            </View>
            <Text style={[styles.subtotalValue, deliveryFee === 0 && { color: "#00C27B", fontFamily: "Inter_700Bold" }]}>
              {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
            </Text>
          </View>
          {!(isChennai && totalGrams >= 1000) && (
            <View style={styles.freeDeliveryHint}>
              <Feather name="info" size={11} color={Colors.primary} />
              <Text style={styles.freeDeliveryText}>
                Free delivery for Chennai orders over 1 kg
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={[styles.summaryRow, { marginBottom: 0 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <SectionHeader icon="map-pin" title="Delivery Address" />
        <View style={styles.card}>
          <Pressable style={styles.locationBtn} onPress={handleUseLocation} disabled={locLoading}>
            {locLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Feather name="navigation" size={16} color={Colors.primary} />
            )}
            <Text style={styles.locationBtnText}>
              {locLoading ? "Getting location…" : "Use My Current Location"}
            </Text>
          </Pressable>

          {mapUrl && (
            <View style={styles.mapContainer}>
              <Image
                source={{ uri: mapUrl }}
                style={styles.mapImage}
                resizeMode="cover"
              />
              <View style={styles.mapPinOverlay}>
                <View style={styles.mapPinOuter}>
                  <Feather name="map-pin" size={22} color={Colors.dark.error} />
                </View>
              </View>
              <View style={styles.mapCoordBadge}>
                <Feather name="crosshair" size={11} color={Colors.dark.textSecondary} />
                <Text style={styles.mapCoordText}>
                  {coords!.lat.toFixed(4)}, {coords!.lng.toFixed(4)}
                </Text>
              </View>
            </View>
          )}

          <Field label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
          <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
          <Field label="Address Line" value={address} onChangeText={setAddress} placeholder="House / Flat / Street" multiline />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="City / Area" value={city} onChangeText={setCity} placeholder="City" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ width: 110 }}>
              <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="000000" keyboardType="number-pad" maxLength={6} />
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <SectionHeader icon="credit-card" title="Payment Method" />
        <View style={styles.card}>
          {PAYMENT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.paymentOption, paymentMethod === opt.id && styles.paymentOptionSelected]}
              onPress={() => { Haptics.selectionAsync(); setPaymentMethod(opt.id); }}
            >
              <View style={[styles.paymentIconWrap, paymentMethod === opt.id && { backgroundColor: Colors.primary + "20" }]}>
                <Feather name={opt.icon as any} size={18} color={paymentMethod === opt.id ? Colors.primary : Colors.dark.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.paymentLabel, paymentMethod === opt.id && { color: Colors.dark.text }]}>{opt.label}</Text>
                <Text style={styles.paymentSub}>{opt.sub}</Text>
              </View>
              <View style={[styles.radioOuter, paymentMethod === opt.id && { borderColor: Colors.primary }]}>
                {paymentMethod === opt.id && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.footerLabel}>Total to pay</Text>
            <Text style={styles.footerTotal}>₹{grandTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.footerPayBadge}>
            <Feather
              name={paymentMethod === "upi" ? "smartphone" : paymentMethod === "card" ? "credit-card" : "package"}
              size={13}
              color={Colors.primary}
            />
            <Text style={styles.footerPayText}>
              {paymentMethod === "upi" ? "UPI" : paymentMethod === "card" ? "Card" : "COD"}
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.placeBtn, pressed && { opacity: 0.85 }, isPlacing && { opacity: 0.6 }]}
          onPress={handlePlaceOrder}
          disabled={isPlacing || items.length === 0}
        >
          {isPlacing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Feather name={paymentMethod === "cod" ? "check-circle" : "credit-card"} size={20} color="#000" />
              <Text style={styles.placeBtnText}>
                {paymentMethod === "cod" ? "Place COD Order" : paymentMethod === "upi" ? "Pay with UPI" : "Pay with Card"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Toast visible={!!toast} message={toast ?? ""} icon="alert-circle" onHide={() => setToast(null)} />

      {razorpayOpts && (
        <RazorpayCheckout
          visible={showRazorpay}
          options={razorpayOpts}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onDismiss={handlePaymentDismiss}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon as any} size={15} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 72, textAlignVertical: "top", paddingTop: 12 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.textTertiary}
        keyboardType={keyboardType ?? "default"}
        autoCorrect={false}
        multiline={multiline}
        maxLength={maxLength}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.dark.text },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.dark.text, letterSpacing: 0.2 },

  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 18, borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16, gap: 12,
  },

  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  summaryDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary },
  summaryName: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.dark.text, flex: 1 },
  summaryRight: { alignItems: "flex-end", gap: 2 },
  summaryGrams: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary },
  summaryPrice: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.dark.text },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: 4 },
  subtotalLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.dark.textSecondary },
  subtotalValue: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.textSecondary },
  freeDeliveryHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.primary + "10",
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.primary + "25",
  },
  freeDeliveryText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.primary, flex: 1, lineHeight: 16 },
  totalLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.dark.textSecondary },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },

  locationBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primary + "12",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: Colors.primary + "30",
  },
  locationBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.primary },

  mapContainer: { borderRadius: 14, overflow: "hidden", height: 180, position: "relative" },
  mapImage: { width: "100%", height: "100%" },
  mapPinOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
  },
  mapPinOuter: {
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20,
    padding: 6, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 6,
  },
  mapCoordBadge: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  mapCoordText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.dark.textSecondary },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.dark.textSecondary, letterSpacing: 0.3 },
  fieldInput: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.dark.text,
  },
  row: { flexDirection: "row" },

  paymentOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.border,
  },
  paymentOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + "08" },
  paymentIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.dark.background,
    alignItems: "center", justifyContent: "center",
  },
  paymentLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.dark.textSecondary },
  paymentSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textTertiary, marginTop: 2 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.dark.border,
    alignItems: "center", justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  footer: {
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1, borderTopColor: Colors.dark.border,
    padding: 20, gap: 14,
  },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary },
  footerTotal: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.dark.text },
  footerPayBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.primary + "15",
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.primary + "30",
  },
  footerPayText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  placeBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, height: 56,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  placeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#000" },
});
