// ESLint (flat config) con la config oficial de Expo.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    rules: {
      // Los iconos de tabs/headers de React Navigation son render-props anónimos.
      'react/display-name': 'off',
    },
  },
];
