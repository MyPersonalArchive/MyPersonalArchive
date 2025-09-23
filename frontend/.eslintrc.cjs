module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'unused-imports'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Disable the default no-unused-vars as we use unused-imports plugin
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',

    // Enable unused-imports plugin to auto remove unused imports and vars
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',  // ignore vars starting with _
        args: 'after-used',
        argsIgnorePattern: '^_',
      }
    ],

    // Other style rules
    'quotes': ['error', 'double', { avoidEscape: true }],
    'semi': ['error', 'never'],
    'indent': ['error', 4], // or 'tab' if you want tabs
  },
  settings: {},
}
