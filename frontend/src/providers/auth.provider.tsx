"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { refreshTokenApi } from "@/lib/api/auth.api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, hydrateAddresses } = useAuthStore();

  useEffect(() => {
    async function hydrateAuth() {
      try {
        const result = await refreshTokenApi();
        // Hydrate user from persisted/refreshed token
        // (login() expects LoginCredentials — use setUser + direct store update)
        setUser(result.user);
        useAuthStore.setState({
          token: result.accessToken,
          refreshToken: result.refreshToken ?? null,
          isAuthenticated: true,
        });
        if (typeof window !== "undefined") {
          window.__BALII_ACCESS_TOKEN__ = result.accessToken;
          window.__BALII_REFRESH_TOKEN__ = result.refreshToken;
          window.__BALII_USER_ID__ = result.user.id;
        }
        await hydrateAddresses();
      } catch {
        // Not authenticated, that's fine
      } finally {
        setLoading(false);
      }
    }
    hydrateAuth();
  }, [setUser, setLoading, hydrateAddresses]);

  return <>{children}</>;
}
