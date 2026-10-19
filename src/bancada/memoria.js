// Memória das telas da bancada.
// Ao voltar para uma tela, ela aparece na hora com o que já foi carregado e se atualiza por trás.
// Pedidos iguais feitos ao mesmo tempo (ex.: o catálogo, usado por várias telas) viram um só.
// Fica só na memória do navegador: some ao sair, ao recarregar ou ao fechar a página.

const dados = new Map();
const emAndamento = new Map();
const ouvintes = new Set();
let ativos = 0;

const avisar = () => ouvintes.forEach((f) => f(ativos));

export const lembrar = (chave) => dados.get(chave);
export const temNaMemoria = (chave) => dados.has(chave);
export const guardarNaMemoria = (chave, valor) => dados.set(chave, valor);

export function esquecerTudo() {
  dados.clear();
  emAndamento.clear();
}

// busca e guarda; "novo" ignora um pedido igual já em andamento (usado depois de salvar algo);
// "silencioso" não acende o aviso (pré-carregamento)
export function buscar(chave, pedir, novo = false, silencioso = false) {
  if (!novo && emAndamento.has(chave)) return emAndamento.get(chave);
  const conta = silencioso ? 0 : 1;
  ativos += conta;
  avisar();
  const p = pedir()
    .then((d) => { dados.set(chave, d); return d; })
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
