// ============================================================
//  CHAVES PÚBLICAS DA CLOUDFLARE (conta da Casa Âmbar)
//  Podem ficar no código: o navegador de todo visitante recebe estas chaves.
//  A chave SECRETA do Turnstile nunca entra aqui: fica só nas Propriedades do Apps Script (TURNSTILE_SECRET).
//  Vazia = desligado. Ao preencher, a política de segurança (CSP) do index.html libera a Cloudflare sozinha (vite.config.js).
// ============================================================
export const EXTERNOS = {
  // "Não sou robô" no cadastro e no "Esqueci minha senha" (Turnstile → Site Key)
  turnstileSiteKey: '',
  // Visitas do site (Web Analytics → token do site)
  analyticsToken: '',
};
