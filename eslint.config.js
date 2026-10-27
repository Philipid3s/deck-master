import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'shots/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Scripts run under Node and drive the page through Puppeteer, so they
    // see both sets of globals.
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // Replay determinism: the same seed plus the same decisions must replay
    // exactly, so every draw in the simulation comes from Rng.stream().
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use Rng.stream(seed, day, label) — Math.random() breaks replay determinism.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'core/ is engine-agnostic: no DOM.' },
        { name: 'window', message: 'core/ is engine-agnostic: no DOM.' },
      ],
    },
  },
);
