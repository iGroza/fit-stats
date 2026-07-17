import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        assetsDir: '',
        cssCodeSplit: false,
        rollupOptions: {
            output: {
                entryFileNames: 'index.js',
                chunkFileNames: '[name].js',
                assetFileNames: function (assetInfo) {
                    if (assetInfo.name && assetInfo.name.slice(-4) === '.css') {
                        return 'index.css';
                    }
                    return '[name][extname]';
                },
            },
        },
    },
});
