import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: ["support"],
    queryFn: api.getSupport,
  });

  return (
    <View style={[styles.container, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 42 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Feather name="headphones" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>We're here to help</Text>
          <Text style={styles.subtitle}>
            Our support team is available Mon–Sat, 9am–6pm IST
          </Text>

          <View style={styles.contactCard}>
            <Pressable
              style={({ pressed }) => [styles.contactItem, pressed && { opacity: 0.75 }]}
              onPress={() => {
                Haptics.selectionAsync();
                Linking.openURL(`tel:${data?.phone}`);
              }}
            >
              <View style={styles.contactIcon}>
                <Feather name="phone" size={22} color={Colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{data?.phone}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.dark.textTertiary} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [styles.contactItem, pressed && { opacity: 0.75 }]}
              onPress={() => {
                Haptics.selectionAsync();
                Linking.openURL(`mailto:${data?.email}`);
              }}
            >
              <View style={styles.contactIcon}>
                <Feather name="mail" size={22} color={Colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{data?.email}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.dark.textTertiary} />
            </Pressable>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.faqTitle}>Frequently Asked</Text>
            <FaqItem
              q="How are products recommended?"
              a="Based on your health goals and body metrics, we match you with the most suitable nutrition powders."
            />
            <FaqItem
              q="How is my daily serving calculated?"
              a="Your total monthly grams are divided by 30 to give your optimal daily serving."
            />
            <FaqItem
              q="Can I change my goals?"
              a="Yes, contact support to update your profile and get a fresh nutrition plan."
            />
          </View>
        </View>
      )}
    </View>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Pressable
      style={styles.faqItem}
      onPress={() => { Haptics.selectionAsync(); setOpen((v) => !v); }}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{q}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={Colors.dark.textSecondary} />
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.dark.text,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    alignSelf: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  contactCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  contactIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: { flex: 1 },
  contactLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  contactValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.dark.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 16,
  },
  faqSection: { gap: 10 },
  faqTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  faqItem: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    gap: 8,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQ: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.text,
    flex: 1,
    paddingRight: 12,
  },
  faqA: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
});
