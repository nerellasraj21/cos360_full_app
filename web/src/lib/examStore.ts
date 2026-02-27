import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ExamCreateFull } from '@/types/exam'

interface ExamStore {
  wizardStep: number
  wizardData: Partial<ExamCreateFull>
  setWizardStep: (step: number) => void
  updateWizardData: (section: keyof ExamCreateFull, data: ExamCreateFull[keyof ExamCreateFull]) => void
  resetWizard: () => void
  markEntryFilter: {
    examId?: string
    classId?: string
    sectionId?: string
    subjectConfigId?: string
  }
  setMarkEntryFilter: (filter: Partial<ExamStore['markEntryFilter']>) => void
  activeExamId: string | null
  activeExamName: string | null
  setActiveExam: (examId: string | null, examName?: string | null) => void
}

const WIZARD_INITIAL: Partial<ExamCreateFull> = {
  exam: undefined,
  class_sections: [],
  subject_configs: [],
  exam_dates: [],
}

export const useExamStore = create<ExamStore>()(
  persist(
    (set) => ({
      wizardStep: 1,
      wizardData: WIZARD_INITIAL,
      setWizardStep: (step) => set({ wizardStep: step }),
      updateWizardData: (section, data) =>
        set((state) => ({
          wizardData: { ...state.wizardData, [section]: data },
        })),
      resetWizard: () => set({ wizardStep: 1, wizardData: WIZARD_INITIAL }),
      markEntryFilter: {},
      setMarkEntryFilter: (filter) =>
        set((state) => ({
          markEntryFilter: { ...state.markEntryFilter, ...filter },
        })),
      activeExamId: null,
      activeExamName: null,
      setActiveExam: (examId, examName = null) =>
        set({ activeExamId: examId, activeExamName: examName }),
    }),
    {
      name: 'exam-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        wizardData: state.wizardData,
        wizardStep: state.wizardStep,
        markEntryFilter: state.markEntryFilter,
      }) as ExamStore,
    }
  )
)
