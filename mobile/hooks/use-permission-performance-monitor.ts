import { useEffect, useRef, useCallback } from 'react';
import { useOptimizedMobilePermissions } from './use-optimized-mobile-permissions';

interface PerformanceMetrics {
  componentName: string;
  permissionChecks: number;
  averageCheckTime: number;
  cacheHitRate: number;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
}

interface PerformanceAlert {
  type: 'slow_permission_check' | 'excessive_renders' | 'low_cache_hit_rate' | 'memory_usage';
  message: string;
  componentName: string;
  value: number;
  threshold: number;
  timestamp: number;
}

interface PerformanceThresholds {
  maxPermissionCheckTime: number; // milliseconds
  maxRendersPerSecond: number;
  minCacheHitRate: number; // percentage
  maxMemoryUsage: number; // MB
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  maxPermissionCheckTime: 5, // 5ms
  maxRendersPerSecond: 10,
  minCacheHitRate: 0.8, // 80%
  maxMemoryUsage: 50, // 50MB
};

/**
 * Performance monitoring hook for permission-heavy components
 */
export const usePermissionPerformanceMonitor = (
  componentName: string,
  thresholds: Partial<PerformanceThresholds> = {}
) => {
  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const { getCacheStats } = useOptimizedMobilePermissions();
  
  const metrics = useRef<PerformanceMetrics>({
    componentName,
    permissionChecks: 0,
    averageCheckTime: 0,
    cacheHitRate: 0,
    renderCount: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
  });

  const alerts = useRef<PerformanceAlert[]>([]);
  const renderTimes = useRef<number[]>([]);
  const lastRenderTimestamp = useRef<number>(0);

  // Track render performance
  useEffect(() => {
    const renderStart = performance.now();
    metrics.current.renderCount++;
    
    return () => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      metrics.current.lastRenderTime = renderTime;
      metrics.current.totalRenderTime += renderTime;
      
      // Track render frequency
      const now = Date.now();
      renderTimes.current.push(now);
      
      // Keep only renders from the last second
      renderTimes.current = renderTimes.current.filter(time => now - time <= 1000);
      
      // Check for excessive renders
      if (renderTimes.current.length > finalThresholds.maxRendersPerSecond) {
        addAlert('excessive_renders', 
          `Component ${componentName} rendered ${renderTimes.current.length} times in 1 second`,
          renderTimes.current.length,
          finalThresholds.maxRendersPerSecond
        );
      }
      
      // Check for slow renders
      if (renderTime > finalThresholds.maxPermissionCheckTime) {
        addAlert('slow_permission_check',
          `Component ${componentName} render took ${renderTime.toFixed(2)}ms`,
          renderTime,
          finalThresholds.maxPermissionCheckTime
        );
      }
      
      lastRenderTimestamp.current = now;
    };
  });

  // Add performance alert
  const addAlert = useCallback((
    type: PerformanceAlert['type'],
    message: string,
    value: number,
    threshold: number
  ) => {
    const alert: PerformanceAlert = {
      type,
      message,
      componentName,
      value,
      threshold,
      timestamp: Date.now(),
    };
    
    alerts.current.push(alert);
    
    // Keep only recent alerts (last 100)
    if (alerts.current.length > 100) {
      alerts.current = alerts.current.slice(-100);
    }
    
    // Log performance issues in development
    if (__DEV__) {
      console.warn(`[Permission Performance] ${message}`, alert);
    }
  }, [componentName]);

  // Monitor cache performance
  const monitorCachePerformance = useCallback(() => {
    const cacheStats = getCacheStats();
    
    if (cacheStats.hitRate < finalThresholds.minCacheHitRate && cacheStats.metrics?.totalChecks > 10) {
      addAlert('low_cache_hit_rate',
        `Component ${componentName} has low cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`,
        cacheStats.hitRate,
        finalThresholds.minCacheHitRate
      );
    }
    
    metrics.current.cacheHitRate = cacheStats.hitRate;
  }, [getCacheStats, finalThresholds.minCacheHitRate, addAlert, componentName]);

  // Get current performance metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    monitorCachePerformance();
    return { ...metrics.current };
  }, [monitorCachePerformance]);

  // Get performance alerts
  const getAlerts = useCallback((since?: number): PerformanceAlert[] => {
    const cutoff = since || Date.now() - (5 * 60 * 1000); // Last 5 minutes by default
    return alerts.current.filter(alert => alert.timestamp >= cutoff);
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    alerts.current = [];
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const cacheStats = getCacheStats();
    const recentAlerts = getAlerts();
    
    return {
      componentName,
      metrics: getMetrics(),
      cacheStats,
      alerts: recentAlerts,
      recommendations: generateRecommendations(metrics.current, cacheStats, recentAlerts),
    };
  }, [componentName, getMetrics, getCacheStats, getAlerts]);

  // Generate performance recommendations
  const generateRecommendations = (
    componentMetrics: PerformanceMetrics,
    cacheStats: any,
    recentAlerts: PerformanceAlert[]
  ): string[] => {
    const recommendations: string[] = [];
    
    // Cache hit rate recommendations
    if (cacheStats.hitRate < 0.7) {
      recommendations.push('Consider preloading frequently used permissions');
      recommendations.push('Increase cache TTL if permissions don\'t change frequently');
    }
    
    // Render frequency recommendations
    const excessiveRenderAlerts = recentAlerts.filter(a => a.type === 'excessive_renders');
    if (excessiveRenderAlerts.length > 0) {
      recommendations.push('Use React.memo() to prevent unnecessary re-renders');
      recommendations.push('Consider memoizing permission check results in component state');
    }
    
    // Slow permission check recommendations
    const slowCheckAlerts = recentAlerts.filter(a => a.type === 'slow_permission_check');
    if (slowCheckAlerts.length > 0) {
      recommendations.push('Batch multiple permission checks together');
      recommendations.push('Consider using the optimized permission hooks');
    }
    
    // Memory usage recommendations
    if (cacheStats.size > cacheStats.maxSize * 0.9) {
      recommendations.push('Consider reducing cache size or TTL');
      recommendations.push('Clear cache periodically for long-running sessions');
    }
    
    return recommendations;
  };

  // Performance monitoring utilities
  const measurePermissionCheck = useCallback(<T>(
    checkFunction: () => T,
    permissionDescription?: string
  ): T => {
    const start = performance.now();
    const result = checkFunction();
    const duration = performance.now() - start;
    
    metrics.current.permissionChecks++;
    metrics.current.averageCheckTime = 
      (metrics.current.averageCheckTime * (metrics.current.permissionChecks - 1) + duration) / 
      metrics.current.permissionChecks;
    
    if (duration > finalThresholds.maxPermissionCheckTime) {
      addAlert('slow_permission_check',
        `Slow permission check${permissionDescription ? ` (${permissionDescription})` : ''}: ${duration.toFixed(2)}ms`,
        duration,
        finalThresholds.maxPermissionCheckTime
      );
    }
    
    return result;
  }, [finalThresholds.maxPermissionCheckTime, addAlert]);

  return {
    getMetrics,
    getAlerts,
    clearAlerts,
    getPerformanceSummary,
    measurePermissionCheck,
  };
};

/**
 * Global performance monitoring for the entire app
 */
class GlobalPermissionPerformanceMonitor {
  private static instance: GlobalPermissionPerformanceMonitor;
  private componentMetrics: Map<string, PerformanceMetrics> = new Map();
  private globalAlerts: PerformanceAlert[] = [];

  static getInstance(): GlobalPermissionPerformanceMonitor {
    if (!GlobalPermissionPerformanceMonitor.instance) {
      GlobalPermissionPerformanceMonitor.instance = new GlobalPermissionPerformanceMonitor();
    }
    return GlobalPermissionPerformanceMonitor.instance;
  }

  registerComponent(componentName: string, metrics: PerformanceMetrics) {
    this.componentMetrics.set(componentName, metrics);
  }

  addGlobalAlert(alert: PerformanceAlert) {
    this.globalAlerts.push(alert);
    
    // Keep only recent alerts
    if (this.globalAlerts.length > 500) {
      this.globalAlerts = this.globalAlerts.slice(-500);
    }
  }

  getGlobalMetrics() {
    const allMetrics = Array.from(this.componentMetrics.values());
    
    return {
      totalComponents: allMetrics.length,
      totalPermissionChecks: allMetrics.reduce((sum, m) => sum + m.permissionChecks, 0),
      averageRenderTime: allMetrics.reduce((sum, m) => sum + m.lastRenderTime, 0) / allMetrics.length,
      totalRenders: allMetrics.reduce((sum, m) => sum + m.renderCount, 0),
      slowestComponent: allMetrics.reduce((slowest, current) => 
        current.lastRenderTime > (slowest?.lastRenderTime || 0) ? current : slowest, 
        null as PerformanceMetrics | null
      ),
      alerts: this.globalAlerts.slice(-50), // Last 50 alerts
    };
  }

  generateGlobalReport() {
    const metrics = this.getGlobalMetrics();
    
    return {
      summary: {
        totalComponents: metrics.totalComponents,
        totalPermissionChecks: metrics.totalPermissionChecks,
        averageRenderTime: metrics.averageRenderTime,
        totalRenders: metrics.totalRenders,
      },
      performance: {
        slowestComponent: metrics.slowestComponent,
        recentAlerts: metrics.alerts,
      },
      recommendations: this.generateGlobalRecommendations(metrics),
    };
  }

  private generateGlobalRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.averageRenderTime > 10) {
      recommendations.push('Overall app performance is slow - consider optimizing permission checks');
    }
    
    if (metrics.alerts.length > 10) {
      recommendations.push('High number of performance alerts - review component implementations');
    }
    
    if (metrics.slowestComponent && metrics.slowestComponent.lastRenderTime > 20) {
      recommendations.push(`Component "${metrics.slowestComponent.componentName}" is particularly slow`);
    }
    
    return recommendations;
  }
}

export const globalPermissionMonitor = GlobalPermissionPerformanceMonitor.getInstance();