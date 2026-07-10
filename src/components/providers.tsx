"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: "admin" | "user";
  businessName?: string;
  defaultReminderDays?: number;
  defaultReminderTime?: string;
  defaultReminderMessage?: string;
  hasCobranzas?: boolean;
  hasHabitaciones?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/[...nextauth]");
        const data = await res.json();

        if (res.ok && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
          if (pathname !== "/" && pathname !== "/login") {
            router.push("/login");
          }
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
  }, [pathname, router]);

  const logout = async () => {
    try {
      await fetch("/api/auth/[...nextauth]", { method: "DELETE" });
      setUser(null);
      // Use window.location for hard navigation to ensure proper state reset
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return { user, loading, logout };
}

export function useRequireAuth(allowedRoles: ("admin" | "user")[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !allowedRoles.includes(user.role))) {
      router.push("/login");
    }
  }, [user, loading, router, allowedRoles]);

  return { user, loading };
}