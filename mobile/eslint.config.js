// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['__mocks__/**/*.js', 'jest.setup.js'],
    languageOptions: { globals: { jest: 'readonly' } },
  },
]);
