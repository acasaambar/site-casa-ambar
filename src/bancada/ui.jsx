import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sol, Forma } from '../components/Marca.jsx';
import { useBancada } from './sessao.jsx';
import { mascaraCPF } from '../lib/util.js';
import { lembrar, temNaMemoria, estaFresco, aindaVale, guardarNaMemoria, buscar, acompanhar } from './memoria.js';

// ---------- bandeira do cartão (para conferir com o extrato da maquininha) ----------
export const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Hiper', 'Diners', 'Cabal', 'Outra'];
export const ehCartao = (m) => m === 'Cartão de crédito' || m === 'Cartão de débito';
export const faltaBandeira = (metodo, bandeira) => ehCartao(metodo) && !bandeira;
// no link da InfinitePay a bandeira é opcional (o link também aceita Pix)
export const pedeBandeira = (m) => ehCartao(m) || m === 'Link InfinitePay';

export function CampoBandeira({ metodo, valor, aoMudar, className = 'b-campo' }) {
  if (!pedeBandeira(metodo)) return null;
  const obrigatoria = ehCartao(metodo);
  return (
    <label className={className}>
      <span className="rotulo">{obrigatoria ? 'Bandeira do cartão' : 'Bandeira do cartão (se pagou no cartão)'}</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)} aria-invalid={obrigatoria && !valor} required={obrigatoria}>
        <option value="">{obrigatoria ? 'Escolha…' : 'Pix ou não sei'}</option>
        {BANDEIRAS.map((b) => <option key={b}>{b}</option>)}
      </select>
    </label>
  );
}

// Pagamento dividido em mais de uma forma: linhas { metodo, valor, parcelas, bandeira, codigo }.
// total (número): mostra "faltam / passou"; sem total, a última linha pode ficar sem valor e leva o que sobrar.
export const LINHA_PAGAMENTO = { metodo: 'Pix', valor: '', parcelas: 1, codigo: '', bandeira: '', parceiro: '' };
// Permuta (só na comanda): a Casa assume o pagamento em troca de divulgação; precisa dizer com quem
export const faltaParceiro = (l) => l.metodo === 'Permuta' && String(l.parceiro || '').trim().length < 3;
export function resumoLinhas(linhas, total) {
  const soma = linhas.reduce((s, l) => s + numBR(l.valor), 0);
  const falta = total == null ? 0 : Math.round((total - soma) * 100) / 100;
  const semBandeira = linhas.some((l) => faltaBandeira(l.metodo, l.bandeira));
  const semParceiro = linhas.some((l) => faltaParceiro(l));
  const vazias = linhas.filter((l) => String(l.valor).trim() === '').length;
  const ok = !semBandeira && !semParceiro && (total == null ? vazias <= 1 && linhas.length > 1 && linhas.every((l) => String(l.valor).trim() === '' || numBR(l.valor) > 0) : Math.abs(falta) <= 0.009);
  return { soma, falta, semBandeira, semParceiro, ok };
}
export function LinhasDePagamento({ linhas, aoMudar, total, formas = METODOS, minimo = 1 }) {
  const mudar = (i, mud) => {
    const novas = linhas.map((l, k) => (k === i ? { ...l, ...mud } : l));
    // duas formas e total conhecido: ao digitar uma, a outra leva o que sobra
    if (total != null && linhas.length === 2 && 'valor' in mud) {
      const sobra = Math.round((total - numBR(mud.valor)) * 100) / 100;
      novas[1 - i] = { ...novas[1 - i], valor: sobra > 0 ? String(sobra.toFixed(2)).replace('.', ',') : '' };
    }
    aoMudar(novas);
  };
  const { falta } = resumoLinhas(linhas, total);
  const outra = formas.find((f) => !linhas.some((l) => l.metodo === f)) || formas[0];
  return (
    <div className="cm-pagar__linhas">
      {linhas.map((l, i) => (
        <div key={i} className={`cm-pagar__linha${linhas.length > minimo ? ' cm-pagar__linha--tirar' : ''}${/Cartão de crédito|Link/.test(l.metodo) ? ' cm-pagar__linha--parcelas' : ''}${pedeBandeira(l.metodo) || l.metodo === 'Vale-presente' || l.metodo === 'Permuta' ? ' cm-pagar__linha--extra' : ''}`}>
          <select className="cm-pagar__metodo" value={l.metodo} onChange={(e) => mudar(i, { metodo: e.target.value })} aria-label={linhas.length > 1 ? `Forma ${i + 1}` : 'Forma'}>
            {formas.map((m) => <option key={m}>{m}</option>)}
          </select>
          <input className="cm-pagar__valor" inputMode="decimal" value={l.valor} placeholder={total == null && i === linhas.length - 1 ? 'o que sobrar' : ''} onChange={(e) => mudar(i, { valor: e.target.value.replace(/[^\d,.]/g, '') })} aria-label={linhas.length > 1 ? `Valor da forma ${i + 1}` : 'Valor'} />
          {/Cartão de crédito|Link/.test(l.metodo) && (
            <select className="cm-pagar__extra cm-pagar__parcelas" value={l.parcelas} onChange={(e) => mudar(i, { parcelas: Number(e.target.value) })} aria-label="Parcelas">
              {Array.from({ length: 12 }, (_, k) => <option key={k + 1} value={k + 1}>{k + 1}x</option>)}
            </select>
          )}
          {pedeBandeira(l.metodo) && (
            <select className="cm-pagar__extra cm-pagar__bandeira" value={l.bandeira} onChange={(e) => mudar(i, { bandeira: e.target.value })} aria-label="Bandeira do cartão" aria-invalid={faltaBandeira(l.metodo, l.bandeira)}>
              <option value="">{ehCartao(l.metodo) ? 'Bandeira…' : 'Bandeira'}</option>
              {BANDEIRAS.map((b) => <option key={b}>{b}</option>)}
            </select>
          )}
          {l.metodo === 'Permuta' && <input className="cm-pagar__extra" value={l.parceiro || ''} maxLength={80} onChange={(e) => mudar(i, { parceiro: e.target.value })} placeholder="Com quem? Ex.: @blogueira" aria-label="Permuta com quem" aria-invalid={faltaParceiro(l)} />}
          {l.metodo === 'Vale-presente' && <input className="cm-pagar__extra" value={l.codigo} onChange={(e) => mudar(i, { codigo: e.target.value.toUpperCase() })} placeholder="AMBAR-XXXX-XXXX" aria-label="Código do vale" />}
          {linhas.length > minimo && <button type="button" className="cm-item__tirar cm-pagar__tirar" aria-label={`Tirar forma ${i + 1}`} onClick={() => aoMudar(linhas.filter((_, k) => k !== i))}>×</button>}
        </div>
      ))}
      <div className="cm-pagar__resumo" aria-live="polite">
        {total == null ? (
          <span className="b-suave">Deixe o valor da última forma em branco para ela levar o que sobrar.</span>
        ) : Math.abs(falta) > 0.009 ? (
          <span className={falta > 0 ? 'b-alerta-txt' : 'b-suave'}>{falta > 0 ? `Faltam ${real(falta)}` : `Passou ${real(-falta)}`}</span>
        ) : <span className="b-suave">Valores conferem.</span>}
        {(total == null || falta > 0.009 || linhas.length === 1) && (
          <button type="button" className="link-acao" onClick={() => aoMudar([...linhas, { ...LINHA_PAGAMENTO, metodo: outra, valor: total == null || falta <= 0.009 ? '' : String(falta.toFixed(2)).replace('.', ',') }])}>
            {total == null ? '+ outra forma' : falta > 0.009 ? `+ dividir: outra forma com ${real(falta)}` : '+ dividir em mais de uma forma'}
          </button>
        )}
      </div>
    </div>
  );
}

// Forma de pagamento do balcão (agenda, aula avulsa). "Vale-presente" pede o código; se o vale não cobrir
// tudo, o resto vai na forma escolhida. itemId (serviço/plano) permite conferir o saldo antes de salvar.
// "Dividir em mais de uma forma": p.formas = linhas (a venda é uma só, com as partes).
export const PAGAMENTO_INICIAL = { metodo: 'Pix', bandeira: '', codigo: '', resto: 'Pix' };
export const faltaPagamento = (p) => (p.formas ? !resumoLinhas(p.formas).ok : p.metodo === 'Vale-presente' ? !p.codigo.trim() : faltaBandeira(p.metodo, p.bandeira));

// parcelas: mostra "Parcelas" no cartão de crédito / link (combo parcelado)
export function CamposPagamento({ metodos, p, aoMudar, rotulo = 'Recebido por', itemId, cpf, data, parcelas, semDividir }) {
  const { chamar } = useBancada();
  const [conferido, setConferido] = useState(null);
  const [erro, setErro] = useState('');
  const vale = p.metodo === 'Vale-presente';
  const formas = metodos.includes('Vale-presente') ? metodos : [...metodos, 'Vale-presente'];
  const formasResto = metodos.filter((m) => m !== 'Vale-presente' && m !== 'Cortesia');
  const mudar = (mud) => { aoMudar({ ...p, ...mud }); if ('codigo' in mud || 'metodo' in mud) { setConferido(null); setErro(''); } };
  async function conferir() {
    setErro('');
    try {
      const r = await chamar('simularPreco', { planoId: itemId, cpf, codigo: p.codigo, data });
      if (!r.vale) { setConferido(null); setErro('Este código é de um cupom, não de um vale-presente.'); return; }
      setConferido(r);
    } catch (e) { setConferido(null); setErro(e.message); }
  }
  const cobreTudo = conferido && conferido.valorFinal <= 0.009;
  if (p.formas) {
    return (
      <div className="b-pagar b-pagar--dividido">
        <span className="rotulo">{rotulo} · dividido em {p.formas.length} formas</span>
        <LinhasDePagamento linhas={p.formas} aoMudar={(l) => (l.length > 1 ? aoMudar({ ...p, formas: l }) : (() => { const { formas: _f, ...resto } = p; aoMudar({ ...resto, metodo: l[0].metodo, bandeira: l[0].bandeira }); })())}
          formas={formasResto.filter((m) => m !== 'Vale-presente')} minimo={2} />
        <button type="button" className="link-acao" onClick={() => { const { formas: _f, ...resto } = p; aoMudar({ ...resto, metodo: p.formas[0].metodo, bandeira: p.formas[0].bandeira }); }}>Voltar para uma forma só</button>
      </div>
    );
  }
  return (
    <div className="b-pagar">
      <label className="b-campo"><span className="rotulo">{rotulo}</span>
        <select value={p.metodo} onChange={(e) => mudar({ metodo: e.target.value })}>{formas.map((m) => <option key={m}>{m}</option>)}</select></label>
      {vale && (
        <label className="b-campo b-pagar__codigo">
          <span className="rotulo">Código do vale-presente</span>
          <span className="codigo__linha">
            <input value={p.codigo} onChange={(e) => mudar({ codigo: e.target.value.toUpperCase() })} placeholder="AMBAR-XXXX-XXXX" autoCapitalize="characters" spellCheck={false} />
            {itemId && <button type="button" className="botao botao--linha botao--p" disabled={!p.codigo.trim()} onClick={conferir}>Conferir</button>}
          </span>
        </label>
      )}
      {vale && conferido && (
        <p className="aviso">{cobreTudo ? `O vale cobre tudo (${real(conferido.valeUsado)}).` : `O vale cobre ${real(conferido.valeUsado)}. Faltam ${real(conferido.valorFinal)}.`}</p>
      )}
      <Erro>{erro}</Erro>
      {vale && !cobreTudo && (
        <label className="b-campo"><span className="rotulo">Se o vale não cobrir tudo, o resto em</span>
          <select value={p.resto} onChange={(e) => mudar({ resto: e.target.value })}>{formasResto.map((m) => <option key={m}>{m}</option>)}</select></label>
      )}
      {!(vale && cobreTudo) && <CampoBandeira metodo={vale ? p.resto : p.metodo} valor={p.bandeira} aoMudar={(b) => mudar({ bandeira: b })} />}
      {parcelas && !(vale && cobreTudo) && ['Cartão de crédito', 'Link InfinitePay'].includes(vale ? p.resto : p.metodo) && (
        <label className="b-campo"><span className="rotulo">Parcelas</span>
          <select value={p.parcelas || 1} onChange={(e) => mudar({ parcelas: Number(e.target.value) })}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
      )}
      {!vale && !semDividir && (
        <button type="button" className="link-acao" onClick={() => mudar({ formas: [{ ...LINHA_PAGAMENTO, metodo: p.metodo, bandeira: p.bandeira || '', parcelas: p.parcelas || 1 }, { ...LINHA_PAGAMENTO, metodo: p.metodo === 'Pix' ? 'Dinheiro' : 'Pix' }] })}>
          Dividir em mais de uma forma
        </button>
      )}
    </div>
  );
}

// ---------- formatos ----------
export const real = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const realCurto = (v) => {
  const n = Number(v || 0);
  // sinal de menos colado no valor (o hífen deixava o "−" sozinho numa linha)
  if (n < 0) return '−\u2060' + realCurto(-n);
  if (Math.abs(n) >= 10000) return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return Number.isInteger(n) ? 'R$ ' + n.toLocaleString('pt-BR') : real(n);
};
// valor de cartão de número (KPI): sempre com centavos, igual em todas as telas; só abrevia a partir de 100 mil
export const kpiReal = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 100000) return realCurto(n);
  return n < 0 ? '−\u2060' + real(-n) : real(n);
};
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export function dataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : iso;
}
export function dataCurta(iso) {
  if (!iso) return '';
  const [, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return d ? `${d} ${MESES[m - 1]}` : iso;
}
export function hora(h) {
  if (!h) return '';
  const [hh, mm] = String(h).split(':');
  return mm === '00' ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
}
// "hoje" no fuso da casa (Fortaleza), igual ao servidor, mesmo com o aparelho em outro fuso
export function hojeIso() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}

// busca de novo ao voltar para a aba e a cada poucos minutos (reservas do site e outro aparelho aparecem sem F5)
export function useAtualizarSozinho(recarregar, minutos = 3) {
  const ref = useRef(recarregar);
  useEffect(() => { ref.current = recarregar; });
  useEffect(() => {
    const visivel = () => { if (document.visibilityState === 'visible') ref.current?.(); };
    document.addEventListener('visibilitychange', visivel);
    const t = setInterval(() => { if (document.visibilityState === 'visible') ref.current?.(); }, minutos * 60000);
    return () => { document.removeEventListener('visibilitychange', visivel); clearInterval(t); };
  }, [minutos]);
}
export function somarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const x = new Date(a, m - 1, d + n);
  const p = (k) => String(k).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
export const diaSemana = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d).getDay(); };
// segunda-feira da semana do dia (a agenda busca a semana inteira de uma vez)
export const segundaDe = (iso) => somarDias(iso, -((diaSemana(iso) + 6) % 7));
// cliente sem CPF tem um código interno de 15 dígitos (começa com 9)
export const semCpf = (c) => String(c || '').replace(/\D/g, '').length > 11;
export const cpfFmt = (c) => (semCpf(c) ? 'sem CPF' : mascaraCPF(c || ''));
export const METODOS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesTexto = (m) => { const [a, n] = String(m).split('-'); return `${MESES_LONGOS[Number(n) - 1]} ${a}`; };
export const somarMes = (m, n) => { const [a, x] = String(m).split('-').map(Number); const d = new Date(a, x - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
// valor digitado no balcão: "1.200,00", "1200,5" e "99.90" (ponto com 1–2 casas no fim é decimal)
export const numBR = (v) => {
  let t = String(v ?? '').trim();
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (!/^\d+\.\d{1,2}$/.test(t)) t = t.replace(/\./g, '');
  return Number(t) || 0;
};
export function telFmt(t) {
  const d = String(t || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || '';
}
export function linkWhats(numero, texto = '') {
  const d = String(numero || '').replace(/\D/g, '');
  if (!d) return '';
  return `https://wa.me/${d.length <= 11 ? '55' + d : d}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}
export const primeiro = (n) => String(n || '').trim().split(' ')[0];
// "1 aula", "3 aulas" (sem o "aula(s)")
export const plural = (n, um, varios) => `${n} ${Number(n) === 1 ? um : varios}`;
// mesmo nome da profissional (como o servidor compara: sem acento, sem diferença de maiúsculas)
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
export const ehDela = (nome, membro) => !!membro && !!semAcento(nome) && semAcento(nome) === semAcento(membro.professorNome || membro.nome);

// CSV que o Excel abre direto (separador ; e acentos certos)
export function baixarCSV(nome, colunas, linhas) {
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    // impede que o Excel execute fórmulas vindas de dados (=, +, -, @)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const corpo = [colunas.map((c) => esc(c[1])).join(';')]
    .concat(linhas.map((l) => colunas.map((c) => esc(typeof c[0] === 'function' ? c[0](l) : l[c[0]])).join(';')))
    .join('\r\n');
  const blob = new Blob(['﻿' + corpo], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome.endsWith('.csv') ? nome : nome + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------- dados ----------
// const { dados, erro, carregando, recarregar } = useDados('agenda', { de, dias })
// Carrega os dados de uma tela. Se a tela já foi aberta antes, mostra na hora o que
// estava na memória e atualiza por trás. "atual" diz se os dados são destes parâmetros.
// formato (opcional): confere o que chegou (ex.: Array.isArray). Dado de outro formato é descartado e buscado de novo
// (uma vez), em vez de quebrar a tela.
export function useDados(acao, params, ativo = true, formato) {
  const { chamar, token } = useBancada();
  const chave = JSON.stringify(params || {});
  const id = `${token}|${acao}|${chave}`;
  const [estado, setEstado] = useState(() => ({ dados: lembrar(id) ?? null, erro: '', carregando: true, id: temNaMemoria(id) ? id : '' }));
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    if (!ativo) return undefined;
    let vivo = true;
    // acabou de chegar do servidor (outra tela pediu há pouco): usa o que tem, sem nova ida ao Google
    if (versao === 0 && aindaVale(id)) { setEstado({ dados: lembrar(id), erro: '', carregando: false, id }); return undefined; }
    setEstado((e) => (temNaMemoria(id) ? { dados: lembrar(id), erro: '', carregando: true, id } : { ...e, carregando: true, erro: '' }));
    buscar(id, () => chamar(acao, JSON.parse(chave)), versao > 0)
      .then((d) => { if (vivo) setEstado({ dados: d, erro: '', carregando: false, id }); })
      .catch((e) => { if (vivo) setEstado((x) => ({ ...x, erro: e.message, carregando: false })); });
    return () => { vivo = false; };
  }, [id, versao, chamar, ativo]); // eslint-disable-line react-hooks/exhaustive-deps
  const { id: idDados, ...resto } = estado;
  const estranho = resto.dados != null && formato && !formato(resto.dados);
  const refeitos = useRef(0);
  useEffect(() => {
    if (!estranho || resto.carregando || refeitos.current >= 1) return;
    refeitos.current += 1;
    setVersao((v) => v + 1);
  }, [estranho, resto.carregando]);
  return {
    ...resto,
    dados: estranho ? null : resto.dados,
    atual: idDados === id,
    recarregar: () => setVersao((v) => v + 1),
    setDados: (d) => setEstado((e) => {
      const novo = typeof d === 'function' ? d(e.dados) : d;
      guardarNaMemoria(id, novo);
      return { ...e, dados: novo, id };
    }),
  };
}

// A profissional atende serviços (está em Catálogo → Profissionais)? true / false / null (ainda carregando).
// Para a equipe do balcão é sempre true. Usa a mesma busca da agenda de hoje (já vem pré-carregada).
export function useFazServicos() {
  const { membro } = useBancada();
  const prof = membro?.papel === 'professora';
  const { dados } = useDados('agendaSemana', { de: segundaDe(hojeIso()) }, prof);
  if (!prof) return true;
  if (!dados) return null;
  return (dados.equipe || []).some((e) => ehDela(e.nome, membro)) || (dados.atendimentos || []).length > 0;
}

// faixa que rola para o lado: avisa quando ainda há itens escondidos à direita (para o esmaecido da borda)
export function useMaisADireita() {
  const ref = useRef(null);
  const [mais, setMais] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = () => setMais(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    Array.from(el.children).forEach((c) => ro?.observe(c));
    return () => { el.removeEventListener('scroll', medir); ro?.disconnect(); };
  });
  return [ref, mais];
}

// busca por trás, antes de a tela ser aberta (mesma chave do useDados)
// guarda na memória das telas um resultado que já veio do servidor (a tela abre na hora, sem buscar de novo)
export function lembrarResultado(token, acao, params, valor) {
  guardarNaMemoria(`${token}|${acao}|${JSON.stringify(params || {})}`, valor);
}

export function preCarregar(chamar, token, acao, params = {}) {
  const id = `${token}|${acao}|${JSON.stringify(params)}`;
  // o que voltou do navegador depois do F5 aparece na hora, mas é buscado de novo por trás
  if (!estaFresco(id)) buscar(id, () => chamar(acao, params), false, true).catch(() => {});
}

// Menu "Mais" (ações que não cabem na barra). itens: [{ texto, acao, className? }]; fecha ao escolher, ao tocar fora ou com Esc.
// Teclado: Enter/↓ abre no primeiro item, ↑ ↓ Home End navegam, Esc fecha e devolve o foco ao botão, Tab fecha.
// itens do menu que aparecem de fato (alguns só existem em tela estreita: ficam ocultos nas outras e não recebem foco)
const itensDoMenu = (raiz) => Array.from(raiz?.querySelectorAll('[role="menuitem"]') || []).filter((el) => el.getClientRects().length > 0);
export function MenuMais({ itens, rotulo = 'Mais', className = '' }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  const botao = useRef(null);
  const id = useId();
  const lista = useRef(null);
  const pelaTecla = useRef(false); // abriu pelo teclado: o foco vai para o primeiro item
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false); };
    // captura + stopImmediatePropagation: o Esc fecha só o menu (a folha por baixo continua aberta)
    const tecla = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); setAberto(false); botao.current?.focus(); } };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', tecla, true);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', tecla, true); };
  }, [aberto]);
  useEffect(() => {
    if (aberto && pelaTecla.current) itensDoMenu(caixa.current)[0]?.focus();
    pelaTecla.current = false;
  }, [aberto]);
  // a lista sempre cabe na tela: se passaria da borda direita ancora pela direita do botão, se passaria da esquerda, pela esquerda
  useLayoutEffect(() => {
    const l = lista.current;
    if (!aberto || !l) return;
    const folga = 8;
    const largura = document.documentElement.clientWidth;
    ['left', 'right', 'transform'].forEach((k) => { l.style[k] = ''; });
    let r = l.getBoundingClientRect();
    if (r.right > largura - folga) { l.style.left = 'auto'; l.style.right = '0'; r = l.getBoundingClientRect(); }
    if (r.left < folga) { l.style.right = 'auto'; l.style.left = '0'; r = l.getBoundingClientRect(); }
    if (r.right > largura - folga) l.style.transform = `translateX(${largura - folga - r.right}px)`;
    else if (r.left < folga) l.style.transform = `translateX(${folga - r.left}px)`;
  }, [aberto]);
  const visiveis = itens.filter(Boolean);
  if (!visiveis.length) return null;
  const aoTeclarNoBotao = (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (aberto) itensDoMenu(caixa.current)[0]?.focus(); else { pelaTecla.current = true; setAberto(true); } } };
  const aoTeclarNaLista = (e) => {
    const todos = itensDoMenu(e.currentTarget);
    const i = todos.indexOf(document.activeElement);
    const vai = { ArrowDown: (i + 1) % todos.length, ArrowUp: (i - 1 + todos.length) % todos.length, Home: 0, End: todos.length - 1 }[e.key];
    if (vai != null) { e.preventDefault(); todos[vai]?.focus(); }
    else if (e.key === 'Tab') setAberto(false);
  };
  return (
    <div className={`b-menumais ${className}`} ref={caixa}>
      <button type="button" ref={botao} className="botao botao--linha botao--p b-menumais__botao" aria-haspopup="menu" aria-expanded={aberto} aria-controls={aberto ? id : undefined} aria-label={`${rotulo} opções`}
        onClick={(e) => { if (!aberto && e.detail === 0) pelaTecla.current = true; setAberto((x) => !x); }} onKeyDown={aoTeclarNoBotao}>
        <span className="b-menumais__texto">{rotulo}</span><span aria-hidden="true" className="b-menumais__pontos">•••</span><span aria-hidden="true" className="b-menumais__seta">▾</span>
      </button>
      {aberto && (
        <div className="b-menumais__lista" ref={lista} role="menu" id={id} aria-label={rotulo} onKeyDown={aoTeclarNaLista}>
          {visiveis.map((it) => (
            <button key={it.texto} type="button" role="menuitem" className={`b-menumais__item ${it.className || ''}`} onClick={() => { setAberto(false); botao.current?.focus(); it.acao(); }}>
              {it.texto}{it.extra ? <span className="b-menumais__extra">{it.extra}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// aviso discreto enquanto alguma tela busca dados novos
export function Atualizando() {
  const [n, setN] = useState(0);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => acompanhar(setN), []);
  useEffect(() => {
    if (!n) { setVisivel(false); return undefined; }
    const t = setTimeout(() => setVisivel(true), 400);
    return () => clearTimeout(t);
  }, [n]);
  if (!visivel) return null;
  return (
    <div className="b-atualizando" role="status">
      <Sol tamanho={14} className="girando" />
      <span>Atualizando…</span>
    </div>
  );
}

// ---------- peças visuais ----------
export function Carregando({ texto = 'Carregando' }) {
  return (
    <div className="b-carregando" role="status">
      <Sol tamanho={30} className="girando cor-caramelo" />
      <span>{texto}…</span>
    </div>
  );
}

export function Vazio({ titulo, children, forma = 'sutileza', acao }) {
  return (
    <div className="b-vazio">
      <Forma nome={forma} tamanho={46} cor="var(--caramelo)" />
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
      {acao && <div className="b-vazio__acao">{acao}</div>}
    </div>
  );
}

// título da página: subtítulo de UMA linha; o que for mais longo vai em `ajuda` (botão "?")
export function Cabecalho({ rotulo, titulo, children, acoes, ajuda }) {
  return (
    <header className="b-cabecalho" data-secao={rotulo || undefined}>
      <div>
        <h1 className="b-titulo">{titulo}</h1>
        {(children || ajuda) && (
          <p className="b-cabecalho__sub">
            {children}
            {ajuda && <Ajuda titulo={typeof titulo === 'string' ? titulo : undefined}>{ajuda}</Ajuda>}
          </p>
        )}
      </div>
      {acoes && <div className="b-cabecalho__acoes">{acoes}</div>}
    </header>
  );
}

// botão "?" que abre um cartãozinho com a explicação: no lugar de parágrafos longos soltos na tela
export function Ajuda({ titulo, children, alinhar = 'esquerda' }) {
  const ref = useRef(null);
  const botao = useRef(null);
  const id = useId();
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    if (!aberta) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberta(false); };
    // o Esc fecha só o "?" (captura + stopImmediatePropagation): a folha por baixo continua aberta; o foco volta ao botão
    const esc = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); setAberta(false); botao.current?.focus(); } };
    // Tab para fora do cartãozinho fecha (quem usa teclado não fica com ele aberto pela tela)
    const saiu = (e) => { if (ref.current && e.relatedTarget && !ref.current.contains(e.relatedTarget)) setAberta(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('touchstart', fora);
    document.addEventListener('keydown', esc, true);
    const el = ref.current;
    el?.addEventListener('focusout', saiu);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('touchstart', fora); document.removeEventListener('keydown', esc, true); el?.removeEventListener('focusout', saiu); };
  }, [aberta]);
  return (
    <span className="b-ajuda" ref={ref}>
      <button type="button" ref={botao} className="b-ajuda__botao" aria-label={titulo ? `Como funciona: ${titulo}` : 'Como funciona'} aria-expanded={aberta} aria-controls={aberta ? id : undefined} onClick={() => setAberta((a) => !a)}>?</button>
      {aberta && (
        <span className={`b-ajuda__texto b-ajuda__texto--${alinhar}`} id={id} role="note">
          {titulo && <strong>{titulo}</strong>}
          {children}
        </span>
      )}
    </span>
  );
}

// aviso curto em cartão (no lugar de frase solta): tom = info | ok | aviso | alerta
// alerta é anunciado na hora (role=alert), ok vira status; o tom também vai por escrito para o leitor de tela (não só pela cor)
const ROTULO_DO_TOM = { alerta: 'Alerta: ', aviso: 'Atenção: ', ok: '', info: '' };
export function Aviso({ tom = 'info', titulo, children, acao }) {
  return (
    <div className={`b-aviso b-aviso--${tom}`} role={tom === 'alerta' ? 'alert' : tom === 'ok' ? 'status' : 'note'}>
      <span className="b-aviso__icone" aria-hidden="true">{tom === 'ok' ? '✓' : tom === 'info' ? 'i' : '!'}</span>
      <div className="b-aviso__texto">
        {ROTULO_DO_TOM[tom] && <span className="b-so-leitor">{ROTULO_DO_TOM[tom]}</span>}
        {titulo && <strong>{titulo}</strong>}
        {children && <span>{children}</span>}
      </div>
      {acao && <div className="b-aviso__acao">{acao}</div>}
    </div>
  );
}

// bloco com título, ações e ajuda: a base de toda seção da bancada
// aceita ref, id, data-* etc. (vão para o <section>): a tela pode rolar até ela sem envolver num div
export function Secao({ titulo, ajuda, acoes, children, className = '', ...resto }) {
  return (
    <section {...resto} className={`b-secao ${className}`.trim()}>
      <header className="b-secao__topo">
        <h2 className="b-secao__titulo">{titulo}{ajuda && <Ajuda titulo={typeof titulo === 'string' ? titulo : undefined}>{ajuda}</Ajuda>}</h2>
        {acoes && <div className="b-secao__acoes">{acoes}</div>}
      </header>
      {children}
    </section>
  );
}

// carregando com "esqueleto": blocos cinza no lugar do círculo girando
export function Esqueleto({ linhas = 4, altura = 18 }) {
  return (
    <div className="b-esqueleto" role="status" aria-label="Carregando" aria-busy="true">
      {Array.from({ length: linhas }, (_, i) => <span key={i} style={{ height: altura, width: `${100 - ((i * 13) % 38)}%` }} />)}
    </div>
  );
}

export function Erro({ children }) {
  if (!children) return null;
  return <p className="erro erro--destaque" role="alert">{children}</p>;
}

// alertas da cliente (alergia, gestante, cuidado combinado): sempre à vista na agenda, nas aulas e na comanda
export function Alertas({ lista, compacto }) {
  if (!lista?.length) return null;
  return (
    <div className={`b-alertas${compacto ? ' b-alertas--compacto' : ''}`} role="note">
      <span className="b-alertas__icone" aria-hidden="true">!</span>
      <span className="b-alertas__rotulo">Atenção</span>
      <ul>{lista.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

export function Tag({ tom = 'neutro', children, title }) {
  return <span className={`b-tag b-tag--${tom}`} title={title}>{children}</span>;
}

// ---------- foco, rolagem e teclado das camadas (folha, busca, menu do celular) ----------
// Elementos que o Tab alcança dentro de uma camada
const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
export function focaveisEm(raiz) {
  if (!raiz) return [];
  return Array.from(raiz.querySelectorAll(FOCAVEIS)).filter((e) => !e.closest('[inert], [hidden]') && e.getClientRects().length > 0);
}
// Tab/Shift+Tab não saem da camada: do último volta ao primeiro (e ao contrário)
export function prenderTab(e, raiz) {
  if (e.key !== 'Tab' || !raiz) return;
  const lista = focaveisEm(raiz);
  if (!lista.length) { e.preventDefault(); raiz.focus?.(); return; }
  const primeiro = lista[0];
  const ultimo = lista[lista.length - 1];
  const ativo = document.activeElement;
  if (e.shiftKey && (ativo === primeiro || ativo === raiz || !raiz.contains(ativo))) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && (ativo === ultimo || !raiz.contains(ativo))) { e.preventDefault(); primeiro.focus(); }
}
// quem trava a rolagem do fundo (folha, busca) conta aqui: só destrava quando o último sair
let travasDeRolagem = 0;
export function travarRolagem() { travasDeRolagem += 1; document.body.classList.add('b-sem-rolagem'); }
export function soltarRolagem() { travasDeRolagem = Math.max(0, travasDeRolagem - 1); if (!travasDeRolagem) document.body.classList.remove('b-sem-rolagem'); }
const OUTRA_CAMADA = '.b-modal, .bg, [role="dialog"]';
// camada aberta: lembra quem tinha o foco (e devolve ao fechar), puxa o foco de volta se escapar e trava a rolagem
export function useCamada(raiz, { ativo = true, foco, ehTopo = () => true } = {}) {
  useEffect(() => {
    if (!ativo) return undefined;
    const origem = document.activeElement;
    travarRolagem();
    const caixa = raiz.current;
    const alvo = (typeof foco === 'function' ? foco(caixa) : null) || caixa;
    alvo?.focus?.({ preventScroll: true });
    const voltou = (e) => {
      if (!ehTopo() || !caixa || caixa.contains(e.target) || e.target.closest?.(OUTRA_CAMADA)) return;
      (focaveisEm(caixa)[0] || caixa).focus({ preventScroll: true });
    };
    document.addEventListener('focusin', voltou);
    return () => {
      document.removeEventListener('focusin', voltou);
      soltarRolagem();
      if (origem && origem !== document.body && origem.isConnected) origem.focus?.({ preventScroll: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// folhas abertas uma sobre a outra (ex.: editar um item dentro da comanda): o Esc fecha só a de cima
const folhasAbertas = [];
const PRIMEIRO_CAMPO = '.b-modal__corpo input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([disabled]), .b-modal__corpo select:not([disabled]), .b-modal__corpo textarea:not([disabled])';

// Folha lateral (no celular, de baixo para cima). role=dialog na caixa: foco inicial no primeiro campo (ou na própria folha),
// Tab preso dentro, Esc fecha só a de cima e o foco volta para o botão que abriu.
export function Modal({ titulo, rotulo, aoFechar, children, largo }) {
  const ref = useRef(null);
  const idTitulo = useId();
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;
  const eu = useRef({});
  useEffect(() => {
    const marca = eu.current;
    folhasAbertas.push(marca);
    const esc = (e) => e.key === 'Escape' && folhasAbertas[folhasAbertas.length - 1] === marca && fechar.current?.();
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('keydown', esc); folhasAbertas.splice(folhasAbertas.indexOf(marca), 1); };
  }, []);
  // no celular/iPad não foca o primeiro campo (o teclado subia sozinho ao abrir o detalhe do atendimento)
  useCamada(ref, { foco: (c) => (window.matchMedia?.('(pointer: coarse)').matches ? null : c?.querySelector(PRIMEIRO_CAMPO)), ehTopo: () => folhasAbertas[folhasAbertas.length - 1] === eu.current });
  return (
    <div className="b-modal" onMouseDown={(e) => e.target === e.currentTarget && aoFechar?.()}>
      <div className={`b-modal__caixa${largo ? ' b-modal__caixa--largo' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1} onKeyDown={(e) => prenderTab(e, ref.current)}>
        <header className="b-modal__topo">
          <div>
            <h2 className="b-modal__titulo" id={idTitulo}>{titulo}</h2>
            {rotulo && <p className="b-modal__contexto">{rotulo}</p>}
          </div>
          {aoFechar && <button type="button" className="b-fechar" aria-label="Fechar" onClick={aoFechar}><span aria-hidden="true">×</span></button>}
        </header>
        <div className="b-modal__corpo">{children}</div>
      </div>
    </div>
  );
}

export function Kpi({ rotulo, valor, detalhe, tom }) {
  return (
    <div className={`b-kpi${tom ? ' b-kpi--' + tom : ''}`}>
      <span className="b-kpi__rotulo">{rotulo}</span>
      <strong className="b-kpi__valor">{valor}</strong>
      {(tom === 'alerta' || tom === 'aviso') && <span className="b-so-leitor">{tom === 'alerta' ? 'Alerta' : 'Atenção'}</span>}
      {detalhe && <span className="b-kpi__detalhe">{detalhe}</span>}
    </div>
  );
}

// navegação de mês: ‹ outubro 2026 ›
export function SeletorMes({ mes, aoMudar, className = '' }) {
  return (
    <div className={`b-mes ${className}`.trim()} role="group" aria-label="Mês">
      <button type="button" onClick={() => aoMudar(somarMes(mes, -1))} aria-label="Mês anterior">‹</button>
      <strong aria-live="polite">{mesTexto(mes)}</strong>
      <button type="button" onClick={() => aoMudar(somarMes(mes, 1))} aria-label="Próximo mês">›</button>
    </div>
  );
}

// setas, Home e End trocam de aba (o Tab entra na aba atual e sai da lista): padrão de abas do teclado
function teclasDeAbas(e, ids, atual, aoMudar) {
  const teclas = { ArrowRight: 1, ArrowLeft: -1, Home: 'ini', End: 'fim' };
  if (!(e.key in teclas) || e.altKey || e.ctrlKey || e.metaKey) return;
  const i = Math.max(0, ids.indexOf(atual));
  const j = teclas[e.key] === 'ini' ? 0 : teclas[e.key] === 'fim' ? ids.length - 1 : (i + teclas[e.key] + ids.length) % ids.length;
  e.preventDefault();
  aoMudar(ids[j]);
  e.currentTarget.querySelectorAll('[role="tab"]')[j]?.focus();
}
const abaAtiva = (itens, atual) => (itens.some(([id]) => id === atual) ? atual : itens[0]?.[0]);

export function Segmento({ itens, atual, aoMudar, rotulo }) {
  const ativa = abaAtiva(itens, atual);
  return (
    <div className="b-segmento" role="tablist" aria-label={rotulo} onKeyDown={(e) => teclasDeAbas(e, itens.map(([id]) => id), atual, aoMudar)}>
      {itens.map(([id, t]) => <button key={id} type="button" role="tab" aria-selected={atual === id} tabIndex={ativa === id ? 0 : -1} onClick={() => aoMudar(id)}>{t}</button>)}
    </div>
  );
}

export function Abas({ itens, atual, aoMudar, rotulo }) {
  const [ref, mais] = useMaisADireita();
  const ativa = abaAtiva(itens, atual);
  // a aba escolhida fica à vista na faixa que rola para o lado (sem mexer na rolagem da página)
  useEffect(() => {
    const faixa = ref.current;
    const aba = faixa?.querySelector('[aria-selected="true"]');
    if (!faixa || !aba) return;
    if (aba.offsetLeft < faixa.scrollLeft) faixa.scrollLeft = aba.offsetLeft - 12;
    else if (aba.offsetLeft + aba.offsetWidth > faixa.scrollLeft + faixa.clientWidth) faixa.scrollLeft = aba.offsetLeft + aba.offsetWidth - faixa.clientWidth + 12;
  }, [atual]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`b-abas${mais ? ' b-rola--mais' : ''}`} role="tablist" aria-label={rotulo} ref={ref} onKeyDown={(e) => teclasDeAbas(e, itens.map(([id]) => id), atual, aoMudar)}>
      {itens.map(([id, texto]) => (
        <button key={id} type="button" role="tab" aria-selected={atual === id} tabIndex={ativa === id ? 0 : -1} onClick={() => aoMudar(id)}>{texto}</button>
      ))}
    </div>
  );
}

// Busca de aluno (nome, CPF, WhatsApp ou e-mail)
// ---------- busca de clientes na hora ----------
// A lista inteira de clientes já vem pré-carregada ao entrar na bancada: a busca filtra ali mesmo (na hora)
// e pergunta ao servidor por trás (acha também quem foi cadastrado agora há pouco em outro computador).
const semAcentoBusca = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function filtrarClientes(lista, busca, max = 8) {
  const t = semAcentoBusca(busca.trim());
  if (t.length < 2) return [];
  const dig = t.replace(/\D/g, '');
  return (lista || []).filter((a) => semAcentoBusca(a.nome).includes(t) || (dig.length >= 3 && (String(a.cpf || '').includes(dig) || String(a.whatsapp || '').replace(/\D/g, '').includes(dig)))
    || semAcentoBusca(a.email).includes(t)).slice(0, max);
}
const chaveListaClientes = (token) => `${token}|alunos|{}`;
// cliente recém-cadastrado entra na lista guardada (a busca já acha, sem esperar a lista nova)
export function incluirNaListaDeClientes(token, c) {
  const l = lembrar(chaveListaClientes(token));
  if (Array.isArray(l) && c?.cpf) guardarNaMemoria(chaveListaClientes(token), [...l.filter((x) => x.cpf !== c.cpf), c].sort((a, b) => a.nome.localeCompare(b.nome)));
}
export function useBuscaClientes(q, max = 8, ativo = true) {
  const { chamar, token } = useBancada();
  const [doServidor, setDoServidor] = useState(null); // { q, lista }
  const [buscando, setBuscando] = useState(false);
  const termo = q.trim();
  useEffect(() => {
    if (!ativo || termo.length < 2) { setDoServidor(null); return undefined; }
    let vivo = true;
    const t = setTimeout(() => {
      setBuscando(true);
      chamar('alunos', { busca: termo }).then((r) => vivo && setDoServidor({ q: termo, lista: r })).catch(() => {}).finally(() => vivo && setBuscando(false));
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [termo, chamar, ativo]);
  useEffect(() => { if (ativo) preCarregar(chamar, token, 'alunos', {}); }, [ativo]); // eslint-disable-line react-hooks/exhaustive-deps
  if (termo.length < 2) return { lista: [], buscando: false };
  const locais = filtrarClientes(lembrar(chaveListaClientes(token)), termo, max);
  // o que o servidor achou (mais novo) vem primeiro; os da lista local completam
  const servidor = doServidor && doServidor.q === termo ? doServidor.lista : [];
  const vistos = new Set();
  const lista = [...servidor, ...locais].filter((a) => !vistos.has(a.cpf) && vistos.add(a.cpf)).slice(0, max);
  // até o servidor responder a esta busca, "nada encontrado" não aparece (aparece "buscando…")
  const esperando = buscando || !(doServidor && doServidor.q === termo);
  return { lista, buscando: esperando && lista.length === 0 };
}

export function BuscaAluno({ aoEscolher, autoFocus, placeholder = 'Buscar por nome, CPF ou WhatsApp', excluir = [], motivoExcluir = 'já está nesta aula' }) {
  const [q, setQ] = useState('');
  const { lista: achados, buscando } = useBuscaClientes(q);
  const [escolheu, setEscolheu] = useState(false);
  const lista = escolheu ? [] : achados;
  return (
    <div className="b-busca">
      <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setEscolheu(false); }} placeholder={placeholder} autoFocus={autoFocus} aria-label="Buscar cadastro" />
      {buscando && <span className="b-busca__status" role="status">buscando…</span>}
      {lista.length > 0 && (
        <ul className="b-busca__lista">
          {lista.map((a) => (
            <li key={a.cpf}>
              <button type="button" disabled={excluir.includes(a.cpf)} onClick={() => { aoEscolher(a); setQ(''); setEscolheu(true); }}>
                <strong>{a.nome}</strong>
                <span>{excluir.includes(a.cpf) ? motivoExcluir : `${cpfFmt(a.cpf)} · ${a.plano || 'sem plano ativo'}`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !buscando && !escolheu && lista.length === 0 && <p className="b-busca__nada" role="status">Ninguém encontrado com essa busca.</p>}
    </div>
  );
}

// botão que executa uma ação assíncrona e mostra "…" enquanto espera
// erro que a própria ação não tratou aparece logo depois do botão (antes sumia em silêncio)
export function BotaoAcao({ acao, children, className = 'botao botao--linha botao--p', confirmar, ...resto }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  return (
    <>
      {/* disabled depois do {...resto}: enquanto espera o servidor, não dá para tocar de novo (cobrança em dobro) */}
      <button type="button" className={className} aria-busy={ocupado || undefined} {...resto} disabled={ocupado || resto.disabled}
        onClick={async () => {
          if (confirmar && !window.confirm(confirmar)) return;
          setOcupado(true);
          setErro('');
          try { await acao(); } catch (e) { setErro(e?.message || 'Não deu certo. Tente de novo.'); } finally { setOcupado(false); }
        }}>
        {ocupado ? <><span aria-hidden="true">…</span><span className="b-so-leitor">Aguarde</span></> : children}
      </button>
      {erro && <span className="erro b-erro-botao" role="alert">{erro}</span>}
    </>
  );
}

// pedido de outra tela para abrir um formulário (state.novo/nova) vale uma vez só: voltar no navegador não reabre
export function useEsquecerPedidoDaRota(...chaves) {
  const local = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    if (!local.state || !chaves.some((k) => local.state[k])) return;
    const st = { ...local.state };
    chaves.forEach((k) => { delete st[k]; });
    nav(local.pathname + local.search, { replace: true, state: st });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export const STATUS_RESERVA = {
  reservado: ['Reservado', 'neutro'],
  'check-in': ['Presente', 'ok'],
  falta: ['Faltou', 'alerta'],
  pendente: ['Aguardando pagamento', 'aviso'],
  cancelado: ['Cancelado', 'apagado'],
};
