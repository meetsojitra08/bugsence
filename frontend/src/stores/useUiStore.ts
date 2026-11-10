import { create } from "zustand";

interface UiState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  isCaptureModalOpen: boolean;
  setCaptureModalOpen: (open: boolean) => void;
  openCaptureModal: () => void;

  showInsightsNav: boolean;
  setShowInsightsNav: (show: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) => set({ isSidebarCollapsed: collapsed }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open: boolean) => set({ isCommandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  isCaptureModalOpen: false,
  setCaptureModalOpen: (open: boolean) => set({ isCaptureModalOpen: open }),
  openCaptureModal: () => set({ isCaptureModalOpen: true }),

  showInsightsNav: false,
  setShowInsightsNav: (show: boolean) => set({ showInsightsNav: show }),
}));
