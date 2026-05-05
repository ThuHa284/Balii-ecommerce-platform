import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, UserRole, Address } from "@/types/user.types";
import { loginApi } from "@/lib/api/auth.api";
import { LoginCredentials } from "@/types/user.types";

// ============================================
// State & Action Types
// ============================================
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Address management (max 5 addresses per user)
  addresses: Address[];
  selectedAddressId: string | null;

  // Auth Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;

  // Address Actions
  addAddress: (address: Omit<Address, "id" | "userId">) => Address;
  updateAddress: (id: string, data: Partial<Omit<Address, "id" | "userId">>) => void;
  removeAddress: (id: string) => void;
  setSelectedAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

// ============================================
// Zustand Store with persist middleware
// Saves token + user + addresses to localStorage
// ============================================
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      addresses: [],
      selectedAddressId: null,

      // ── Auth ──────────────────────────────────────────────────────────────
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const result = await loginApi(credentials);
          if (typeof window !== "undefined") {
            (window as unknown as Record<string, unknown>).__BALII_ACCESS_TOKEN__ =
              result.accessToken;
          }
          set({
            user: result.user,
            token: result.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        if (typeof window !== "undefined") {
          (window as unknown as Record<string, unknown>).__BALII_ACCESS_TOKEN__ = undefined;
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          addresses: [],
          selectedAddressId: null,
        });
      },

      setUser: (user: User) => set({ user }),
      setLoading: (isLoading: boolean) => set({ isLoading }),

      // ── Address ───────────────────────────────────────────────────────────
      addAddress: (addressData) => {
        const { addresses, user } = get();
        if (addresses.length >= 5) {
          throw new Error("Bạn đã đạt giới hạn 5 địa chỉ. Vui lòng xóa bớt để thêm mới.");
        }
        const newAddress: Address = {
          ...addressData,
          id: `addr_${Date.now()}`,
          userId: user?.id ?? "guest",
          isDefault: addresses.length === 0, // first address is auto-default
        };
        const updatedAddresses = addressData.isDefault
          ? [
              ...addresses.map((a) => ({ ...a, isDefault: false })),
              newAddress,
            ]
          : [...addresses, newAddress];

        set({
          addresses: updatedAddresses,
          selectedAddressId: newAddress.id,
        });
        return newAddress;
      },

      updateAddress: (id, data) => {
        set({
          addresses: get().addresses.map((a) =>
            a.id === id ? { ...a, ...data } : a
          ),
        });
      },

      removeAddress: (id) => {
        const { addresses, selectedAddressId } = get();
        const filtered = addresses.filter((a) => a.id !== id);
        // If removed address was selected, fall back to default or first
        const newSelected =
          selectedAddressId === id
            ? filtered.find((a) => a.isDefault)?.id ?? filtered[0]?.id ?? null
            : selectedAddressId;
        set({ addresses: filtered, selectedAddressId: newSelected });
      },

      setSelectedAddress: (id) => set({ selectedAddressId: id }),

      setDefaultAddress: (id) => {
        set({
          addresses: get().addresses.map((a) => ({
            ...a,
            isDefault: a.id === id,
          })),
        });
      },
    }),
    {
      name: "balii-auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        addresses: state.addresses,
        selectedAddressId: state.selectedAddressId,
      }),
    }
  )
);

// ============================================
// Convenience selector hooks
// ============================================
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsAdmin = () => useAuthStore((s) => s.user?.role === UserRole.ADMIN);
export const useSelectedAddress = () =>
  useAuthStore((s) => s.addresses.find((a) => a.id === s.selectedAddressId) ?? null);
