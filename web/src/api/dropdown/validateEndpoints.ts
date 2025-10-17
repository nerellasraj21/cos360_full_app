/**
 * Validation script to verify all 8 dropdown endpoints are properly configured
 */
import { DROPDOWN_ENDPOINTS } from '../../constants/dropdown/endpoints';
import { validateAllEndpoints } from './dropdownValidation';

console.log('🔍 Validating Dropdown Endpoint Configuration System...\n');

// List all configured endpoints
const endpointKeys = Object.keys(DROPDOWN_ENDPOINTS);
console.log(`📋 Found ${endpointKeys.length} configured endpoints:`);
endpointKeys.forEach((key, index) => {
  const endpoint = DROPDOWN_ENDPOINTS[key];
  console.log(`  ${index + 1}. ${key} -> ${endpoint.url}`);
});

console.log('\n🔧 Running comprehensive validation...');

// Run validation
const validationResult = validateAllEndpoints();

if (validationResult.isValid) {
  console.log('✅ All endpoint configurations are valid!');
} else {
  console.log(`❌ Found ${validationResult.errors.length} validation errors:`);
  validationResult.errors.forEach(error => {
    console.log(`  - ${error.endpointKey}: ${error.message}`);
  });
}

if (validationResult.warnings.length > 0) {
  console.log(`⚠️  Found ${validationResult.warnings.length} warnings:`);
  validationResult.warnings.forEach(warning => {
    console.log(`  - ${warning.endpointKey}: ${warning.message}`);
    if (warning.suggestion) {
      console.log(`    💡 ${warning.suggestion}`);
    }
  });
}

// Verify all 8 required endpoints are present
const requiredEndpoints = [
  'ACADEMIC_YEARS',
  'CLASSES', 
  'SECTIONS_BY_CLASS',
  'SUBJECT_CATEGORIES',
  'SUBJECTS',
  'SUBJECTS_BY_CATEGORY', 
  'TRANSPORT_ROUTES',
  'HOLIDAYS'
];

console.log('\n📊 Checking required endpoints coverage:');
const missingEndpoints = requiredEndpoints.filter(key => !DROPDOWN_ENDPOINTS[key]);

if (missingEndpoints.length === 0) {
  console.log('✅ All 8 required endpoints are configured');
} else {
  console.log(`❌ Missing endpoints: ${missingEndpoints.join(', ')}`);
}

// Check cascading endpoints
const cascadingEndpoints = endpointKeys.filter(key => {
  const endpoint = DROPDOWN_ENDPOINTS[key];
  return endpoint.queryParams && 
    Object.values(endpoint.queryParams).some(value => 
      typeof value === 'string' && value.includes('{{dependsOn}}')
    );
});

console.log(`\n🔗 Found ${cascadingEndpoints.length} cascading endpoints:`);
cascadingEndpoints.forEach(key => {
  console.log(`  - ${key}`);
});

console.log('\n🎉 Endpoint configuration system validation complete!');