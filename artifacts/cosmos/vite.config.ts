import path from 'path';
import fs from 'node:fs/promises';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

const cosmicRunDir = path.resolve(import.meta.dirname, '..', '..', 'cosmic-run');
const cosmicRunOutputDir = path.resolve(import.meta.dirname, 'dist/public/cosmic-run');

function cosmicRunStaticAssets(): Plugin {
  const contentTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  };

  return {
    name: 'cosmic-run-static-assets',
    configureServer(server) {
      server.middlewares.use('/cosmic-run', async (req, res, next) => {
        const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
        const filePath = path.resolve(cosmicRunDir, relativePath);
        if (!filePath.startsWith(`${cosmicRunDir}${path.sep}`)) {
          next();
          return;
        }

        try {
          const file = await fs.readFile(filePath);
          res.statusCode = 200;
          res.setHeader('Content-Type', contentTypes[path.extname(filePath)] || 'application/octet-stream');
          res.end(file);
        } catch {
          next();
        }
      });
    },
    async closeBundle() {
      await fs.rm(cosmicRunOutputDir, { recursive: true, force: true });
      await fs.cp(cosmicRunDir, cosmicRunOutputDir, { recursive: true });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    cosmicRunStaticAssets(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
      allow: [path.resolve(import.meta.dirname, '..', '..')],
    },
    // Proxy /api/* to the Express API server during development
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
