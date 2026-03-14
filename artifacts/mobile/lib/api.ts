const BASE = process.env.EXPO_PUBLIC_API_URL ?? "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(err.message ?? "Request failed");
  }
  return res.json();
}

export const api = {
  signup: (data: { email: string; password: string }) =>
    request<{ account_id: number; email: string; onboarding_completed: boolean }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ account_id: number; email: string; onboarding_completed: boolean }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submitOnboarding: (data: {
    account_id: number;
    name: string;
    date_of_birth: string;
    gender: string;
    height_cm: number;
    weight_kg: number;
    phone_number: string;
    goals: { goal_id: number; rank: number }[];
  }) =>
    request<{ success: boolean; profile_id?: number; message: string }>("/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getDashboard: (account_id: number) =>
    request<{
      profile: {
        id: number;
        account_id: number;
        name: string;
        age: number;
        date_of_birth: string;
        gender: string;
        height_cm: number;
        weight_kg: number;
        bmi: number;
        phone_number: string;
      };
      user_goals: { goal_id: number; goal_name: string; rank: number }[];
      all_goals: { id: number; name: string }[];
      recommendations: {
        product_id: number;
        product_name: string;
        grams: number;
        grams_per_day: number;
        goal_name: string;
        price_per_gram: number;
        icon_emoji: string;
        icon_color: string;
      }[];
      total_grams_per_month: number;
      grams_per_day: number;
    }>(`/dashboard?account_id=${account_id}`),

  updateGoals: (data: { account_id: number; goals: { goal_id: number; rank: number }[] }) =>
    request<{ success: boolean; message: string }>("/goals/update", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateProfile: (data: { account_id: number; height_cm?: number; weight_kg?: number }) =>
    request<{ success: boolean; message: string }>("/goals/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getProducts: () =>
    request<{
      products: {
        id: number;
        name: string;
        description: string;
        price_per_gram: number;
        goal_id: number;
        goal_name: string;
        is_trial: boolean;
        trial_price?: number;
        key_benefits: string[];
        icon_color: string;
        icon_emoji: string;
      }[];
    }>("/products"),

  addToCart: (data: { account_id: number; product_id: number; grams: number }) =>
    request<{ items: CartItem[]; total_price: number }>("/cart/add", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCart: (account_id: number) =>
    request<{ items: CartItem[]; total_price: number }>(`/cart?account_id=${account_id}`),

  removeCartItem: (id: number) =>
    request<{ message: string }>(`/cart/item/${id}`, { method: "DELETE" }),

  checkout: (data: {
    account_id: number;
    delivery_name?: string;
    delivery_phone?: string;
    delivery_address?: string;
    delivery_city?: string;
    delivery_pincode?: string;
    payment_method?: string;
    delivery_lat?: number;
    delivery_lng?: number;
    delivery_fee?: number;
    razorpay_payment_id?: string;
  }) =>
    request<{ order: Order; message: string }>("/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createPaymentOrder: (data: { amount_paise: number; receipt: string }) =>
    request<{ order_id: string; amount: number; currency: string; key_id: string }>("/payment/create-order", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    request<{ verified: boolean; payment_id: string }>("/payment/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getOrders: (account_id: number) =>
    request<{ orders: Order[] }>(`/orders?account_id=${account_id}`),

  getSupport: () => request<{ phone: string; email: string }>("/support"),
};

export interface CartItem {
  id: number;
  account_id: number;
  product_id: number;
  product_name: string;
  grams: number;
  price: number;
}

export interface Order {
  id: number;
  account_id: number;
  total_price: number;
  status: string;
  tracking_link?: string;
  delivery_name?: string;
  delivery_phone?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_pincode?: string;
  payment_method?: string;
  created_at: string;
  items: {
    id: number;
    product_id: number;
    product_name: string;
    grams: number;
    price: number;
  }[];
}
