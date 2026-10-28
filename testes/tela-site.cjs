// Fotos do site público e da área do aluno (390, 820 e 1280 px), com relatório de rolagem lateral, erros no console e texto abaixo de 12 px.
// Uso: node testes/tela-site.cjs --url http://127.0.0.1:5180 --rotas "",entrar,aulas --aluno --larg 390,820,1280 --saida /caminho/fotos
//   --aluno: entra antes com a aluna de exemplo do simulador (Mariana Costa, CPF 529.982.247-25, senha aluna2026)
//   --rotas: caminhos depois do # (vazio = início). Ex.: aulas,meu-plano,minha-conta,minhas-reservas,ficha-saude
// Antes: o simulador (PORTA=8790 npm run simulador) e o site (VITE_API_URL=http://localhost:8790 npx vite --port 5180).
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');
const arg = (n, p) => { const i = process.argv.indexOf('--' + n); return i < 0 ? p : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const URL_ = String(arg('url', 'http://127.0.0.1:5173')).replace(/\/$/, '');
const rotas = String(arg('rotas', '')).split(',');
const larguras = String(arg('larg', '390,820,1280')).split(',').map(Number);
const saida = arg('saida', path.join(process.cwd(), 'fotos-site'));
const altura = Number(arg('viewport-alto', 900));
const comAluno = !!arg('aluno', false);
const limpo = (t) => String(t).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
(async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch();
  for (const w of larguras) {
    const ctx = await browser.newContext({ viewport: { width: w, height: altura }, hasTouch: w < 900 });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push('pageerror: ' + e.message.slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
    if (comAluno) {
      await page.goto(`${URL_}/#/entrar`);
      await page.waitForSelector('input[name=cpf]', { timeout: 15000 });
      await page.fill('input[name=cpf]', '529.982.247-25');
      await page.fill('input[name=senha]', 'aluna2026');
      await page.click('form button[type=submit]');
      await page.waitForURL(/#\/aulas/, { timeout: 20000 }).catch(() => {});
    }
    for (const r of rotas) {
      await page.goto(`${URL_}/#/${r}`);
      await page.waitForTimeout(900);
      try { await page.waitForFunction(() => !document.querySelector('.carregando, .b-carregando'), null, { timeout: 8000 }); } catch { /* segue */ }
      await page.waitForTimeout(500);
      const base = `${comAluno ? 'aluno' : 'site'}-${limpo(r || 'inicio')}-${w}`;
      await page.screenshot({ path: path.join(saida, base + '.png'), fullPage: true });
      const info = await page.evaluate(() => {
        const pequenos = [];
        document.querySelectorAll('body *').forEach((el) => {
          if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          if (parseFloat(cs.fontSize) < 12) pequenos.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} ${cs.fontSize} "${el.textContent.trim().slice(0, 24)}"`);
        });
        return { rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth, pequenos: [...new Set(pequenos)].slice(0, 6) };
      });
      if (info.rolagem > 0) console.log(`ROLAGEM LATERAL (${info.rolagem}px) em ${base}`);
      if (info.pequenos.length) console.log(`TEXTO < 12px em ${base}: ${info.pequenos.join(' | ')}`);
    }
    if (erros.length) console.log(`[${w}px] erros:`, [...new Set(erros)].slice(0, 6));
    await ctx.close();
  }
  await browser.close();
  console.log('fotos em', saida);
})();
