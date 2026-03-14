import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const { user, isLoading, setUser } = useApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.onboarding_completed) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, isLoading]);

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await api.googleLogin({
        google_id: "demo_google_id_" + Date.now(),
        email: "demo@nexoapp.com",
        name: "Nexo User",
      });
      setUser(result);
      if (result.onboarding_completed) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 32, paddingTop: insets.top }]}>
      <View style={styles.logoArea}>
        <Image
          source={require("@/assets/images/nexo-logo.jpeg")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>by Ashgre · Personalized Nutrition</Text>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.pillRow}>
          <Pill icon="activity" text="Weight Loss" color={Colors.primary} />
          <Pill icon="trending-up" text="Muscle Gain" color="#D9342B" />
        </View>
        <View style={styles.pillRow}>
          <Pill icon="zap" text="Energy" color={Colors.blue} />
          <Pill icon="brain" text="Brain Power" color="#F5C518" />
          <Pill icon="heart" text="Vitality" color="#6A0DAD" />
        </View>
        <Text style={styles.heroText}>
          Small in size,{"\n"}big in benefits
        </Text>
        <View style={styles.certRow}>
          <Text style={styles.certChip}>🌱 Vegan</Text>
          <Text style={styles.certChip}>💚 Cruelty Free</Text>
          <Text style={styles.certChip}>✅ FSSAI</Text>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
          onPress={handleGoogleLogin}
        >
          <View style={styles.googleIcon}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service{"\n"}and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

function Pill({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color + "40" }]}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  logoArea: {
    alignItems: "center",
    paddingTop: 32,
  },
  logoImage: {
    width: 220,
    height: 160,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  heroSection: {
    alignItems: "center",
    gap: 12,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  heroText: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 36,
    marginTop: 8,
  },
  certRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
  },
  certChip: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.text,
    borderRadius: 16,
    height: 56,
    width: "100%",
    paddingHorizontal: 20,
    gap: 12,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  googleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#4285F4",
  },
  googleButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#000",
    flex: 1,
    textAlign: "center",
    marginRight: 32,
  },
  terms: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textTertiary,
    textAlign: "center",
    lineHeight: 18,
  },
});
