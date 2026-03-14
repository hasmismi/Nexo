import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const { user, isLoading, setUser } = useApp();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.onboarding_completed) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, isLoading]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBusy(true);
    try {
      const result =
        mode === "signup"
          ? await api.signup({ email: trimmedEmail, password })
          : await api.login({ email: trimmedEmail, password });

      setUser(result);
      if (result.onboarding_completed) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    } catch (err: any) {
      Alert.alert(
        mode === "signup" ? "Sign Up Failed" : "Login Failed",
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsBusy(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setEmail("");
    setPassword("");
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.dark.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            <Pill label="Muscle Gain" mci="weight-lifter" color="#D9342B" />
          </View>
          <View style={styles.pillRow}>
            <Pill label="Energy" mci="lightning-bolt" color={Colors.blue} />
            <Pill label="Brain Power" mci="brain" color="#F5C518" />
            <Pill label="Vitality" mci="leaf" color="#6A0DAD" />
          </View>
          <Text style={styles.heroText}>Small in size,{"\n"}big in benefits</Text>
          <View style={styles.certRow}>
            <Text style={styles.certChip}>🌱 Vegan</Text>
            <Text style={styles.certChip}>💚 Cruelty Free</Text>
            <Text style={styles.certChip}>✅ FSSAI</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={16} color={Colors.dark.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.dark.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={16} color={Colors.dark.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                placeholderTextColor={Colors.dark.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={16}
                  color={Colors.dark.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.pressed,
              isBusy && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === "login" ? "Log in" : "Sign up"}
              </Text>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <Pressable onPress={toggleMode} disabled={isBusy}>
              <Text style={styles.switchLink}>
                {mode === "login" ? " Sign up" : " Log in"}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service{"\n"}and Privacy Policy
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Pill({ label, mci, color }: { label: string; mci: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color + "40" }]}>
      <MaterialCommunityIcons name={mci as any} size={14} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 28,
  },
  logoArea: {
    alignItems: "center",
  },
  logoImage: {
    width: 200,
    height: 140,
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
    gap: 10,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  heroText: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 34,
    marginTop: 4,
  },
  certRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
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
  formCard: {
    width: "100%",
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  formTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.dark.text,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  submitBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  switchText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  switchLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  terms: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.dark.textTertiary,
    textAlign: "center",
    lineHeight: 17,
  },
});
