import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useOptimizedMobilePermissions } from '../hooks/use-optimized-mobile-permissions';
import { generateGlobalPerformanceReport, PermissionPerformanceAnalyzer } from '../utils/permission-performance-utils';

interface PermissionPerformanceMonitorProps {
  visible?: boolean;
  onClose?: () => void;
}

export const PermissionPerformanceMonitor: React.FC<PermissionPerformanceMonitorProps> = ({
  visible = false,
  onClose
}) => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const { getCacheStats, clearPermissionCache } = useOptimizedMobilePermissions();

  useEffect(() => {
    if (visible) {
      // Initial load
      updatePerformanceData();
      
      // Set up auto-refresh
      const interval = setInterval(updatePerformanceData, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [visible]);

  const updatePerformanceData = () => {
    const globalReport = generateGlobalPerformanceReport();
    const cacheStats = getCacheStats();
    
    setPerformanceData({
      ...globalReport,
      cache: cacheStats,
    });
  };

  const handleClearCache = () => {
    clearPermissionCache();
    updatePerformanceData();
  };

  if (!visible || !performanceData) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'critical': return '#F44336';
      default: return '#757575';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Permission Performance Monitor</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Overall Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(performanceData.summary.status) }]}>
            <Text style={styles.statusText}>{performanceData.summary.status.toUpperCase()}</Text>
          </View>
          
          {performanceData.summary.criticalIssues.length > 0 && (
            <View style={styles.criticalIssues}>
              <Text style={styles.criticalTitle}>Critical Issues:</Text>
              {performanceData.summary.criticalIssues.map((issue: string, index: number) => (
                <Text key={index} style={styles.criticalIssue}>• {issue}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Cache Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Hit Rate</Text>
              <Text style={styles.statValue}>
                {(performanceData.cache.hitRate * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cache Size</Text>
              <Text style={styles.statValue}>
                {performanceData.cache.size}/{performanceData.cache.maxSize}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Checks</Text>
              <Text style={styles.statValue}>
                {performanceData.cache.metrics?.totalChecks || 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Time</Text>
              <Text style={styles.statValue}>
                {performanceData.cache.metrics?.averageAccessTime?.toFixed(2) || 0}ms
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={handleClearCache} style={styles.clearCacheButton}>
            <Text style={styles.clearCacheText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Operations</Text>
              <Text style={styles.statValue}>{performanceData.performance.totalOperations}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Duration</Text>
              <Text style={styles.statValue}>
                {performanceData.performance.averageDuration.toFixed(2)}ms
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cache Hit Rate</Text>
              <Text style={styles.statValue}>
                {(performanceData.performance.cacheHitRate * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Component Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Component Performance</Text>
          {Object.entries(performanceData.performance.componentStats).map(([component, stats]: [string, any]) => (
            <View key={component} style={styles.componentStat}>
              <Text style={styles.componentName}>{component}</Text>
              <View style={styles.componentMetrics}>
                <Text style={styles.componentMetric}>
                  Operations: {stats.operations}
                </Text>
                <Text style={styles.componentMetric}>
                  Avg: {stats.averageDuration.toFixed(2)}ms
                </Text>
                <Text style={styles.componentMetric}>
                  Cache: {(stats.cacheHitRate * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Slowest Operations */}
        {performanceData.performance.slowestOperations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Slowest Operations</Text>
            {performanceData.performance.slowestOperations.slice(0, 5).map((op: any, index: number) => (
              <View key={index} style={styles.slowOperation}>
                <Text style={styles.slowOpComponent}>{op.component}</Text>
                <Text style={styles.slowOpOperation}>{op.operation}</Text>
                <Text style={styles.slowOpDuration}>{op.duration.toFixed(2)}ms</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {performanceData.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {performanceData.recommendations.map((rec: string, index: number) => (
              <Text key={index} style={styles.recommendation}>• {rec}</Text>
            ))}
          </View>
        )}

        {/* Memory Usage */}
        {performanceData.memory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Memory Usage</Text>
            <View style={styles.memoryStats}>
              <Text style={styles.memoryText}>
                Used: {(performanceData.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
              </Text>
              <Text style={styles.memoryText}>
                Total: {(performanceData.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB
              </Text>
              <Text style={styles.memoryText}>
                Usage: {performanceData.memory.usagePercentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    bottom: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 10,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  criticalIssues: {
    backgroundColor: '#3d1a1a',
    padding: 10,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  criticalTitle: {
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  criticalIssue: {
    color: '#ffcdd2',
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearCacheButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  clearCacheText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  componentStat: {
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  componentName: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  componentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  componentMetric: {
    color: '#aaa',
    fontSize: 12,
  },
  slowOperation: {
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slowOpComponent: {
    color: '#fff',
    flex: 1,
    fontSize: 12,
  },
  slowOpOperation: {
    color: '#aaa',
    flex: 2,
    fontSize: 12,
  },
  slowOpDuration: {
    color: '#F44336',
    fontWeight: 'bold',
    fontSize: 12,
  },
  recommendation: {
    color: '#4CAF50',
    marginBottom: 5,
    paddingLeft: 10,
  },
  memoryStats: {
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 5,
  },
  memoryText: {
    color: '#fff',
    marginBottom: 3,
  },
});

export default PermissionPerformanceMonitor;