// eslint.config.js
import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/**', 'data/**'],
  },
  js.configs.recommended,
  {
    // Browser-side app code: loaded via <script type="module"> in index.html,
    // plus mapboxgl which is loaded from a separate <script> tag (not imported).
    files: ['js/**/*.js'],
    ignores: ['**/*.test.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        AbortSignal: 'readonly',
        ImageData: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URLSearchParams: 'readonly',
        mapboxgl: 'readonly',
        // Leaflet: loaded from a <script> tag in index.html, same as mapboxgl.
        // js/heatmapView.js still uses it (see the HEATMAP_ENABLED comment in
        // js/app.js) even though the app has otherwise migrated to Mapbox GL JS.
        L: 'readonly',
      },
    },
    rules: {
      eqeqeq: 'error',
    },
  },
  {
    // Node-side test files and data-fetching scripts.
    files: ['**/*.test.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      eqeqeq: 'error',
    },
  },
];
