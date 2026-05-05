import { create } from "zustand";

interface UIState {
  isMobileNavOpen: boolean;
  isSearchOpen: boolean;
  toggleMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isMobileNavOpen: false,
  isSearchOpen: false,
  toggleMobileNav: () => set({ isMobileNavOpen: !get().isMobileNavOpen }),
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
  toggleSearch: () => set({ isSearchOpen: !get().isSearchOpen }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}));
