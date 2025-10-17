import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AcademicYear } from '@/types/masters/academicyear';
import { fetchAcademicYears } from '@/api/masters/academicyears';

interface AcademicYearState {
  academicYears: AcademicYear[];
  selectedAcademicYearId: string;
  setSelectedAcademicYearId: (id: string) => void;
  setAcademicYears: (years: AcademicYear[]) => void;
  fetchAndSetAcademicYears: () => Promise<void>;
  clearInvalidData: () => void;
}

export const useAcademicYearStore = create<AcademicYearState>()(
  persist(
    (set, get) => ({
      academicYears: [],
      selectedAcademicYearId: (() => {
        try {
          const stored = localStorage.getItem('academic-year-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            const storedId = parsed.state?.selectedAcademicYearId;
            if (!storedId || storedId === '371' || storedId.length < 10) {
              localStorage.removeItem('academic-year-storage');
              return '';
            }
            return String(storedId);
          }
        } catch (error) {
          console.error('Error checking persisted academic year data:', error);
        }
        return '';
      })(),
      setSelectedAcademicYearId: (id) => {
        set({ selectedAcademicYearId: String(id) });
      },
      setAcademicYears: (years) => set({ academicYears: years }),
      fetchAndSetAcademicYears: async () => {
        try {
          const response = await fetchAcademicYears();
          const years = response.items;
          console.log("response", response)
          set({ academicYears: years });

          const currentId = get().selectedAcademicYearId;
          // If currentId is invalid OR not present in fetched list, choose a sane fallback
          const existsInList = years.some(y => String(y.id) === String(currentId));
          if (!currentId || currentId === '' || currentId === '371' || currentId.length < 10 || !existsInList) {
            const activeYear = years.find(year => year.is_active);
            const preferredId = activeYear
              ? String(activeYear.id)
              : years.length > 0
                ? String(years[years.length - 1].id)
                : '';

            if (preferredId && preferredId.length >= 10) {
              set({ selectedAcademicYearId: preferredId });
            } else {
              set({ selectedAcademicYearId: '' });
            }
          }
        } catch (error) {
          console.error('Error fetching academic years:', error);
        }
      },
      clearInvalidData: () => {
        set({ selectedAcademicYearId: '', academicYears: [] });
      },
    }),
    {
      name: 'academic-year-storage',
      partialize: (state) => ({ selectedAcademicYearId: state.selectedAcademicYearId }),
    }
  )
);
