// Simula o Google Apps Script + Planilha no computador (para testar o backend sem publicar).
// Simulação do Apps Script + Sheets (v2): propriedades, e-mail, HMAC, sessão
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const paraBuffer = (d) => (Array.isArray(d) ? Buffer.from(d.map((x) => x & 255)) : Buffer.from(String(d)));
const vm = require('vm');
function colIdx(l) { return l.charCodeAt(0) - 65; }
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  setNumberFormat(f) { for (let c = this.c - 1; c < this.c - 1 + this.nc; c++) this.sh.fmt[c] = f; return this; }
  setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; }
  // texto que a planilha mostra (data/hora convertida aparece como foi digitada)
  getDisplayValues() { return this.getValues().map((l) => l.map((x) => (x instanceof Date ? x._tela : String(x)))); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push((this.sh.rows[this.r - 1 + i] || [])[this.c - 1 + j] ?? ''); o.push(row); } return o; }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { const R = this.r - 1 + i; this.sh.rows[R] = this.sh.rows[R] || []; this.sh.rows[R][this.c - 1 + j] = this.sh.conv(x, this.c - 1 + j); })); return this; }
  setValue(x) { return this.setValues([[x]]); }
  getValue() { return this.getValues()[0][0]; }
  clearContent() { for (let i = 0; i < this.nr; i++) { const R = this.r - 1 + i; if (!this.sh.rows[R]) continue; for (let j = 0; j < this.nc; j++) this.sh.rows[R][this.c - 1 + j] = ''; } return this; }
}
class Sheet {
  constructor(name) { this.name = name; this.rows = []; this.fmt = {}; }
  // como o Google: texto de data/hora vira data (salvo em coluna de texto); appendRow do Google ignora o formato de texto
  conv(x, c, ignoraTexto) {
    if (this.fmt[c] === '@' && !ignoraTexto) return typeof x === 'number' ? String(x) : x;
    if (typeof x === 'string' && /^\d+(\.\d+)?$/.test(x)) return Number(x);
    const data = (d) => Object.assign(d, { _tela: x });
    if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(x)) return data(new Date(x.replace(' ', 'T') + (x.length > 10 ? 'Z' : 'T00:00:00Z')));
    if (typeof x === 'string' && /^\d{2}:\d{2}$/.test(x)) return data(new Date('1899-12-30T' + x + ':00Z'));
    return x;
  }
  getName() { return this.name; }
  appendRow(v) { this.rows.push(v.map((x, i) => this.conv(x, i, this.ss && this.ss.__appendIgnoraTexto))); }
  getLastRow() { let n = this.rows.length; while (n > 0 && (this.rows[n - 1] || []).every(x => x === '' || x == null)) n--; return n; }
  getLastColumn() { return Math.max(0, ...this.rows.map(r => r.length)); }
  getDataRange() { const n = Math.max(1, this.getLastRow()); return new Range(this, 1, 1, n, Math.max(1, ...this.rows.map(r => r.length))); }
  getRange(a, b, c, d) {
    if (typeof a === 'string') { const [x, y] = a.split(':'); return new Range(this, 1, colIdx(x) + 1, 99999, colIdx(y) - colIdx(x) + 1); }
    return new Range(this, a, b, c || 1, d || 1);
  }
  setFrozenRows() {} deleteRow(i) { this.rows.splice(i - 1, 1); }
}
function criar(arquivos) {
  // __fuso: o fuso que a planilha informa (as datas do simulador ficam em GMT: outro valor imita a planilha num fuso diferente)
  const ss = { __fuso: 'GMT', getSpreadsheetTimeZone() { return this.__fuso; }, sheets: {}, getSheetByName(n) { return this.sheets[n] || null; },
    insertSheet(n) { const sh = new Sheet(n); sh.ss = this; return (this.sheets[n] = sh); }, getSheets() { return Object.values(this.sheets); } };
  const cacheStore = {}; const props = {}; const emails = []; const chamadasIP = [];
  const UrlFetchApp = { fetch: (url, opt) => {
    const corpo = opt && opt.payload ? JSON.parse(opt.payload) : {};
    chamadasIP.push({ url, corpo, headers: opt && opt.headers });
    let r = {};
    // Turnstile: __turnstile = 'cair' (sem resposta), 'segredo-errado' ou normal (só 'humano-ok' passa)
    if (url.includes('turnstile')) {
      if (global.__turnstile === 'cair') throw new Error('Address unavailable');
      const t = global.__turnstile === 'segredo-errado' ? { success: false, 'error-codes': ['invalid-input-secret'] }
        : corpo.response === 'humano-ok' ? { success: true, hostname: 'www.acasambar.com.br' } : { success: false, 'error-codes': ['invalid-input-response'] };
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify(t) };
    }
    if (url.endsWith('/links')) r = { url: 'https://checkout.infinitepay.io/acasaambar?lenc=' + corpo.order_nsu };
    if (url.endsWith('/payment_check')) r = { success: true, paid: !String(corpo.transaction_nsu).startsWith('falso'), amount: global.__valor || 0, paid_amount: global.__pago || global.__valor || 0, installments: global.__parc || 1, capture_method: 'pix' };
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(r) };
  } };
  const ctx = {
    SpreadsheetApp: { openById: () => ss, flush() {} },
    CacheService: { getScriptCache: () => ({ get: k => cacheStore[k] || null, put: (k, v) => { cacheStore[k] = v; }, remove: k => { delete cacheStore[k]; },
      getAll: ks => Object.fromEntries(ks.filter(k => k in cacheStore).map(k => [k, cacheStore[k]])), putAll: (o) => { Object.assign(cacheStore, o); },
      removeAll: ks => { ks.forEach(k => { delete cacheStore[k]; }); } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : (k === 'PASTA_ANAMNESES_ID' ? 'pasta' : null)), setProperty: (k, v) => { props[k] = v; } }) },
    DriveApp: (() => { const arquivos = {}; let n = 0; const pasta = { getId: () => 'pastaX', searchFiles: () => ({ hasNext: () => false }),
      createFile: (b) => { const id = 'arquivo' + String(++n).padStart(8, '0'); arquivos[id] = b; return { getUrl: () => 'https://drive/pdf', getId: () => id }; } };
      return { arquivos, getFolderById: () => pasta, getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => pasta,
        getFileById: (id) => { if (!arquivos[id]) throw new Error('nao existe'); return { getBlob: () => arquivos[id], setTrashed: () => { delete arquivos[id]; },
          setContent: (t) => { arquivos[id] = { getDataAsString: () => String(t), getBytes: () => [...Buffer.from(String(t))], getContentType: () => 'text/plain' }; } }; } }; })(),
    MailApp: { sendEmail: o => emails.push(o), getRemainingDailyQuota: () => 1500 },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'contato@acasaambar.com.br' }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(), sleep() {},
      computeDigest: (_a, t) => [...crypto.createHash('sha256').update(String(t)).digest()].map(b => (b > 127 ? b - 256 : b)),
      computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', String(k)).update(String(v)).digest()].map(b => (b > 127 ? b - 256 : b)),
      base64Encode: b => Buffer.from(b.map(x => x & 255)).toString('base64'),
      formatDate: (d, _tz, f) => { const z = n => String(n).padStart(2, '0'); const loc = new Date(d.getTime() - (_tz === 'GMT' ? 0 : 3 * 3600e3));
        return f.replace('yyyy', loc.getUTCFullYear()).replace('yy', String(loc.getUTCFullYear()).slice(2)).replace('MM', z(loc.getUTCMonth() + 1)).replace('dd', z(loc.getUTCDate())).replace('HH', z(loc.getUTCHours())).replace('mm', z(loc.getUTCMinutes())).replace('ss', z(loc.getUTCSeconds())).replace('u', loc.getUTCDay() || 7); },
      newBlob: (dados, tipo) => ({ getAs: () => ({ setName() { return this; } }), getBytes: () => dados, getContentType: () => tipo, getDataAsString: () => (Array.isArray(dados) ? paraBuffer(dados).toString() : String(dados)) }),
      gzip: (b) => { const z = [...zlib.gzipSync(paraBuffer(b.getBytes()))].map(x => (x > 127 ? x - 256 : x)); return { getBytes: () => z }; },
      ungzip: (b) => { const t = zlib.gunzipSync(paraBuffer(b.getBytes())).toString(); return { getDataAsString: () => t }; },
      base64Decode: (t) => [...Buffer.from(t, 'base64')],
      DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 },
    },
    ContentService: { createTextOutput: t => ({ setMimeType() { return t; } }), MimeType: { JSON: 1 } },
    Logger: { log: m => (process.env.LOGS ? console.log('LOG', m) : null) },
    console, UrlFetchApp,
  };
  vm.createContext(ctx);
  for (const a of arquivos) vm.runInContext(fs.readFileSync(a, 'utf8'), ctx, { filename: a });
  // o contrato dos planos (Contrato.gs) já vem ligado; os testes antigos compram plano sem assinar: ligam à mão quando querem testá-lo
  if (ctx.CONTRATO_PRONTO !== undefined) ctx.CONTRATO_PRONTO = false;
  // mudança na planilha feita fora de um pedido (o teste mexendo direto, como alguém editando à mão):
  // o cache das abas é esquecido, como no botão "Ler a planilha de novo" dos Ajustes
  const digital = () => JSON.stringify(Object.values(ss.sheets).map((sh) => sh.rows));
  let ultima = null;
  const enviar = (acao, d) => {
    const agora = digital();
    if (ultima !== null && agora !== ultima && !ss.__semLimparCache) Object.keys(cacheStore).forEach((k) => { if (k.startsWith('v_')) delete cacheStore[k]; });
    const r = JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ acao, ...d }) } }));
    ultima = digital();
    return r;
  };
  // como a tela: se o servidor pergunta "é venda repetida mesmo?" (VENDA_DUPLICADA), confirma com os order_nsu vistos e um motivo.
  // Os testes da própria proteção ligam `ss.__semConfirmarSozinho` para ver a recusa de verdade.
  const chamar = (acao, d) => {
    let r = enviar(acao, d);
    for (let volta = 0; !ss.__semConfirmarSozinho && volta < 4 && !r.ok && r.codigo === 'VENDA_DUPLICADA' && r.dados && r.dados.repetidas; volta++) {
      d = { ...d, confirmarRepetida: [...(d.confirmarRepetida || []), ...r.dados.repetidas.map((x) => x.nsu)], motivoRepetida: 'teste' };
      r = enviar(acao, d);
    }
    return r;
  };
  return { ctx, chamar, ss, emails, props, chamadasIP, cacheStore };
}
module.exports = { criar };
