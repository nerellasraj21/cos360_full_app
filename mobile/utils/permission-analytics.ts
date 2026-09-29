/**
 * Permission Analytics and Monitoring System
 * Tracks permission usage patterns, performance metrics, and security events
 */

export interface PermissionUsageEvent {
  id: string;
  timestamp: number;
  userId: string;
  userRole: string;
  resource: string;
  action: string;
  granted: boolean;
  context?: {
    screen?: string;
    component?: string;
    studentId?: string;
    sessionId?: string;
  };
  performance?: {
    checkDuration: number;
    cacheHit: boolean;
  };
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'unauthorized_access' | 'permission_escalation' | 'suspicious_activity' | 'failed_permission_check';
  userId: string;
  userRole: string;
  resource: string;
  action: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface PermissionAnalytics {
  totalChecks: number;
  grantedChecks: number;
  deniedChecks: number;
  averageCheckTime: number;
  cacheHitRate: number;
  topResources: Array<{ resource: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  userActivity: Array<{ userId: string; role: string; checks: number }>;
  securityEvents: SecurityEvent[];
  performanceMetrics: {
    slowestChecks: Array<{ resource: string; action: string; duration: number }>;
    cachePerformance: {
      hits: number;
      misses: number;
      evictions: number;
    };
  };
}

class PermissionAnalyticsService {
  private static instance: PermissionAnalyticsService;
  private events: PermissionUsageEvent[] = [];
  private securityEvents: SecurityEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events
  private maxSecurityEvents = 1000; // Keep last 1k security events

  static getInstance(): PermissionAnalyticsService {
    if (!PermissionAnalyticsService.instance) {
      PermissionAnalyticsService.instance = new PermissionAnalyticsService();
    }
    return PermissionAnalyticsService.instance;
  }

  /**
   * Record a permission usage event
   */
  recordPermissionCheck(
    userId: string,
    userRole: string,
    resource: string,
    action: string,
    granted: boolean,
    context?: PermissionUsageEvent['context'],
    performance?: PermissionUsageEvent['performance']
  ): void {
    const event: PermissionUsageEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      userId,
      userRole,
      resource,
      action,
      granted,
      context,
      performance,
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Check for security concerns
    this.analyzeSecurityImplications(event);

    // Log in development
    if (__DEV__) {
      console.log('Permission Check:', {
        user: `${userId} (${userRole})`,
        permission: `${resource}:${action}`,
        result: granted ? '✅ GRANTED' : '❌ DENIED',
        performance: performance ? `${performance.checkDuration.toFixed(2)}ms (${performance.cacheHit ? 'cache hit' : 'cache miss'})` : 'N/A',
      });
    }
  }

  /**
   * Record a security event
   */
  recordSecurityEvent(
    type: SecurityEvent['type'],
    userId: string,
    userRole: string,
    resource: string,
    action: string,
    details: string,
    severity: SecurityEvent['severity'] = 'medium',
    context?: Record<string, any>
  ): void {
    const event: SecurityEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      userId,
      userRole,
      resource,
      action,
      details,
      severity,
      context,
    };

    this.securityEvents.push(event);

    // Keep only recent security events
    if (this.securityEvents.length > this.maxSecurityEvents) {
      this.securityEvents = this.securityEvents.slice(-this.maxSecurityEvents);
    }

    // Log security events
    console.warn('Security Event:', {
      type,
      severity,
      user: `${userId} (${userRole})`,
      permission: `${resource}:${action}`,
      details,
    });

    // Alert on critical events
    if (severity === 'critical') {
      this.alertCriticalSecurityEvent(event);
    }
  }

  /**
   * Get analytics for a specific time period
   */
  getAnalytics(timeWindow: number = 24 * 60 * 60 * 1000): PermissionAnalytics {
    const cutoff = Date.now() - timeWindow;
    const recentEvents = this.events.filter(e => e.timestamp >= cutoff);
    const recentSecurityEvents = this.securityEvents.filter(e => e.timestamp >= cutoff);

    if (recentEvents.length === 0) {
      return this.getEmptyAnalytics();
    }

    const totalChecks = recentEvents.length;
    const grantedChecks = recentEvents.filter(e => e.granted).length;
    const deniedChecks = totalChecks - grantedChecks;

    // Performance metrics
    const performanceEvents = recentEvents.filter(e => e.performance);
    const averageCheckTime = performanceEvents.length > 0
      ? performanceEvents.reduce((sum, e) => sum + (e.performance?.checkDuration || 0), 0) / performanceEvents.length
      : 0;

    const cacheHits = performanceEvents.filter(e => e.performance?.cacheHit).length;
    const cacheHitRate = performanceEvents.length > 0 ? cacheHits / performanceEvents.length : 0;

    // Resource and action analysis
    const resourceCounts = this.countByField(recentEvents, 'resource');
    const actionCounts = this.countByField(recentEvents, 'action');

    // User activity analysis
    const userActivity = this.analyzeUserActivity(recentEvents);

    // Performance analysis
    const slowestChecks = performanceEvents
      .filter(e => e.performance)
      .sort((a, b) => (b.performance?.checkDuration || 0) - (a.performance?.checkDuration || 0))
      .slice(0, 10)
      .map(e => ({
        resource: e.resource,
        action: e.action,
        duration: e.performance?.checkDuration || 0,
      }));

    const cachePerformance = {
      hits: cacheHits,
      misses: performanceEvents.length - cacheHits,
      evictions: 0, // This would need to be tracked separately
    };

    return {
      totalChecks,
      grantedChecks,
      deniedChecks,
      averageCheckTime,
      cacheHitRate,
      topResources: resourceCounts.slice(0, 10),
      topActions: actionCounts.slice(0, 10),
      userActivity: userActivity.slice(0, 20),
      securityEvents: recentSecurityEvents,
      performanceMetrics: {
        slowestChecks,
        cachePerformance,
      },
    };
  }

  /**
   * Get security analytics
   */
  getSecurityAnalytics(timeWindow: number = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - timeWindow;
    const recentEvents = this.securityEvents.filter(e => e.timestamp >= cutoff);

    const eventsByType = this.countByField(recentEvents, 'type');
    const eventsBySeverity = this.countByField(recentEvents, 'severity');
    const eventsByUser = this.countByField(recentEvents, 'userId');

    const criticalEvents = recentEvents.filter(e => e.severity === 'critical');
    const highSeverityEvents = recentEvents.filter(e => e.severity === 'high');

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      eventsByUser,
      criticalEvents,
      highSeverityEvents,
      riskScore: this.calculateRiskScore(recentEvents),
    };
  }

  /**
   * Get user-specific analytics
   */
  getUserAnalytics(userId: string, timeWindow: number = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - timeWindow;
    const userEvents = this.events.filter(e => e.userId === userId && e.timestamp >= cutoff);
    const userSecurityEvents = this.securityEvents.filter(e => e.userId === userId && e.timestamp >= cutoff);

    const totalChecks = userEvents.length;
    const grantedChecks = userEvents.filter(e => e.granted).length;
    const deniedChecks = totalChecks - grantedChecks;

    const resourceUsage = this.countByField(userEvents, 'resource');
    const actionUsage = this.countByField(userEvents, 'action');

    const averageCheckTime = userEvents
      .filter(e => e.performance)
      .reduce((sum, e, _, arr) => sum + (e.performance?.checkDuration || 0) / arr.length, 0);

    return {
      userId,
      totalChecks,
      grantedChecks,
      deniedChecks,
      denialRate: totalChecks > 0 ? deniedChecks / totalChecks : 0,
      resourceUsage,
      actionUsage,
      averageCheckTime,
      securityEvents: userSecurityEvents,
      riskLevel: this.calculateUserRiskLevel(userEvents, userSecurityEvents),
    };
  }

  /**
   * Export analytics data
   */
  exportAnalytics(format: 'json' | 'csv' = 'json', timeWindow?: number) {
    const analytics = this.getAnalytics(timeWindow);
    
    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    } else {
      return this.convertToCSV(analytics);
    }
  }

 
  clearAnalytics(): void {
    this.events = [];
    this.securityEvents = [];
  }

  getRealTimeMetrics() {
    const last5Minutes = 5 * 60 * 1000;
    const recentEvents = this.events.filter(e => Date.now() - e.timestamp <= last5Minutes);
    
    return {
      checksPerMinute: recentEvents.length / 5,
      currentDenialRate: recentEvents.length > 0 
        ? recentEvents.filter(e => !e.granted).length / recentEvents.length 
        : 0,
      activeUsers: new Set(recentEvents.map(e => e.userId)).size,
      topResources: this.countByField(recentEvents, 'resource').slice(0, 5),
      recentSecurityEvents: this.securityEvents.filter(e => Date.now() - e.timestamp <= last5Minutes),
    };
  }

  // Private helper methods

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private analyzeSecurityImplications(event: PermissionUsageEvent): void {
    // Check for suspicious patterns
    if (!event.granted) {
      const recentDenials = this.events
        .filter(e => 
          e.userId === event.userId && 
          !e.granted && 
          Date.now() - e.timestamp <= 5 * 60 * 1000 // Last 5 minutes
        ).length;

      if (recentDenials > 10) {
        this.recordSecurityEvent(
          'suspicious_activity',
          event.userId,
          event.userRole,
          event.resource,
          event.action,
          `User has ${recentDenials} permission denials in the last 5 minutes`,
          'high'
        );
      }
    }

    // Check for permission escalation attempts
    if (!event.granted && this.isEscalationAttempt(event)) {
      this.recordSecurityEvent(
        'permission_escalation',
        event.userId,
        event.userRole,
        event.resource,
        event.action,
        'Attempted to access resource above user role level',
        'high'
      );
    }
  }

  private isEscalationAttempt(event: PermissionUsageEvent): boolean {
    // Define role hierarchy and check if user is trying to access higher-level resources
    const roleHierarchy = ['student', 'parent', 'teacher', 'staff', 'admin'];
    const userRoleLevel = roleHierarchy.indexOf(event.userRole.toLowerCase());
    
    // Define resource access levels
    const resourceLevels: Record<string, number> = {
      'profile': 0,
      'students': 1,
      'fees': 2,
      'staff': 3,
      'masters': 4,
      'system': 4,
    };

    const resourceLevel = resourceLevels[event.resource] || 0;
    return userRoleLevel < resourceLevel;
  }

  private alertCriticalSecurityEvent(event: SecurityEvent): void {
    console.error('🚨 CRITICAL SECURITY EVENT:', event);
    
  }

  private countByField<T extends Record<string, any>>(
    items: T[], 
    field: keyof T
  ): Array<{ [K in keyof T]: T[K] } & { count: number }> {
    const counts = items.reduce((acc, item) => {
      const value = item[field];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([value, count]) => ({ [field]: value, count } as any))
      .sort((a, b) => b.count - a.count);
  }

  private analyzeUserActivity(events: PermissionUsageEvent[]) {
    const userStats = events.reduce((acc, event) => {
      const key = `${event.userId}:${event.userRole}`;
      if (!acc[key]) {
        acc[key] = {
          userId: event.userId,
          role: event.userRole,
          checks: 0,
          granted: 0,
          denied: 0,
        };
      }
      acc[key].checks++;
      if (event.granted) {
        acc[key].granted++;
      } else {
        acc[key].denied++;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(userStats).sort((a: any, b: any) => b.checks - a.checks);
  }

  private calculateRiskScore(events: SecurityEvent[]): number {
    if (events.length === 0) return 0;

    const severityWeights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 15,
    };

    const totalScore = events.reduce((sum, event) => {
      return sum + severityWeights[event.severity];
    }, 0);

    // Normalize to 0-100 scale
    return Math.min(100, (totalScore / events.length) * 10);
  }

  private calculateUserRiskLevel(
    events: PermissionUsageEvent[], 
    securityEvents: SecurityEvent[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const denialRate = events.length > 0 ? events.filter(e => !e.granted).length / events.length : 0;
    const criticalSecurityEvents = securityEvents.filter(e => e.severity === 'critical').length;
    const highSecurityEvents = securityEvents.filter(e => e.severity === 'high').length;

    if (criticalSecurityEvents > 0 || denialRate > 0.5) {
      return 'critical';
    } else if (highSecurityEvents > 2 || denialRate > 0.3) {
      return 'high';
    } else if (securityEvents.length > 0 || denialRate > 0.1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getEmptyAnalytics(): PermissionAnalytics {
    return {
      totalChecks: 0,
      grantedChecks: 0,
      deniedChecks: 0,
      averageCheckTime: 0,
      cacheHitRate: 0,
      topResources: [],
      topActions: [],
      userActivity: [],
      securityEvents: [],
      performanceMetrics: {
        slowestChecks: [],
        cachePerformance: {
          hits: 0,
          misses: 0,
          evictions: 0,
        },
      },
    };
  }

  private convertToCSV(analytics: PermissionAnalytics): string {
    // Convert analytics to CSV format
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Checks', analytics.totalChecks.toString()],
      ['Granted Checks', analytics.grantedChecks.toString()],
      ['Denied Checks', analytics.deniedChecks.toString()],
      ['Average Check Time (ms)', analytics.averageCheckTime.toFixed(2)],
      ['Cache Hit Rate', (analytics.cacheHitRate * 100).toFixed(1) + '%'],
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Export singleton instance
export const permissionAnalytics = PermissionAnalyticsService.getInstance();

// Hook for React components
export const usePermissionAnalytics = () => {
  return {
    recordPermissionCheck: permissionAnalytics.recordPermissionCheck.bind(permissionAnalytics),
    recordSecurityEvent: permissionAnalytics.recordSecurityEvent.bind(permissionAnalytics),
    getAnalytics: permissionAnalytics.getAnalytics.bind(permissionAnalytics),
    getSecurityAnalytics: permissionAnalytics.getSecurityAnalytics.bind(permissionAnalytics),
    getUserAnalytics: permissionAnalytics.getUserAnalytics.bind(permissionAnalytics),
    getRealTimeMetrics: permissionAnalytics.getRealTimeMetrics.bind(permissionAnalytics),
    exportAnalytics: permissionAnalytics.exportAnalytics.bind(permissionAnalytics),
  };
};