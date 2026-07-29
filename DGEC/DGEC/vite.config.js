import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

function cleanUrlsPlugin() {
  return {
    name: 'clean-urls-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url.split('?')[0];
        const queryStr = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';

        if (urlPath === '/admin' || urlPath === '/admin/') {
          req.url = '/admin.html' + queryStr;
        } else if (urlPath === '/client' || urlPath === '/client/' || urlPath === '/client-dashboard' || urlPath === '/client-dashboard/') {
          req.url = '/client.html' + queryStr;
        } else if (urlPath === '/staff' || urlPath === '/staff/') {
          req.url = '/staff.html' + queryStr;
        } else if (urlPath === '/login' || urlPath === '/login/' || urlPath === '/client-login' || urlPath === '/client-login/') {
          req.url = '/login.html' + queryStr;
        } else if (urlPath === '/set-password' || urlPath === '/set-password/') {
          req.url = '/set-password.html' + queryStr;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), cleanUrlsPlugin()],
  server: {
    port: 8080,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        client: resolve(__dirname, 'client.html'),
        staff: resolve(__dirname, 'staff.html'),
        login: resolve(__dirname, 'login.html')
      }
    }
  }
});
