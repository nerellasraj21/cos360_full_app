// School configuration constants
export const SCHOOL_CONFIG = {
  name: 'COS360',
  shortName: 'AGS',
  subtitle: 'School Management System',
  logo: '🏫',
} as const;

// Function to get school name (can be extended to fetch from API)
export const getSchoolName = (): string => {
  return SCHOOL_CONFIG.name;
};

// Function to get school info
export const getSchoolInfo = () => {
  return SCHOOL_CONFIG;
};