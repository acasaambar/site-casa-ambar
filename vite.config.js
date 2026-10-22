import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { EXTERNOS } from './src/externos.js';

// Política de segurança (CSP) do index.html:
//  - endereço da API de testes, só em testes locais;
//  - Cloudflare (Turnstile e Web Analytics), só quando a chave correspondente está em src/externos.js.
const cspTeste = {
  name: 'csp-teste',
  transformIndexHtml(html) {
    const extra = process.env.VITE_API_URL ? new URL(process.env.VITE_API_URL).origin : '';
    const ts = Boolean(EXTERNOS.turnstileSiteKey);
    const wa = Boolean(EXTERNOS.analyticsToken);
    const lista = (l) => l.filter(Boolean).map((x) => ' ' + x).join('');
    return html
      .replace(' %CSP_TESTE%', extra ? ' ' + extra : '')
      .replace('%CSP_SCRIPT%', lista([ts && 'https://challenges.cloudflare.com', wa && 'https://static.cloudflareinsights.com']))
      .replace('%CSP_CONEXAO%', lista([ts && 'https://challenges.cloudflare.com', wa && 'https://cloudflareinsights.com']))
      .replace('%CSP_MOLDURA%', ts ? 'https://challenges.cloudflare.com' : "'none'");
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
