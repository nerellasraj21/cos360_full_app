import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useOptimizedMobilePermissions } from '../hooks/use-optimized-mobile-permissions';
import { 
  preloadPermissionsForRole, 
  PermissionPerformanceAnalyzer,
  generateGlobalPerformanceReport 
} from '../utils/permission-performance-utils';

interface PerformanceSettings {
  enableCaching: boolean;
  enablePerformanceMonitoring: boolean;
  enablePreloading: boolean;
  cacheSize: number;
  cacheTTL: number;
  monitoringInterval: number;
  autoOptimization: boolean;
}

interface PerformanceState {
  settings: PerformanceSettings;
  isMonitoring: boolean;
  lastReport: any | null;
  optimizationSuggestions: string[];
}

type PerformanceAction =
  | { type: 'UPDATE_SETTINGS'; payload: Partial<PerformanceSettings> }
  | { type: 'START_MONITORING' }
  | { type: 'STOP_MONITORING' }
  | { type: 'UPDATE_REPORT'; payload: any }
  | { type: 'ADD_SUGGESTION'; payload: string }
  | { type: 'CLEAR_SUGGESTIONS' }
  | { type: 'RESET_SETTINGS' };

interface PermissionPerformanceContextType extends PerformanceState {
  updateSettings: (settings: Partial<PerformanceSettings>) => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  generateReport: () => any;
  applyOptimizations: () => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: PerformanceSettings = {
  enableCaching: true,
  enablePerformanceMonitoring: __DEV__, // Only in development by default
  enablePreloading: true,
  cacheSize: 2000,
  cacheTTL: 10 * 60 * 1000, // 10 minutes
  monitoringInterval: 30000, // 30 seconds
  autoOptimization: false,
};

const initialState: PerformanceState = {
  settings: DEFAULT_SETTINGS,
  isMonitoring: false,
  lastReport: null,
  optimizationSuggestions: [],
};

const performanceReducer = (state: PerformanceState, action: PerformanceAction): PerformanceState => {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case 'START_MONITORING':
      return {
        ...state,
        isMonitoring: true,
      };

    case 'STOP_MONITORING':
      return {
        ...state,
        isMonitoring: false,
      };

    case 'UPDATE_REPORT':
      return {
        ...state,
        lastReport: action.payload,
      };

    case 'ADD_SUGGESTION':
      return {
        ...state,
        optimizationSuggestions: [...state.optimizationSuggestions, action.payload],
      };

    case 'CLEAR_SUGGESTIONS':
      return {
        ...state,
        optimizationSuggestions: [],
      };

    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: DEFAULT_SETTINGS,
      };

    default:
      return state;
  }
};

const PermissionPerformanceContext = createContext<PermissionPerformanceContextType | undefined>(undefined);

interface PermissionPerformanceProviderProps {
  children: ReactNode;
}

export const PermissionPerformanceProvider: React.FC<PermissionPerformanceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(performanceReducer, initialState);
  const { user, role, isAuthenticated } = useAuth();
  const { preloadPermissions, clearPermissionCache } = useOptimizedMobilePermissions();

  // Auto-preload permissions when user logs in
  useEffect(() => {
    if (isAuthenticated && user && role && state.settings.enablePreloading) {
      const roleName = role.name?.toLowerCase() || 'user';
      preloadPermissionsForRole(roleName, undefined, (permissions) => {
        preloadPermissions(permissions as any);
      });
    }
  }, [isAuthenticated, user, role, state.settings.enablePreloading, preloadPermissions]);

  // Performance monitoring interval
  useEffect(() => {
    let interval: any = null;

    if (state.isMonitoring && state.settings.enablePerformanceMonitoring) {
      interval = setInterval(() => {
        const report = generateGlobalPerformanceReport();
        dispatch({ type: 'UPDATE_REPORT', payload: report });

        // Auto-optimization based on report
        if (state.settings.autoOptimization) {
          applyAutoOptimizations(report);
        }

        // Generate suggestions
        const suggestions = PermissionPerformanceAnalyzer.getOptimizationRecommendations();
        if (suggestions.length > 0) {
          suggestions.forEach(suggestion => {
            dispatch({ type: 'ADD_SUGGESTION', payload: suggestion });
          });
        }
      }, state.settings.monitoringInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.isMonitoring, state.settings.enablePerformanceMonitoring, state.settings.monitoringInterval, state.settings.autoOptimization]);

  const updateSettings = (newSettings: Partial<PerformanceSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  };

  const startMonitoring = () => {
    dispatch({ type: 'START_MONITORING' });
  };

  const stopMonitoring = () => {
    dispatch({ type: 'STOP_MONITORING' });
  };

  const generateReport = () => {
    const report = generateGlobalPerformanceReport();
    dispatch({ type: 'UPDATE_REPORT', payload: report });
    return report;
  };

  const applyOptimizations = () => {
    const report = generateReport();
    
    // Clear suggestions first
    dispatch({ type: 'CLEAR_SUGGESTIONS' });

    // Apply automatic optimizations based on report
    applyAutoOptimizations(report);
  };

  const applyAutoOptimizations = (report: any) => {
    // Clear cache if hit rate is very low
    if (report.performance.cacheHitRate < 0.2) {
      clearPermissionCache();
      dispatch({ type: 'ADD_SUGGESTION', payload: 'Cache cleared due to low hit rate' });
    }

    // Suggest preloading if cache misses are high
    if (report.performance.cacheHitRate < 0.6 && user && role) {
      const roleName = role.name?.toLowerCase() || 'user';
      preloadPermissionsForRole(roleName, undefined, (permissions) => {
        preloadPermissions(permissions as any);
      });
      dispatch({ type: 'ADD_SUGGESTION', payload: 'Permissions preloaded to improve cache performance' });
    }

    // Adjust cache settings based on memory usage
    if (report.memory && report.memory.usagePercentage > 80) {
      updateSettings({
        cacheSize: Math.max(500, state.settings.cacheSize * 0.8),
        cacheTTL: Math.max(60000, state.settings.cacheTTL * 0.8),
      });
      dispatch({ type: 'ADD_SUGGESTION', payload: 'Cache settings adjusted due to high memory usage' });
    }
  };

  const resetSettings = () => {
    dispatch({ type: 'RESET_SETTINGS' });
    dispatch({ type: 'CLEAR_SUGGESTIONS' });
  };

  const value: PermissionPerformanceContextType = {
    ...state,
    updateSettings,
    startMonitoring,
    stopMonitoring,
    generateReport,
    applyOptimizations,
    resetSettings,
  };

  return (
    <PermissionPerformanceContext.Provider value={value}>
      {children}
    </PermissionPerformanceContext.Provider>
  );
};

export const usePermissionPerformance = (): PermissionPerformanceContextType => {
  const context = useContext(PermissionPerformanceContext);
  if (context === undefined) {
    throw new Error('usePermissionPerformance must be used within a PermissionPerformanceProvider');
  }
  return context;
};

export default PermissionPerformanceContext;