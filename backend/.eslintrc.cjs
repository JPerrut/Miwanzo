module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'plugin:node/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'node/no-unsupported-features/es-syntax': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
