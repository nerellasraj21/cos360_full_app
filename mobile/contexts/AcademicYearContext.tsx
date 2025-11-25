import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { academicYearsApi, AcademicYear } from '@/src/api';
import { useAuth } from './AuthContext';

interface AcademicYearContextType {
  activeAcademicYear: AcademicYear | null;
  activeAcademicYearId: string | null;
  setActiveAcademicYear: (academicYear: AcademicYear | null) => void;
  setActiveAcademicYearById: (id: string | null) => void;
  academicYears: AcademicYear[];
  isLoading: boolean;
  refetchAcademicYears: () => void;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

const ACTIVE_ACADEMIC_YEAR_KEY = '@active_academic_year';

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Fetch all academic years only when authenticated
  const { data: academicYears = [], isLoading, refetch } = useQuery({
    queryKey: ['academicYears'],
    queryFn: () => academicYearsApi.getAcademicYears(),
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Load active academic year from storage on mount
  useEffect(() => {
    const loadActiveAcademicYear = async () => {
      try {
        const storedId = await AsyncStorage.getItem(ACTIVE_ACADEMIC_YEAR_KEY);
        if (storedId) {
          setActiveAcademicYearId(storedId);
        } else {
          // Set default to the active academic year from API
          const activeYear = academicYears.find(year => year.is_active);
          if (activeYear) {
            setActiveAcademicYearId(activeYear.id);
            await AsyncStorage.setItem(ACTIVE_ACADEMIC_YEAR_KEY, activeYear.id);
          }
        }
      } catch (error) {
        console.error('Error loading active academic year:', error);
      }
    };

    if (academicYears.length > 0) {
      loadActiveAcademicYear();
    }
  }, [academicYears]);

  // Get the active academic year object
  const activeAcademicYear = activeAcademicYearId
    ? academicYears.find(year => year.id === activeAcademicYearId) || null
    : null;

  const setActiveAcademicYear = async (academicYear: AcademicYear | null) => {
    const id = academicYear?.id || null;
    setActiveAcademicYearId(id);

    try {
      if (id) {
        await AsyncStorage.setItem(ACTIVE_ACADEMIC_YEAR_KEY, id);
      } else {
        await AsyncStorage.removeItem(ACTIVE_ACADEMIC_YEAR_KEY);
      }

      // Invalidate all queries to trigger refetch with new academic year
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Error saving active academic year:', error);
    }
  };

  const setActiveAcademicYearById = async (id: string | null) => {
    const academicYear = id ? academicYears.find(year => year.id === id) || null : null;
    await setActiveAcademicYear(academicYear);
  };

  const refetchAcademicYears = () => {
    refetch();
  };

  const value: AcademicYearContextType = {
    activeAcademicYear,
    activeAcademicYearId,
    setActiveAcademicYear,
    setActiveAcademicYearById,
    academicYears,
    isLoading,
    refetchAcademicYears,
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