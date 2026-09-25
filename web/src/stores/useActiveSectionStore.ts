import { create } from 'zustand';

export type MobileTab = 'preview' | 'edit';

export interface ActiveSectionState {
  activeSection: string;
  mobileTab: MobileTab;
  setActiveSection: (section: string) => void;
  setMobileTab: (tab: MobileTab) => void;
  openTailor: () => void;
}

export const useActiveSectionStore = create<ActiveSectionState>((set) => ({
  activeSection: '',
  mobileTab: 'preview',
  setActiveSection: (section) => set({ activeSection: section }),
  setMobileTab: (tab) => set({ mobileTab: tab }),
  openTailor: () => set({ activeSection: 'tailor', mobileTab: 'edit' }),
}));
