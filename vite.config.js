import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        master: resolve(__dirname, 'master.html'),
        contacts: resolve(__dirname, 'contacts.html'),
        booking: resolve(__dirname, 'booking.html'),
        cabinet: resolve(__dirname, 'cabinet.html'),
        admin: resolve(__dirname, 'admin.html'),
        faq: resolve(__dirname, 'faq.html'),
        aftercare: resolve(__dirname, 'aftercare.html'),
      },
      external: [
        /^https:\/\/cdn\.jsdelivr\.net/,
        /^https:\/\/unpkg\.com/,
        'three',
        /^three\//,
      ],
    },
  },

  // Static assets (images, GLB, textures, icons) are in public/
  // and will be copied to dist/ as-is
  publicDir: 'public',
});
