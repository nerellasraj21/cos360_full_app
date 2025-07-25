import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AcademicYear } from '@/types/masters/academicyear';
import { fetchAcademicYears } from '@/api/masters/academicyears';

interface AcademicYearState {
  academicYears: AcademicYear[];
  selectedAcademicYearId: number ;
  setSelectedAcademicYearId: (id: number) => void;
  setAcademicYears: (years: AcademicYear[]) => void;
  fetchAndSetAcademicYears: () => Promise<void>;
}

export const useAcademicYearStore = create<AcademicYearState>()(
  persist(
    (set, get) => ({
      academicYears: [],
      selectedAcademicYearId: 0,
      setSelectedAcademicYearId: (id) => set({ selectedAcademicYearId: id }),
      setAcademicYears: (years) => set({ academicYears: years }),
      fetchAndSetAcademicYears: async () => {
        const years = await fetchAcademicYears();
        set({ academicYears: years });
        // Optionally set default selected year if not set
        if (get().selectedAcademicYearId==0 && years.length > 0) {
          set({ selectedAcademicYearId: years[0].id });
        }
      },
    }),
    {
      name: 'academic-year-storage',
      partialize: (state) => ({ selectedAcademicYearId: state.selectedAcademicYearId }),
    }
  )
); 