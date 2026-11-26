import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { federationCssRootCopy } from './vite-plugins/federation-css-root-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE_URL || process.env.VITE_BASE_URL || 'http://localhost:3022/',
    plugins: [
        federationCssRootCopy(),
        react({
            jsxRuntime: 'automatic',
        }),
        federation({
            name: 'flow_app',
            filename: 'remoteEntry.js',
            exposes: {
                './App': './src/App.tsx',
            },
            shared: {
                react: { singleton: true, requiredVersion: '^19.2.0' },
                'react-dom': { singleton: true, requiredVersion: '^19.2.0' },
                'react-router-dom': { singleton: true, requiredVersion: '^7.12.0' },
                'framer-motion': { singleton: true },
                axios: { singleton: true },
                '@so360/shell-context': { singleton: true },
                '@so360/design-system': { singleton: true },
                '@so360/event-bus': { singleton: true },
                '@so360/cross-link': { singleton: true },
            },
        }),
    ],
    build: {
        target: 'esnext',
        minify: 'esbuild',
        cssCodeSplit: false,
        emptyOutDir: false,
        rollupOptions: {
            output: {
                // The federation runtime (importShared / __federation_fn_import) MUST keep its own chunk:
                // a vendor manual chunk that imports React through it would absorb it and the exposed
                // ./App would statically import that whole vendor chunk on every open.
                // lucide-react is tree-shaken per remote into one `icons` chunk shared by all lazy pages.
                manualChunks(id: string) {
                    if (id.includes('__federation_fn_import')) return '__federation_fn_import';
                    if (id.includes('node_modules/lucide-react')) return 'icons';
                    return undefined;
                },
            },
        },
    },
    server: {
        port: 3022,
        strictPort: true,
        cors: true,
        proxy: {
            '/v1/flow': {
                target: 'http://localhost:3021',
                changeOrigin: true,
            },
            '/v1': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
    preview: {
        port: 3022,
        strictPort: true,
        cors: true,
        proxy: {
            '/v1/flow': {
                target: 'http://localhost:3021',
                changeOrigin: true,
            },
            '/v1': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
}; });
