import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CustomSection {
  id: string;
  title: string;
  content: string;
}

export interface CustomSectionsState {
  sectionTitles: Record<string, string>;
  customSections: CustomSection[];
  setSectionTitle: (sectionId: string, title: string) => void;
  resetSectionTitle: (sectionId: string) => void;
  addCustomSection: (title: string, initialContent?: string) => string;
  updateCustomSection: (id: string, updates: Partial<CustomSection>) => void;
  deleteCustomSection: (id: string) => void;
  resetAll: () => void;
}

export const useCustomSectionsStore = create<CustomSectionsState>()(
  persist(
    (set) => ({
      sectionTitles: {},
      customSections: [],

      setSectionTitle: (sectionId, title) =>
        set((state) => ({
          sectionTitles: {
            ...state.sectionTitles,
            [sectionId]: title.trim(),
          },
        })),

      resetSectionTitle: (sectionId) =>
        set((state) => {
          const next = { ...state.sectionTitles };
          delete next[sectionId];
          return { sectionTitles: next };
        }),

      addCustomSection: (title, initialContent = '') => {
        const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        set((state) => ({
          customSections: [
            ...state.customSections,
            { id, title: title.trim() || 'Custom Section', content: initialContent },
          ],
        }));
        return id;
      },

      updateCustomSection: (id, updates) =>
        set((state) => ({
          customSections: state.customSections.map((sec) =>
            sec.id === id ? { ...sec, ...updates } : sec
          ),
        })),

      deleteCustomSection: (id) =>
        set((state) => ({
          customSections: state.customSections.filter((sec) => sec.id !== id),
        })),

      resetAll: () =>
        set({
          sectionTitles: {},
          customSections: [],
        }),
    }),
    {
      name: 'resume-custom-sections',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/** Helper hook to get the display title of a section, falling back to default */
export function getSectionDisplayTitle(sectionId: string, defaultTitle: string): string {
  const custom = useCustomSectionsStore.getState().sectionTitles[sectionId];
  return custom && custom.trim() ? custom : defaultTitle;
}
