// Memória das telas da bancada.
// Ao voltar para uma tela, ela aparece na hora com o que já foi carregado e se atualiza por trás.
// Pedidos iguais feitos ao mesmo tempo (ex.: o catálogo, usado por várias telas) viram um só.
//
// Também sobrevive ao F5 (a bancada abre já preenchida e se atualiza por trás):
//  - catálogo e planos (nada pessoal) ficam guardados neste computador (localStorage), por pessoa;
//  - agenda, clientes, comandas e a tela Hoje (dados pessoais, LGPD) ficam só até fechar a aba
//    (sessionStorage) e são apagados ao sair ou trocar de login.

const dados = new Map();
const emAndamento = new Map();
const frescos = new Set(); // vieram do servidor nesta página (o resto veio do que estava guardado)
const ouvintes = new Set();
let ativos = 0;

const avisar = () => ouvintes.forEach((f) => f(ativos));

// ---------- o que fica guardado no navegador ----------
const FIXOS = { catalogoServicos: 1, planos: 1 }; // sem dados pessoais: ficam no computador
const DA_ABA = { agendaSemana: 1, alunos: 1, comandas: 1, resumo: 1, espera: 1, minhasClientes: 1 }; // até fechar a aba
const MAX_GUARDAR = 2_500_000; // caracteres: maior que isso fica só na memória (o navegador guarda ~5 MB)
const PREFIXO_ABA = 'ambar_mem|';
const PREFIXO_FIXO = 'ambar_fixo|';
let dono = { token: '', email: '' };

// chave = `${token}|${acao}|${params}`
const partes = (chave) => {
  const i = chave.indexOf('|');
  const j = chave.indexOf('|', i + 1);
  return { token: chave.slice(0, i), acao: chave.slice(i + 1, j), params: chave.slice(j + 1) };
};

function guardarNoNavegador(chave, valor) {
  const { acao, params } = partes(chave);
  const onde = FIXOS[acao] ? localStorage : DA_ABA[acao] ? sessionStorage : null;
  if (!onde || !dono.token) return;
  try {
    const texto = JSON.stringify(valor);
    const k = FIXOS[acao] ? `${PREFIXO_FIXO}${dono.email}|${acao}|${params}` : PREFIXO_ABA + chave;
    if (texto.length > MAX_GUARDAR) { onde.removeItem(k); return; }
    onde.setItem(k, texto);
  } catch { /* sem espaço ou sem armazenamento: fica só na memória */ }
}

// quem está usando a bancada: ao mudar, traz de volta o que estava guardado para essa pessoa
export function usarDono(token, email) {
  token = token || '';
  email = String(email || '').toLowerCase();
  if (token === dono.token && email === dono.email) return;
  dono = { token, email };
  if (!token) return;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(PREFIXO_ABA + token + '|') && !dados.has(k.slice(PREFIXO_ABA.length))) dados.set(k.slice(PREFIXO_ABA.length), JSON.parse(sessionStorage.getItem(k)));
    }
  } catch { /* ignora */ }
  try {
    const p = `${PREFIXO_FIXO}${email}|`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(p)) continue;
      const chave = `${token}|${k.slice(p.length)}`;
      if (!dados.has(chave)) dados.set(chave, JSON.parse(localStorage.getItem(k)));
    }
  } catch { /* ignora */ }
}

export const lembrar = (chave) => dados.get(chave);
export const temNaMemoria = (chave) => dados.has(chave);
// veio do servidor nesta página (o que voltou do navegador depois do F5 ainda precisa ser conferido)
export const estaFresco = (chave) => frescos.has(chave);
export const guardarNaMemoria = (chave, valor) => {
  dados.set(chave, valor);
  guardarNoNavegador(chave, valor);
};

// sair ou trocar de login: esquece tudo e apaga do navegador os dados pessoais (o catálogo fica)
export function esquecerTudo() {
  dados.clear();
  emAndamento.clear();
  frescos.clear();
  dono = { token: '', email: '' };
  try {
    const apagar = [];
    for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); if (k && k.startsWith(PREFIXO_ABA)) apagar.push(k); }
    apagar.forEach((k) => sessionStorage.removeItem(k));
  } catch { /* sem armazenamento */ }
}

// busca e guarda; "novo" ignora um pedido igual já em andamento (usado depois de salvar algo);
// "silencioso" não acende o aviso (pré-carregamento)
export function buscar(chave, pedir, novo = false, silencioso = false) {
  if (!novo && emAndamento.has(chave)) return emAndamento.get(chave);
  const conta = silencioso ? 0 : 1;
  ativos += conta;
  avisar();
  const p = pedir()
    .then((d) => { guardarNaMemoria(chave, d); frescos.add(chave); return d; })
    .finally(() => {
      if (emAndamento.get(chave) === p) emAndamento.delete(chave);
      ativos -= conta;
      avisar();
    });
  emAndamento.set(chave, p);
  return p;
}

// quantos pedidos estão a caminho (para o aviso "Atualizando…")
export function acompanhar(f) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
