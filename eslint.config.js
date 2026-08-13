// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Reanimated is built on values that are mutated from worklets and on refs
    // that are read outside render — neither fits the React Compiler's rules.
    files: ['components/day-page.tsx', 'components/entry-drag.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
    },
  },
]);
