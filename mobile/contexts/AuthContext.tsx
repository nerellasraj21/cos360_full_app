import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import {
  AuthResponse,
  getValidAccessToken,
  initializeAuth,
  loginUser,
  logoutUser,
  User,
  Permission
} from '../services/authUtils';
import { ParentStudent, parentStudentsApi } from '../src/api/students';
import { setSelectedStudentForInterceptor } from '../src/api/client';
import {
  getStoredSelectedStudent,
  getStoredAvailableStudents,
  getStoredStudentId,
  storeStudentData
} from '../services/authUtils';
import { logPermissionDebugInfo, checkPermissionPatterns } from '../utils/permission-debug';
import { hasPermissionWithFallbacks } from '../utils/permission-compatibility';

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
  | { type: 'LOGIN_SUCCESS'; payload: AuthResponse }
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

    case 'LOGIN_SUCCESS':
      // Handle permissions that come as object format from backend
      let loginPermissionsArray: Permission[] = [];
      if (Array.isArray(action.payload.permissions)) {
        loginPermissionsArray = action.payload.permissions;
      } else if (action.payload.permissions && typeof action.payload.permissions === 'object') {
        // Convert object format {"resource": ["action1", "action2"]} to array format
        loginPermissionsArray = Object.entries(action.payload.permissions).flatMap(([resource, actions]) =>
          Array.isArray(actions) ? actions.map(actionItem => ({
            id: `${resource}:${actionItem}`, // Generate unique ID
            resource,
            action: actionItem,
            is_granted: true
          })) : []
        );
      }

      const loginPermissionsMap = loginPermissionsArray.reduce((map, perm) => {
        map[`${perm.resource}:${perm.action}`] = perm;
        return map;
      }, {} as { [key: string]: Permission });

      // Debug permissions after login
      logPermissionDebugInfo(loginPermissionsArray, 'Login Success - Permissions Received');
      const permissionPatterns = checkPermissionPatterns(loginPermissionsArray);
      console.log('🔍 Permission Patterns Check:', permissionPatterns);

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
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        selectedStudent: null,
        availableStudents: [],
        studentId: null,
      };

    case 'INITIALIZE_AUTH':
      let permissionsArray: Permission[] = [];
      if (Array.isArray(action.payload.permissions)) {
        permissionsArray = action.payload.permissions;
      } else if (action.payload.permissions && typeof action.payload.permissions === 'object') {
        // Convert object format {"resource": ["action1", "action2"]} to array format
        permissionsArray = Object.entries(action.payload.permissions).flatMap(([resource, actions]) =>
          Array.isArray(actions) ? actions.map(actionItem => ({
            id: `${resource}:${actionItem}`, // Generate unique ID
            resource,
            action: actionItem,
            is_granted: true
          })) : []
        );
      }

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
      };

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

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing authentication...');
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

        console.log('Authentication initialization complete:', {
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

      console.log('Attempting login for user:', username);
      const response = await loginUser(username, password, clientName, academicYearId);

      // Fetch parent students BEFORE setting authenticated (to prevent navigation)
      const roleName = response.role?.name?.toLowerCase();
      let availableStudents: ParentStudent[] = [];
      let selectedStudent: ParentStudent | null = null;
      if (roleName === 'student') {
        console.log("Student logged in, setting studentId to entity_id:", response.entity_id);
        dispatch({ type: 'SET_STUDENT_ID', payload: response.entity_id || null });
      }
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
          // Don't fail login if student fetching fails
        }
      }

      // Dispatch login success first
      dispatch({ type: 'LOGIN_SUCCESS', payload: response });

      // Then set student data and persist
      if (availableStudents.length > 0) {
        // Set available students first
        dispatch({ type: 'SET_AVAILABLE_STUDENTS', payload: availableStudents });

        // Persist available students
        try {
          await storeStudentData(selectedStudent, availableStudents, selectedStudent?.id || null);
        } catch (persistError) {
          console.error('Failed to persist student data during login:', persistError);
        }

        // Then select student
        if (selectedStudent) {
          dispatch({ type: 'SELECT_STUDENT', payload: selectedStudent });
          setSelectedStudentForInterceptor(selectedStudent);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Refresh authentication status
  const refreshAuth = async (): Promise<void> => {
    try {
      const authData = await initializeAuth();
      dispatch({ type: 'INITIALIZE_AUTH', payload: authData });
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
    // Use the compatibility layer for enhanced permission checking
    const hasPermissionResult = hasPermissionWithFallbacks(
      state.permissionsMap,
      resource,
      action,
      true // Enable debug logging
    );

    return hasPermissionResult;
  };

  // Select student
  const selectStudent = async (student: ParentStudent | null): Promise<void> => {
    dispatch({ type: 'SELECT_STUDENT', payload: student });
    setSelectedStudentForInterceptor(student);

    // Persist student selection
    try {
      const currentState = state;
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
      const currentState = state;
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

import { ActivityIndicator, Text, View } from 'react-native';

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