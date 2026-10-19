import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Endereço extra liberado na política de segurança (CSP) só em testes locais
const cspTeste = {
  name: 'csp-teste',
  transformIndexHtml(html) {
    const extra = process.env.VITE_API_URL ? new URL(process.env.VITE_API_URL).origin : '';
    return html.replace(' %CSP_TESTE%', extra ? ' ' + extra : '');
  },
};

// base './' faz o site funcionar em qualquer endereço
// (GitHub Pages, domínio próprio ou subpasta).
export default defineConfig({
  plugins: [react(), cspTeste],
  base: './',
  // compatível também com iPhones e Macs com Safari mais antigo
  build: { target: ['es2020', 'safari14', 'chrome87', 'firefox78'] },
});
