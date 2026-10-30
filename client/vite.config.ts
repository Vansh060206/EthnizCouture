import { defineConfig, Plugin, ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Middleware to properly support HTTP Range Requests (206 Partial Content) for MP4 videos in Vite dev server
function mp4RangePlugin(): Plugin {
  return {
    name: 'mp4-range-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.includes('.mp4')) {
          const cleanUrl = req.url.split('?')[0];
          const filePath = path.resolve(__dirname, 'public', cleanUrl.replace(/^\//, ''));

          if (!fs.existsSync(filePath)) {
            return next();
          }

          const stat = fs.statSync(filePath);
          const fileSize = stat.size;
          const range = req.headers.range;

          // Maximum chunk size (512 KB) for instantaneous startup & smooth progressive streaming on low connectivity
          const MAX_CHUNK_SIZE = 512 * 1024;

          if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            let end = parts[1] ? parseInt(parts[1], 10) : start + MAX_CHUNK_SIZE - 1;
            if (end >= fileSize) {
              end = fileSize - 1;
            }

            if (start >= fileSize) {
              res.writeHead(416, {
                'Content-Range': `bytes */${fileSize}`,
                'Accept-Ranges': 'bytes'
              });
              return res.end();
            }

            const chunkSize = end - start + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize,
              'Content-Type': 'video/mp4',
              'Cache-Control': 'public, max-age=31536000, immutable'
            });

            fileStream.pipe(res);
            res.on('close', () => {
              fileStream.destroy();
            });
            return;
          } else {
            res.writeHead(200, {
              'Content-Length': fileSize,
              'Content-Type': 'video/mp4',
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'public, max-age=31536000, immutable'
            });
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            res.on('close', () => {
              fileStream.destroy();
            });
            return;
          }
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mp4RangePlugin()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'vendor-ui': ['lucide-react', 'canvas-confetti', 'axios']
        }
      }
    }
  }
});
