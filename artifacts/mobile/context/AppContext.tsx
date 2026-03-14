import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { router } from "expo-router";

interface AppUser {
  account_id: number;
  email: string;
  onboarding_completed: boolean;
}

interface AppContextValue {
  user: AppUser | null;
  isLoading: boolean;
  setUser: (user: AppUser | null) => void;
  logout: () => Promise<void>;
  cartCount: number;
  setCartCount: (count: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem("nexo_user").then((data) => {
      if (data) {
        setUserState(JSON.parse(data));
      }
      setIsLoading(false);
    });
  }, []);

  const setUser = (u: AppUser | null) => {
    setUserState(u);
    if (u) {
      AsyncStorage.setItem("nexo_user", JSON.stringify(u));
    } else {
      AsyncStorage.removeItem("nexo_user");
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem("nexo_user");
    setUserState(null);
    setCartCount(0);
    router.replace("/");
  };

  const value = useMemo<AppContextValue>(
    () => ({ user, isLoading, setUser, logout, cartCount, setCartCount }),
    [user, isLoading, cartCount]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
