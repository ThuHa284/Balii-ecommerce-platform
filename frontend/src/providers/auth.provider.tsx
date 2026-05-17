"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { refreshTokenApi } from "@/lib/api/auth.api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    async function hydrateAuth() {
      try {
        const result = await refreshTokenApi();
        // Hydrate user from persisted/refreshed token
        // (login() expects LoginCredentials — use setUser + direct store update)
        setUser(result.user);
        useAuthStore.setState({
          token: result.accessToken,
          isAuthenticated: true,
        });
      } catch {
        // Not authenticated, that's fine
      } finally {
        setLoading(false);
      }
    }
    hydrateAuth();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
