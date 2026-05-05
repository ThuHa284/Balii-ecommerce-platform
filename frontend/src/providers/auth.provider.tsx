"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { refreshTokenApi } from "@/lib/api/auth.api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, setLoading } = useAuthStore();

  useEffect(() => {
    async function hydrateAuth() {
      try {
        const result = await refreshTokenApi();
        login(result.user, result.accessToken);
      } catch {
        // Not authenticated, that's fine
      } finally {
        setLoading(false);
      }
    }
    hydrateAuth();
  }, [login, setLoading]);

  return <>{children}</>;
}
