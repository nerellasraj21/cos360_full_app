import { PermissionTuple } from '../src/types/permissions';

/**
 * Performance testing utilities for permission system
 */

export interface PerformanceTestResult {
  testName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

export interface PermissionTestSuite {
  singlePermissionCheck: PerformanceTestResult;
  multiplePermissionCheck: PerformanceTestResult;
  batchPermissionCheck: PerformanceTestResult;
  cacheHitTest: PerformanceTestResult;
  cacheMissTest: PerformanceTestResult;
}

/**
 * Run performance tests on permission checking functions
 */
export const runPermissionPerformanceTests = (
  checkPermission: (resource: string, action: string) => boolean,
  checkMultiplePermissions: (permissions: PermissionTuple[]) => Record<string, boolean>,
  hasAnyPermission: (permissions: PermissionTuple[]) => boolean,
  hasAllPermissions: (permissions: PermissionTuple[]) => boolean,
  clearCache?: () => void
): PermissionTestSuite => {
  
  const testPermissions: [string, string][] = [
    ['students', 'read'],
    ['students', 'create'],
    ['students', 'update'],
    ['students', 'delete'],
    ['students', 'list'],
    ['fees', 'read'],
    ['fees', 'create'],
    ['fees', 'update'],
    ['fees', 'delete'],
    ['fees', 'list'],
    ['staff', 'read'],
    ['staff', 'create'],
    ['transport', 'read'],
    ['transport', 'list'],
    ['masters', 'read'],
  ];

  // Test single permission checks
  const singlePermissionTest = measurePerformance(
    'Single Permission Check',
    1000,
    () => {
      checkPermission('students', 'read');
    }
  );

  // Test multiple permission checks (individual calls)
  const multiplePermissionTest = measurePerformance(
    'Multiple Permission Check (Individual)',
    100,
    () => {
      testPermissions.forEach(([resource, action]) => {
        checkPermission(resource, action);
      });
    }
  );

  // Test batch permission checks
  const batchPermissionTest = measurePerformance(
    'Batch Permission Check',
    100,
    () => {
      checkMultiplePermissions(testPermissions);
    }
  );

  // Test cache hit performance (run same checks multiple times)
  const cacheHitTest = measurePerformance(
    'Cache Hit Test',
    1000,
    () => {
      // Run the same permission check multiple times to test cache hits
      checkPermission('students', 'read');
      checkPermission('students', 'read');
      checkPermission('students', 'read');
    }
  );

  // Test cache miss performance (clear cache before each check)
  const cacheMissTest = measurePerformance(
    'Cache Miss Test',
    100,
    () => {
      if (clearCache) {
        clearCache();
      }
      checkPermission('students', 'read');
    }
  );

  return {
    singlePermissionCheck: singlePermissionTest,
    multiplePermissionCheck: multiplePermissionTest,
    batchPermissionCheck: batchPermissionTest,
    cacheHitTest: cacheHitTest,
    cacheMissTest: cacheMissTest,
  };
};

/**
 * Measure performance of a function
 */
const measurePerformance = (
  testName: string,
  iterations: number,
  testFunction: () => void
): PerformanceTestResult => {
  const times: number[] = [];
  
  // Warm up
  for (let i = 0; i < 10; i++) {
    testFunction();
  }

  // Actual test
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    testFunction();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / averageTime;

  return {
    testName,
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    opsPerSecond,
  };
};

/**
 * Compare performance between two permission implementations
 */
export const comparePermissionPerformance = (
  originalImplementation: {
    checkPermission: (resource: string, action: string) => boolean;
    hasAnyPermission: (permissions: PermissionTuple[]) => boolean;
    hasAllPermissions: (permissions: PermissionTuple[]) => boolean;
  },
  optimizedImplementation: {
    checkPermission: (resource: string, action: string) => boolean;
    checkMultiplePermissions: (permissions: PermissionTuple[]) => Record<string, boolean>;
    hasAnyPermission: (permissions: PermissionTuple[]) => boolean;
    hasAllPermissions: (permissions: PermissionTuple[]) => boolean;
    clearCache?: () => void;
  }
) => {
  console.log('🚀 Running Permission Performance Comparison...\n');

  // Test original implementation
  console.log('📊 Testing Original Implementation:');
  const originalResults = runPermissionPerformanceTests(
    originalImplementation.checkPermission,
    (permissions) => {
      // Simulate batch checking with individual calls
      const results: Record<string, boolean> = {};
      permissions.forEach(([resource, action]) => {
        results[`${resource}:${action}`] = originalImplementation.checkPermission(resource, action);
      });
      return results;
    },
    originalImplementation.hasAnyPermission,
    originalImplementation.hasAllPermissions
  );

  printTestResults(originalResults);

  // Test optimized implementation
  console.log('\n⚡ Testing Optimized Implementation:');
  const optimizedResults = runPermissionPerformanceTests(
    optimizedImplementation.checkPermission,
    optimizedImplementation.checkMultiplePermissions,
    optimizedImplementation.hasAnyPermission,
    optimizedImplementation.hasAllPermissions,
    optimizedImplementation.clearCache
  );

  printTestResults(optimizedResults);

  // Calculate improvements
  console.log('\n📈 Performance Improvements:');
  const improvements = calculateImprovements(originalResults, optimizedResults);
  printImprovements(improvements);

  return {
    original: originalResults,
    optimized: optimizedResults,
    improvements,
  };
};

const printTestResults = (results: PermissionTestSuite) => {
  Object.values(results).forEach(result => {
    console.log(`  ${result.testName}:`);
    console.log(`    Average: ${result.averageTime.toFixed(3)}ms`);
    console.log(`    Ops/sec: ${result.opsPerSecond.toFixed(0)}`);
    console.log(`    Range: ${result.minTime.toFixed(3)}ms - ${result.maxTime.toFixed(3)}ms`);
  });
};

const calculateImprovements = (
  original: PermissionTestSuite,
  optimized: PermissionTestSuite
) => {
  const improvements: Record<string, number> = {};
  
  Object.keys(original).forEach(key => {
    const originalTime = (original as any)[key].averageTime;
    const optimizedTime = (optimized as any)[key].averageTime;
    const improvement = ((originalTime - optimizedTime) / originalTime) * 100;
    improvements[key] = improvement;
  });

  return improvements;
};

const printImprovements = (improvements: Record<string, number>) => {
  Object.entries(improvements).forEach(([test, improvement]) => {
    const emoji = improvement > 0 ? '🚀' : improvement < -10 ? '⚠️' : '📊';
    const sign = improvement > 0 ? '+' : '';
    console.log(`  ${emoji} ${test}: ${sign}${improvement.toFixed(1)}%`);
  });
};

export const generatePerformanceReport = (
  testResults: ReturnType<typeof comparePermissionPerformance>
) => {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: Object.keys(testResults.original).length,
      averageImprovement: Object.values(testResults.improvements).reduce((sum, imp) => sum + imp, 0) / Object.keys(testResults.improvements).length,
      bestImprovement: Math.max(...Object.values(testResults.improvements)),
      worstImprovement: Math.min(...Object.values(testResults.improvements)),
    },
    detailed: testResults,
    recommendations: generateRecommendations(testResults),
  };

  return report;
};

const generateRecommendations = (
  testResults: ReturnType<typeof comparePermissionPerformance>
): string[] => {
  const recommendations: string[] = [];
  const { improvements } = testResults;

  if (improvements.cacheHitTest > 50) {
    recommendations.push('Caching is highly effective - ensure cache is properly warmed up');
  }

  if (improvements.batchPermissionCheck > 30) {
    recommendations.push('Batch permission checking provides significant performance gains');
  }

  if (improvements.singlePermissionCheck > 20) {
    recommendations.push('Individual permission checks are much faster with optimization');
  }

  if (Object.values(improvements).some(imp => imp < -10)) {
    recommendations.push('Some operations are slower - review implementation for potential issues');
  }

  if (improvements.cacheMissTest < 10) {
    recommendations.push('Cache miss performance could be improved further');
  }

  return recommendations;
};