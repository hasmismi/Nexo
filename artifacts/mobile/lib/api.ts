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
    request<{ account_id: number; email: string; onboarding_completed: boolean; is_admin: boolean }>("/auth/login", {
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

  adminBootstrap: (account_id: number) =>
    request<{ success: boolean; message: string }>("/admin/bootstrap", {
      method: "POST",
      body: JSON.stringify({ account_id }),
    }),

  adminStats: (account_id: number) =>
    request<{
      total_users: number;
      total_orders: number;
      total_revenue: number;
      today_orders: number;
      pending_orders: number;
    }>(`/admin/stats?account_id=${account_id}`),

  adminOrders: (account_id: number) =>
    request<{ orders: AdminOrder[] }>(`/admin/orders?account_id=${account_id}`),

  adminUpdateOrderStatus: (account_id: number, order_id: number, order_status: string, tracking_link?: string) =>
    request<{ success: boolean }>(`/admin/orders/${order_id}/status`, {
      method: "PUT",
      body: JSON.stringify({ account_id, order_status, ...(tracking_link !== undefined ? { tracking_link } : {}) }),
    }),

  adminUsers: (account_id: number) =>
    request<{ users: AdminUser[] }>(`/admin/users?account_id=${account_id}`),

  adminToggleAdmin: (account_id: number, target_id: number) =>
    request<{ success: boolean; is_admin: boolean }>(`/admin/users/${target_id}/toggle-admin`, {
      method: "PUT",
      body: JSON.stringify({ account_id }),
    }),

  adminProducts: (account_id: number) =>
    request<{ products: AdminProduct[] }>(`/admin/products?account_id=${account_id}`),

  adminUpdateProduct: (account_id: number, product_id: number, updates: Partial<AdminProduct>) =>
    request<{ product: AdminProduct }>(`/admin/products/${product_id}`, {
      method: "PUT",
      body: JSON.stringify({ account_id, ...updates }),
    }),

  adminOffers: (account_id: number) =>
    request<{ offers: AdminOffer[] }>(`/admin/offers?account_id=${account_id}`),

  adminCreateOffer: (account_id: number, data: Omit<AdminOffer, "id" | "uses_count" | "created_at">) =>
    request<{ offer: AdminOffer }>("/admin/offers", {
      method: "POST",
      body: JSON.stringify({ account_id, ...data }),
    }),

  adminUpdateOffer: (account_id: number, offer_id: number, data: Partial<AdminOffer>) =>
    request<{ offer: AdminOffer }>(`/admin/offers/${offer_id}`, {
      method: "PUT",
      body: JSON.stringify({ account_id, ...data }),
    }),

  adminDeleteOffer: (account_id: number, offer_id: number) =>
    request<{ success: boolean }>(`/admin/offers/${offer_id}?account_id=${account_id}`, {
      method: "DELETE",
    }),
};

export interface CartItem {
  id: number;
  account_id: number;
  product_id: number;
  product_name: string;
  grams: number;
  price: number;
}

export interface AdminOrder {
  id: number;
  account_id: number;
  email: string | null;
  customer_name: string | null;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_pincode: string | null;
  payment_method: string | null;
  delivery_fee: number;
  order_status: string;
  tracking_link: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  items: { order_id: number; product_name: string | null; quantity: number; unit_price: number }[];
}

export interface AdminUser {
  id: number;
  email: string;
  is_admin: boolean;
  name: string | null;
  phone_number: string | null;
  gender: string | null;
  age: number | null;
  onboarding_completed: boolean | null;
  created_at: string;
  order_count: number;
}

export interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price_per_gram: number;
  goal_id: number | null;
  is_trial: boolean;
  key_benefits: string;
  icon_color: string;
  icon_emoji: string;
  nutrition_energy_kcal: number | null;
  nutrition_protein_g: number | null;
  nutrition_fat_g: number | null;
  nutrition_carbs_g: number | null;
  nutrition_fibre_g: number | null;
  nutrition_sugars_g: number | null;
  nutrition_added_sugars_g: number | null;
}

export interface AdminOffer {
  id: number;
  title: string;
  description: string;
  code: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
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
