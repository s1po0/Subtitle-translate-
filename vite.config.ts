import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: { target: 'chrome74' }, server: { host: "0.0.0.0", allowedHosts: [".e2b.app"] } });
