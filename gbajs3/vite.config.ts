/// <reference types="vitest" />
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['/img/favicon.ico'],
      manifest: {
        name: 'Gbajs3',
        short_name: 'GJ3',
        description: 'GBA emulator online in the Browser',
        theme_color: '#979597',
        background_color: '#212529',
        icons: [
          {
            src: '/img/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/img/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: '/img/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/img/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/img/maskable-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/img/maskable-icon-256x256.png',
            sizes: '256x256',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/img/maskable-icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/img/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    }),
    splitVendorChunkPlugin(),
    visualizer({ gzipSize: true })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const vendorPrefix = 'vendor_';
          if (id.indexOf('node_modules') > -1) {
            if (id.indexOf('@mui') > -1) {
              // vendor mui
              return vendorPrefix + '@mui';
            }

            if (
              id.indexOf('react-joyride') > -1 ||
              id.indexOf('react-floater') > -1 ||
              id.indexOf('popper.js') > -1
            ) {
              // vendor react joyride + large deps
              return vendorPrefix + 'react-joyride';
            }

            // returning void defaults to splitVendorChunkPlugin logic
          }
        }
      }
    }
  },
  test: {
    globals: true,
    restoreMocks: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      exclude: [
        'test/**',
        'src/emulator/mgba/wasm/**',
        '**/*.d.ts',
        '**/*eslint*'
      ]
    }
  }
});
