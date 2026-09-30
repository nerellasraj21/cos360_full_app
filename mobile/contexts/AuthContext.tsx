import React, { createContext, ReactNode, useContext, useEffect, useReducer, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import {
  AuthResponse,
  getValidAccessToken,
  initializeAuth,
  loginUser,
  logoutUser,
  normalisePermissions,
  storeAuthData,
  User,
  Permission
} from '../services/authUtils';
import { ParentStudent, parentStudentsApi } from '../src/api/students';
import { setSelectedStudentForInterceptor, setSessionExpiredCallback } from '../src/api/client';
import {
  getStoredSelectedStudent,
  getStoredAvailableStudents,
  getStoredStudentId,
  storeStudentData
} from '../services/authUtils';
// import { logPermissionDebugInfo, checkPermissionPatterns } from '../utils/permission-debug';
import { hasPermissionWithFallbacks } from '../utils/permission-compatibility';
import { getTeacherAllowedActions } from '../src/lib/teacherPermissionMatrix';
import { getStaffAllowedActions } from '../src/lib/staffPermissionMatrix';

// Auth state interface
interface AuthState {
  user: User | null;
  role: any | null;
  permissions: Permission[];
  permissionsMap: { [key: string]: Permission };
  menu: any[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  selectedStudent: ParentStudent | null;
  availableStudents: ParentStudent[];
  studentId: string | null;
  requiresPasswordChange: boolean;
}

// Auth actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ROLE'; payload: any | null }
  | { type: 'SET_PERMISSIONS'; payload: Permission[] }
  | { type: 'SET_MENU'; payload: any[] }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: AuthResponse; selectedStudent?: ParentStudent | null; availableStudents?: ParentStudent[] }
  | { type: 'LOGOUT' }
  | { type: 'INITIALIZE_AUTH'; payload: { user: User | null; role: any | null; permissions: Permission[]; menu: any[]; isAuthenticated: boolean; selectedStudent?: ParentStudent | null; availableStudents?: ParentStudent[]; studentId?: string | null } }
  | { type: 'SET_AVAILABLE_STUDENTS'; payload: ParentStudent[] }
  | { type: 'SELECT_STUDENT'; payload: ParentStudent | null }
  | { type: 'SET_STUDENT_ID'; payload: string | null };

// Auth context interface
interface AuthContextType extends AuthState {
  login: (username: string, password: string, clientName?: string, academicYearId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  completePasswordSetup: (response: AuthResponse) => Promise<void>;
  clearError: () => void;
  getAccessToken: () => Promise<string | null>;
  hasPermission: (resource: string, action: string) => boolean;
  selectStudent: (student: ParentStudent | null) => Promise<void>;
  setAvailableStudents: (students: ParentStudent[]) => Promise<void>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  role: null,
  permissions: [],
  permissionsMap: {},
  menu: [],
  isAuthenticated: false,
  isLoading: true,
  error: null,
  selectedStudent: null,
  availableStudents: [],
  studentId: null,
  requiresPasswordChange: false,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_ROLE':
      return { ...state, role: action.payload };

    case 'SET_PERMISSIONS':
      const permissionsMap = action.payload.reduce((map, perm) => {
        map[`${perm.resource}:${perm.action}`] = perm;
        return map;
      }, {} as { [key: string]: Permission });
      return { ...state, permissions: action.payload, permissionsMap };

    case 'SET_MENU':
      return { ...state, menu: action.payload };

    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'LOGIN_SUCCESS': {
      const loginPermissionsArray = normalisePermissions(action.payload.permissions as any);

      const loginPermissionsMap = loginPermissionsArray.reduce((map, perm) => {
        map[`${perm.resource}:${perm.action}`] = perm;
        return map;
      }, {} as { [key: string]: Permission });

      return {
        ...state,
        user: action.payload.user,
        role: action.payload.role,
        permissions: loginPermissionsArray,
        permissionsMap: loginPermissionsMap,
        menu: Array.isArray(action.payload.menu) ? action.payload.menu : [],
        isAuthenticated: true,
        isLoading: false,
        error: null,
        requiresPasswordChange: !!(action.payload as AuthResponse).requires_password_change,
        // Commit student context atomically so components never see a half-initialised state
        selectedStudent: action.selectedStudent !== undefined ? action.selectedStudent : state.selectedStudent,
        availableStudents: action.availableStudents !== undefined ? action.availableStudents : state.availableStudents,
      };
    }

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        selectedStudent: null,
        availableStudents: [],
        studentId: null,
      };

    case 'INITIALIZE_AUTH': {
      const permissionsArray = normalisePermissions(action.payload.permissions as any);

      const initPermissionsMap = permissionsArray.reduce((map, perm) => {
        map[`${perm.resource}:${perm.action}`] = perm;
        return map;
      }, {} as { [key: string]: Permission });
      return {
        ...state,
        user: action.payload.user,
        role: action.payload.role,
        permissions: permissionsArray,
        permissionsMap: initPermissionsMap,
        menu: Array.isArray(action.payload.menu) ? action.payload.menu : [],
        isAuthenticated: action.payload.isAuthenticated,
        selectedStudent: action.payload.selectedStudent || null,
        availableStudents: action.payload.availableStudents || [],
        studentId: action.payload.studentId || null,
        isLoading: false,
        requiresPasswordChange: false,
      };
    }

    case 'SET_AVAILABLE_STUDENTS':
      return {
        ...state,
        availableStudents: action.payload,
      };

    case 'SELECT_STUDENT':
      return {
        ...state,
        selectedStudent: action.payload,
        studentId: action.payload?.id || null,
      };

    case 'SET_STUDENT_ID':
      return {
        ...state,
        studentId: action.payload,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // L-3: Keep a ref that always points to the latest state so async callbacks
  // (selectStudent, setAvailableStudents) read current values, not stale closures.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Register session-expired callback so client.ts can trigger logout when refresh fails.
  // Runs once on mount; AuthProvider wraps the entire app and never unmounts mid-session.
  useEffect(() => {
    setSessionExpiredCallback(() => {
      setSelectedStudentForInterceptor(null);
      dispatch({ type: 'LOGOUT' });
    });
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (__DEV__) console.log('Initializing authentication...');
        const authData = await initializeAuth();

        // Load persisted student data
        const [selectedStudent, availableStudents, studentId] = await Promise.all([
          getStoredSelectedStudent(),
          getStoredAvailableStudents(),
          getStoredStudentId(),
        ]);

        dispatch({
          type: 'INITIALIZE_AUTH',
          payload: {
            ...authData,
            selectedStudent,
            availableStudents,
            studentId,
          }
        });

        // Set interceptor with persisted student
        setSelectedStudentForInterceptor(selectedStudent);

        if (__DEV__) console.log('Authentication initialization complete:', {
          isAuthenticated: authData.isAuthenticated,
          hasUser: !!authData.user
        });
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Ensure we're not stuck in loading state
        dispatch({
          type: 'INITIALIZE_AUTH',
          payload: {
            user: null,
            role: null,
            permissions: [],
            menu: [],
            isAuthenticated: false
          }
        });
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string, clientName?: string, academicYearId?: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if (__DEV__) console.log('Attempting login for user:', username);
      const response = await loginUser(username, password, clientName, academicYearId);
      await completeLogin(response);
    } catch (error) {
      const axiosError = error as any;
      const backendDetail = axiosError?.response?.data?.detail;
      const detailStr = typeof backendDetail === 'string'
        ? backendDetail
        : Array.isArray(backendDetail)
        ? backendDetail.map((e: any) => e?.msg ?? String(e)).join('; ')
        : null;
      const errorMessage = detailStr || (error instanceof Error ? error.message : 'Login failed');
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // First-login set-password returns the same payload as login: store it and sign straight in
  const completePasswordSetup = async (response: AuthResponse): Promise<void> => {
    await storeAuthData(response);
    await completeLogin(response);
  };

  // Shared by login and completePasswordSetup: load the parent's students, set the
  // interceptor headers, then commit everything in a single LOGIN_SUCCESS.
  const completeLogin = async (response: AuthResponse): Promise<void> => {
    // Fetch parent students BEFORE setting authenticated (to prevent navigation)
    const roleName = response.role?.name?.toLowerCase();
    let availableStudents: ParentStudent[] = [];
    let selectedStudent: ParentStudent | null = null;
    if (roleName === 'student') {
      if (__DEV__) console.log("Student logged in, setting studentId to entity_id:", response.entity_id);
      dispatch({ type: 'SET_STUDENT_ID', payload: response.entity_id || null });
    }
    let studentFetchFailed = false;
    if (roleName === 'parent' || roleName === 'guardian' || roleName === 'father' || roleName === 'mother') {
      try {
        const students = await parentStudentsApi.getParentStudents();
        availableStudents = students;

        // Auto-select first student if available
        if (students.length > 0) {
          selectedStudent = students[0];
        }
      } catch (studentsError) {
        console.error('Failed to fetch parent students:', studentsError);
        studentFetchFailed = true;
      }
    }

    // H-4: Set interceptor headers BEFORE dispatching LOGIN_SUCCESS so the very first
    // API calls fired by navigation effects (e.g. dashboard queries) already carry
    // the correct X-Student-ID / X-Academic-Year-ID headers.
    if (availableStudents.length > 0 && selectedStudent) {
      try {
        await storeStudentData(selectedStudent, availableStudents, selectedStudent?.id || null);
        setSelectedStudentForInterceptor(selectedStudent);
      } catch (persistError) {
        console.error('Failed to persist student data during login:', persistError);
      }
    }

    // M-4: Commit user + student context atomically so components never observe
    // isAuthenticated=true with selectedStudent=null during the first render cycle.
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: response,
      selectedStudent: selectedStudent || null,
      availableStudents,
    });

    // Surface parent-student fetch failure so user is not silently left without context
    if (studentFetchFailed) {
      dispatch({ type: 'SET_ERROR', payload: 'Could not load student information. Please refresh.' });
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // H1: Clear interceptor state so old student headers are not sent for the next session
      setSelectedStudentForInterceptor(null);
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Refresh authentication status
  const refreshAuth = async (): Promise<void> => {
    try {
      const authData = await initializeAuth();
      const [selectedStudent, availableStudents, studentId] = await Promise.all([
        getStoredSelectedStudent(),
        getStoredAvailableStudents(),
        getStoredStudentId(),
      ]);
      dispatch({
        type: 'INITIALIZE_AUTH',
        payload: {
          ...authData,
          selectedStudent,
          availableStudents,
          studentId,
        },
      });
      // Restore interceptor headers so API calls after password change still carry student context
      setSelectedStudentForInterceptor(selectedStudent);
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh authentication' });
    }
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Get access token with automatic refresh
  const getAccessToken = async (): Promise<string | null> => {
    try {
      return await getValidAccessToken();
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  };

  // Check permission with fallback support
  const hasPermission = (resource: string, action: string): boolean => {
    // Teacher role is capped by a frontend-only allowlist, independent of
    // whatever the backend grants. Resources not in that allowlist fall
    // through to the normal backend-driven check below.
    // See src/lib/teacherPermissionMatrix.ts for the full table.
    if ((state.role?.name ?? '').toLowerCase() === 'teacher') {
      const teacherAllowedActions = getTeacherAllowedActions(resource);
      if (teacherAllowedActions) {
        return teacherAllowedActions.includes(action);
      }
    }

    // Staff role is capped by a frontend-only allowlist, independent of
    // whatever the backend grants. Resources not in that allowlist fall
    // through to the normal backend-driven check below.
    // See src/lib/staffPermissionMatrix.ts for the full table.
    if ((state.role?.name ?? '').toLowerCase() === 'staff') {
      const staffAllowedActions = getStaffAllowedActions(resource);
      if (staffAllowedActions) {
        return staffAllowedActions.includes(action);
      }
    }

    // Use the compatibility layer for enhanced permission checking
    const hasPermissionResult = hasPermissionWithFallbacks(
      state.permissionsMap,
      resource,
      action,
      false
    );

    return hasPermissionResult;
  };

  // Select student
  const selectStudent = async (student: ParentStudent | null): Promise<void> => {
    dispatch({ type: 'SELECT_STUDENT', payload: student });
    setSelectedStudentForInterceptor(student);

    // Persist student selection
    try {
      const currentState = stateRef.current;
      await storeStudentData(student, currentState.availableStudents, student?.id || null);
    } catch (error) {
      console.error('Failed to persist student selection:', error);
    }
  };

  // Set available students
  const setAvailableStudents = async (students: ParentStudent[]): Promise<void> => {
    dispatch({ type: 'SET_AVAILABLE_STUDENTS', payload: students });

    // Persist available students
    try {
      const currentState = stateRef.current;
      await storeStudentData(currentState.selectedStudent, students, currentState.studentId);
    } catch (error) {
      console.error('Failed to persist available students:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshAuth,
    completePasswordSetup,
    clearError,
    getAccessToken,
    hasPermission,
    selectStudent,
    setAvailableStudents,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      // You can customize this loading component
      return (
        <AuthLoadingComponent />
      );
    }

    if (!isAuthenticated) {
      // You can customize this unauthorized component
      return (
        <AuthUnauthorizedComponent />
      );
    }

    return <Component {...props} />;
  };
};

// Loading component (can be customized)
const AuthLoadingComponent: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
    <Text style={{ marginTop: 10 }}>Loading...</Text>
  </View>
);

// Unauthorized component (can be customized)
const AuthUnauthorizedComponent: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Please log in to access this content.</Text>
  </View>
);

export default AuthContext;