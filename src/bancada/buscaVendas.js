// Busca e filtros da tela Vendas (feitos na tela, sobre as vendas do período já carregadas).
// A caixa de busca entende várias palavras (todas precisam combinar):
//   texto            → cliente, item, observação, cupom/vale, forma, bandeira, origem, quem lançou, nº da comanda e código
//   números          → "150" ou "1.200,50" acham o valor cobrado (ou o preço, ou uma das formas); com 3+ dígitos também o CPF e o código
//   faixa e limites  → "100-200", ">300", "<80"
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "1.200,00" e "99.90" (mesma regra do numBR da bancada, repetida aqui para o arquivo não depender da tela)
const numero = (v) => {
  let t = String(v ?? '').trim();
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (!/^\d+\.\d{1,2}$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

const NUM = '(\\d+(?:[.,]\\d{1,3})*)';
const RE_FAIXA = new RegExp(`^(?:r\\$)?${NUM}-(?:r\\$)?${NUM}$`, 'i');
const RE_LIMITE = new RegExp(`^([<>])=?(?:r\\$)?${NUM}$`, 'i');
const RE_CPF = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/; // CPF colado como a ficha mostra (não pode virar faixa de valores)
const RE_NUMERO = /^(?:r\$)?\d+(?:[.,]\d+)*$/i;

const valoresDaVenda = (p) => {
  const v = [p.valor, p.valorOriginal, p.valorPago, p.valeUsado];
  (p.formas || []).forEach((f) => v.push(f.valor));
  return v.map(Number).filter((x) => Number.isFinite(x) && x > 0);
};
const igual = (a, b) => Math.abs(a - b) < 0.005;

// uma palavra da busca contra uma venda; `texto` é o conjunto de textos da venda (sem acento, minúsculo)
function combina(p, palavra, texto, digitos) {
  if (RE_CPF.test(palavra)) return digitos.includes(palavra.replace(/\D/g, ''));
  const faixa = RE_FAIXA.exec(palavra);
  if (faixa) {
    const a = numero(faixa[1]), b = numero(faixa[2]);
    const [min, max] = a <= b ? [a, b] : [b, a];
    return Number(p.valor) >= min - 0.005 && Number(p.valor) <= max + 0.005;
  }
  const limite = RE_LIMITE.exec(palavra);
  if (limite) {
    const n = numero(limite[2]);
    return limite[1] === '>' ? Number(p.valor) >= n - 0.005 : Number(p.valor) <= n + 0.005;
  }
  if (RE_NUMERO.test(palavra)) {
    const n = numero(palavra.replace(/^r\$/i, ''));
    if (n > 0 && valoresDaVenda(p).some((v) => igual(v, n))) return true;
    const so = palavra.replace(/\D/g, '');
    if (so.length >= 3 && digitos.includes(so)) return true;
  }
  return texto.includes(palavra);
}

export function textoDaVenda(p, obsLegivel = (t) => t) {
  return semAcento([
    p.nome, p.descricao, obsLegivel(p.observacao), p.cupom, p.vale, p.metodo, p.bandeira, p.origem, p.comanda, p.registradoPor, p.status === 'excluido' ? 'excluida' : p.status,
    p.orderNsu, ...(p.formas || []).map((f) => `${f.metodo} ${f.bandeira || ''}`),
  ].filter(Boolean).join(' '));
}

export function palavrasDaBusca(busca) {
  return semAcento(busca).split(/\s+/).map((x) => x.trim()).filter(Boolean);
}

export function formasDaVenda(p) {
  const f = (p.formas || []).map((x) => x.metodo).filter(Boolean);
  return f.length ? f : [p.metodo].filter(Boolean);
}

// filtros: { busca, forma ('' = todas), min, max (texto), quem ('' = todos) }
export function filtrarVendas(lista, filtros, obsLegivel) {
  const palavras = palavrasDaBusca(filtros.busca);
  const min = filtros.min === '' || filtros.min == null ? null : numero(filtros.min);
  const max = filtros.max === '' || filtros.max == null ? null : numero(filtros.max);
  if (!palavras.length && !filtros.forma && min == null && max == null && !filtros.quem) return lista;
  return lista.filter((p) => {
    if (filtros.forma && !formasDaVenda(p).includes(filtros.forma)) return false;
    if (filtros.quem && String(p.registradoPor || '') !== filtros.quem) return false;
    if (min != null && Number(p.valor) < min - 0.005) return false;
    if (max != null && Number(p.valor) > max + 0.005) return false;
    if (!palavras.length) return true;
    const texto = textoDaVenda(p, obsLegivel);
    const digitos = `${String(p.cpf || '').replace(/\D/g, '')} ${String(p.orderNsu || '').toLowerCase()}`;
    return palavras.every((w) => combina(p, w, texto, digitos));
  });
}

export const FILTROS_VAZIOS = { busca: '', forma: '', min: '', max: '', quem: '' };
export const temFiltro = (f) => !!(f.busca.trim() || f.forma || f.min !== '' || f.max !== '' || f.quem);
