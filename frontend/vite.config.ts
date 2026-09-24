import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/orders': 'http://localhost:3000',
      '/webhooks': 'http://localhost:3000',
    },
  },
});
