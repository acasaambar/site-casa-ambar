// Publica apps-script/ no Google Apps Script pela API oficial e atualiza a mesma implantação (a URL /exec não muda).
// Usado pelo workflow "Publicar Apps Script" quando existem os segredos GAS_CLIENT_ID, GAS_CLIENT_SECRET e
// GAS_REFRESH_TOKEN (cliente OAuth da própria Casa, só com os escopos script.projects e script.deployments).
// Sem o escopo cloud-platform do clasp, o token não cai na regra de sessão de 16 h do Google Workspace.
// Também precisa de SCRIPT_ID e DEPLOYMENT_ID (os mesmos de sempre). Node 22, sem dependências.
import { readdir, readFile } from 'node:fs/promises';

const pegar = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`::error::Falta o segredo ${k} (Settings → Secrets and variables → Actions)`); process.exit(1); }
  return v;
};
const [clientId, clientSecret, refreshToken, scriptId, deploymentId] =
  ['GAS_CLIENT_ID', 'GAS_CLIENT_SECRET', 'GAS_REFRESH_TOKEN', 'SCRIPT_ID', 'DEPLOYMENT_ID'].map(pegar);
const descricao = (process.env.DESCRICAO || 'Automático').slice(0, 200);

// 1) token de acesso a partir do refresh token
const tk = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
}).then((r) => r.json()).catch(() => ({}));
if (!tk.access_token) {
  console.error(`::error::O Google recusou a credencial de publicação (${tk.error || 'sem resposta'}). Refaça o passo do OAuth Playground e atualize GAS_REFRESH_TOKEN.`);
  process.exit(1);
}

const api = async (caminho, method, body) => {
  const r = await fetch('https://script.googleapis.com/v1/' + caminho, {
    method,
    headers: { authorization: 'Bearer ' + tk.access_token, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${caminho.replace(scriptId, '<script>').replace(deploymentId, '<implantação>')} → HTTP ${r.status}: ${String(j.error?.message || '').slice(0, 300)}`);
  return j;
};

// 2) arquivos: *.gs viram SERVER_JS, *.html viram HTML e appsscript.json é o manifesto (mesma ordem do clasp)
const pasta = 'apps-script';
const files = [];
for (const f of (await readdir(pasta)).sort()) {
  if (f.endsWith('.gs')) files.push({ name: f.slice(0, -3), type: 'SERVER_JS', source: await readFile(`${pasta}/${f}`, 'utf8') });
  else if (f.endsWith('.html')) files.push({ name: f.slice(0, -5), type: 'HTML', source: await readFile(`${pasta}/${f}`, 'utf8') });
  else if (f === 'appsscript.json') files.push({ name: 'appsscript', type: 'JSON', source: await readFile(`${pasta}/${f}`, 'utf8') });
}
if (!files.some((f) => f.name === 'appsscript')) { console.error('::error::apps-script/appsscript.json não encontrado'); process.exit(1); }

try {
  await api(`projects/${scriptId}/content`, 'PUT', { files });
  console.log(`Código enviado: ${files.length} arquivos.`);
  // 3) versão nova + a mesma implantação apontando para ela
  const v = await api(`projects/${scriptId}/versions`, 'POST', { description: descricao });
  await api(`projects/${scriptId}/deployments/${deploymentId}`, 'PUT', {
    deploymentConfig: { scriptId, versionNumber: v.versionNumber, manifestFileName: 'appsscript', description: descricao },
  });
  console.log(`Implantação atualizada para a versão ${v.versionNumber}.`);
} catch (e) {
  console.error('::error::' + e.message);
  process.exit(1);
}
