// Tira fotos das telas da bancada (para conferir o visual em 390, 820 e 1280 px).
// Uso: node testes/tela.cjs --url http://127.0.0.1:5180 --papel admin --rotas agenda,alunos --larg 390,820,1280 --saida /caminho/fotos [--abas]
//   --papel: admin | recep | lia (profissional de estética) | ana (professora)
//   --abas: também clica em cada aba/segmento da tela e tira uma foto de cada
//   --viewport-alto 900: altura da janela (a foto é da página inteira)
// Antes: o simulador (PORTA=8790 npm run simulador) e o site (VITE_API_URL=http://localhost:8790 npx vite --port 5180).
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');
const arg = (n, p) => { const i = process.argv.indexOf('--' + n); return i < 0 ? p : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const URL_ = String(arg('url', 'http://127.0.0.1:5173')).replace(/\/$/, '');
const papel = arg('papel', 'admin');
const rotas = String(arg('rotas', '')).split(',');
const larguras = String(arg('larg', '390,820,1280')).split(',').map(Number);
const saida = arg('saida', path.join(process.cwd(), 'fotos'));
const altura = Number(arg('viewport-alto', 900));
const porAbas = !!arg('abas', false);
const CONTAS = { admin: ['contato@acasaambar.com.br', 'ambar2026adm'], recep: ['bia@acasaambar.com.br', 'recep2026ok'], lia: ['lia@gmail.com', 'liamoura2026'], ana: ['ana@gmail.com', 'anapaula26'] };
const limpo = (t) => String(t).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
(async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch();
  const [email, senha] = CONTAS[papel];
  for (const w of larguras) {
    const ctx = await browser.newContext({ viewport: { width: w, height: altura }, hasTouch: w < 900 });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push('pageerror: ' + e.message.slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
    await page.goto(`${URL_}/#/bancada`);
    await page.fill('input[type=email]', email);
    await page.fill('input[type=password]', senha);
    await page.click('button:has-text("Entrar")');
    await page.waitForSelector('.b-menu', { state: 'attached', timeout: 20000 });
    for (const r of rotas) {
      await page.goto(`${URL_}/#/bancada${r ? '/' + r : ''}`);
      await page.waitForTimeout(500);
      try { await page.waitForFunction(() => !document.querySelector('.b-carregando'), null, { timeout: 8000 }); } catch {}
      await page.waitForTimeout(700);
      const base = `${papel}-${limpo(r || 'hoje')}-${w}`;
      await page.screenshot({ path: path.join(saida, base + '.png'), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) console.log(`ROLAGEM LATERAL (${overflow}px) em ${base}`);
      if (porAbas) {
        const abas = await page.evaluate(() => [...document.querySelectorAll('.b-abas button, .b-segmento button')].map((b) => b.innerText.trim()));
        for (const a of [...new Set(abas)].slice(1)) {
          try {
            await page.locator('.b-abas button, .b-segmento button', { hasText: a }).first().click();
            await page.waitForTimeout(900);
            await page.screenshot({ path: path.join(saida, `${base}~${limpo(a)}.png`), fullPage: true });
          } catch (e) { console.log('aba não abriu:', a, String(e).slice(0, 80)); }
        }
      }
    }
    if (erros.length) console.log(`erros no navegador (${w}px):`, [...new Set(erros)].slice(0, 6));
    await ctx.close();
  }
  await browser.close();
  console.log('fotos em', saida);
})();
