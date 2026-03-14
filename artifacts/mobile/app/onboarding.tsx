import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

const GOALS = [
  { id: 6,  name: "Muscle Gain",                      mci: "weight-lifter", color: "#D9342B", desc: "Build and recover faster" },
  { id: 7,  name: "Weight Loss",                       mci: "run",           color: "#A8A8B3", desc: "Burn fat, stay lean" },
  { id: 8,  name: "Improved Brain Performance",        mci: "brain",         color: "#F5C518", desc: "Focus, memory, clarity" },
  { id: 9,  name: "Increase Energy Levels",            mci: "lightning-bolt",color: "#1A6FBF", desc: "Sustained clean energy" },
  { id: 10, name: "Kids Health",                       mci: "account-child", color: "#FF8C00", desc: "Natural growth support" },
  { id: 11, name: "Overall Senior Health Improvement", mci: "human-cane",    color: "#6A0DAD", desc: "Nutrition for golden years" },
  { id: 12, name: "Overall Fitness Support",           mci: "leaf",          color: "#4CAF50", desc: "Clean, holistic wellness" },
  { id: 13, name: "Blood Sugar Management",            mci: "water-plus",    color: "#008080", desc: "Steady energy, zero spikes" },
];

const GENDERS = ["Male", "Female", "Other"];
const STEPS = ["profile", "goals"] as const;
type Step = (typeof STEPS)[number];

function calcAge(dob: string): number | null {
  const parts = dob.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length < 4) return null;
  const birth = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function toISODate(dob: string): string {
  const parts = dob.split("/");
  if (parts.length !== 3) return dob;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

export default function OnboardingScreen() {
  const { user, setUser } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<{ id: number; rank: number }[]>([]);

  const toggleGoal = (id: number) => {
    Haptics.selectionAsync();
    const existing = selectedGoals.find((g) => g.id === id);
    if (existing) {
      setSelectedGoals(selectedGoals.filter((g) => g.id !== id));
    } else if (selectedGoals.length < 2) {
      setSelectedGoals([...selectedGoals, { id, rank: selectedGoals.length + 1 }]);
    }
  };

  const formatDob = (text: string) => {
    const clean = text.replace(/[^0-9]/g, "");
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
  };

  const handleProfileNext = () => {
    if (!name || !dob || !gender || !height || !weight || !phone) {
      Alert.alert("Missing fields", "Please fill in all fields to continue.");
      return;
    }
    const age = calcAge(dob);
    if (age === null || age < 1 || age > 120) {
      Alert.alert("Invalid date of birth", "Please enter a valid date in DD/MM/YYYY format.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("goals");
  };

  const handleSubmit = async () => {
    if (selectedGoals.length === 0) {
      Alert.alert("Select goals", "Please select at least one nutrition goal.");
      return;
    }
    if (!user) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.submitOnboarding({
        account_id: user.account_id,
        name,
        date_of_birth: toISODate(dob),
        gender,
        height_cm: parseFloat(height),
        weight_kg: parseFloat(weight),
        phone_number: phone,
        goals: selectedGoals.map((g) => ({ goal_id: g.id, rank: g.rank })),
      });
      setUser({ ...user, onboarding_completed: true });
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const age = calcAge(dob);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {step === "goals" && (
          <Pressable onPress={() => setStep("profile")} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={Colors.dark.text} />
          </Pressable>
        )}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: step === "profile" ? "50%" : "100%" }]} />
        </View>
        <Text style={styles.stepIndicator}>{step === "profile" ? "1/2" : "2/2"}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === "profile" ? (
          <>
            <Text style={styles.title}>Your Profile</Text>
            <Text style={styles.subtitle}>We need a few details to personalise your nutrition plan</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.dark.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date of Birth (DD/MM/YYYY)</Text>
              <TextInput
                style={styles.input}
                value={dob}
                onChangeText={(t) => setDob(formatDob(t))}
                placeholder="01/01/1995"
                placeholderTextColor={Colors.dark.textTertiary}
                keyboardType="numeric"
                maxLength={10}
              />
              {age !== null && dob.length === 10 && (
                <Text style={styles.ageCalc}>Age: {age} years</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.dark.textTertiary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderSelected]}
                    onPress={() => { Haptics.selectionAsync(); setGender(g); }}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="175"
                  placeholderTextColor={Colors.dark.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="70"
                  placeholderTextColor={Colors.dark.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
              onPress={handleProfileNext}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#000" />
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Your Goals</Text>
            <Text style={styles.subtitle}>Select up to 2 goals — we'll build your personalised plan around them</Text>

            <View style={styles.goalsGrid}>
              {GOALS.map((goal) => {
                const selected = selectedGoals.find((g) => g.id === goal.id);
                const rank = selected?.rank;
                return (
                  <Pressable
                    key={goal.id}
                    style={[styles.goalCard, !!selected && styles.goalCardSelected]}
                    onPress={() => toggleGoal(goal.id)}
                  >
                    <View style={styles.goalCardTop}>
                      <View style={[styles.goalIconWrap, { backgroundColor: goal.color + "22" }]}>
                        <MaterialCommunityIcons name={goal.mci as any} size={22} color={goal.color} />
                      </View>
                      {rank !== undefined && (
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>{rank}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.goalName, !!selected && { color: Colors.primary }]}>{goal.name}</Text>
                    <Text style={styles.goalDesc}>{goal.desc}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.goalsCounter}>
              <Text style={styles.goalsCounterText}>{selectedGoals.length}/2 selected</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Build My Plan</Text>
                  <Feather name="zap" size={18} color="#000" />
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepIndicator: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  field: { marginBottom: 20 },
  row: { flexDirection: "row", gap: 12 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.dark.text,
  },
  ageCalc: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.primary,
    marginTop: 6,
  },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
  },
  genderSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "15",
  },
  genderText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  genderTextSelected: { color: Colors.primary },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  nextBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#000",
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  goalCard: {
    width: "47%",
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  goalCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  goalCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  goalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#000",
  },
  goalName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.dark.text,
    lineHeight: 18,
  },
  goalDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.dark.textSecondary,
    lineHeight: 15,
  },
  goalsCounter: {
    alignItems: "center",
    marginBottom: 20,
  },
  goalsCounterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
});
