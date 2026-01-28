/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { coverageConfigDefaults } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  const withCOIServiceWorker = mode === 'with-coi-serviceworker';

  return {
    base: './',
    plugins: [
      react({
        plugins: [
          [
            '@swc/plugin-emotion',
            {
              // items for component selectors with MUI+SWC
              autoLabel: 'dev-only',
              labelFormat: '[local]',
              importMap: {
                '@mui/material/styles': {
                  styled: {
                    canonicalImport: ['@emotion/styled', 'default'],
                    styledBaseImport: ['@mui/material/styles', 'styled']
                  }
                }
              }
            }
          ]
        ]
      }),
      withCOIServiceWorker
        ? [
            createHtmlPlugin({
              inject: {
                tags: [
                  {
                    tag: 'script',
                    attrs: { src: 'coi-sw.js' },
                    injectTo: 'head-prepend'
                  }
                ]
              }
            })
          ]
        : [],
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['./img/favicon.ico'],
        manifest: {
          name: 'Gbajs3',
          short_name: 'GJ3',
          description: 'GBA emulator online in the Browser',
          theme_color: '#212529',
          background_color: '#212529',
          icons: [
            {
              src: './img/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: './img/icon-256x256.png',
              sizes: '256x256',
              type: 'image/png'
            },
            {
              src: './img/icon-384x384.png',
              sizes: '384x384',
              type: 'image/png'
            },
            {
              src: './img/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: './img/maskable-icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: './img/maskable-icon-256x256.png',
              sizes: '256x256',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: './img/maskable-icon-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: './img/maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: 'img/desktop.png',
              sizes: '2054x1324',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Desktop Gbajs3'
            },
            {
              src: 'img/mobile.png',
              sizes: '1170x2532',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Mobile Gbajs3'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,wasm}'],
          navigateFallbackDenylist: [/^\/admin/]
        },
        ...(withCOIServiceWorker
          ? {
              injectRegister: null,
              strategies: 'injectManifest',
              srcDir: 'src/service-worker',
              filename: 'coi-sw.ts',
              injectManifest: {
                injectionPoint: undefined
              }
            }
          : {})
      }),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@thenick775/mgba-wasm/dist/*.wasm.map',
            dest: 'assets'
          }
        ]
      }),
      visualizer({ gzipSize: true })
    ],
    optimizeDeps: {
      exclude: ['@thenick775/mgba-wasm']
    },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: [
              'react',
              'react-dom',
              'react-dom/client',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
              'scheduler'
            ],

            emotion: ['@emotion/react', '@emotion/styled'],

            mui: ['@mui/material'],

            'mui-x': ['@mui/x-tree-view'],

            mgba: ['@thenick775/mgba-wasm'],

            onboarding: ['react-ios-pwa-prompt-ts'],

            dnd: ['react-draggable', 'react-dropzone', 'react-rnd'],

            query: ['@tanstack/react-query', 'zod'],

            ui: [
              'react-modal',
              'react-hot-toast',
              'react-spinners',
              'react-animate-height',
              'react-icons',
              'react-icons/tb',
              'react-icons/fa',
              'react-icons/ai',
              'react-icons/bi',
              'react-error-boundary'
            ],

            hooks: [
              'react-hook-form',
              '@uidotdev/usehooks',
              'jwt-decode',
              'nanoid'
            ],
            zip: ['@zip.js/zip.js']
          }
        }
      }
    },
    test: {
      globals: true,
      restoreMocks: true,
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src'],
        reporter: ['html', 'json-summary', 'json'],
        exclude: [
          ...coverageConfigDefaults.exclude,
          'test/**',
          'src/emulator/mgba/wasm/**',
          '**/*.d.ts',
          '**/*eslint*',
          '**/service-worker/**'
        ]
      }
    }
  };
});
