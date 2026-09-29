import { globalPermissionMonitor } from '../hooks/use-permission-performance-monitor';

/**
 * Utility functions for permission performance monitoring and optimization
 */

export interface PermissionPreloadConfig {
  commonPermissions: Array<[string, string]>;
  modulePermissions: Record<string, Array<[string, string]>>;
  userRolePermissions: Record<string, Array<[string, string]>>;
}

// Common permissions that are frequently checked across the app
export const COMMON_PERMISSIONS: Array<[string, string]> = [
  ['profile', 'read'],
  ['profile', 'update'],
  ['students', 'list'],
  ['students', 'read'],
  ['fees', 'list'],
  ['fees', 'read'],
  ['staff', 'list'],
  ['staff', 'read'],
  ['transport', 'list'],
  ['transport', 'read'],
];

// Module-specific permissions for preloading
export const MODULE_PERMISSIONS: Record<string, Array<[string, string]>> = {
  students: [
    ['students', 'create'],
    ['students', 'read'],
    ['students', 'update'],
    ['students', 'delete'],
    ['students', 'list'],
    ['student_admissions', 'create'],
    ['student_admissions', 'read'],
    ['student_admissions', 'list'],
    ['student_documents', 'read'],
    ['student_documents', 'list'],
    ['student_certificates', 'read'],
    ['student_certificates', 'list'],
    ['student_attendance', 'read'],
    ['student_attendance', 'create'],
    ['student_attendance', 'update'],
  ],
  fees: [
    ['fee_categories', 'create'],
    ['fee_categories', 'read'],
    ['fee_categories', 'update'],
    ['fee_categories', 'delete'],
    ['fee_categories', 'list'],
    ['fee_types', 'create'],
    ['fee_types', 'read'],
    ['fee_types', 'update'],
    ['fee_types', 'delete'],
    ['fee_types', 'list'],
    ['fee_transactions', 'create'],
    ['fee_transactions', 'read'],
    ['fee_transactions', 'list'],
    ['fee_refunds', 'create'],
    ['fee_refunds', 'read'],
    ['fee_refunds', 'list'],
  ],
  staff: [
    ['staff', 'create'],
    ['staff', 'read'],
    ['staff', 'update'],
    ['staff', 'delete'],
    ['staff', 'list'],
    ['staff_attendance', 'create'],
    ['staff_attendance', 'read'],
    ['staff_attendance', 'update'],
    ['staff_attendance', 'list'],
    ['designations', 'create'],
    ['designations', 'read'],
    ['designations', 'update'],
    ['designations', 'delete'],
    ['designations', 'list'],
  ],
  transport: [
    ['transport_routes', 'create'],
    ['transport_routes', 'read'],
    ['transport_routes', 'update'],
    ['transport_routes', 'delete'],
    ['transport_routes', 'list'],
    ['transport_vehicles', 'create'],
    ['transport_vehicles', 'read'],
    ['transport_vehicles', 'update'],
    ['transport_vehicles', 'delete'],
    ['transport_vehicles', 'list'],
    ['transport_trips', 'create'],
    ['transport_trips', 'read'],
    ['transport_trips', 'list'],
  ],
  masters: [
    ['academic_years', 'create'],
    ['academic_years', 'read'],
    ['academic_years', 'update'],
    ['academic_years', 'delete'],
    ['academic_years', 'list'],
    ['classes', 'create'],
    ['classes', 'read'],
    ['classes', 'update'],
    ['classes', 'delete'],
    ['classes', 'list'],
    ['subjects', 'create'],
    ['subjects', 'read'],
    ['subjects', 'update'],
    ['subjects', 'delete'],
    ['subjects', 'list'],
    ['holidays', 'create'],
    ['holidays', 'read'],
    ['holidays', 'update'],
    ['holidays', 'delete'],
    ['holidays', 'list'],
  ],
};

// Role-specific permission preloading
export const ROLE_PERMISSIONS: Record<string, Array<[string, string]>> = {
  admin: [
    ...COMMON_PERMISSIONS,
    ...MODULE_PERMISSIONS.students,
    ...MODULE_PERMISSIONS.fees,
    ...MODULE_PERMISSIONS.staff,
    ...MODULE_PERMISSIONS.transport,
    ...MODULE_PERMISSIONS.masters,
  ],
  teacher: [
    ...COMMON_PERMISSIONS,
    ['students', 'read'],
    ['students', 'list'],
    ['student_attendance', 'create'],
    ['student_attendance', 'read'],
    ['student_attendance', 'update'],
    ['student_attendance', 'list'],
    ['classes', 'read'],
    ['classes', 'list'],
    ['subjects', 'read'],
    ['subjects', 'list'],
  ],
  parent: [
    ['profile', 'read'],
    ['profile', 'update'],
    ['students', 'read'],
    ['student_documents', 'read'],
    ['student_documents', 'list'],
    ['fee_transactions', 'read'],
    ['fee_transactions', 'list'],
    ['transport_trips', 'read'],
    ['transport_trips', 'list'],
  ],
  student: [
    ['profile', 'read_own'],
    ['profile', 'update_own'],
    ['student_documents', 'read'],
    ['fee_transactions', 'read'],
    ['transport_trips', 'read'],
  ],
};

/**
 * Preload permissions based on user role and current module
 */
export const preloadPermissionsForRole = (
  roleName: string,
  currentModule?: string,
  preloadFunction?: (permissions: Array<[string, string]>) => void
) => {
  if (!preloadFunction) return;

  const rolePermissions = ROLE_PERMISSIONS[roleName.toLowerCase()] || COMMON_PERMISSIONS;
  
  // Always preload common permissions
  preloadFunction(COMMON_PERMISSIONS);
  
  // Preload role-specific permissions
  preloadFunction(rolePermissions);
  
  // Preload module-specific permissions if specified
  if (currentModule && MODULE_PERMISSIONS[currentModule]) {
    preloadFunction(MODULE_PERMISSIONS[currentModule]);
  }
};

/**
 * Optimize permission checks by batching them
 */
export const batchPermissionChecks = (
  permissions: Array<[string, string]>,
  checkFunction: (permissions: Array<[string, string]>) => Record<string, boolean>
): Record<string, boolean> => {
  // Group permissions by resource for more efficient checking
  const groupedPermissions = permissions.reduce((groups, [resource, action]) => {
    if (!groups[resource]) {
      groups[resource] = [];
    }
    groups[resource].push(action);
    return groups;
  }, {} as Record<string, string[]>);

  // Check permissions in batches
  const results: Record<string, boolean> = {};
  
  Object.entries(groupedPermissions).forEach(([resource, actions]) => {
    const resourcePermissions = actions.map(action => [resource, action] as [string, string]);
    const resourceResults = checkFunction(resourcePermissions);
    Object.assign(results, resourceResults);
  });

  return results;
};

/**
 * Performance monitoring utilities
 */
export class PermissionPerformanceAnalyzer {
  private static performanceData: Array<{
    timestamp: number;
    component: string;
    operation: string;
    duration: number;
    cacheHit: boolean;
  }> = [];

  static recordOperation(
    component: string,
    operation: string,
    duration: number,
    cacheHit: boolean = false
  ) {
    this.performanceData.push({
      timestamp: Date.now(),
      component,
      operation,
      duration,
      cacheHit,
    });

    // Keep only recent data (last 1000 operations)
    if (this.performanceData.length > 1000) {
      this.performanceData = this.performanceData.slice(-1000);
    }
  }

  static getPerformanceReport(timeWindow: number = 5 * 60 * 1000) {
    const cutoff = Date.now() - timeWindow;
    const recentData = this.performanceData.filter(d => d.timestamp >= cutoff);

    if (recentData.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        slowestOperations: [],
        componentStats: {},
      };
    }

    const totalOperations = recentData.length;
    const averageDuration = recentData.reduce((sum, d) => sum + d.duration, 0) / totalOperations;
    const cacheHits = recentData.filter(d => d.cacheHit).length;
    const cacheHitRate = cacheHits / totalOperations;

    const slowestOperations = recentData
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(d => ({
        component: d.component,
        operation: d.operation,
        duration: d.duration,
        timestamp: d.timestamp,
      }));

    const componentStats = recentData.reduce((stats, d) => {
      if (!stats[d.component]) {
        stats[d.component] = {
          operations: 0,
          totalDuration: 0,
          cacheHits: 0,
        };
      }
      
      stats[d.component].operations++;
      stats[d.component].totalDuration += d.duration;
      if (d.cacheHit) {
        stats[d.component].cacheHits++;
      }
      
      return stats;
    }, {} as Record<string, { operations: number; totalDuration: number; cacheHits: number }>);

    // Calculate averages for each component
    Object.keys(componentStats).forEach(component => {
      const stats = componentStats[component];
      (stats as any).averageDuration = stats.totalDuration / stats.operations;
      (stats as any).cacheHitRate = stats.cacheHits / stats.operations;
    });

    return {
      totalOperations,
      averageDuration,
      cacheHitRate,
      slowestOperations,
      componentStats,
    };
  }

  static getOptimizationRecommendations() {
    const report = this.getPerformanceReport();
    const recommendations: string[] = [];

    if (report.cacheHitRate < 0.7) {
      recommendations.push('Consider preloading more permissions to improve cache hit rate');
    }

    if (report.averageDuration > 5) {
      recommendations.push('Permission checks are taking too long - consider optimizing permission logic');
    }

    const slowComponents = Object.entries(report.componentStats)
      .filter(([_, stats]: [string, any]) => stats.averageDuration > 10)
      .map(([component, _]) => component);

    if (slowComponents.length > 0) {
      recommendations.push(`These components are slow: ${slowComponents.join(', ')}`);
    }

    const lowCacheComponents = Object.entries(report.componentStats)
      .filter(([_, stats]: [string, any]) => stats.cacheHitRate < 0.5)
      .map(([component, _]) => component);

    if (lowCacheComponents.length > 0) {
      recommendations.push(`These components have low cache hit rates: ${lowCacheComponents.join(', ')}`);
    }

    return recommendations;
  }
}

/**
 * Memory usage monitoring for permission caches
 */
export const monitorPermissionMemoryUsage = () => {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  
  return null;
};

/**
 * Generate performance report for the global monitor
 */
export const generateGlobalPerformanceReport = () => {
  const globalMetrics = globalPermissionMonitor.getGlobalMetrics();
  const performanceReport = PermissionPerformanceAnalyzer.getPerformanceReport();
  const memoryUsage = monitorPermissionMemoryUsage();
  const recommendations = PermissionPerformanceAnalyzer.getOptimizationRecommendations();

  return {
    timestamp: new Date().toISOString(),
    global: globalMetrics,
    performance: performanceReport,
    memory: memoryUsage,
    recommendations,
    summary: {
      status: getOverallPerformanceStatus(performanceReport, memoryUsage),
      criticalIssues: getCriticalIssues(performanceReport, memoryUsage),
    },
  };
};

const getOverallPerformanceStatus = (performanceReport: any, memoryUsage: any): 'good' | 'warning' | 'critical' => {
  if (
    performanceReport.averageDuration > 20 ||
    performanceReport.cacheHitRate < 0.3 ||
    (memoryUsage && memoryUsage.usagePercentage > 90)
  ) {
    return 'critical';
  }
  
  if (
    performanceReport.averageDuration > 10 ||
    performanceReport.cacheHitRate < 0.6 ||
    (memoryUsage && memoryUsage.usagePercentage > 70)
  ) {
    return 'warning';
  }
  
  return 'good';
};

const getCriticalIssues = (performanceReport: any, memoryUsage: any): string[] => {
  const issues: string[] = [];
  
  if (performanceReport.averageDuration > 20) {
    issues.push('Permission checks are extremely slow');
  }
  
  if (performanceReport.cacheHitRate < 0.3) {
    issues.push('Cache hit rate is critically low');
  }
  
  if (memoryUsage && memoryUsage.usagePercentage > 90) {
    issues.push('Memory usage is critically high');
  }
  
  return issues;
};