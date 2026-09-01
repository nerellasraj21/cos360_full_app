import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { academicYearsApi, AcademicYear } from '@/src/api';
import { useAuth } from './AuthContext';

interface AcademicYearContextType {
  activeAcademicYear: AcademicYear | null;
  activeAcademicYearId: string | null;
  setActiveAcademicYear: (academicYear: AcademicYear | null) => Promise<void>;
  setActiveAcademicYearById: (id: string | null) => Promise<void>;
  academicYears: AcademicYear[];
  isLoading: boolean;
  refetchAcademicYears: () => void;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

const STORAGE_KEY = '@active_academic_year';

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  // Ref keeps the current ID accessible in effects without adding it to dependency arrays,
  // preventing auto-select from overriding a user's manual selection on refetch.
  const activeIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: academicYears = [], isLoading, refetch } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => academicYearsApi.getAcademicYears(),
    enabled: isAuthenticated,
  });

  // Keep ref in sync with state
  useEffect(() => {
    activeIdRef.current = activeAcademicYearId;
  }, [activeAcademicYearId]);

  // Load persisted ID from AsyncStorage immediately on mount — before the API call completes.
  // This prevents a null flash for components that read activeAcademicYearId on first render.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(id => { if (id) setActiveAcademicYearId(id); })
      .catch(e => console.error('AcademicYearContext: storage read failed', e))
      .finally(() => setStorageLoaded(true));
  }, []);

  // Once both storage read and API fetch are ready: validate the stored ID or auto-select.
  // Runs again if academicYears refetches — if the stored year was deleted, auto-select a new one.
  useEffect(() => {
    if (!storageLoaded || academicYears.length === 0) return;

    const currentId = activeIdRef.current;
    const isValid = !!currentId && academicYears.some(y => y.id === currentId);

    if (!isValid) {
      const best = academicYears.find(y => y.is_active) ?? academicYears[0];
      if (best) {
        setActiveAcademicYearId(best.id);
        AsyncStorage.setItem(STORAGE_KEY, best.id).catch(console.error);
      }
    }
  }, [storageLoaded, academicYears]);

  const activeAcademicYear = activeAcademicYearId
    ? academicYears.find(y => y.id === activeAcademicYearId) ?? null
    : null;

  const setActiveAcademicYear = async (academicYear: AcademicYear | null): Promise<void> => {
    const id = academicYear?.id ?? null;
    setActiveAcademicYearId(id);
    try {
      if (id) {
        await AsyncStorage.setItem(STORAGE_KEY, id);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      // Invalidate all queries so every screen refetches for the new academic year
      queryClient.invalidateQueries();
    } catch (e) {
      console.error('AcademicYearContext: storage write failed', e);
    }
  };

  const setActiveAcademicYearById = async (id: string | null): Promise<void> => {
    const year = id ? academicYears.find(y => y.id === id) ?? null : null;
    await setActiveAcademicYear(year);
  };

  const value: AcademicYearContextType = {
    activeAcademicYear,
    activeAcademicYearId,
    setActiveAcademicYear,
    setActiveAcademicYearById,
    academicYears,
    isLoading,
    refetchAcademicYears: () => refetch(),
  };

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
}
