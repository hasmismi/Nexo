import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: {
    name?: string;
    contact?: string;
  };
}

interface Props {
  visible: boolean;
  options: RazorpayOptions;
  onSuccess: (paymentId: string, orderId: string, signature: string) => void;
  onFailure: (reason: string) => void;
  onDismiss: () => void;
}

export function RazorpayCheckout({ visible, options, onSuccess, onFailure, onDismiss }: Props) {
  if (!visible) return null;

  if (Platform.OS === "web") {
    return (
      <RazorpayWeb
        options={options}
        onSuccess={onSuccess}
        onFailure={onFailure}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <RazorpayNative
      visible={visible}
      options={options}
      onSuccess={onSuccess}
      onFailure={onFailure}
      onDismiss={onDismiss}
    />
  );
}

function RazorpayWeb({ options, onSuccess, onFailure, onDismiss }: Omit<Props, "visible">) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const launched = useRef(false);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;

    const existingScript = document.getElementById("razorpay-checkout-js");
    if (existingScript) {
      openRazorpay();
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => { setStatus("ready"); openRazorpay(); };
    script.onerror = () => { setStatus("error"); onFailure("Failed to load payment gateway"); };
    document.body.appendChild(script);
  }, []);

  const openRazorpay = () => {
    const rzp = new window.Razorpay({
      key: options.key,
      amount: options.amount,
      currency: options.currency,
      order_id: options.order_id,
      name: options.name,
      description: options.description ?? "Nexo Nutrition Order",
      prefill: options.prefill ?? {},
      theme: { color: "#CCFF00" },
      modal: {
        ondismiss: () => { onDismiss(); },
      },
      handler: (response: any) => {
        onSuccess(
          response.razorpay_payment_id,
          response.razorpay_order_id,
          response.razorpay_signature,
        );
      },
    });
    rzp.on("payment.failed", (response: any) => {
      onFailure(response.error?.description ?? "Payment failed");
    });
    rzp.open();
    setStatus("ready");
  };

  if (status === "loading") {
    return (
      <View style={styles.webOverlay}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.webLoadingText}>Opening payment gateway…</Text>
      </View>
    );
  }
  return null;
}

function RazorpayNative({ visible, options, onSuccess, onFailure, onDismiss }: Props) {
  const [WebView, setWebView] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    import("react-native-webview").then((mod) => {
      setWebView(() => mod.WebView ?? mod.default);
    }).catch(() => onFailure("WebView not available"));
  }, []);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; font-family: sans-serif; }
    .loading { color: #fff; text-align: center; gap: 12px; display: flex; flex-direction: column; align-items: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #CCFF00;
               border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p style="color:#999;font-size:14px">Loading payment gateway…</p>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    window.onload = function() {
      var options = ${JSON.stringify({
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        order_id: options.order_id,
        name: options.name,
        description: options.description ?? "Nexo Nutrition Order",
        prefill: options.prefill ?? {},
        theme: { color: "#CCFF00" },
      })};

      options.handler = function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'payment_success',
          payment_id: response.razorpay_payment_id,
          order_id: response.razorpay_order_id,
          signature: response.razorpay_signature,
        }));
      };

      options.modal = {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'payment_dismissed' }));
        }
      };

      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'payment_failed',
          reason: response.error && response.error.description ? response.error.description : 'Payment failed',
        }));
      });
      rzp.open();
    };
  </script>
</body>
</html>
`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "payment_success") {
        onSuccess(data.payment_id, data.order_id, data.signature);
      } else if (data.type === "payment_failed") {
        onFailure(data.reason ?? "Payment failed");
      } else if (data.type === "payment_dismissed") {
        onDismiss();
      }
    } catch {
      onFailure("Unexpected error");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.nativeContainer}>
        <View style={styles.nativeHeader}>
          <Text style={styles.nativeTitle}>Secure Payment</Text>
          <Pressable onPress={onDismiss} style={styles.closeBtn}>
            <Feather name="x" size={20} color={Colors.dark.text} />
          </Pressable>
        </View>

        {!loaded && (
          <View style={styles.nativeLoading}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.nativeLoadingText}>Loading Razorpay…</Text>
          </View>
        )}

        {WebView ? (
          <WebView
            source={{ html }}
            style={[styles.webView, !loaded && { opacity: 0, position: "absolute" }]}
            onLoadEnd={() => setLoaded(true)}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mixedContentMode="compatibility"
          />
        ) : (
          <View style={styles.nativeLoading}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.nativeLoadingText}>Loading…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 9999,
  },
  webLoadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  nativeContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  nativeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  nativeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.dark.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  nativeLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  nativeLoadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  webView: {
    flex: 1,
    backgroundColor: "#111",
  },
});
