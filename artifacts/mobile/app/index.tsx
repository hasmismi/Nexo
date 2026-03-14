import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

// Android-safe icon mapping - uses Feather icons that work reliably
const ICON_MAP: Record<string, { feather: string; label: string }> = {
  "run": { feather: "activity", label: "Weight Loss" },
  "dumbbell": { feather: "zap", label: "Muscle" },
  "brain": { feather: "brain", label: "Brain" },
  "zap": { feather: "zap", label: "Energy" },
  "leaf": { feather: "leaf", label: "Vitality" },
};

// Google OAuth config - get these from Google Cloud Console
// https://console.cloud.google.com/
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || "";

// For web/Replit
const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://www.googleapis.com/oauth2/v4/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export default function LoginScreen() {
  const { user, isLoading, setUser } = useApp();
  const insets = useSafeAreaInsets();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      scopes: ["profile", "email"],
      redirectUrl: AuthSession.getRedirectUrl(),
    },
    discovery
  );

  useEffect(() => {
    if (!isLoading && user) {
      if (user.onboarding_completed) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleLoginWithToken(authentication.accessToken);
      }
    }
  }, [response]);

  const handleGoogleLoginWithToken = async (accessToken: string) => {
    try {
      // Get user info from Google
      const userInfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoRes.json();

      if (!userInfoRes.ok) {
        throw new Error(userInfo.error?.message || "Failed to get user info");
      }

      // Login with backend
      const result = await api.googleLogin({
        google_id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
      });

      setUser(result);
      if (result.onboarding_completed) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      Alert.alert("Login Error", err.message || "Failed to sign in with Google");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!GOOGLE_CLIENT_ID) {
      Alert.alert(
        "Setup Required",
        "Google OAuth is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID environment variable."
      );
      return;
    }
    setIsLoggingIn(true);
    try {
      await promptAsync();
    } catch (err: any) {
      console.error("Google prompt error:", err);
      Alert.alert("Login Error", err.message || "Failed to open Google sign-in");
      setIsLoggingIn(false);
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
          <Pill label="Weight Loss" mci="run" color={Colors.primary} />
          <Pill label="Muscle Gain" mci="dumbbell" color="#D9342B" />
        </View>
        <View style={styles.pillRow}>
          <Pill label="Energy" mci="zap" color={Colors.blue} />
          <Pill label="Brain Power" mci="brain" color="#F5C518" />
          <Pill label="Vitality" mci="leaf" color="#6A0DAD" />
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
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, isLoggingIn && { opacity: 0.6 }]}
          onPress={handleGoogleLogin}
          disabled={isLoggingIn || !request}
        >
          {isLoggingIn ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <View style={styles.googleIcon}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service{"\n"}and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

function Pill({ label, mci, color }: { label: string; mci: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color + "40" }]}>
      {Platform.OS === "android" ? (
        <Feather name={ICON_MAP[mci]?.feather ?? "circle"} size={14} color={color} />
      ) : (
        <MaterialCommunityIcons name={mci as any} size={14} color={color} />
      )}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
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
