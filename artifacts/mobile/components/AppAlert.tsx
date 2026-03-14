import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onDismiss: () => void;
}

export function ConfirmModal({ visible, title, message, buttons, onDismiss }: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMessage}>{message}</Text> : null}
          <View style={styles.dialogButtons}>
            {buttons.map((btn, i) => (
              <Pressable
                key={i}
                style={[
                  styles.dialogBtn,
                  btn.style === "cancel" && styles.dialogBtnCancel,
                  btn.style === "destructive" && styles.dialogBtnDestructive,
                ]}
                onPress={() => {
                  btn.onPress?.();
                  onDismiss();
                }}
              >
                <Text
                  style={[
                    styles.dialogBtnText,
                    btn.style === "cancel" && styles.dialogBtnTextCancel,
                    btn.style === "destructive" && styles.dialogBtnTextDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ToastProps {
  visible: boolean;
  message: string;
  icon?: keyof typeof Feather.glyphMap;
  onHide: () => void;
}

export function Toast({ visible, message, icon = "check-circle", onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onHide}>
      <View style={styles.toastContainer} pointerEvents="none">
        <Animated.View style={[styles.toast, { opacity }]}>
          <Feather name={icon} size={17} color={Colors.primary} />
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: "#1C1C1C",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  dialogTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  dialogMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 21,
  },
  dialogButtons: {
    flexDirection: "row",
    gap: 10,
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 11,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
  },
  dialogBtnCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#333",
  },
  dialogBtnDestructive: {
    backgroundColor: "rgba(255,59,48,0.12)",
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  dialogBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  dialogBtnTextCancel: {
    color: "#888",
  },
  dialogBtnTextDestructive: {
    color: "#FF3B30",
  },
  toastContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 90,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1C1C1C",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  toastText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#fff",
  },
});
