// ESLint flat config —— 后端（Node ESM）与前端（浏览器 + JSX）分开配置
// 重点：no-undef + no-unused-vars，用于拦住"引用未声明变量"这类只能靠运行时才暴露的问题
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

const unusedVars = ['error', {
  args: 'after-used',
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  caughtErrors: 'none',        // catch 里没用到的错误对象不算问题
  ignoreRestSiblings: true,
}];

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', 'data/**', '**/*.min.js'] },

  js.configs.recommended,

  // ---------- 后端：Node ESM ----------
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': unusedVars,
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'smart'],
      'no-console': 'off',
    },
  },

  // ---------- 前端：浏览器 + JSX ----------
  {
    files: ['web/src/**/*.{js,jsx}'],
    ...reactHooks.configs.flat.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'no-undef': 'error',
      'no-unused-vars': unusedVars,
      'no-empty': ['error', { allowEmptyCatch: true }],
      // React Compiler 时代的建议性规则：属于性能优化建议，需要架构级改造，
      // 存量代码量大，先降级为 warn，不阻塞 CI。
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // ---------- Service Worker：独立的 worker 全局环境 ----------
  {
    files: ['web/public/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', globals: { ...globals.serviceworker } },
    rules: { 'no-unused-vars': unusedVars },
  },

  // ---------- 构建/配置文件：Node 环境 ----------
  {
    files: ['**/*.config.js', 'eslint.config.js', 'web/vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
