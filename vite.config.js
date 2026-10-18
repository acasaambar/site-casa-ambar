import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' faz o site funcionar em qualquer endereço
// (GitHub Pages, domínio próprio ou subpasta).
export default defineConfig({
  plugins: [react()],
  base: './',
  // compatível também com iPhones e Macs com Safari mais antigo
  build: { target: ['es2020', 'safari14', 'chrome87', 'firefox78'] },
});
