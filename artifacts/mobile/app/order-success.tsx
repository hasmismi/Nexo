import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Animated } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }], opacity }]}>
          <View style={styles.iconCircle}>
            <Feather name="check" size={52} color={Colors.primary} />
          </View>
        </Animated.View>

        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>
          Your order has been confirmed and will be delivered to your address soon.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="truck" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>Estimated delivery in 3–5 business days</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="bell" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>You'll be notified when your order ships</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="package" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>Track your order from the Orders section</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace("/orders")}
        >
          <Feather name="package" size={18} color="#000" />
          <Text style={styles.primaryBtnText}>View My Orders</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background, paddingHorizontal: 24 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  iconWrap: { marginBottom: 8 },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.primary + "18",
    borderWidth: 2, borderColor: Colors.primary + "40",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 30, color: Colors.dark.text, textAlign: "center" },
  subtitle: {
    fontFamily: "Inter_400Regular", fontSize: 15,
    color: Colors.dark.textSecondary, textAlign: "center",
    lineHeight: 23, paddingHorizontal: 10,
  },
  infoCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.dark.border,
    padding: 18, gap: 14, width: "100%",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary, flex: 1, lineHeight: 20 },
  actions: { gap: 12 },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, height: 56,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#000" },
  secondaryBtn: {
    borderRadius: 16, height: 50,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  secondaryBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.dark.textSecondary },
});
