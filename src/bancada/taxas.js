// Taxas da InfinitePay no navegador: a mesma conta de `taxaPctDaParte` (Gestao.gs). Mudou lá? Mude aqui.
// `taxas` é a tabela de Ajustes: { pix, debito: { vm, elo, amex }, credito: { vm: [12], elo: [12], amex: [12] }, link: [12] }
export const FORMAS_TAXA = [['debito', 'Débito'], ['credito', 'Crédito'], ['link', 'Link ou site'], ['pix', 'Pix']];

export function grupoDaBandeira(bandeira) {
  const b = String(bandeira || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  if (b.startsWith('elo')) return 'elo';
  if (b.startsWith('american') || b.startsWith('amex')) return 'amex';
  return 'vm';
}

function daColuna(col, parcelas) {
  const n = Math.max(1, Math.min(12, Number(parcelas) || 1));
  if (!col) return { pct: 0, falta: true };
  if (col[n - 1] != null) return { pct: Number(col[n - 1]), falta: false };
  for (let i = n - 2; i >= 0; i--) if (col[i] != null) return { pct: Number(col[i]), falta: n > 1 };
  return { pct: 0, falta: true };
}

// forma: 'pix' | 'debito' | 'credito' | 'link'
export function taxaPct(taxas, forma, bandeira, parcelas) {
  const t = taxas || {};
  const g = grupoDaBandeira(bandeira);
  if (forma === 'pix') return { pct: Number(t.pix) || 0, falta: false };
  if (forma === 'debito') {
    const d = t.debito && t.debito[g] != null ? t.debito[g] : t.debito ? t.debito.vm : null;
    return d == null ? { pct: 0, falta: true } : { pct: Number(d), falta: false };
  }
  if (forma === 'link') return daColuna(t.link, parcelas);
  if (forma === 'credito') return daColuna(t.credito && t.credito[g], parcelas);
  return { pct: 0, falta: false };
}

const centavos = (n) => Math.round(n * 100) / 100;

// "cobrei R$ X": quanto fica de taxa e quanto cai na conta
export function aPartirDoCobrado(cobrado, pct) {
  const taxa = centavos((cobrado * pct) / 100);
  return { cobrado: centavos(cobrado), taxa, liquido: centavos(cobrado - taxa) };
}

// "quero receber R$ Y": quanto cobrar para sobrar Y depois da taxa (arredonda para cima, para nunca faltar)
export function aPartirDoLiquido(liquido, pct) {
  const cobrado = pct >= 100 ? liquido : Math.ceil((liquido / (1 - pct / 100)) * 100 - 1e-9) / 100;
  return aPartirDoCobrado(cobrado, pct);
}

// dias úteis (segunda a sexta; feriados não entram na conta), igual a `somarDiasUteis` do servidor
export function somarDiasUteis(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  for (let i = 0; i < n; i++) {
    do d.setUTCDate(d.getUTCDate() + 1); while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  }
  return d.toISOString().slice(0, 10);
}

// quantos dias úteis até cair na conta: forma = 'pix' | 'debito' | 'credito' | 'link'
export const prazoDias = (taxas, forma) => Number(taxas?.prazos?.[forma]) || 0;
