import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole, Address } from '@/types/user.types';
import { loginApi, logoutApi } from '@/lib/api/auth.api';
import { LoginCredentials } from '@/types/user.types';
import {
  createAddress,
  deleteAddress,
  getMyAddresses,
  updateAddress as updateAddressApi,
} from '@/lib/api/addresses.api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  addresses: Address[];
  selectedAddressId: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  hydrateAddresses: () => Promise<void>;
  addAddress: (address: Omit<Address, 'id' | 'userId'>) => Promise<Address>;
  updateAddress: (
    id: string,
    data: Partial<Omit<Address, 'id' | 'userId'>>,
  ) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setSelectedAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      addresses: [],
      selectedAddressId: null,

      // Auth
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const result = await loginApi(credentials);
          if (typeof window !== 'undefined') {
            (
              window as unknown as Record<string, unknown>
            ).__BALII_ACCESS_TOKEN__ = result.accessToken;
            (
              window as unknown as Record<string, unknown>
            ).__BALII_REFRESH_TOKEN__ = result.refreshToken;
            (window as unknown as Record<string, unknown>).__BALII_USER_ID__ =
              result.user.id;
          }
          set({
            user: result.user,
            token: result.accessToken,
            refreshToken: result.refreshToken ?? null,
            addresses: result.user.addresses ?? [],
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        await logoutApi().catch(() => undefined);
        if (typeof window !== 'undefined') {
          (
            window as unknown as Record<string, unknown>
          ).__BALII_ACCESS_TOKEN__ = undefined;
          (
            window as unknown as Record<string, unknown>
          ).__BALII_REFRESH_TOKEN__ = undefined;
          (window as unknown as Record<string, unknown>).__BALII_USER_ID__ =
            undefined;
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          addresses: [],
          selectedAddressId: null,
        });
      },

      setUser: (user: User) => set({ user }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
      hydrateAddresses: async () => {
        const addresses = await getMyAddresses();
        set((state) => ({
          addresses,
          selectedAddressId:
            state.selectedAddressId &&
            addresses.some((item) => item.id === state.selectedAddressId)
              ? state.selectedAddressId
              : (addresses.find((item) => item.isDefault)?.id ??
                addresses[0]?.id ??
                null),
        }));
      },

      // Address
      addAddress: async (addressData) => {
        const { addresses, user } = get();
        if (addresses.length >= 5) {
          throw new Error(
            'Bạn đã đạt giới hạn 5 địa chỉ. Vui lòng xóa bớt để thêm mới.',
          );
        }
        if (!user) {
          throw new Error('Bạn cần đăng nhập để thêm địa chỉ.');
        }
        const newAddress = await createAddress({
          recipientName: addressData.fullName,
          phone: addressData.phone,
          provinceId: extractNumericId(addressData.province),
          districtId: extractNumericId(addressData.district),
          wardId: extractNumericId(addressData.ward),
          streetAddress: addressData.street,
          isDefault: addressData.isDefault ?? addresses.length === 0,
        });
        const updatedAddresses =
          (addressData.isDefault ?? false)
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

      updateAddress: async (id, data) => {
        await updateAddressApi(id, {
          recipientName: data.fullName,
          phone: data.phone,
          provinceId: data.province
            ? extractNumericId(data.province)
            : undefined,
          districtId: data.district
            ? extractNumericId(data.district)
            : undefined,
          wardId: data.ward ? extractNumericId(data.ward) : undefined,
          streetAddress: data.street,
          isDefault: data.isDefault,
        });
        set({
          addresses: get().addresses.map((a) =>
            a.id === id ? { ...a, ...data } : a,
          ),
        });
      },

      removeAddress: async (id) => {
        await deleteAddress(id);
        const { addresses, selectedAddressId } = get();
        const filtered = addresses.filter((a) => a.id !== id);
        const newSelected =
          selectedAddressId === id
            ? (filtered.find((a) => a.isDefault)?.id ?? filtered[0]?.id ?? null)
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
      name: 'balii-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        addresses: state.addresses,
        selectedAddressId: state.selectedAddressId,
      }),
    },
  ),
);

export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsAdmin = () =>
  useAuthStore(
    (s) =>
      s.user?.role === UserRole.ADMIN || s.user?.role === UserRole.SUPER_ADMIN,
  );
export const useIsSuperAdmin = () =>
  useAuthStore((s) => s.user?.role === UserRole.SUPER_ADMIN);
export const useSelectedAddress = () =>
  useAuthStore(
    (s) => s.addresses.find((a) => a.id === s.selectedAddressId) ?? null,
  );

function extractNumericId(label: string) {
  const matched = label.match(/(\d+)/);
  return matched ? Number(matched[1]) : 0;
}
