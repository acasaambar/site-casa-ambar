import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, preCarregar, Alertas, MenuMais, segundaDe, useMaisADireita, CamposPagamento, PAGAMENTO_INICIAL, faltaPagamento, Carregando, Erro, Modal, BuscaAluno, BotaoAcao, Vazio, Tag, real, hora, hojeIso, linkWhats, primeiro, telFmt, dataBR, DIAS_LONGOS,
  MESES, diaSemana, plural, ehDela, somarDias } from './ui.jsx';
import { mascaraTelefone, soDigitos } from '../lib/util.js';
import { IconeWhatsapp } from '../components/Marca.jsx';
import { ComandaModal } from './Comandas.jsx';
import { ProntuarioModal } from './Prontuario.jsx';
import { HorarioSemanal, DiasEspeciais, horariosIniciais, resumoHorario } from './Horarios.jsx';
import { Aviso, Esqueleto, Ajuda } from './ui.jsx';
import { Avatar, BlocoForm, Interruptor, Barra } from './CatalogoPecas.jsx';
import { TrocaProfissional, PedirSubstituicao } from './Trocas.jsx';
import { lembrar } from './memoria.js';
import { horariosLivres, segundosAgoraFortaleza } from './horariosLivres.js';

// Cor de cada área de cuidado (tons da marca)
export const COR_CATEGORIA = {
  'Estética facial': 'facial',
  'Estética corporal': 'corporal',
  'Estética capilar': 'capilar',
  Fisioterapia: 'fisio',
};
const STATUS = {
  agendado: ['Agendado', 'neutro'],
  confirmado: ['Confirmado', 'ok'],
  atendido: ['Atendido', 'ok'],
  falta: ['Faltou', 'alerta'],
  cancelado: ['Cancelado', 'apagado'],
};
const PAGAMENTO = { no_dia: 'paga no dia', pacote: 'pacote', pago: 'pago', cortesia: 'cortesia' };
const METODOS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay'];

// pediu para remarcar pelo link do lembrete e ainda não foi remarcado
const pedeRemarcar = (a) => a.resposta === 'remarcar' && (a.status === 'agendado' || a.status === 'confirmado');
const min = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); };
const fimDe = (a) => { const t = min(a.hora) + a.duracao; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

// ============================================================
//  AGENDA DO DIA (como no Avec): todo mundo lado a lado, horários nas linhas
//  Colunas: profissionais de estética e fisioterapia (com o horário de cada uma)
//  e professoras de Pilates e Yoga (com as aulas do dia).
// ============================================================
const SLOT = 30, ALT = 46; // 30 min por linha, 46 px por linha
const GRUPOS = [['estetica', 'Estética'], ['fisio', 'Fisioterapia'], ['pilates', 'Pilates'], ['yoga', 'Yoga']];
const grupoDe = (categorias = []) => (categorias.some((c) => c.startsWith('Estética')) ? 'estetica' : categorias.includes('Fisioterapia') ? 'fisio' : 'estetica');
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const lerLocal = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
const iniciais = (n) => n.replace(/^(dra?\.?|prof\.?)\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

import { Passo, ClienteEscolhido } from './AgendaPecas.jsx';
import { Ajuda as AjudaAg, Aviso as AvisoAg, Esqueleto as EsqueletoAg } from './ui.jsx';
import './css/agenda.css';

// dados: { atendimentos, folgas, equipe } do dia (vêm da semana carregada pela Agenda; null enquanto carrega).
// slot: lugar na barra da Agenda onde ficam os botões (agendar, bloquear, lista de espera…).
// aplicar(atendimento): mostra na hora o que foi salvo e atualiza a semana por trás.
export function AgendaServicos({ dia, dados, erro, recarregar, aplicar, slot, aoNaoVem, aulas = [], aoAbrirAula, abrirNovo, abrirEspera }) {
  const { membro, chamar } = useBancada();
  const [erroAberto, setErroAberto] = useState('');
  const balcao = pode(membro, 'admin', 'recepcao');
  const [gruposRef, maisGrupos] = useMaisADireita();
  const { dados: catalogo } = useDados('catalogoServicos', {});
  const quadro = useRef(null);
  const rolouEm = useRef('');
  const [novo, setNovo] = useState(abrirNovo ? { data: dia } : null);
  const [aberto, setAberto] = useState(null);
  const [bloquear, setBloquear] = useState(null);
  const [folga, setFolga] = useState(null);
  const [comanda, setComanda] = useState(null);
  const [prontuario, setProntuario] = useState(null);
  const [trocar, setTrocar] = useState(null);
  const [pedir, setPedir] = useState(null);
  const [ocultos, setOcultos] = useState(() => lerLocal('ambar_agenda_ocultos', []));
  const [visiveis, setVisiveis] = useState(() => lerLocal('ambar_agenda_colunas', typeof window !== 'undefined' && window.innerWidth < 600 ? 2 : window.innerWidth < 1100 ? 3 : 5));
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setAgora(new Date()), 60000); return () => clearInterval(t); }, []);
  const [arrasto, setArrasto] = useState(null); // { a, nome, min, valido } enquanto arrasta um atendimento
  const [mover, setMover] = useState(null); // { a, profissional, hora } para confirmar
  const [imprimindo, setImprimindo] = useState(false);
  const [espera, setEspera] = useState(!!abrirEspera);
  const { dados: esperaDados, recarregar: recarregarEspera } = useDados('espera', { tipo: 'servico' }, balcao, Array.isArray);
  // só uma lista conta (um dado de outro formato não pode derrubar a agenda)
  const listaEspera = Array.isArray(esperaDados) ? esperaDados : [];
  const esperaDoDia = listaEspera.filter((x) => !x.data || x.data === dia).length;
  const gesto = useRef(null);
  const arrastou = useRef(false);
  const fns = useRef({});

  const lista = useMemo(() => dados?.atendimentos || [], [dados]);
  const folgas = dados?.folgas || [];

  // colunas: quem atende serviços + professoras com aula no dia
  const colunas = useMemo(() => {
    const cols = [];
    (dados?.equipe || []).forEach((e) => cols.push({ nome: e.nome, tipo: 'servico', grupo: grupoDe(e.categorias), detalhe: e.categorias.join(', ') || 'Serviços', turnos: e.turnos.map(([a, b]) => [min(a), min(b)]) }));
    lista.forEach((a) => { if (!cols.some((c) => c.nome === a.profissional)) cols.push({ nome: a.profissional, tipo: 'servico', grupo: grupoDe([a.categoria]), detalhe: a.categoria, turnos: null }); });
    const prof = {};
    aulas.forEach((a) => { (prof[a.professor] = prof[a.professor] || new Set()).add(a.modalidade); });
    Object.entries(prof).forEach(([nome, mods]) => {
      const m = [...mods];
      const ja = cols.find((c) => c.nome === nome);
      if (ja) { ja.aulas = true; ja.detalhe = `${ja.detalhe} · aulas de ${m.join(' e ')}`; return; } // atende serviços e dá aula: tudo na mesma coluna
      cols.push({ nome, tipo: 'aula', grupo: m.includes('Pilates') ? 'pilates' : 'yoga', detalhe: m.join(' e '), turnos: null, aulas: true });
    });
    const ordem = GRUPOS.map(([g]) => g);
    // a profissional vê só a própria coluna (as colegas apareceriam vazias, como se estivessem livres)
    return cols.filter((c) => balcao || ehDela(c.nome, membro))
      .sort((a, b) => ordem.indexOf(a.grupo) - ordem.indexOf(b.grupo) || a.nome.localeCompare(b.nome));
  }, [dados, lista, aulas, balcao, membro]);
  const mostradas = balcao ? colunas.filter((c) => !ocultos.includes(c.grupo)) : colunas;

  // faixa de horas: das 6h às 20h, ou mais se alguém começa antes / termina depois
  const [INI, FIM] = useMemo(() => {
    let a = 6 * 60, b = 20 * 60;
    colunas.forEach((c) => (c.turnos || []).forEach(([x, y]) => { a = Math.min(a, x); b = Math.max(b, y); }));
    lista.forEach((x) => { a = Math.min(a, min(x.hora)); b = Math.max(b, min(x.hora) + x.duracao); });
    aulas.forEach((x) => { a = Math.min(a, min(x.hora)); b = Math.max(b, min(x.hora) + (x.duracao || 60)); });
    return [Math.floor(a / 60) * 60, Math.ceil(b / 60) * 60];
  }, [colunas, lista, aulas]);
  const PX = ALT / SLOT;
  const altura = (FIM - INI) * PX;
  const y = (m) => (m - INI) * PX;
  const minutoAgora = agora.getHours() * 60 + agora.getMinutes();
  const ehHoje = dia === hojeIso();

  // ---------- arrastar para remarcar (mouse: arrasta; toque: segura um instante e arrasta) ----------
  const podeMover = (a) => balcao && (a.status === 'agendado' || a.status === 'confirmado');
  // '' = pode; senão, o motivo (aparece no bloco tracejado)
  const motivoNao = (a, nome, ini) => {
    const fim = ini + a.duracao;
    const col = colunas.find((c) => c.nome === nome);
    if (!col || col.tipo !== 'servico') return 'Só nas colunas de serviço';
    const p = catalogo?.profissionais.find((x) => x.nome === nome);
    const serv = catalogo?.servicos.find((x) => x.id === a.servicoId);
    if (p && serv && !fazServico(p, serv)) return `${primeiro(nome)} não faz este serviço`;
    if (col.turnos && !col.turnos.some(([x, z]) => ini >= x && fim <= z)) return 'Fora do horário';
    if (lista.some((o) => o.id !== a.id && o.profissional === nome && o.status !== 'falta' && min(o.hora) < fim && ini < min(o.hora) + o.duracao)) return 'Horário ocupado';
    if (folgas.some((f) => f.profissional === nome && (f.diaTodo || (min(f.inicio) < fim && ini < min(f.fim))))) return 'Horário bloqueado';
    if (aulas.some((x) => x.professor === nome && min(x.hora) < fim && ini < min(x.hora) + (x.duracao || 60))) return 'Horário de aula';
    return '';
  };
  fns.current.atualizar = (x, yTela) => {
    const g = gesto.current;
    const el = document.elementFromPoint(x, yTela)?.closest?.('.ag-col');
    if (!el || el.dataset.tipo !== 'servico') { setArrasto({ a: g.a, nome: '', min: 0, valido: false, motivo: '' }); return; }
    const r = el.getBoundingClientRect();
    const m = Math.round((INI + (yTela - r.top) / PX - g.pega) / 15) * 15;
    const ini = Math.max(INI, Math.min(m, FIM - g.a.duracao));
    const motivo = motivoNao(g.a, el.dataset.nome, ini);
    setArrasto({ a: g.a, nome: el.dataset.nome, min: ini, valido: !motivo, motivo });
  };
  fns.current.ativar = (x, yTela) => {
    const g = gesto.current;
    if (!g) return;
    g.ativo = true;
    try { navigator.vibrate?.(12); } catch { /* sem vibração */ }
    fns.current.atualizar(x, yTela);
  };
  fns.current.borda = (x, yTela) => {
    const el = quadro.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (yTela < r.top + 70) el.scrollTop -= 14; else if (yTela > r.bottom - 40) el.scrollTop += 14;
    if (x < r.left + 90) el.scrollLeft -= 14; else if (x > r.right - 40) el.scrollLeft += 14;
  };
  fns.current.soltar = () => {
    setArrasto((t) => {
      if (t && t.valido && t.nome && (t.nome !== t.a.profissional || t.min !== min(t.a.hora))) setMover({ a: t.a, profissional: t.nome, hora: hhmm(t.min) });
      return null;
    });
  };
  function comecarArrasto(e, a) {
    if (!podeMover(a) || e.button > 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    gesto.current = { a, id: e.pointerId, tipo: e.pointerType, x0: e.clientX, y0: e.clientY, pega: (e.clientY - r.top) / PX, ativo: false, timer: null };
    if (e.pointerType !== 'mouse') {
      const { clientX, clientY } = e;
      gesto.current.timer = setTimeout(() => fns.current.ativar(clientX, clientY), 380);
    }
  }
  useEffect(() => {
    const mexe = (e) => {
      const g = gesto.current;
      if (!g || e.pointerId !== g.id) return;
      if (!g.ativo) {
        const dist = Math.hypot(e.clientX - g.x0, e.clientY - g.y0);
        if (g.tipo === 'mouse' && dist > 6) fns.current.ativar(e.clientX, e.clientY);
        else if (g.tipo !== 'mouse' && dist > 10) { clearTimeout(g.timer); gesto.current = null; }
        return;
      }
      fns.current.borda(e.clientX, e.clientY);
      fns.current.atualizar(e.clientX, e.clientY);
    };
    const solta = (e) => {
      const g = gesto.current;
      if (!g || e.pointerId !== g.id) return;
      clearTimeout(g.timer);
      gesto.current = null;
      if (!g.ativo) return;
      arrastou.current = true;
      setTimeout(() => { arrastou.current = false; }, 400);
      fns.current.soltar();
    };
    const cancela = (e) => {
      const g = gesto.current;
      if (!g || e.pointerId !== g.id) return;
      clearTimeout(g.timer);
      gesto.current = null;
      setArrasto(null);
    };
    // segurando no iPad/celular, a agenda não rola junto
    const toque = (e) => { if (gesto.current?.ativo) e.preventDefault(); };
    const tecla = (e) => { if (e.key === 'Escape' && gesto.current?.ativo) { gesto.current = null; setArrasto(null); } };
    window.addEventListener('pointermove', mexe);
    window.addEventListener('pointerup', solta);
    window.addEventListener('pointercancel', cancela);
    document.addEventListener('touchmove', toque, { passive: false });
    document.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('pointermove', mexe);
      window.removeEventListener('pointerup', solta);
      window.removeEventListener('pointercancel', cancela);
      document.removeEventListener('touchmove', toque);
      document.removeEventListener('keydown', tecla);
    };
  }, []);

  // ---------- imprimir a agenda do dia ----------
  useEffect(() => {
    if (!imprimindo) return undefined;
    const fim = () => setImprimindo(false);
    window.addEventListener('afterprint', fim);
    const t = setTimeout(() => window.print(), 80);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', fim); };
  }, [imprimindo]);

  // ao abrir um dia, a agenda já rola até onde interessa (uma vez por dia escolhido):
  // hoje, perto de agora; outro dia, o primeiro atendimento ou o começo do expediente de quem atende serviços
  useEffect(() => {
    const el = quadro.current;
    if (!el || !dados || rolouEm.current === dia) return;
    rolouEm.current = dia;
    let alvo = INI;
    if (ehHoje) alvo = minutoAgora - 60;
    else {
      const inicios = lista.filter((a) => a.status !== 'cancelado').map((a) => min(a.hora))
        .concat(colunas.filter((c) => c.tipo === 'servico').flatMap((c) => (c.turnos || []).map(([a]) => a)));
      if (inicios.length) alvo = Math.min(...inicios) - 30;
    }
    el.scrollTop = alvo > INI + 30 ? Math.max(0, (alvo - INI) * PX) : 0;
  }, [dados, dia]); // eslint-disable-line react-hooks/exhaustive-deps

  const alternarGrupo = (g) => {
    const n = ocultos.includes(g) ? ocultos.filter((x) => x !== g) : [...ocultos, g];
    setOcultos(n); gravarLocal('ambar_agenda_ocultos', n);
  };
  const mudarVisiveis = (n) => { setVisiveis(n); gravarLocal('ambar_agenda_colunas', n); };
  const contagem = (g) => colunas.filter((c) => c.grupo === g).length;

  // partes fora do horário de quem atende serviços
  const fora = (c) => {
    if (!c.turnos) return [];
    const livres = [...c.turnos].sort((a, b) => a[0] - b[0]);
    const r = [];
    let p = INI;
    livres.forEach(([a, b]) => { if (a > p) r.push([p, Math.min(a, FIM)]); p = Math.max(p, b); });
    if (p < FIM) r.push([p, FIM]);
    return r;
  };

  // botões da agenda do dia, na barra da Agenda (ao lado das abas)
  const nEspera = listaEspera.length;
  const badge = nEspera ? <span className="ag-espera__n" title={`${esperaDoDia} para este dia ou qualquer dia`}>{nEspera}</span> : null;
  const acoes = balcao && slot && createPortal(
    <>
      <button type="button" className="botao botao--linha botao--p ag-so-largo" onClick={() => setEspera(true)}>Lista de espera{badge}</button>
      <button type="button" className="botao botao--linha botao--p ag-so-largo" onClick={() => setBloquear({ data: dia })}>Bloquear horário</button>
      <MenuMais itens={[
        { texto: 'Lista de espera', extra: nEspera || null, acao: () => setEspera(true), className: 'ag-so-estreito' },
        { texto: 'Bloquear horário', acao: () => setBloquear({ data: dia }), className: 'ag-so-estreito' },
        colunas.length > 0 && { texto: 'Imprimir a agenda do dia', acao: () => setImprimindo(true) },
        aoNaoVem && { texto: 'Alguém não vem', acao: aoNaoVem },
      ]} />
      <button type="button" className="botao botao--cheio botao--p ag-novo" onClick={() => setNovo({ data: dia })}><span aria-hidden="true">+</span> Agendar serviço</button>
    </>, slot);

  if (!dados) {
    return (<>
      {acoes}
      {erro ? <Erro>{erro}</Erro> : <EsqueletoAg linhas={8} altura={46} />}
    </>);
  }
  return (
    <>
      {acoes}
      <Erro>{erro}</Erro>
      {balcao && (
        <div className="ag-barra">
          <div className={`ag-grupos${maisGrupos ? ' b-rola--mais' : ''}`} role="group" aria-label="Mostrar na agenda" ref={gruposRef}>
            {GRUPOS.filter(([g]) => contagem(g)).map(([g, t]) => (
              <button key={g} type="button" className={`ag-grupo ag-grupo--${g}`} aria-pressed={!ocultos.includes(g)} onClick={() => alternarGrupo(g)}>
                <i aria-hidden="true" />{t}<small>{contagem(g)}</small>
              </button>
            ))}
          </div>
          <div className="ag-barra__fim">
            <div className="ag-colunas" role="group" aria-label="Colunas na tela">
              <span>Colunas</span>
              {[2, 3, 5, 8].map((n) => <button key={n} type="button" aria-pressed={visiveis === n} onClick={() => mudarVisiveis(n)}>{n}</button>)}
            </div>
            <AjudaAg titulo="Como usar a agenda" alinhar="direita">
              <span><strong>Agendar:</strong> toque num horário vazio da coluna.</span>
              <span><strong>Remarcar:</strong> arraste o atendimento até o novo horário. No celular e no iPad, toque, segure e arraste.</span>
              <span><strong>Listrado:</strong> fora do horário de atendimento.</span>
            </AjudaAg>
          </div>
        </div>
      )}

      {colunas.length === 0 && (balcao ? (
        <Vazio titulo="Ninguém atende neste dia" forma="presenca" acao={pode(membro, 'admin') ? <Link className="botao botao--linha botao--p" to="/bancada/grade">Abrir o catálogo</Link> : null}>
          {pode(membro, 'admin') ? 'Cadastre a equipe e as aulas no Catálogo.' : 'Peça à administração para cadastrar a equipe.'}
        </Vazio>
      ) : (
        <Vazio titulo="Nada na sua agenda neste dia" forma="presenca">Escolha outro dia acima.</Vazio>
      ))}

      {mostradas.length > 0 && (
        <div className={`ag${arrasto ? ' ag--arrastando' : ''}`} ref={quadro} style={{ '--visiveis': balcao ? Math.min(visiveis, mostradas.length) : mostradas.length }}>
          <div className="ag-grade" style={{ '--n': mostradas.length, '--alt': `${ALT}px` }}>
            <div className="ag-canto" aria-hidden="true" />
            {mostradas.map((c) => {
              const nAtend = lista.filter((a) => a.profissional === c.nome && a.status !== 'cancelado').length;
              const nAulas = aulas.filter((a) => a.professor === c.nome).length;
              const total = nAtend + nAulas;
              return (
                <div key={c.nome} className={`ag-cab ag-cab--${c.grupo}`} title={`${c.nome} · ${c.detalhe}`}>
                  <span className="ag-cab__av">
                    <span className="ag-cab__foto" aria-hidden="true">{iniciais(c.nome)}</span>
                    {total > 0 && <span className="ag-cab__n" title={[nAtend ? plural(nAtend, 'atendimento', 'atendimentos') : '', nAulas ? plural(nAulas, 'aula', 'aulas') : ''].filter(Boolean).join(' · ')}>{total}</span>}
                  </span>
                  <span className="ag-cab__nome"><strong>{c.nome}</strong><small>{c.detalhe}</small></span>
                </div>
              );
            })}

            <div className="ag-horas" style={{ height: altura }} aria-hidden="true">
              {Array.from({ length: (FIM - INI) / SLOT }, (_, i) => {
                const m = INI + i * SLOT;
                return <span key={m} className={m % 60 ? 'meia' : ''} style={{ top: i * ALT }}>{hhmm(m)}</span>;
              })}
            </div>

            {mostradas.map((c) => (
              <div key={c.nome} className={`ag-col${c.tipo === 'aula' ? ' ag-col--aula' : ''}`} style={{ height: altura }} aria-label={`Agenda de ${c.nome}`} data-nome={c.nome} data-tipo={c.tipo}>
                {fora(c).map(([a, b]) => <div key={a} className="ag-fora" style={{ top: y(a), height: (b - a) * PX }} title="Fora do horário de atendimento" />)}
                {c.tipo === 'servico' && balcao && Array.from({ length: (FIM - INI) / SLOT }, (_, i) => {
                  const m = INI + i * SLOT;
                  const livre = !c.turnos || c.turnos.some(([a, b]) => m >= a && m < b);
                  return livre && (
                    <button key={m} type="button" className="ag-vago" style={{ top: i * ALT, height: ALT }} aria-label={`Agendar com ${c.nome} às ${hora(hhmm(m))}`}
                      onClick={() => setNovo({ data: dia, profissional: c.nome, hora: hhmm(m) })}><span>+ {hora(hhmm(m))}</span></button>
                  );
                })}
                {folgas.filter((f) => f.profissional === c.nome).map((f) => {
                  const a = f.diaTodo ? INI : Math.max(min(f.inicio), INI);
                  const b = f.diaTodo ? FIM : Math.min(min(f.fim), FIM);
                  if (b <= a) return null;
                  return (
                    <button key={f.id} type="button" className="s-folga ag-folga" style={{ top: y(a), height: (b - a) * PX }} disabled={!balcao}
                      onClick={() => setFolga(f)} title={`${f.motivo}${f.diaTodo ? ' · dia todo' : ` · ${hora(f.inicio)}–${hora(f.fim)}`}`}>
                      <span>{f.motivo}</span>
                    </button>
                  );
                })}
                {aulas.filter((a) => a.professor === c.nome).map((a) => {
                  const dur = a.duracao || 60;
                  return (
                    <button key={a.id} type="button" className={`ag-bloco ag-bloco--aula ag-bloco--${a.modalidade.toLowerCase()}`}
                      style={{ top: y(min(a.hora)) + 2, height: dur * PX - 4 }} onClick={() => aoAbrirAula?.(a)}>
                      <span className="ag-bloco__hora">{hora(a.hora)}–{hora(hhmm(min(a.hora) + dur))}</span>
                      <strong>{a.modalidade}</strong>
                      <span className="ag-bloco__info">{a.ocupadosQtd} de {a.capacidade} {a.capacidade === 1 ? 'lugar' : 'lugares'}</span>
                      {a.titular && <span className="ag-bloco__info ag-bloco__troca">cobrindo {primeiro(a.titular)}</span>}
                    </button>
                  );
                })}
                {lista.filter((a) => a.profissional === c.nome).map((a) => (
                  <button key={a.id} type="button" onClick={() => { if (!arrastou.current) setAberto(a); }} onPointerDown={(e) => comecarArrasto(e, a)}
                    className={`ag-bloco s-bloco--${COR_CATEGORIA[a.categoria] || 'facial'} ag-bloco--${a.status}${podeMover(a) ? ' ag-bloco--movel' : ''}${arrasto?.a.id === a.id ? ' ag-bloco--saindo' : ''}${pedeRemarcar(a) ? ' ag-bloco--remarcar' : ''}${a.duracao < 30 ? ' ag-bloco--curto' : ''}`}
                    style={{ top: y(min(a.hora)) + 2, height: Math.max(a.duracao * PX - 4, 30) }}>
                    <span className="ag-bloco__hora" title={`${hora(a.hora)}–${hora(fimDe(a))}`}>{a.duracao < 30 ? hora(a.hora) : `${hora(a.hora)}–${hora(fimDe(a))}`}{pedeRemarcar(a) ? ' · quer remarcar' : ''}</span>
                    <strong>{a.alertas?.length > 0 && <i className="ag-bloco__alerta" title={a.alertas.join(' · ')} aria-label="Atenção: ver alertas">!</i>}{a.nome}</strong>
                    {a.duracao >= 40 && <span className="ag-bloco__info">{a.servico}</span>}
                    {a.titular && a.duracao >= 60 && <span className="ag-bloco__info ag-bloco__troca">cobrindo {primeiro(a.titular)}</span>}
                    {a.status === 'atendido' && <i className="ag-bloco__sel ag-sel--atendido" title="Atendido" aria-hidden="true">✓</i>}
                    {a.status === 'confirmado' && <i className="ag-bloco__sel ag-sel--confirmado" title="Confirmado" aria-hidden="true">✓</i>}
                    {a.status === 'falta' && <i className="ag-bloco__sel ag-sel--falta" title="Faltou" aria-hidden="true">×</i>}
                    {(a.status === 'atendido' || a.status === 'confirmado' || a.status === 'falta') && <span className="ag-vh">{STATUS[a.status][0]}</span>}
                    {a.duracao >= 60 && (a.pagamento === 'pago' || a.pagamento === 'pacote') && <span className={`ag-bloco__pg ag-bloco__pg--${a.pagamento}`}>{PAGAMENTO[a.pagamento]}</span>}
                  </button>
                ))}
                {arrasto && arrasto.nome === c.nome && (
                  <div className={`ag-fantasma${arrasto.valido ? '' : ' ag-fantasma--nao'}`} style={{ top: y(arrasto.min) + 2, height: Math.max(arrasto.a.duracao * PX - 4, 30) }} aria-hidden="true">
                    <span>{hora(hhmm(arrasto.min))}–{hora(hhmm(arrasto.min + arrasto.a.duracao))}</span>
                    <strong>{arrasto.valido ? arrasto.a.nome : arrasto.motivo}</strong>
                  </div>
                )}
                {ehHoje && minutoAgora > INI && minutoAgora < FIM && <div className="ag-agora" style={{ top: y(minutoAgora) }} aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {novo && catalogo && <NovoAtendimento inicial={novo} catalogo={catalogo} aoFechar={() => setNovo(null)} aoSalvar={(r) => { setNovo(null); aplicar(r); }} />}
      {aberto && <DetalheAtendimento a={aberto} erroInicial={erroAberto} aoFechar={() => { setAberto(null); setErroAberto(''); }} aoMudar={(r) => { setAberto(null); aplicar(r); }}
        // confirmou, faltou, atendido sem cobrança: aparece na hora e o servidor confere por trás;
        // se ele recusar, volta como estava e a ficha reabre com o motivo
        aoMudarRapido={(a, status) => {
          setAberto(null);
          setErroAberto('');
          aplicar({ ...a, status }, true);
          chamar('atualizarAtendimento', { id: a.id, status }).then((r) => aplicar(r)).catch((e) => { aplicar(a, true); setErroAberto(e.message); setAberto(a); });
        }}
        aoReagendar={(a) => { setAberto(null); setNovo({ data: a.data, profissional: a.profissional, servicoId: a.servicoId, reagendar: a }); }}
        aoComanda={async (a) => { setAberto(null); setComanda({ carregando: true, a }); }}
        aoProntuario={(a) => { setAberto(null); setProntuario(a); }}
        aoTrocar={(a) => { setAberto(null); setTrocar(a); }}
        aoPedir={(a) => { setAberto(null); setPedir(a); }} />}
      {trocar && <TrocaProfissional tipo="servico" id={trocar.id} aoFechar={() => setTrocar(null)} aoTerminar={() => { setTrocar(null); recarregar(); }} />}
      {pedir && <PedirSubstituicao item={{ tipo: 'servico', ref: pedir.id, titulo: pedir.servico, data: pedir.data, hora: pedir.hora }} aoFechar={() => setPedir(null)} aoEnviar={() => setPedir(null)} />}
      {bloquear && catalogo && <BloquearHorario inicial={bloquear} profissionais={catalogo.profissionais.filter((p) => p.ativo).map((p) => p.nome)} aoFechar={() => setBloquear(null)} aoSalvar={() => { setBloquear(null); recarregar(); }} />}
      {folga && <DetalheFolga f={folga} aoFechar={() => setFolga(null)} aoMudar={() => { setFolga(null); recarregar(); }} />}
      {comanda && <ComandaDoAtendimento a={comanda.a} aoFechar={() => { setComanda(null); recarregar(); }} />}
      {prontuario && <ProntuarioModal alvo={{ atendimentoId: prontuario.id }} nome={prontuario.nome} aoFechar={() => setProntuario(null)} />}
      {espera && catalogo && <EsperaServicos dia={dia} lista={listaEspera} catalogo={catalogo} aoFechar={() => setEspera(false)}
        aoMudar={() => { recarregarEspera(); recarregar(); }} />}
      {mover && <MoverAtendimento m={mover} aoFechar={() => setMover(null)} aoMover={(r) => { setMover(null); aplicar(r); }} />}
      {imprimindo && <ImpressaoDia dia={dia} colunas={colunas} lista={lista} aulas={aulas} folgas={folgas} />}
    </>
  );
}

// ============================================================
//  LISTA DE ESPERA DE SERVIÇOS (quem quer um horário que não tinha)
// ============================================================
const PERIODOS = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };

function EsperaServicos({ dia, lista, catalogo, aoFechar, aoMudar }) {
  const { chamar } = useBancada();
  const [novo, setNovo] = useState(false);
  const [agendar, setAgendar] = useState(null); // item da lista que vai virar agendamento
  const [erro, setErro] = useState('');
  const doDia = (x) => x.data === dia;
  const ordenada = [...lista].sort((a, b) => Number(doDia(b)) - Number(doDia(a)) || a.criadoEm.localeCompare(b.criadoEm));
  const mudar = async (x, status) => { setErro(''); try { await chamar('atualizarEspera', { id: x.id, status }); aoMudar(); } catch (e) { setErro(e.message); } };
  const texto = (x) => `Olá, ${primeiro(x.nome)}! Aqui é da Casa Âmbar. Abriu um horário para ${x.servico}${x.profissional ? ` com ${x.profissional}` : ''}${x.data ? ` em ${dataBR(x.data).slice(0, 5)}` : ''}. Quer que a gente agende?`;
  if (agendar) {
    return (
      <NovoAtendimento catalogo={catalogo} inicial={{ data: agendar.data && agendar.data >= hojeIso() ? agendar.data : dia, servicoId: agendar.servicoId, profissional: agendar.profissional,
        cliente: agendar.cpf ? { nome: agendar.nome, cpf: agendar.cpf, whatsapp: agendar.whatsapp } : { nome: agendar.nome, whatsapp: agendar.whatsapp } }}
        aoFechar={() => setAgendar(null)} aoSalvar={async () => { await chamar('atualizarEspera', { id: agendar.id, status: 'agendado' }).catch(() => {}); setAgendar(null); aoMudar(); }} />
    );
  }
  const nDoDia = lista.filter(doDia).length;
  return (
    <Modal titulo="Lista de espera" rotulo="Serviços" aoFechar={aoFechar} largo>
      <div className="b-form">
        <div className="ag-esp-topo">
          <span className="ag-esp-topo__n">
            <strong>{lista.length}</strong> {lista.length === 1 ? 'pessoa esperando' : 'pessoas esperando'}
            {nDoDia > 0 && <Tag tom="ok">{plural(nDoDia, 'para este dia', 'para este dia')}</Tag>}
            <AjudaAg titulo="Lista de espera">Anote quem quer um horário que estava ocupado. Quando abrir uma vaga, avise pelo WhatsApp e agende por aqui.</AjudaAg>
          </span>
          {!novo && <button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo(true)}>Pôr alguém na lista</button>}
        </div>
        {novo && <NovaEspera catalogo={catalogo} dia={dia} aoFechar={() => setNovo(false)} aoSalvar={() => { setNovo(false); aoMudar(); }} />}
        <Erro>{erro}</Erro>
        {ordenada.length === 0 && !novo && <Vazio titulo="Ninguém esperando" forma="presenca">Quando um horário estiver ocupado, anote aqui quem quer um aviso.</Vazio>}
        {ordenada.length > 0 && (
          <ol className="ag-esp ag-esp--servicos">
            {ordenada.map((x) => (
              <li key={x.id} className={doDia(x) ? 'ag-esp--hoje' : ''}>
                <span className="ag-esp__quem">
                  <strong>{x.nome}</strong>
                  <span className="b-meta"><span>{x.servico}</span>{x.profissional && <span>com {x.profissional}</span>}</span>
                  <span className="ag-esp__tags">
                    <Tag tom={x.data ? 'neutro' : 'apagado'}>{x.data ? dataBR(x.data) : 'qualquer dia'}</Tag>
                    {x.periodo && <Tag>{PERIODOS[x.periodo]}</Tag>}
                    {x.status === 'avisado' && <Tag tom="ok">aviso enviado</Tag>}
                  </span>
                  {x.obs && <small className="ag-esp__obs">{x.obs}</small>}
                </span>
                <span className="ag-esp__acoes">
                  {x.whatsapp && <a className="botao botao--linha botao--p com-icone" href={linkWhats(x.whatsapp, texto(x))} target="_blank" rel="noreferrer" onClick={() => x.status !== 'avisado' && mudar(x, 'avisado')}><IconeWhatsapp tamanho={15} /> Avisar</a>}
                  <button type="button" className="botao botao--cheio botao--p" onClick={() => setAgendar(x)}>Agendar</button>
                  <BotaoAcao className="botao botao--fantasma botao--p ag-perigo" confirmar={`Tirar ${x.nome} da lista de espera?`} acao={() => mudar(x, 'desistiu')}>Tirar</BotaoAcao>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}

function NovaEspera({ catalogo, dia, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [cliente, setCliente] = useState(null);
  const [sem, setSem] = useState(null); // { nome, whatsapp } sem cadastro
  const [f, setF] = useState({ servicoId: '', profissional: '', data: dia >= hojeIso() ? dia : '', periodo: '', obs: '' });
  const [erro, setErro] = useState('');
  const servicos = catalogo.servicos.filter((s) => s.ativo);
  const serv = servicos.find((s) => s.id === f.servicoId);
  const profs = catalogo.profissionais.filter((p) => p.ativo && (!serv || fazServico(p, serv)));
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <section className="esp-form ag-esp-form" aria-label="Pôr na lista de espera">
      <Passo n={1} titulo="Cliente">
        {cliente ? (
          <ClienteEscolhido nome={cliente.nome} detalhe={telFmt(cliente.whatsapp)} aoTrocar={() => setCliente(null)} />
        ) : sem ? (
          <>
            <div className="b-linha2">
              <label className="b-campo"><span className="rotulo">Nome e sobrenome</span><input value={sem.nome} onChange={(e) => setSem({ ...sem, nome: e.target.value })} /></label>
              <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" value={sem.whatsapp} onChange={(e) => setSem({ ...sem, whatsapp: mascaraTelefone(e.target.value) })} /></label>
            </div>
            <button type="button" className="botao botao--fantasma botao--p ag-solto" onClick={() => setSem(null)}>Buscar no cadastro</button>
          </>
        ) : (
          <>
            <BuscaAluno placeholder="Buscar cliente por nome, CPF ou WhatsApp" aoEscolher={(a) => setCliente(a)} />
            <button type="button" className="botao botao--fantasma botao--p ag-solto" onClick={() => setSem({ nome: '', whatsapp: '' })}>Cliente sem cadastro (só nome e WhatsApp)</button>
          </>
        )}
      </Passo>
      <Passo n={2} titulo="O que quer">
        <label className="b-campo"><span className="rotulo">Serviço</span>
          <select {...campo('servicoId')}>
            <option value="">Escolha…</option>
            {catalogo.categorias.map((c) => [c, servicos.filter((s) => s.categoria === c)]).filter(([, l]) => l.length).map(([c, l]) => (
              <optgroup key={c} label={c}>{l.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</optgroup>
            ))}
          </select></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Profissional</span>
            <select {...campo('profissional')}><option value="">Qualquer pessoa</option>{profs.map((p) => <option key={p.nome}>{p.nome}</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Dia (vazio = qualquer dia)</span><input type="date" min={hojeIso()} {...campo('data')} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Período</span>
            <select {...campo('periodo')}><option value="">Qualquer horário</option>{Object.entries(PERIODOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Observação</span><input {...campo('obs')} maxLength={200} placeholder="Ex.: só depois das 17h" /></label>
        </div>
      </Passo>
      <Erro>{erro}</Erro>
      <div className="b-botoes">
        <BotaoAcao className="botao botao--cheio botao--p" disabled={!f.servicoId || (!cliente && !sem)} acao={async () => {
          setErro('');
          try {
            await chamar('entrarEspera', { tipo: 'servico', ...f, cpf: cliente?.cpf, cliente: cliente ? undefined : { nome: sem.nome, whatsapp: soDigitos(sem.whatsapp) } });
            aoSalvar();
          } catch (e) { setErro(e.message); }
        }}>Pôr na lista</BotaoAcao>
        <button type="button" className="botao botao--fantasma botao--p" onClick={aoFechar}>Voltar</button>
      </div>
    </section>
  );
}

// confirmação depois de arrastar: o mesmo atendimento muda de horário (pagamento, pacote e comanda continuam)
function MoverAtendimento({ m, aoFechar, aoMover }) {
  const { chamar } = useBancada();
  const [erro, setErro] = useState('');
  const { a } = m;
  const outra = m.profissional !== a.profissional;
  return (
    <Modal titulo="Remarcar?" rotulo={`${a.servico} · ${a.nome}`} aoFechar={aoFechar}>
      <div className="b-form">
        <div className="ag-mover">
          <div><span className="rotulo">Era</span><strong>{hora(a.hora)}</strong><span>com {a.profissional}</span></div>
          <span className="ag-mover__seta" aria-hidden="true">→</span>
          <div><span className="rotulo">Fica</span><strong>{hora(m.hora)}</strong><span>com {m.profissional}</span></div>
        </div>
        <AvisoAg tom={outra ? 'aviso' : 'info'}>{outra ? `Muda de profissional: vale o tempo do serviço de ${primeiro(m.profissional)}. ` : ''}Pagamento, pacote e comanda continuam os mesmos.</AvisoAg>
        <Erro>{erro}</Erro>
        <div className="b-botoes">
          <BotaoAcao className="botao botao--cheio" acao={async () => {
            setErro('');
            try {
              aoMover(await chamar('agendarServico', { servicoId: a.servicoId, profissional: m.profissional, data: a.data, hora: m.hora, reagendarId: a.id }));
            } catch (e) { setErro(e.message); }
          }}>Remarcar para {hora(m.hora)}</BotaoAcao>
          <button type="button" className="botao botao--linha" onClick={aoFechar}>Deixar como estava</button>
        </div>
      </div>
    </Modal>
  );
}

// folha para imprimir: uma lista por pessoa, na ordem do dia (vai direto para o <body>; o resto some na impressão)
function ImpressaoDia({ dia, colunas, lista, aulas, folgas }) {
  const titulo = `${DIAS_LONGOS[diaSemana(dia)]}, ${Number(dia.slice(8))} de ${MESES[Number(dia.slice(5, 7)) - 1]}`;
  const blocos = colunas.map((c) => {
    const itens = [
      ...lista.filter((a) => a.profissional === c.nome && a.status !== 'cancelado').map((a) => ({ k: 'a' + a.id, ini: a.hora, fim: fimDe(a), titulo: a.nome, sub: a.servico,
        extra: [a.status === 'falta' ? 'faltou' : a.status === 'atendido' ? 'atendido' : a.status === 'confirmado' ? 'confirmado' : '', a.obs].filter(Boolean).join(' · '), alertas: a.alertas || [] })),
      ...aulas.filter((x) => x.professor === c.nome).map((x) => ({ k: 'u' + x.id, ini: x.hora, fim: hhmm(min(x.hora) + (x.duracao || 60)), titulo: `${x.modalidade} · ${x.ocupadosQtd} de ${x.capacidade}`,
        sub: (x.reservas || []).map((r) => (r.tapete ? `${r.tapete}. ` : '') + r.nome).join(', ') || 'sem reservas', extra: '', alertas: [] })),
      ...folgas.filter((f) => f.profissional === c.nome).map((f) => ({ k: 'f' + f.id, ini: f.diaTodo ? '00:00' : f.inicio, fim: f.diaTodo ? '' : f.fim, titulo: `Bloqueado: ${f.motivo}`, sub: f.diaTodo ? 'dia todo' : '', extra: '', alertas: [] })),
    ].sort((p, q) => p.ini.localeCompare(q.ini));
    return [c, itens];
  }).filter(([, l]) => l.length);
  return createPortal(
    <div className="ag-impressao">
      <header><strong>Casa Âmbar · agenda do dia</strong><span>{titulo}</span></header>
      {blocos.map(([c, itens]) => (
        <section key={c.nome}>
          <h2>{c.nome} <small>{c.detalhe}</small></h2>
          <table>
            <tbody>
              {itens.map((i) => (
                <tr key={i.k}>
                  <td className="ag-impressao__hora">{i.ini === '00:00' && !i.fim ? '—' : `${hora(i.ini)}${i.fim ? '–' + hora(i.fim) : ''}`}</td>
                  <td>
                    <strong>{i.titulo}</strong>{i.sub && <span> · {i.sub}</span>}
                    {i.extra && <em> · {i.extra}</em>}
                    {i.alertas.length > 0 && <b className="ag-impressao__alerta"> ! {i.alertas.join(' · ')}</b>}
                  </td>
                  <td className="ag-impressao__marca" aria-hidden="true">{i.k[0] === 'f' ? '' : '☐'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <footer>Impresso em {dataBR(hojeIso())} às {hora(new Date().toTimeString().slice(0, 5))}</footer>
    </div>,
    document.body,
  );
}

// ============================================================
//  NOVO ATENDIMENTO (ou reagendar)
// ============================================================
// inicial: { data, profissional, hora, servicoId, reagendar, cliente } (cliente: aberto pela ficha)
export function NovoAtendimento({ inicial, catalogo, aoFechar, aoSalvar }) {
  const { chamar, token } = useBancada();
  const re = inicial.reagendar;
  const [servicoId, setServicoId] = useState(inicial.servicoId || '');
  const [profissional, setProfissional] = useState(inicial.profissional || '');
  const [data, setData] = useState(inicial.data || hojeIso());
  const [horaSel, setHoraSel] = useState(inicial.hora || '');
  const [horarios, setHorarios] = useState(null);
  const [cliente, setCliente] = useState(re ? { nome: re.nome, cpf: re.cpf, whatsapp: re.whatsapp } : inicial.cliente || null);
  const [semCadastro, setSemCadastro] = useState({ nome: '', whatsapp: '' });
  const [modoCliente, setModoCliente] = useState('busca');
  const [pagamento, setPagamento] = useState(re ? re.pagamento : 'no_dia');
  const [pg, setPg] = useState(PAGAMENTO_INICIAL);
  const [pacote, setPacote] = useState(null);
  const [obs, setObs] = useState(re ? String(re.obs || '').replace(/^(Reagendado de [^.]*\.\s*)+/, '') : '');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [repetir, setRepetir] = useState({ cadaDias: 0, vezes: 4 });
  const [serie, setSerie] = useState(null); // resultado da série: { criados, pulados }
  const [combo, setCombo] = useState(''); // combo que a cliente vai levar ('' = só a sessão)
  const [extras, setExtras] = useState([]); // outros serviços da mesma visita: [{ chave, servicoId, profissional, hora, dur }]
  const [lote, setLote] = useState(null); // resultado de vários serviços: { criados, falhas }
  // dia que já passou: lança o atendimento feito (migração do Avec); horário digitado, sem série
  const passado = !re && !!data && data < hojeIso();
  const limitePassado = somarDias(hojeIso(), -120);

  const servicos = catalogo.servicos.filter((s) => s.ativo);
  const serv = servicos.find((s) => s.id === servicoId);
  const profs = catalogo.profissionais.filter((p) => p.ativo && (!serv || fazServico(p, serv)));

  // horários livres: na hora, com a agenda da semana que já está na tela; o servidor confere por trás
  // (a resposta dele substitui) e de novo ao salvar
  useEffect(() => {
    if (!serv || !profissional || !data || passado) return undefined;
    let vivo = true;
    const params = { de: segundaDe(data) };
    const semana = lembrar(`${token}|agendaSemana|${JSON.stringify(params)}`);
    const local = horariosLivres({ semana, catalogo, servicoId, profissional, data, ignorarId: re?.id, hoje: hojeIso(), segundosAgora: segundosAgoraFortaleza() });
    setHorarios(local);
    if (!semana) preCarregar(chamar, token, 'agendaSemana', params); // outra semana: a próxima troca já sai na hora
    chamar('horarios', { servicoId, profissional, data, ignorarId: re?.id })
      .then((r) => { if (vivo) { setHorarios(r); setHoraSel((h) => (h && r.horarios.includes(h) ? h : '')); } })
      .catch((e) => vivo && !local && setErro(e.message));
    return () => { vivo = false; };
  }, [servicoId, profissional, data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setCombo(''); }, [servicoId]);

  useEffect(() => {
    setPacote(null);
    if (!cliente?.cpf || !servicoId) return undefined;
    let vivo = true;
    chamar('creditosServico', { cpf: cliente.cpf, servicoId, data }).then((r) => { if (vivo) { setPacote(r); if (r && !re) setPagamento('pacote'); } }).catch(() => {});
    return () => { vivo = false; };
  }, [cliente, servicoId, data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar(outraPessoa) {
    setErro('');
    setEnviando(true);
    try {
      const comum = {
        data, obs, pagamento, ...pg, outraPessoa: outraPessoa === true || undefined,
        cpf: cliente?.cpf || undefined,
        cliente: cliente?.cpf ? undefined : cliente ? { nome: cliente.nome, whatsapp: cliente.whatsapp } : { ...semCadastro, whatsapp: soDigitos(semCadastro.whatsapp) },
      };
      const combinado = comboValido && (pagamento === 'no_dia' || pagamento === 'pago') ? combo : undefined;
      if (extras.length) {
        // vários serviços da mesma visita: uma ida só ao servidor; o que não couber volta em `falhas`
        const r = await chamar('agendarServicos', {
          ...comum,
          servicos: [{ servicoId, profissional, hora: horaSel, combo: combinado }, ...extras.map((x) => ({ servicoId: x.servicoId, profissional: x.profissional, hora: x.hora }))],
        });
        if (r.falhas.length) setLote(r);
        else aoSalvar(r.criados[0]);
        return;
      }
      const r = await chamar('agendarServico', {
        ...comum, servicoId, profissional, hora: horaSel, combo: combinado,
        reagendarId: re?.id,
        repetir: !re && !passado && repetir.cadaDias ? repetir : undefined,
      });
      if (r?.serie) setSerie(r.serie);
      else aoSalvar(r);
    } catch (e) {
      // mãe e filha com o mesmo WhatsApp: confirma que é outra pessoa
      if (e.codigo === 'WHATSAPP_DE_OUTRA' && window.confirm(`${e.message}\n\nOK = cadastrar ${cliente?.nome || semCadastro.nome} como outra pessoa com o mesmo número.\nCancelar = voltar e buscar o cadastro existente pelo nome.`)) {
        setEnviando(false);
        salvar(true);
        return;
      }
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const porCategoria = catalogo.categorias.map((c) => [c, servicos.filter((s) => s.categoria === c)]).filter(([, l]) => l.length);
  // combos (pacotes) de cada serviço: aparecem na lista e abaixo do serviço escolhido
  const combosDe = (id) => (catalogo.pacotes || []).filter((p) => p.ativo && p.servicoId === id).sort((a, b) => a.sessoes - b.sessoes);
  const textoCombos = (id) => combosDe(id).map((p) => `${plural(p.sessoes, 'sessão', 'sessões')} ${real(p.preco)}`).join(' / ');
  const combos = serv ? combosDe(serv.id) : [];
  const comboEscolhido = combos.find((p) => p.id === combo);
  const comboValido = !!comboEscolhido && !re && !pacote;
  if (lote) {
    return (
      <Modal rotulo={`${cliente?.nome || semCadastro.nome} · ${dataBR(data)}`} titulo={`${plural(lote.criados.length, 'serviço marcado', 'serviços marcados')}${lote.falhas.length ? `, ${plural(lote.falhas.length, 'não coube', 'não couberam')}` : ''}`} aoFechar={() => aoSalvar(lote.criados[0])}>
        <div className="b-form">
          <ul className="sv-resumo sr-lista">
            {lote.criados.map((x) => <li key={x.id}><span className="sr-ok" aria-hidden="true">✓</span><strong>{hora(x.hora)} · {x.servico}</strong><small>com {x.profissional}</small></li>)}
            {lote.falhas.map((x, i) => <li key={i} className="sr-pulado"><span className="sr-nao" aria-hidden="true">×</span><strong>{x.servico}{x.hora ? ` · ${hora(x.hora)}` : ''}</strong><small>{x.motivo}</small></li>)}
          </ul>
          <AvisoAg tom="aviso">Os itens com × não foram marcados. Marque-os de novo pela agenda, em outro horário.</AvisoAg>
          <button type="button" className="botao botao--cheio" onClick={() => aoSalvar(lote.criados[0])}>Ok</button>
        </div>
      </Modal>
    );
  }
  if (serie) {
    const nomePg = { no_dia: 'paga no dia', pacote: 'pacote', pago: 'pago', cortesia: 'cortesia' };
    return (
      <Modal rotulo={`${serv?.nome || ''} · ${hora(horaSel)} com ${profissional}`} titulo={plural(serie.criados.length, 'horário marcado', 'horários marcados')} aoFechar={aoSalvar}>
        <div className="b-form">
          <ul className="sr-lista">
            {serie.criados.map((x) => <li key={x.id}><span className="sr-ok" aria-hidden="true">✓</span><strong>{DIAS_LONGOS[diaSemana(x.data)]}, {dataBR(x.data)}</strong><small>{nomePg[x.pagamento] || x.pagamento}</small></li>)}
            {serie.pulados.map((x) => <li key={x.data} className="sr-pulado"><span className="sr-nao" aria-hidden="true">×</span><strong>{DIAS_LONGOS[diaSemana(x.data)]}, {dataBR(x.data)}</strong><small>{x.motivo}</small></li>)}
          </ul>
          {serie.pulados.length > 0 && <AvisoAg tom="aviso">Os dias com × não foram marcados. Escolha outro horário para eles pela agenda.</AvisoAg>}
          <button type="button" className="botao botao--cheio" onClick={aoSalvar}>Ok</button>
        </div>
      </Modal>
    );
  }
  const temCliente = cliente || (modoCliente === 'novo' && semCadastro.nome.trim().split(' ').length >= 2 && soDigitos(semCadastro.whatsapp).length >= 10);

  return (
    <Modal rotulo={re ? `${re.servico} de ${primeiro(re.nome)}` : 'Estética e fisioterapia'} titulo={re ? 'Reagendar' : 'Agendar serviço'} aoFechar={aoFechar} largo>
      <div className="b-form ag-form">
        <Passo n={1} titulo="Serviço">
          <label className="b-campo">
            <span className="ag-vh">Serviço</span>
            <select value={servicoId} onChange={(e) => setServicoId(e.target.value)} disabled={!!re} aria-label="Serviço">
              <option value="">Escolha…</option>
              {porCategoria.map(([c, l]) => (
                <optgroup key={c} label={c}>{l.map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.duracao} min · {real(s.preco)}{combosDe(s.id).length ? ` · combo: ${textoCombos(s.id)}` : ''}</option>)}</optgroup>
              ))}
            </select>
          </label>
          {serv && (
            <div className="s-combos ag-combos">
              <Tag tom="neutro">{serv.duracao} min · {real(serv.preco)}</Tag>
              {combos.map((p) => <Tag key={p.id} tom="ambar">Combo {plural(p.sessoes, 'sessão', 'sessões')} · {real(p.preco)}</Tag>)}
            </div>
          )}
          {serv && profs.length === 0 && (
            <AvisoAg tom="alerta">Ninguém faz {serv.nome}. Acerte em Catálogo → Serviços → "Quem faz este serviço".</AvisoAg>
          )}
        </Passo>

        <Passo n={2} titulo="Quando e com quem">
          <div className="b-linha2">
            <label className="b-campo">
              <span className="rotulo">Profissional</span>
              <select value={profissional} onChange={(e) => setProfissional(e.target.value)}>
                <option value="">Escolha…</option>
                {profs.map((p) => <option key={p.nome}>{p.nome}</option>)}
              </select>
            </label>
            <label className="b-campo"><span className="rotulo">Dia</span><input type="date" value={data} min={re ? hojeIso() : limitePassado} onChange={(e) => { setData(e.target.value); setHoraSel(''); }} /></label>
          </div>
          {passado && (
            <AvisoAg tom="aviso" titulo={data < limitePassado ? 'Dá para lançar atendimentos de até 120 dias atrás' : 'Dia que já passou'}>
              {data < limitePassado ? '' : `Entra como atendido, com comissão. Se já pagou, a venda vai para o caixa de ${dataBR(data)}.`}
            </AvisoAg>
          )}

          {serv && profissional && passado && (
            <label className="b-campo s-hora-passada"><span className="rotulo">Horário em que foi feito</span>
              <input type="time" step={300} value={horaSel} onChange={(e) => setHoraSel(e.target.value)} /></label>
          )}
          {serv && profissional && !passado && (
            <fieldset className="s-horarios">
              <legend className="rotulo">Horário livre · {horarios?.duracao || serv.duracao} min</legend>
              {!horarios && <span className="b-suave">Procurando horários livres…</span>}
              {horarios && horarios.horarios.length === 0 && <span className="b-suave">{horarios.motivo || 'Sem horário livre neste dia. Tente outro dia ou profissional.'}</span>}
              {horarios && horarios.horarios.length > 0 && (
                <div className="s-horarios__grade">
                  {horarios.horarios.map((h) => (
                    <button key={h} type="button" aria-pressed={horaSel === h} onClick={() => setHoraSel(h)}>{hora(h)}</button>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {!re && !passado && serv && profissional && horaSel && (
            <>
              {extras.map((x, i) => {
                const antes = [{ hora: horaSel, dur: horarios?.duracao || serv.duracao }, ...extras.slice(0, i).map((y) => ({ hora: y.hora, dur: y.dur }))].filter((y) => y.hora);
                const fim = antes.reduce((m, y) => Math.max(m, minDe(y.hora) + (y.dur || 0)), 0);
                const outros = [{ hora: horaSel, dur: horarios?.duracao || serv.duracao }, ...extras.filter((y) => y.chave !== x.chave).map((y) => ({ hora: y.hora, dur: y.dur }))].filter((y) => y.hora);
                return (
                  <ServicoExtra key={x.chave} n={i + 2} item={x} catalogo={catalogo} data={data} outros={outros} depoisDe={fim}
                    aoMudar={(mud) => setExtras((l) => l.map((y) => (y.chave === x.chave ? { ...y, ...mud } : y)))} aoTirar={() => setExtras((l) => l.filter((y) => y.chave !== x.chave))} />
                );
              })}
              {extras.length < 7 && (
                <button type="button" className="botao botao--fantasma botao--p ag-solto vd-mais" onClick={() => { setRepetir({ cadaDias: 0, vezes: 4 }); setPg((x) => { if (!x.formas) return x; const { formas: _f, ...resto } = x; return { ...resto, metodo: x.formas[0].metodo, bandeira: x.formas[0].bandeira }; }); setExtras((l) => [...l, { chave: Math.random().toString(36).slice(2), servicoId: '', profissional: '', hora: '', dur: 0 }]); }}>
                  + Outro serviço neste atendimento
                </button>
              )}
            </>
          )}

          {!re && serv && !passado && extras.length === 0 && (
            <div className="b-linha2 sr-repetir">
              <label className="b-campo"><span className="rotulo">Repetir</span>
                <select value={repetir.cadaDias} onChange={(e) => setRepetir({ ...repetir, cadaDias: Number(e.target.value) })}>
                  <option value={0}>Só este dia</option>
                  <option value={7}>Toda semana</option>
                  <option value={14}>A cada 2 semanas</option>
                  <option value={21}>A cada 3 semanas</option>
                  <option value={28}>A cada 4 semanas</option>
                </select></label>
              {repetir.cadaDias > 0 && (
                <label className="b-campo"><span className="rotulo">Quantas vezes (com esta)</span>
                  <select value={repetir.vezes} onChange={(e) => setRepetir({ ...repetir, vezes: Number(e.target.value) })}>
                    {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n} vezes</option>)}
                  </select></label>
              )}
              {repetir.cadaDias > 0 && <p className="b-suave sr-nota">Mesmo horário, com {profissional || 'a mesma pessoa'}. {pagamento === 'pacote' ? 'Cada sessão usa o pacote enquanto houver saldo.' : pagamento === 'pago' ? 'Só a primeira fica paga; as outras ficam para pagar no dia.' : pagamento === 'cortesia' ? 'Todas como cortesia.' : 'Todas para pagar no dia.'} Dias ocupados são pulados e avisados.</p>}
            </div>
          )}
        </Passo>

        {!re && (
          <Passo n={3} titulo="Cliente">
            {cliente ? (
              <ClienteEscolhido nome={cliente.nome} detalhe={cliente.cpf ? telFmt(cliente.whatsapp) : 'sem cadastro'} aoTrocar={() => setCliente(null)} />
            ) : modoCliente === 'busca' ? (
              <>
                <BuscaAluno placeholder="Buscar cliente por nome, CPF ou WhatsApp" aoEscolher={(a) => setCliente({ nome: a.nome, cpf: a.cpf, whatsapp: a.whatsapp })} />
                <button type="button" className="botao botao--fantasma botao--p ag-solto" onClick={() => setModoCliente('novo')}>Cliente sem cadastro (só nome e WhatsApp)</button>
              </>
            ) : (
              <>
                <div className="b-linha2">
                  <label className="b-campo"><span className="rotulo">Nome e sobrenome</span><input value={semCadastro.nome} onChange={(e) => setSemCadastro({ ...semCadastro, nome: e.target.value })} /></label>
                  <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" value={semCadastro.whatsapp} onChange={(e) => setSemCadastro({ ...semCadastro, whatsapp: mascaraTelefone(e.target.value) })} /></label>
                </div>
                <button type="button" className="botao botao--fantasma botao--p ag-solto" onClick={() => setModoCliente('busca')}>Buscar no cadastro</button>
              </>
            )}
          </Passo>
        )}

        {!re && serv && (
          <Passo n={4} titulo="Pagamento">
            {combos.length > 0 && !pacote && (pagamento === 'no_dia' || pagamento === 'pago') && (
              <fieldset className="b-opcoes b-opcoes--linha s-leva">
                <legend className="rotulo">O que vai levar</legend>
                <label className={!combo ? 'ativo' : ''}>
                  <input type="radio" checked={!combo} onChange={() => setCombo('')} />
                  <span><strong>Só a sessão</strong><small>{real(serv.preco)}</small></span>
                </label>
                {combos.map((p) => (
                  <label key={p.id} className={combo === p.id ? 'ativo' : ''}>
                    <input type="radio" checked={combo === p.id} onChange={() => setCombo(p.id)} />
                    <span><strong>{p.nome ? `${p.nome} · ` : 'Combo · '}{plural(p.sessoes, 'sessão', 'sessões')}</strong>
                      <small>{real(p.preco)}{p.semJurosAte > 1 ? ` · até ${p.semJurosAte}x sem juros` : ''} · esta sessão sai do combo</small></span>
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset className="b-opcoes b-opcoes--linha">
              <legend className="ag-vh">Pagamento</legend>
              {pacote && (
                <label className={pagamento === 'pacote' ? 'ativo' : ''}>
                  <input type="radio" checked={pagamento === 'pacote'} onChange={() => setPagamento('pacote')} />
                  <span><strong>Usar o pacote</strong><small>{pacote.descricao} · {plural(pacote.restantes, 'sessão restante', 'sessões restantes')} (esta desconta 1) · até {dataBR(pacote.fim)}</small></span>
                </label>
              )}
              <label className={pagamento === 'no_dia' ? 'ativo' : ''}>
                <input type="radio" checked={pagamento === 'no_dia'} onChange={() => setPagamento('no_dia')} />
                <span><strong>{passado ? 'Ainda não pagou' : 'Paga no dia'}</strong><small>{passado ? 'fica a receber (na agenda ou na comanda)' : comboValido ? `na comanda, que já abre com o combo (${real(comboEscolhido.preco)})` : 'registra o pagamento ao marcar atendido'}</small></span>
              </label>
              <label className={pagamento === 'pago' ? 'ativo' : ''}>
                <input type="radio" checked={pagamento === 'pago'} onChange={() => setPagamento('pago')} />
                <span><strong>Já pagou</strong><small>{passado ? `entra no caixa de ${dataBR(data)}` : 'registra agora'} · {real(comboValido ? comboEscolhido.preco : serv.preco)}{comboValido ? ' (combo)' : ''}</small></span>
              </label>
              <label className={pagamento === 'cortesia' ? 'ativo' : ''}>
                <input type="radio" checked={pagamento === 'cortesia'} onChange={() => setPagamento('cortesia')} />
                <span><strong>Cortesia</strong><small>sem cobrança</small></span>
              </label>
            </fieldset>
            {pagamento === 'pago' && <CamposPagamento metodos={METODOS} p={pg} aoMudar={setPg} itemId={comboValido ? combo : servicoId} cpf={cliente?.cpf} data={data} parcelas semDividir={extras.length > 0} />}
            {extras.length > 0 && pagamento === 'pago' && (
              <AvisoAg tom="info" titulo={`Total ${real(serv.preco + extras.reduce((t, x) => t + (servicos.find((y) => y.id === x.servicoId)?.preco || 0), 0))} · ${plural(extras.length + 1, 'serviço', 'serviços')}`}>
                Cada serviço é cobrado pelo preço dele. Vale-presente, cupom e valor combinado só com um serviço: receba pela comanda.
              </AvisoAg>
            )}
          </Passo>
        )}

        <label className="b-campo"><span className="rotulo">Observação para quem vai atender</span><input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></label>
        <Erro>{erro}</Erro>
        <button type="button" className="botao botao--cheio" disabled={enviando || !serv || !profissional || !horaSel || (!re && !temCliente) || (pagamento === 'pago' && !re && faltaPagamento(pg)) || (passado && data < limitePassado)
          || (extras.length > 0 && (extras.some((x) => !x.servicoId || !x.profissional || !x.hora) || (pagamento === 'pago' && pg.metodo === 'Vale-presente')))} onClick={salvar}>
          {enviando ? 'Agendando…' : !horaSel ? 'Escolha o horário' : re ? `Mudar para ${dataBR(data)} às ${hora(horaSel)}` : passado ? `Lançar atendimento de ${dataBR(data)} às ${hora(horaSel)}`
            : extras.length ? `Agendar ${extras.length + 1} serviços em ${dataBR(data)}` : repetir.cadaDias ? `Agendar ${repetir.vezes} vezes a partir de ${dataBR(data)}` : `Agendar ${dataBR(data)} às ${hora(horaSel)}`}
        </button>
      </div>
    </Modal>
  );
}

const minDe = (h) => { const [a, b] = String(h).split(':'); return Number(a) * 60 + Number(b || 0); };

// Outro serviço da mesma visita: serviço, profissional e horário. Os horários que batem com os outros serviços
// desta visita (a pessoa não pode estar em dois lugares) ficam de fora; sugere o primeiro horário depois do serviço anterior.
function ServicoExtra({ n, item, catalogo, data, outros, depoisDe, aoMudar, aoTirar }) {
  const { chamar, token } = useBancada();
  const servicos = catalogo.servicos.filter((s) => s.ativo);
  const serv = servicos.find((s) => s.id === item.servicoId);
  const profs = catalogo.profissionais.filter((p) => p.ativo && (!serv || fazServico(p, serv)));
  const porCategoria = catalogo.categorias.map((c) => [c, servicos.filter((s) => s.categoria === c)]).filter(([, l]) => l.length);
  const [horarios, setHorarios] = useState(null);
  const dur = horarios?.duracao || serv?.duracao || 0;
  const bate = (h) => outros.some((o) => minDe(h) < minDe(o.hora) + (o.dur || 0) && minDe(h) + dur > minDe(o.hora));

  useEffect(() => {
    if (!serv || !item.profissional) { setHorarios(null); return undefined; }
    let vivo = true;
    const params = { de: segundaDe(data) };
    const semana = lembrar(`${token}|agendaSemana|${JSON.stringify(params)}`);
    const local = horariosLivres({ semana, catalogo, servicoId: item.servicoId, profissional: item.profissional, data, hoje: hojeIso(), segundosAgora: segundosAgoraFortaleza() });
    setHorarios(local);
    chamar('horarios', { servicoId: item.servicoId, profissional: item.profissional, data }).then((r) => { if (vivo) setHorarios(r); }).catch(() => {});
    return () => { vivo = false; };
  }, [item.servicoId, item.profissional, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const livres = (horarios?.horarios || []).filter((h) => !bate(h));
  // sugestão: o primeiro horário livre depois do serviço anterior; e solta o horário que passou a bater com outro serviço
  useEffect(() => {
    if (!horarios) return;
    if (item.hora && (!(horarios.horarios || []).includes(item.hora) || bate(item.hora))) { aoMudar({ hora: '', dur: 0 }); return; }
    if (!item.hora) {
      const sugerido = livres.find((h) => minDe(h) >= depoisDe);
      if (sugerido) aoMudar({ hora: sugerido, dur });
    }
  }, [horarios, depoisDe, outros.map((o) => o.hora + o.dur).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="sv-extra ag-extra">
      <div className="sv-extra__topo"><strong>Serviço {n}</strong><button type="button" className="botao botao--fantasma botao--p ag-perigo" onClick={aoTirar}>Tirar</button></div>
      <label className="b-campo">
        <span className="rotulo">Serviço</span>
        <select value={item.servicoId} onChange={(e) => aoMudar({ servicoId: e.target.value, profissional: '', hora: '', dur: 0 })}>
          <option value="">Escolha…</option>
          {porCategoria.map(([c, l]) => <optgroup key={c} label={c}>{l.map((x) => <option key={x.id} value={x.id}>{x.nome} · {x.duracao} min · {real(x.preco)}</option>)}</optgroup>)}
        </select>
      </label>
      {serv && (
        <label className="b-campo">
          <span className="rotulo">Profissional</span>
          <select value={item.profissional} onChange={(e) => aoMudar({ profissional: e.target.value, hora: '', dur: 0 })}>
            <option value="">Escolha…</option>
            {profs.map((p) => <option key={p.nome}>{p.nome}</option>)}
          </select>
        </label>
      )}
      {serv && profs.length === 0 && <AvisoAg tom="alerta">Ninguém faz {serv.nome}. Acerte em Catálogo → Serviços.</AvisoAg>}
      {serv && item.profissional && (
        <fieldset className="s-horarios">
          <legend className="rotulo">Horário livre · {dur} min</legend>
          {!horarios && <span className="b-suave">Procurando horários livres…</span>}
          {horarios && livres.length === 0 && <span className="b-suave">{horarios.horarios?.length ? 'Os horários livres batem com os outros serviços desta pessoa.' : horarios.motivo || 'Sem horário livre neste dia. Tente outro profissional.'}</span>}
          {livres.length > 0 && (
            <div className="s-horarios__grade">
              {livres.map((h) => <button key={h} type="button" aria-pressed={item.hora === h} onClick={() => aoMudar({ hora: h, dur })}>{hora(h)}</button>)}
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}

// ============================================================
//  DETALHE DO ATENDIMENTO
// ============================================================
// abre (ou retoma) a comanda do atendimento e mostra a folha da comanda
function ComandaDoAtendimento({ a, aoFechar }) {
  const { chamar } = useBancada();
  const [id, setId] = useState('');
  const [erro, setErro] = useState('');
  useEffect(() => {
    chamar('comandaDoAtendimento', { atendimentoId: a.id }).then((c) => setId(c.id)).catch((e) => setErro(e.message));
  }, [a.id, chamar]);
  if (id) return <ComandaModal id={id} aoFechar={aoFechar} />;
  return <Modal titulo="Comanda" rotulo={`${a.servico} · ${a.nome}`} aoFechar={aoFechar}>{erro ? <Erro>{erro}</Erro> : <Carregando texto="Abrindo a comanda" />}</Modal>;
}

function BloquearHorario({ inicial, profissionais, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ profissional: inicial.profissional || '', data: inicial.data || hojeIso(), diaTodo: false, inicio: '12:00', fim: '13:00', motivo: '', repetirSemanas: 0 });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(null);
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  if (aviso) {
    return (
      <Modal titulo="Horário bloqueado" aoFechar={aoSalvar}>
        <div className="b-form">
          <AvisoAg tom="ok" titulo={plural(aviso.criadas, 'bloqueio criado', 'bloqueios criados')} />
          {aviso.conflitos.length > 0 && (
            <div className="ag-conflitos">
              <AvisoAg tom="alerta" titulo="Já havia atendimento marcado nesse horário">Reagende esses horários pela agenda.</AvisoAg>
              <ul>{aviso.conflitos.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          <button type="button" className="botao botao--cheio" onClick={aoSalvar}>Ok</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal titulo="Bloquear horário" rotulo="Folga, almoço, curso ou outro compromisso" aoFechar={aoFechar}>
      <div className="b-form">
        <Passo n={1} titulo="Quem e quando">
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Profissional</span>
              <select {...campo('profissional')}><option value="">Escolha…</option>{profissionais.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="b-campo"><span className="rotulo">Dia</span><input type="date" {...campo('data')} /></label>
          </div>
          <label className="b-check"><input type="checkbox" checked={f.diaTodo} onChange={(e) => setF({ ...f, diaTodo: e.target.checked })} /> O dia todo</label>
          {!f.diaTodo && (
            <div className="b-linha2">
              <label className="b-campo"><span className="rotulo">Das</span><input type="time" step={900} {...campo('inicio')} /></label>
              <label className="b-campo"><span className="rotulo">Até</span><input type="time" step={900} {...campo('fim')} /></label>
            </div>
          )}
        </Passo>
        <Passo n={2} titulo="Motivo">
          <label className="b-campo"><span className="ag-vh">Motivo</span><input {...campo('motivo')} placeholder="Ex.: almoço, médico, curso" aria-label="Motivo" /></label>
          <label className="b-campo"><span className="rotulo">Repetir</span>
            <select value={f.repetirSemanas} onChange={(e) => setF({ ...f, repetirSemanas: Number(e.target.value) })}>
              <option value={0}>Só neste dia</option>
              {[1, 3, 7, 11, 25].map((n) => <option key={n} value={n}>Toda semana, por {n + 1} semanas</option>)}
            </select></label>
        </Passo>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" disabled={!f.profissional} acao={async () => {
          setErro('');
          try { setAviso(await chamar('salvarFolga', f)); } catch (e) { setErro(e.message); }
        }}>Bloquear</BotaoAcao>
      </div>
    </Modal>
  );
}

function DetalheFolga({ f, aoFechar, aoMudar }) {
  const { chamar } = useBancada();
  const [erro, setErro] = useState('');
  return (
    <Modal titulo={f.motivo} rotulo={`${f.profissional} · ${dataBR(f.data)}`} aoFechar={aoFechar}>
      <div className="b-form">
        <div className="ag-det ag-det--folga">
          <section className="ag-det__quando">
            <div className="ag-det__hora">
              {f.diaTodo ? <strong>Dia todo</strong> : <><strong>{hora(f.inicio)}</strong><span>–{hora(f.fim)}</span></>}
              <Tag tom="aviso">Bloqueado</Tag>
            </div>
          </section>
        </div>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--linha botao--perigo" confirmar="Liberar este horário? Ele volta a ficar livre para agendar." acao={async () => { try { await chamar('excluirFolga', { id: f.id }); aoMudar(); } catch (e) { setErro(e.message); } }}>Liberar este horário</BotaoAcao>
      </div>
    </Modal>
  );
}

function DetalheAtendimento({ a, erroInicial = '', aoFechar, aoMudar, aoMudarRapido, aoReagendar, aoComanda, aoProntuario, aoTrocar, aoPedir }) {
  const { membro, chamar } = useBancada();
  const balcao = pode(membro, 'admin', 'recepcao');
  const [pg, setPg] = useState(PAGAMENTO_INICIAL);
  const [semCombo, setSemCombo] = useState(false); // combo escolhido no agendamento: desmarcar = cobra só a sessão
  const [erro, setErro] = useState(erroInicial);
  const st = STATUS[a.status] || [a.status, 'neutro'];
  const mudar = async (status, extra = {}) => {
    setErro('');
    if (aoMudarRapido && !extra.metodo) { aoMudarRapido(a, status); return; }
    try { aoMudar(await chamar('atualizarAtendimento', { id: a.id, status, ...extra })); } catch (e) { setErro(e.message); }
  };
  const dataTexto = `${DIAS_LONGOS[diaSemana(a.data)]}, ${Number(a.data.slice(8))} de ${MESES[Number(a.data.slice(5, 7)) - 1]}`;
  const lembrete = `Olá, ${primeiro(a.nome)}! Passando para confirmar seu horário na Casa Âmbar: ${a.servico}, ${dataTexto.toLowerCase()} às ${hora(a.hora)}, com ${a.profissional}.`
    + (a.linkConfirmar ? ` Confirme ou peça para remarcar por aqui: ${a.linkConfirmar}` : ' Podemos confirmar?');
  const fechado = a.status === 'atendido' || a.status === 'cancelado';
  const noDia = a.pagamento === 'no_dia' && balcao;

  return (
    <Modal rotulo={a.categoria} titulo={a.servico} aoFechar={aoFechar}>
      <div className={`ag-det s-detalhe--${COR_CATEGORIA[a.categoria] || 'facial'}`}>
        <section className="ag-det__quando">
          <div className="ag-det__hora"><strong>{hora(a.hora)}</strong><span>–{hora(fimDe(a))}</span><Tag tom={st[1]}>{st[0]}</Tag></div>
          <p>{dataTexto} · {a.duracao} min</p>
        </section>
        <dl className="ag-fatos">
          <div><dt>Cliente</dt><dd>{a.nome}{!a.cpf && balcao && <Tag tom="aviso">sem cadastro</Tag>}</dd></div>
          {a.whatsapp && <div><dt>WhatsApp</dt><dd><a href={linkWhats(a.whatsapp, `Olá, ${primeiro(a.nome)}! Aqui é da Casa Âmbar.`)} target="_blank" rel="noreferrer">{telFmt(a.whatsapp)}</a></dd></div>}
          <div><dt>Profissional</dt><dd>{a.profissional}{a.titular && <small>no lugar de {a.titular}</small>}</dd></div>
          {balcao && <div><dt>Pagamento</dt><dd>{PAGAMENTO[a.pagamento] || a.pagamento}{a.combo ? <small>vai levar {a.combo.nome} ({real(a.combo.preco)})</small> : a.valor ? <small>{real(a.valor)}</small> : null}</dd></div>}
          {a.obs && <div className="ag-fatos__largo"><dt>Observação</dt><dd>{a.obs}</dd></div>}
        </dl>
      </div>
      <Alertas lista={a.alertas} />
      {pedeRemarcar(a) && (
        <AvisoAg tom="alerta" titulo="Pediu para remarcar pelo link">{a.respostaEm ? `Em ${dataBR(a.respostaEm)} às ${hora(a.respostaEm.slice(11, 16))}. ` : ''}Combine um novo horário pelo WhatsApp e use “Reagendar”.</AvisoAg>
      )}
      {a.resposta === 'confirmou' && a.status !== 'atendido' && <AvisoAg tom="ok">Confirmou pelo link{a.respostaEm ? ` em ${dataBR(a.respostaEm)}` : ''}.</AvisoAg>}
      <Erro>{erro}</Erro>

      {balcao && a.status !== 'cancelado' && !(a.status === 'atendido' && a.pagamento === 'pago') && (
        <button type="button" className="ag-comanda" onClick={() => aoComanda(a)}>
          <span className="ag-comanda__txt"><strong>{a.pagamento === 'no_dia' ? 'Receber na comanda' : 'Abrir comanda'}</strong><small>serviço + produtos, pagamento dividido</small></span>
          <span className="ag-comanda__seta" aria-hidden="true">›</span>
        </button>
      )}

      {!fechado && (
        <Passo titulo="Atendimento" className="ag-passo--acoes">
          {noDia && (
            <div className="s-receber">
              {a.combo && (
                <label className="s-receber__combo">
                  <input type="checkbox" checked={!semCombo} onChange={(e) => setSemCombo(!e.target.checked)} />
                  <span>Vender o combo ({plural(a.combo.sessoes, 'sessão', 'sessões')} · {real(a.combo.preco)}): esta sessão sai dele</span>
                </label>
              )}
              <CamposPagamento metodos={METODOS} p={pg} aoMudar={setPg} rotulo="Atendido · recebido por" itemId={a.combo && !semCombo ? a.combo.id : a.servicoId} cpf={a.cpf} data={a.data} parcelas />
            </div>
          )}
          <div className="ag-acoes-det">
            {noDia ? (
              <BotaoAcao className="botao botao--cheio botao--p" disabled={faltaPagamento(pg)} acao={() => mudar('atendido', { ...pg, semCombo: a.combo ? semCombo : undefined })}>
                Marcar atendido{a.combo ? ` · ${real(semCombo ? a.valor : a.combo.preco)}` : ''}</BotaoAcao>
            ) : (
              <BotaoAcao className="botao botao--cheio botao--p" acao={() => mudar('atendido')}>Marcar atendido</BotaoAcao>
            )}
            {balcao && a.status === 'agendado' && <BotaoAcao className="botao botao--linha botao--p" acao={() => mudar('confirmado')}>Cliente confirmou</BotaoAcao>}
            <BotaoAcao className="botao botao--linha botao--p botao--perigo" acao={() => mudar('falta')}>Faltou</BotaoAcao>
          </div>
        </Passo>
      )}

      <div className="ag-mais">
        <button type="button" className="botao botao--fantasma botao--p" onClick={() => aoProntuario(a)}>Ficha de estética e evolução</button>
        {balcao && a.cpf && <Link to={`/bancada/alunos/${a.cpf}`} className="botao botao--fantasma botao--p">Cadastro do cliente</Link>}
        {!balcao && <Link to={`/bancada/clientes/${a.id}`} state={{ nome: a.nome }} className="botao botao--fantasma botao--p">Anamnese e comanda</Link>}
        {!balcao && !fechado && !a.titular && a.data >= hojeIso() && (
          <button type="button" className="botao botao--fantasma botao--p" onClick={() => aoPedir(a)}>Pedir substituição deste horário</button>
        )}
        {balcao && a.whatsapp && !fechado && (
          <a className="botao botao--fantasma botao--p com-icone" href={linkWhats(a.whatsapp, lembrete)} target="_blank" rel="noreferrer"><IconeWhatsapp tamanho={15} /> Enviar lembrete</a>
        )}
        {balcao && !fechado && <button type="button" className="botao botao--fantasma botao--p" onClick={() => aoReagendar(a)}>Reagendar</button>}
        {balcao && a.status !== 'cancelado' && <button type="button" className="botao botao--fantasma botao--p" onClick={() => aoTrocar(a)}>Trocar profissional</button>}
        {balcao && (a.status === 'falta' || a.status === 'atendido') && <BotaoAcao className="botao botao--fantasma botao--p" acao={() => mudar('agendado')}>Desfazer</BotaoAcao>}
        {balcao && !fechado && <BotaoAcao className="botao botao--fantasma botao--p ag-perigo" confirmar="Cancelar este atendimento?" acao={() => mudar('cancelado')}>Cancelar atendimento</BotaoAcao>}
      </div>
    </Modal>
  );
}
// ============================================================
//  CATÁLOGO: serviços, pacotes e profissionais (administração)
// ============================================================
export function CatalogoServicos() {
  const { dados, erro, carregando, setDados } = useDados('catalogoServicos', {});
  const [editar, setEditar] = useState(null);
  const [q, setQ] = useState('');
  if (carregando && !dados) return <Esqueleto linhas={6} altura={64} />;
  if (!dados) return <Erro>{erro}</Erro>;
  const busca = semAcentoJs(q);
  const casa = (s) => !busca || semAcentoJs(`${s.nome} ${s.descricao || ''}`).includes(busca);
  const novoServico = () => setEditar({ tipo: 'servico', v: { categoria: dados.categorias[0], duracao: 60, ativo: true } });
  const visiveis = dados.servicos.filter(casa).length;
  return (
    <>
      <Barra resumo={`${plural(dados.servicos.length, 'serviço', 'serviços')} · ${plural(dados.pacotes.length, 'pacote', 'pacotes')}`} titulo="Serviços e pacotes" ajuda="Os serviços só aparecem na bancada. A área do aluno continua só com Yoga e Pilates.">
        <input type="search" className="cg-busca" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar serviço" aria-label="Buscar serviço" />
        <button type="button" className="botao botao--cheio botao--p" onClick={novoServico}>Novo serviço</button>
      </Barra>
      {dados.servicos.length === 0 && <Vazio titulo="Nenhum serviço cadastrado" acao={<button type="button" className="botao botao--cheio botao--p" onClick={novoServico}>Novo serviço</button>} />}
      {dados.servicos.length > 0 && visiveis === 0 && <Vazio titulo="Nenhum serviço com esse nome">Tente outra palavra.</Vazio>}
      <div className="cg-cats">
        {dados.categorias.map((c) => {
          const lista = dados.servicos.filter((s) => s.categoria === c).filter(casa);
          if (!lista.length) return null;
          return (
            <section key={c} className={`cg-cat cg-cat--${COR_CATEGORIA[c]}`}>
              <h3 className="cg-cat__titulo"><i aria-hidden="true" />{c}<span>{plural(lista.length, 'serviço', 'serviços')}</span></h3>
              <ul className="b-itens">
                {lista.map((s) => {
                  const pacs = dados.pacotes.filter((p) => p.servicoId === s.id);
                  return (
                    <li key={s.id} className={`b-item cg-serv${s.ativo ? '' : ' cg-inativo'}`}>
                      <div className="b-item__corpo">
                        <span className="cg-serv__nome">
                          <span className="b-item__titulo">{s.nome}</span>
                          {!s.ativo && <Tag tom="apagado">fora da agenda</Tag>}
                        </span>
                        <span className="b-meta">
                          <span>{s.duracao} min</span>
                          {s.comissao != null && <span>comissão {s.comissao}%</span>}
                        </span>
                        {s.descricao && <span className="cg-serv__desc">{s.descricao}</span>}
                        {pacs.length > 0 && (
                          <span className="cg-pacotes">
                            {pacs.map((p) => (
                              <button key={p.id} type="button" className={`cg-pacote${p.ativo ? '' : ' cg-pacote--off'}`} title="Editar pacote" onClick={() => setEditar({ tipo: 'pacote', v: p })}>
                                {p.nome ? <em>{p.nome}</em> : null}<b>{p.sessoes} sessões</b><span>{real(p.preco)}</span>
                              </button>
                            ))}
                          </span>
                        )}
                      </div>
                      <strong className="cg-preco">{real(s.preco)}</strong>
                      <div className="cg-serv__acoes">
                        <button type="button" className="botao botao--fantasma botao--p" aria-label={`Editar ${s.nome}`} onClick={() => setEditar({ tipo: 'servico', v: s })}>Editar</button>
                        <button type="button" className="botao botao--fantasma botao--p" aria-label={`Novo pacote ou combo de ${s.nome}`} onClick={() => setEditar({ tipo: 'pacote', v: { servicoId: s.id, sessoes: 5, semJurosAte: 3, validadeDias: 120, ativo: true } })}>+ Pacote ou combo</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {editar?.tipo === 'servico' && <EditarServico s={editar.v} categorias={dados.categorias} produtos={dados.produtos || []} profissionais={dados.profissionais || []} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
      {editar?.tipo === 'pacote' && <EditarPacote p={editar.v} servicos={dados.servicos} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
    </>
  );
}

function EditarServico({ s, categorias, produtos = [], profissionais = [], aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const ativas = profissionais.filter((p) => p.ativo);
  // quem faz: o que já está no cadastro de cada uma; serviço novo (ou que ninguém faz) já vem com quem atende a área
  const daArea = (cat) => ativas.filter((p) => p.categorias.includes(cat)).map((p) => p.nome);
  const fazemHoje = s.id ? ativas.filter((p) => fazServico(p, s)).map((p) => p.nome) : [];
  const [quem, setQuem] = useState(() => (fazemHoje.length ? fazemHoje : daArea(s.categoria)));
  const [mexeuQuem, setMexeuQuem] = useState(false);
  const ninguemFazia = !!s.id && fazemHoje.length === 0;
  const [f, setF] = useState({ id: s.id || '', nome: s.nome || '', categoria: s.categoria, duracao: s.duracao || 60, preco: s.preco || '', descricao: s.descricao || '', semJurosAte: s.semJurosAte || 1, ativo: s.ativo !== false,
    comissao: s.comissao == null ? '' : String(s.comissao), consumo: s.consumo || [], retornoDias: s.retornoDias ? String(s.retornoDias) : '' });
  const [erro, setErro] = useState('');
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <Modal rotulo={f.categoria} titulo={s.id ? s.nome : 'Novo serviço'} aoFechar={aoFechar}>
      <div className="b-form">
        <BlocoForm titulo="Serviço">
          <label className="b-campo"><span className="rotulo">Nome</span><input {...campo('nome')} /></label>
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Área</span><select value={f.categoria} onChange={(e) => {
              setF({ ...f, categoria: e.target.value });
              if (!mexeuQuem && (!s.id || ninguemFazia)) setQuem(daArea(e.target.value));
            }}>{categorias.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="b-campo"><span className="rotulo">Duração (min)</span><input type="number" min={10} step={5} {...campo('duracao')} /></label>
          </div>
          <label className="b-campo"><span className="rotulo">Descrição curta</span><input {...campo('descricao')} /></label>
        </BlocoForm>
        <BlocoForm titulo="Preço e comissão">
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Preço (R$)</span><input inputMode="decimal" {...campo('preco')} /></label>
            <label className="b-campo"><span className="rotulo">Parcelas sem juros</span><select {...campo('semJurosAte')}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
          </div>
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Comissão deste serviço (%)</span>
              <input inputMode="decimal" value={f.comissao} onChange={(e) => setF({ ...f, comissao: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="Padrão de quem atende" /></label>
            <label className="b-campo"><span className="rotulo">Retorno sugerido (dias)</span>
              <input inputMode="numeric" value={f.retornoDias} onChange={(e) => setF({ ...f, retornoDias: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="Vazio = sem retorno" /></label>
          </div>
        </BlocoForm>
        <BlocoForm titulo="Produtos usados em cada sessão" ajuda="Baixa o estoque sozinho a cada atendimento.">
          {f.consumo.map((c, i) => {
            const pr = produtos.find((x) => x.id === c.produtoId);
            return (
              <div key={i} className="s-consumo">
                <select value={c.produtoId} onChange={(e) => setF({ ...f, consumo: f.consumo.map((y, k) => (k === i ? { ...y, produtoId: e.target.value } : y)) })} aria-label="Produto">
                  <option value="">Escolha…</option>{produtos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
                <input inputMode="decimal" value={String(c.qtd).replace('.', ',')} onChange={(e) => setF({ ...f, consumo: f.consumo.map((y, k) => (k === i ? { ...y, qtd: e.target.value.replace(/[^\d,.]/g, '') } : y)) })} aria-label="Quantidade" />
                <span className="b-suave">{pr ? pr.unidade : ''}</span>
                <button type="button" className="cm-item__tirar" aria-label="Tirar" onClick={() => setF({ ...f, consumo: f.consumo.filter((_, k) => k !== i) })}>×</button>
              </div>
            );
          })}
          {produtos.length ? <button type="button" className="botao botao--linha botao--p cg-mais" onClick={() => setF({ ...f, consumo: [...f.consumo, { produtoId: '', qtd: 1 }] })}>+ Produto</button>
            : <span className="b-suave">Cadastre os insumos em Estoque para usar aqui.</span>}
        </BlocoForm>
        {ativas.length > 0 && (
          <BlocoForm titulo="Quem faz este serviço" className="s-quemfaz" extra={<Tag tom={quem.length ? 'neutro' : 'aviso'}>{quem.length ? plural(quem.length, 'pessoa', 'pessoas') : 'ninguém'}</Tag>}>
            {ninguemFazia && <Aviso tom="aviso">Ninguém fazia este serviço, por isso ele não aparecia para agendar. Já marcamos quem atende {f.categoria}: confira e salve.</Aviso>}
            <div className="s-quemfaz__lista cg-quem">
              {ativas.map((p) => (
                <label key={p.nome} className="b-check">
                  <input type="checkbox" checked={quem.includes(p.nome)} onChange={(e) => { setMexeuQuem(true); setQuem((l) => (e.target.checked ? [...l, p.nome] : l.filter((n) => n !== p.nome))); }} />
                  <span>{p.nome}<small className="b-suave">{p.categorias.join(', ') || 'todas as áreas'}</small></span>
                </label>
              ))}
            </div>
            {quem.length === 0 && <Aviso tom="aviso">Sem ninguém marcado, o serviço não aparece para agendar.</Aviso>}
          </BlocoForm>
        )}
        <Interruptor checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })}>Disponível para agendar</Interruptor>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try {
            aoSalvar(await chamar('salvarServico', { servico: { ...f, profissionais: ativas.length ? quem : undefined, preco: Number(String(f.preco).replace(',', '.')), duracao: Number(f.duracao), semJurosAte: Number(f.semJurosAte),
              comissao: f.comissao === '' ? '' : Number(String(f.comissao).replace(',', '.')), retornoDias: Number(f.retornoDias) || '', consumo: f.consumo.map((c) => ({ produtoId: c.produtoId, qtd: Number(String(c.qtd).replace(',', '.')) })) } }));
          } catch (e) { setErro(e.message); }
        }}>Salvar serviço</BotaoAcao>
      </div>
    </Modal>
  );
}

function EditarPacote({ p, servicos, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ id: p.id || '', nome: p.nome || '', servicoId: p.servicoId, sessoes: p.sessoes || 5, preco: p.preco || '', validadeDias: p.validadeDias || 120, semJurosAte: p.semJurosAte || 3, ativo: p.ativo !== false });
  const [erro, setErro] = useState('');
  const serv = servicos.find((s) => s.id === f.servicoId);
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const avulso = serv ? serv.preco * Number(f.sessoes || 0) : 0;
  const preco = Number(String(f.preco).replace(',', '.'));
  return (
    <Modal rotulo={serv?.nome} titulo={p.id ? (p.nome || `Pacote de ${p.sessoes} sessões`) : 'Novo pacote ou combo'} aoFechar={aoFechar}>
      <div className="b-form">
        <BlocoForm titulo="Nome" ajuda="Aparece na comanda, na busca e na ficha do cliente. Cada agendamento deste serviço desconta uma sessão.">
          <label className="b-campo"><span className="rotulo">Nome do combo (opcional)</span>
            <input value={f.nome} maxLength={60} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Combo Alívio" /></label>
          <div className="cg-previa">
            <span className="b-suave">Aparece assim</span>
            <strong>{f.nome.trim() ? f.nome.trim() + ' · ' : ''}{serv?.nome} · pacote {f.sessoes || '?'} sessões</strong>
          </div>
        </BlocoForm>
        <BlocoForm titulo="Valor e regras">
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Sessões</span><input type="number" min={2} max={50} {...campo('sessoes')} disabled={!!p.id} /></label>
            <label className="b-campo"><span className="rotulo">Preço do pacote (R$)</span><input inputMode="decimal" {...campo('preco')} /></label>
          </div>
          {avulso > 0 && preco > 0 && <Aviso tom={avulso - preco >= 0 ? 'ok' : 'aviso'}>Avulso sairia {real(avulso)} · economia de {real(avulso - preco)} ({Math.round((1 - preco / avulso) * 100)}%)</Aviso>}
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Validade (dias)</span><input type="number" min={7} {...campo('validadeDias')} /></label>
            <label className="b-campo"><span className="rotulo">Parcelas sem juros</span><select {...campo('semJurosAte')}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
          </div>
        </BlocoForm>
        <Interruptor checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })}>Pacote à venda</Interruptor>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { aoSalvar(await chamar('salvarPacote', { pacote: { ...f, preco, sessoes: Number(f.sessoes), validadeDias: Number(f.validadeDias), semJurosAte: Number(f.semJurosAte) } })); } catch (e) { setErro(e.message); }
        }}>Salvar pacote</BotaoAcao>
      </div>
    </Modal>
  );
}

// Uma pessoa, um cadastro: quem atende serviços (estética e fisioterapia), quem dá aula (Pilates e Yoga) ou as duas coisas.
// Os dois lados se juntam pelo NOME (igual, sem contar acento): é o mesmo nome que a agenda usa para pôr tudo na mesma coluna.
export function Profissionais() {
  const { chamar, membro } = useBancada();
  const verComissao = pode(membro, 'admin'); // comissão é só da administração
  const { dados, erro, carregando, setDados } = useDados('catalogoServicos', {});
  const { dados: aulas, recarregar: recarregarAulas } = useDados('pagamentoAulas', {});
  const [editar, setEditar] = useState(null);
  const [wellhub, setWellhub] = useState(null);
  const [wellhubSalvo, setWellhubSalvo] = useState(false);
  const [erroW, setErroW] = useState('');
  const pessoas = useMemo(() => {
    if (!dados) return [];
    const mapa = new Map();
    dados.profissionais.forEach((p) => mapa.set(semAcentoJs(p.nome), { nome: p.nome, servico: p, aula: null }));
    (aulas?.professoras || []).forEach((a) => {
      const k = semAcentoJs(a.nome);
      if (mapa.has(k)) mapa.get(k).aula = a;
      else mapa.set(k, { nome: a.nome, servico: null, aula: a });
    });
    return [...mapa.values()].sort((x, y) => x.nome.localeCompare(y.nome));
  }, [dados, aulas]);
  // nomes parecidos (mesmo primeiro nome) em cadastros separados: provavelmente a mesma pessoa com o nome escrito diferente
  // (quem tem aulas na Grade com um nome e serviços com outro: ex. "Sara" nas aulas e "Sara Pontes" nos serviços)
  const parecidos = useMemo(() => {
    const out = [];
    pessoas.filter((x) => x.servico && !x.aula?.daGrade?.length).forEach((sv) => pessoas.filter((x) => x.aula?.daGrade?.length && !x.servico).forEach((au) => {
      if (semAcentoJs(sv.nome).split(' ')[0] === semAcentoJs(au.nome).split(' ')[0]) out.push({ sv, au });
    }));
    return out;
  }, [pessoas]);
  if (carregando && !dados) return <Esqueleto linhas={5} altura={64} />;
  if (!dados) return <Erro>{erro}</Erro>;
  const temPilates = (aulas?.professoras || []).some((x) => x.modalidades.includes('Pilates'));
  const wellhubAtual = wellhub ?? (aulas?.wellhubValor ? String(aulas.wellhubValor).replace('.', ',') : '');
  const novaPessoa = () => setEditar({ p: { categorias: [], dias: [1, 2, 3, 4, 5], inicio: '', fim: '', ativo: true }, aula: null });
  return (
    <>
      <Barra resumo={plural(pessoas.length, 'pessoa', 'pessoas')} titulo="Profissionais" ajuda={(
        <>
          <span>Todas as pessoas da equipe num lugar só: quem atende serviços, quem dá aula ou as duas coisas.</span>
          <span>Quem faz as duas aparece na agenda numa coluna só, com serviços e aulas juntos (o nome precisa ser igual nos dois lados).</span>
          <span>Para a pessoa ver a própria agenda, ela precisa de um acesso em Equipe com o mesmo nome.</span>
        </>
      )}>
        <button type="button" className="botao botao--cheio botao--p" onClick={novaPessoa}>Cadastrar profissional</button>
      </Barra>
      {parecidos.map(({ sv, au }) => (
        <Aviso key={sv.nome + au.nome} tom="aviso" titulo="Mesma pessoa com dois nomes?"
          acao={(
            <>
              <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ p: { ...sv.servico, nomeOriginal: sv.servico.nome }, aula: au.aula })}>Juntar como “{sv.nome}”</button>
              <button type="button" className="botao botao--linha botao--p" onClick={() => setEditar({ p: { ...sv.servico, nomeOriginal: sv.servico.nome, nome: au.nome }, aula: au.aula })}>Juntar como “{au.nome}”</button>
            </>
          )}>
          <strong>{sv.nome}</strong> (serviços) e <strong>{au.nome}</strong> (aulas) precisam ter o mesmo nome para ficarem na mesma coluna da agenda.
        </Aviso>
      ))}
      {temPilates && (
        <section className="b-cartao cg-wellhub">
          <label className="b-campo pa-wellhub">
            <span className="rotulo">A Casa recebe por check-in Wellhub (R$)</span>
            <input inputMode="decimal" value={wellhubAtual} placeholder="Ex.: 30" onChange={(e) => { setWellhubSalvo(false); setWellhub(e.target.value.replace(/[^\d,.]/g, '')); }} />
          </label>
          <BotaoAcao className="botao botao--linha botao--p" disabled={wellhub === null} acao={async () => {
            setErroW('');
            try { await chamar('salvarPagamentoAulas', { wellhubValor: wellhub, professoras: [] }); setWellhubSalvo(true); setWellhub(null); recarregarAulas(); } catch (e) { setErroW(e.message); }
          }}>Salvar valor</BotaoAcao>
          {wellhubSalvo && <Tag tom="ok">Salvo</Tag>}
        </section>
      )}
      <Erro>{erroW}</Erro>
      {pessoas.length === 0 && <Vazio titulo="Equipe ainda vazia" forma="presenca" acao={<button type="button" className="botao botao--cheio botao--p" onClick={novaPessoa}>Cadastrar profissional</button>}>Quem dá aula aparece aqui sozinho, assim que entra na Grade de aulas.</Vazio>}
      {pessoas.length > 0 && (
        <ul className="b-itens cg-equipe cg-equipe--prof">
          {pessoas.map(({ nome, servico: p, aula: a }) => {
            const inativo = p ? !p.ativo && !a : false;
            const comissao = [p && verComissao && (p.comissao ? `serviços ${p.comissao}%` : 'sem comissão padrão'), a && (a.pilatesPct != null || a.yogaPorAula ? 'valor da aula cadastrado' : 'sem valor de aula')].filter(Boolean);
            return (
              <li key={nome} className={`b-item cg-pessoa${inativo ? ' cg-inativo' : ''}`}>
                <Avatar nome={nome} />
                <div className="b-item__corpo">
                  <span className="b-item__titulo">{nome}</span>
                  <span className="pf-tipos-resumo">
                    {p && <Tag tom={p.ativo ? 'neutro' : 'apagado'}>{p.servicos?.length ? `${plural(p.servicos.length, 'serviço', 'serviços')} · ${p.categorias.join(', ')}` : p.categorias.join(', ') || 'Serviços'}</Tag>}
                    {a && <Tag tom="ambar">{a.modalidades.length ? `Aulas de ${a.modalidades.join(' e ')}` : 'Aulas (fora da grade)'}</Tag>}
                  </span>
                  <span className="b-meta">
                    <span>{p ? `${resumoHorario(p)}${Object.keys(p.especiais || {}).length ? ` · ${plural(Object.keys(p.especiais).length, 'dia especial', 'dias especiais')}` : ''}` : 'horários na Grade de aulas'}</span>
                    {comissao.map((t) => <span key={t}>{t}</span>)}
                  </span>
                </div>
                <div className="b-item__lado cg-pessoa__acoes">
                  <button type="button" className="botao botao--fantasma botao--p" aria-label={`Editar ${nome}`} onClick={() => setEditar({ p: p ? { ...p, nomeOriginal: p.nome } : { nome, categorias: [], dias: [1, 2, 3, 4, 5], inicio: '', fim: '', ativo: true }, aula: a, soAula: !p })}>Editar</button>
                  {(p || (a && !a.daGrade?.length)) && (
                    <BotaoAcao className="botao botao--fantasma botao--p cg-perigo" confirmar={`Apagar o cadastro de ${nome}? O histórico (atendimentos passados, vendas e comissões) continua com o nome.`}
                      aria-label={`Apagar o cadastro de ${nome}`}
                      acao={async () => { setErroW(''); try { setDados(await chamar('excluirProfissional', { nome })); recarregarAulas(); } catch (e) { setErroW(e.message); } }}>Apagar</BotaoAcao>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editar && (
        <EditarProfissional p={editar.p} aula={editar.aula} soAula={editar.soAula} wellhubValor={aulas?.wellhubValor || 0} categorias={dados.categorias} servicos={dados.servicos} casa={dados.horarioCasa}
          aoFechar={() => setEditar(null)} aoSalvar={(d) => { if (d) setDados(d); recarregarAulas(); setEditar(null); }} />
      )}
    </>
  );
}

const semAcentoJs = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

// faz o serviço? Com lista de serviços (como no Avec), vale a lista; senão, a área
const fazServico = (p, serv) => (p.servicos?.length ? p.servicos.some((c) => c.id === serv.id) : !p.categorias.length || p.categorias.includes(serv.categoria));

function EditarProfissional({ p, aula, soAula, wellhubValor, categorias, servicos, casa, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState(() => {
    // serviços que ela faz: { id: { comissao, duracao } } (vazio = vale o padrão)
    const marcados = {};
    if (p.servicos?.length) p.servicos.forEach((c) => { marcados[c.id] = { comissao: c.comissao == null ? '' : String(c.comissao), duracao: c.duracao ? String(c.duracao) : '' }; });
    else if (p.nome) servicos.filter((s) => s.ativo && fazServico(p, s)).forEach((s) => { marcados[s.id] = { comissao: '', duracao: '' }; });
    return { nome: p.nome || '', nomeOriginal: p.nomeOriginal, horarios: horariosIniciais(p, casa), especiais: p.especiais || {}, ativo: p.ativo !== false,
      comissao: p.comissao ? String(p.comissao) : '', comissaoProduto: p.comissaoProduto ? String(p.comissaoProduto) : '', servicos: marcados };
  });
  const [erro, setErro] = useState('');
  // o que esta pessoa faz: atende serviços e/ou dá aula (a aula entra pela Grade de aulas; aqui fica o valor de cada aula)
  const temServico = !!p.nomeOriginal;
  const [atende, setAtende] = useState(!soAula);
  const [daAula, setDaAula] = useState(!!aula);
  const txt = (v) => (v == null || v === 0 ? '' : String(v).replace('.', ','));
  const [au, setAu] = useState({ pilatesPct: txt(aula?.pilatesPct), wellhubPct: txt(aula?.wellhubPct), yogaPorAula: txt(aula?.yogaPorAula), desde: aula?.desde || hojeIso() });
  // Pilates e/ou Yoga: o que já está na Grade de aulas fica marcado (para tirar, tire as aulas da grade); o resto é escolha do cadastro
  const daGrade = aula?.daGrade || [];
  const [mods, setMods] = useState(aula?.modalidades || []);
  const pilates = mods.includes('Pilates');
  const yoga = mods.includes('Yoga');
  const alternar = (t) => setMods((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  const nomeAula = aula?.nome || '';
  const marcar = (lista, sim) => setF((x) => {
    const m = { ...x.servicos };
    lista.forEach((s) => { if (sim) m[s.id] = m[s.id] || { comissao: '', duracao: '' }; else delete m[s.id]; });
    return { ...x, servicos: m };
  });
  const mudar = (id, campo, v) => setF((x) => ({ ...x, servicos: { ...x.servicos, [id]: { ...x.servicos[id], [campo]: v } } }));
  const num = (v) => Number(String(v).replace(',', '.')) || 0;
  const porArea = categorias.map((c) => [c, servicos.filter((s) => s.categoria === c && (s.ativo || f.servicos[s.id]))]).filter(([, l]) => l.length);
  const qtd = Object.keys(f.servicos).length;

  async function salvar() {
    setErro('');
    if (!atende && !daAula) { setErro('Marque o que esta pessoa faz: serviços, aulas ou os dois.'); return; }
    if (daAula && !mods.length) { setErro('Marque se a pessoa dá aula de Pilates, de Yoga ou das duas.'); return; }
    if (atende) {
      if (!qtd) { setErro('Marque pelo menos um serviço que esta pessoa faz.'); return; }
      if (!Object.keys(f.horarios).length) { setErro('Marque pelo menos um dia de atendimento.'); return; }
    }
    const lista = Object.entries(f.servicos).map(([id, c]) => ({ id, comissao: c.comissao === '' ? '' : num(c.comissao), duracao: c.duracao === '' ? '' : num(c.duracao) }));
    try {
      let catalogo = null;
      // serviços: salva quando atende; se deixou de atender (e tinha cadastro), fica "não atendendo" sem perder o resto
      if (atende || temServico) catalogo = await chamar('salvarProfissional', { profissional: { ...f, ativo: atende ? f.ativo : false, servicos: lista, comissao: num(f.comissao), comissaoProduto: num(f.comissaoProduto) } });
      if (daAula) {
        const nomeNovo = f.nome.trim();
        // o nome das aulas (Grade) muda junto: é assim que "Sara" e "Sara Pontes" viram uma pessoa só
        if (nomeAula && nomeAula !== nomeNovo) await chamar('renomearProfessora', { de: nomeAula, para: nomeNovo });
        await chamar('salvarPagamentoAulas', { wellhubValor: wellhubValor || 0, professoras: [{ nome: nomeNovo, ...au, modalidades: mods, ativo: true }] });
      }
      aoSalvar(catalogo);
    } catch (e) { setErro(e.message); }
  }

  return (
    <Modal rotulo="Profissional" titulo={p.nome || 'Cadastrar profissional'} aoFechar={aoFechar} largo>
      <div className="b-form">
        <BlocoForm titulo="Dados" ajuda={atende && daAula ? 'Na agenda, serviços e aulas ficam na mesma coluna, e a pessoa vê tudo com um só acesso.' : undefined}>
          <label className="b-campo"><span className="rotulo">Nome (como aparece na agenda)</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
          {daAula && nomeAula && nomeAula !== f.nome.trim() && f.nome.trim().length > 1 && (
            <Aviso tom="info">Ao salvar, o nome nas aulas (Grade de aulas) passa de “{nomeAula}” para “{f.nome.trim()}”. Reservas e comissões de aula acompanham.</Aviso>
          )}
          <div className="cg-tipos" role="group" aria-label="O que esta pessoa faz">
            <Interruptor checked={atende} onChange={(e) => setAtende(e.target.checked)} detalhe="Estética e fisioterapia">Atende serviços</Interruptor>
            <Interruptor checked={daAula} onChange={(e) => setDaAula(e.target.checked)} detalhe="Pilates ou Yoga">Dá aula</Interruptor>
          </div>
          {atende && <Interruptor checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} detalhe="Desligado, para de aparecer na agenda de serviços">Atendendo</Interruptor>}
        </BlocoForm>

        {atende && (<>
          <HorarioSemanal valor={f.horarios} aoMudar={(h) => setF((x) => ({ ...x, horarios: h }))} />
          <DiasEspeciais valor={f.especiais} aoMudar={(e) => setF((x) => ({ ...x, especiais: e }))} />

          <BlocoForm titulo="Comissões nos serviços">
            <div className="b-linha2">
              <label className="b-campo"><span className="rotulo">Padrão nos serviços (%)</span><input inputMode="decimal" value={f.comissao} onChange={(e) => setF({ ...f, comissao: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="Ex.: 40" /></label>
              <label className="b-campo"><span className="rotulo">Nos produtos (%)</span><input inputMode="decimal" value={f.comissaoProduto} onChange={(e) => setF({ ...f, comissaoProduto: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="Ex.: 10" /></label>
            </div>
          </BlocoForm>

          <fieldset className="pf-servicos cg-bloco">
            <legend className="cg-bloco__titulo">Serviços que faz<Tag tom={qtd ? 'neutro' : 'aviso'}>{qtd} marcado{qtd === 1 ? '' : 's'}</Tag><Ajuda titulo="Serviços que faz">Marque o que esta pessoa faz. Comissão ou tempo em branco seguem o padrão (o número cinza).</Ajuda></legend>
            {porArea.map(([area, lista]) => {
              const n = lista.filter((s) => f.servicos[s.id]).length;
              return (
                <div key={area} className="pf-grupo">
                  <div className="pf-linha pf-linha--titulo">
                    <label className="pf-nome">
                      <input type="checkbox" checked={n === lista.length} ref={(el) => { if (el) el.indeterminate = n > 0 && n < lista.length; }} onChange={(e) => marcar(lista, e.target.checked)} />
                      <strong>{area}</strong>
                    </label>
                    <span>Comissão</span>
                    <span>Tempo</span>
                  </div>
                  {lista.map((s) => {
                    const c = f.servicos[s.id];
                    return (
                      <div key={s.id} className={`pf-linha${c ? '' : ' pf-linha--fora'}`}>
                        <label className="pf-nome"><input type="checkbox" checked={!!c} onChange={(e) => marcar([s], e.target.checked)} /><span>{s.nome}</span></label>
                        <label className="pf-num">
                          <input inputMode="decimal" disabled={!c} value={c?.comissao ?? ''} placeholder={String(s.comissao ?? (num(f.comissao) || 0))} aria-label={`Comissão em ${s.nome}`}
                            onChange={(e) => mudar(s.id, 'comissao', e.target.value.replace(/[^\d,.]/g, ''))} />
                          <span>%</span>
                        </label>
                        <label className="pf-num">
                          <input inputMode="numeric" disabled={!c} value={c?.duracao ?? ''} placeholder={String(s.duracao)} aria-label={`Tempo de ${s.nome}`}
                            onChange={(e) => mudar(s.id, 'duracao', e.target.value.replace(/\D/g, '').slice(0, 3))} />
                          <span>min</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </fieldset>
        </>)}

        {daAula && (
          <fieldset className="pf-aulas cg-bloco">
            <legend className="cg-bloco__titulo">Aulas<Ajuda titulo="Valor de cada aula">Pilates: comissão sobre o valor de cada aluno na aula (o plano dividido pelas aulas dele). Yoga: valor fixo por aula dada. Contam as aulas que já terminaram, a partir da data abaixo.</Ajuda></legend>
            <div className="pf-mods" role="group" aria-label="Modalidades que a pessoa ensina">
              {['Pilates', 'Yoga'].map((t) => (
                <label key={t} className={`b-check${mods.includes(t) ? ' pf-mods--on' : ''}`}>
                  <input type="checkbox" checked={mods.includes(t)} disabled={daGrade.includes(t)} onChange={() => alternar(t)} /> {t}
                  {daGrade.includes(t) && <span className="b-suave"> · na Grade de aulas</span>}
                </label>
              ))}
            </div>
            {mods.some((t) => !daGrade.includes(t)) && <Aviso tom="info">As aulas só aparecem na agenda e no site quando o nome da pessoa estiver em quem dá a aula, na Grade de aulas (Catálogo → Grade de aulas).</Aviso>}
            <div className="pa-campos">
              {pilates && <label className="b-campo"><span className="rotulo">Pilates · % por aluno</span>
                <input inputMode="decimal" value={au.pilatesPct} placeholder="Ex.: 40" onChange={(e) => setAu({ ...au, pilatesPct: e.target.value.replace(/[^\d,.]/g, '') })} /></label>}
              {pilates && <label className="b-campo"><span className="rotulo">Aluno Wellhub · %</span>
                <input inputMode="decimal" value={au.wellhubPct} placeholder={au.pilatesPct ? `${au.pilatesPct} (igual)` : 'Ex.: 40'} onChange={(e) => setAu({ ...au, wellhubPct: e.target.value.replace(/[^\d,.]/g, '') })} /></label>}
              {yoga && <label className="b-campo"><span className="rotulo">Yoga · R$ por aula</span>
                <input inputMode="decimal" value={au.yogaPorAula} placeholder="Ex.: 60" onChange={(e) => setAu({ ...au, yogaPorAula: e.target.value.replace(/[^\d,.]/g, '') })} /></label>}
              <label className="b-campo"><span className="rotulo">Contar aulas a partir de</span>
                <input type="date" value={au.desde} onChange={(e) => setAu({ ...au, desde: e.target.value })} /></label>
            </div>
          </fieldset>
        )}
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={salvar}>Salvar profissional</BotaoAcao>
        {(temServico || (aula && !daGrade.length)) && (
          <BlocoForm titulo="Apagar cadastro" className="cg-risco" ajuda='Só apaga se não houver horário marcado daqui para a frente, bloqueio, comanda aberta ou aula na Grade. Para só parar de agendar, desmarque "Atendendo".'>
            <BotaoAcao className="botao botao--linha botao--p cg-perigo" confirmar={`Apagar o cadastro de ${p.nomeOriginal || nomeAula}? O histórico (atendimentos passados, vendas e comissões) continua com o nome.`}
              acao={async () => { setErro(''); try { aoSalvar(await chamar('excluirProfissional', { nome: p.nomeOriginal || nomeAula })); } catch (e) { setErro(e.message); } }}>
              Apagar este cadastro
            </BotaoAcao>
          </BlocoForm>
        )}
        {!temServico && daGrade.length > 0 && <Aviso tom="info">Esta pessoa aparece aqui porque dá aula na Grade de aulas. Para tirar, troque quem dá essas aulas na Grade (Catálogo → Grade de aulas).</Aviso>}
      </div>
    </Modal>
  );
}

// Tudo que pode ser vendido ou dado de presente: planos de aula, serviços e pacotes
export function useItensVenda() {
  const { dados: planos } = useDados('planos', {});
  const { dados: cat } = useDados('catalogoServicos', {});
  return useMemo(() => {
    if (!planos) return null;
    const grupos = ['Yoga', 'Pilates'].map((m) => [m, planos.filter((p) => p.ativo && p.modalidade === m).map((p) => ({ id: p.id, nome: p.nome.replace(m + ' · ', ''), preco: p.preco }))]);
    if (cat) {
      cat.categorias.forEach((c) => {
        const itens = [];
        cat.servicos.filter((s) => s.ativo && s.categoria === c).forEach((s) => {
          itens.push({ id: s.id, nome: s.nome, preco: s.preco });
          cat.pacotes.filter((p) => p.ativo && p.servicoId === s.id).forEach((p) => itens.push({ id: p.id, nome: `${p.nome ? p.nome + ' · ' : ''}${s.nome} · pacote ${p.sessoes} sessões`, preco: p.preco }));
        });
        if (itens.length) grupos.push([c, itens]);
      });
    }
    const todos = grupos.flatMap(([, l]) => l);
    return { grupos, achar: (id) => todos.find((i) => i.id === id) };
  }, [planos, cat]);
}

// comGrupo: o nome do grupo (Yoga, Pilates, categoria) vem na frente de cada opção; com vários itens na mesma tela, a opção escolhida fica clara mesmo com o seletor fechado
export function OpcoesItens({ itens, comGrupo }) {
  if (!itens) return null;
  return itens.grupos.filter(([, l]) => l.length).map(([g, l]) => (
    <optgroup key={g} label={g}>{l.map((i) => <option key={i.id} value={i.id}>{comGrupo ? `${g} · ` : ''}{i.nome} · {real(i.preco)}</option>)}</optgroup>
  ));
}

// ============================================================
//  SEMANA DE UMA PESSOA (segunda a domingo): atendimentos, aulas e bloqueios, dia a dia
// ============================================================

// semana: a mesma busca da Agenda (atendimentos, folgas, equipe com os turnos de cada dia e aulas); null enquanto carrega
export function AgendaSemana({ dia, semana, erro, aplicar, slot, aoAbrirDia }) {
  const { membro } = useBancada();
  const balcao = pode(membro, 'admin', 'recepcao');
  const inicio = segundaDe(dia);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const dados = semana;
  const aulasSem = semana?.aulas;
  const { dados: catalogo } = useDados('catalogoServicos', {});
  const [novo, setNovo] = useState(null);

  // quem dá para escolher: quem atende serviços e quem dá aula
  const pessoas = useMemo(() => {
    const n = [];
    (dados?.equipe || []).forEach((e) => n.push(e.nome));
    (aulasSem || []).forEach((a) => { if (!n.includes(a.professor)) n.push(a.professor); });
    (dados?.atendimentos || []).forEach((a) => { if (!n.includes(a.profissional)) n.push(a.profissional); });
    // quem atende serviços primeiro, depois quem só dá aula
    const servico = new Set((dados?.equipe || []).map((e) => e.nome));
    return n.filter((x) => balcao || ehDela(x, membro)).sort((a, b) => Number(servico.has(b)) - Number(servico.has(a)) || a.localeCompare(b));
  }, [dados, aulasSem, balcao, membro]);
  const [escolhida, setEscolhida] = useState(() => lerLocal('ambar_semana_pessoa', ''));
  const pessoa = pessoas.includes(escolhida) ? escolhida : pessoas[0] || '';
  const escolher = (n) => { setEscolhida(n); gravarLocal('ambar_semana_pessoa', n); };

  const eq = (dados?.equipe || []).find((e) => e.nome === pessoa);
  const atend = (dados?.atendimentos || []).filter((a) => a.profissional === pessoa);
  const aulas = (aulasSem || []).filter((a) => a.professor === pessoa);
  const folgas = (dados?.folgas || []).filter((f) => f.profissional === pessoa);
  const turnosDia = (d) => (eq?.dias?.[d] || null)?.map(([a, b]) => [min(a), min(b)]);

  const [INI, FIM] = useMemo(() => {
    let a = 7 * 60, b = 19 * 60;
    dias.forEach((d) => (turnosDia(d) || []).forEach(([x, z]) => { a = Math.min(a, x); b = Math.max(b, z); }));
    atend.forEach((x) => { a = Math.min(a, min(x.hora)); b = Math.max(b, min(x.hora) + x.duracao); });
    aulas.forEach((x) => { a = Math.min(a, min(x.hora)); b = Math.max(b, min(x.hora) + (x.duracao || 60)); });
    return [Math.floor(a / 60) * 60, Math.ceil(b / 60) * 60];
  }, [dados, aulasSem, pessoa]); // eslint-disable-line react-hooks/exhaustive-deps
  const PX = ALT / SLOT;
  const y = (m) => (m - INI) * PX;
  const altura = (FIM - INI) * PX;
  const hoje = hojeIso();
  const fora = (d) => {
    const t = turnosDia(d);
    if (!t) return eq ? [[INI, FIM]] : [];
    const r = [];
    let p = INI;
    [...t].sort((a, b) => a[0] - b[0]).forEach(([a, b]) => { if (a > p) r.push([p, Math.min(a, FIM)]); p = Math.max(p, b); });
    if (p < FIM) r.push([p, FIM]);
    return r;
  };
  const totalSemana = atend.filter((a) => a.status !== 'cancelado').length;
  // abre já rolada até o primeiro horário da pessoa na semana (uma vez por pessoa e semana)
  const quadroSem = useRef(null);
  const rolouSem = useRef('');
  useEffect(() => {
    const el = quadroSem.current;
    if (!el || !dados || !pessoa || rolouSem.current === pessoa + inicio) return;
    rolouSem.current = pessoa + inicio;
    const inicios = atend.filter((a) => a.status !== 'cancelado').map((a) => min(a.hora))
      .concat(aulas.map((a) => min(a.hora)), dias.flatMap((d) => (turnosDia(d) || []).map(([a]) => a)));
    const alvo = inicios.length ? Math.min(...inicios) - 30 : INI;
    el.scrollTop = alvo > INI + 30 ? (alvo - INI) * PX : 0;
  }, [dados, pessoa, inicio]); // eslint-disable-line react-hooks/exhaustive-deps

  const acoes = balcao && slot && createPortal(
    <button type="button" className="botao botao--cheio botao--p ag-novo" onClick={() => setNovo({ data: dia >= hoje ? dia : hoje, profissional: eq ? pessoa : '' })}>
      <span aria-hidden="true">+</span> Agendar serviço
    </button>, slot);

  if (!dados) return <>{acoes}{erro ? <Erro>{erro}</Erro> : <EsqueletoAg linhas={8} altura={46} />}</>;
  return (
    <>
      {acoes}
      <Erro>{erro}</Erro>
      <div className="sem-barra ag-sem-barra">
        {balcao ? (
          <label className="b-campo sem-pessoa"><span className="rotulo">Agenda de</span>
            <select value={pessoa} onChange={(e) => escolher(e.target.value)}>{pessoas.map((n) => <option key={n}>{n}</option>)}</select>
          </label>
        ) : <strong className="sem-pessoa__nome">{pessoa}</strong>}
        <span className="b-meta ag-sem-barra__n"><span><strong>{totalSemana}</strong> {totalSemana === 1 ? 'atendimento' : 'atendimentos'}</span><span><strong>{aulas.length}</strong> {aulas.length === 1 ? 'aula' : 'aulas'}</span><span>na semana</span></span>
      </div>
      {!pessoa ? <Vazio titulo="Ninguém para mostrar" forma="presenca">Cadastre a equipe em Catálogo → Profissionais.</Vazio> : (
        <div className="ag ag--semana" ref={quadroSem} style={{ '--visiveis': typeof window !== 'undefined' && window.innerWidth < 600 ? 3 : 7 }}>
          <div className="ag-grade" style={{ '--n': 7, '--alt': `${ALT}px` }}>
            <div className="ag-canto" aria-hidden="true" />
            {dias.map((d) => {
              const nDia = atend.filter((a) => a.data === d && a.status !== 'cancelado').length + aulas.filter((a) => a.data === d).length;
              return (
                <button key={d} type="button" className={`ag-cab sem-cab${d === hoje ? ' sem-cab--hoje' : ''}`} onClick={() => aoAbrirDia(d)} title="Abrir este dia">
                  <span className="sem-cab__dia">{DIAS_LONGOS[diaSemana(d)].slice(0, 3)}</span>
                  <strong>{Number(d.slice(8))}</strong>
                  <i className={`ag-cab__n${nDia ? '' : ' ag-cab__n--zero'}`} aria-label={nDia ? plural(nDia, 'item', 'itens') : 'nada marcado'}>{nDia || ''}</i>
                </button>
              );
            })}
            <div className="ag-horas" style={{ height: altura }} aria-hidden="true">
              {Array.from({ length: (FIM - INI) / SLOT }, (_, i) => {
                const m = INI + i * SLOT;
                return <span key={m} className={m % 60 ? 'meia' : ''} style={{ top: i * ALT }}>{hhmm(m)}</span>;
              })}
            </div>
            {dias.map((d) => {
              const t = turnosDia(d);
              return (
                <div key={d} className={`ag-col${d === hoje ? ' sem-col--hoje' : ''}`} style={{ height: altura }} aria-label={`${pessoa}, ${dataBR(d)}`}>
                  {fora(d).map(([a, b]) => <div key={a} className="ag-fora" style={{ top: y(a), height: (b - a) * PX }} />)}
                  {balcao && eq && d >= hoje && Array.from({ length: (FIM - INI) / SLOT }, (_, i) => {
                    const m = INI + i * SLOT;
                    const livre = (t || []).some(([a, b]) => m >= a && m < b);
                    return livre && (
                      <button key={m} type="button" className="ag-vago" style={{ top: i * ALT, height: ALT }} aria-label={`Agendar com ${pessoa} em ${dataBR(d)} às ${hora(hhmm(m))}`}
                        onClick={() => setNovo({ data: d, profissional: pessoa, hora: hhmm(m) })}><span>+ {hora(hhmm(m))}</span></button>
                    );
                  })}
                  {folgas.filter((f) => f.data === d).map((f) => {
                    const a = f.diaTodo ? INI : Math.max(min(f.inicio), INI);
                    const b = f.diaTodo ? FIM : Math.min(min(f.fim), FIM);
                    return b > a && <div key={f.id} className="s-folga ag-folga" style={{ top: y(a), height: (b - a) * PX }} title={f.motivo}><span>{f.motivo}</span></div>;
                  })}
                  {aulas.filter((a) => a.data === d).map((a) => {
                    const dur = a.duracao || 60;
                    return (
                      <button key={a.id} type="button" className={`ag-bloco ag-bloco--aula ag-bloco--${a.modalidade.toLowerCase()}`} style={{ top: y(min(a.hora)) + 2, height: dur * PX - 4 }} onClick={() => aoAbrirDia(d)}>
                        <span className="ag-bloco__hora">{hora(a.hora)}</span>
                        <strong>{a.modalidade}</strong>
                        <span className="ag-bloco__info">{a.ocupadosQtd} de {a.capacidade}</span>
                      </button>
                    );
                  })}
                  {atend.filter((a) => a.data === d).map((a) => (
                    <button key={a.id} type="button" onClick={() => aoAbrirDia(d)} className={`ag-bloco s-bloco--${COR_CATEGORIA[a.categoria] || 'facial'} ag-bloco--${a.status}${a.duracao < 30 ? ' ag-bloco--curto' : ''}`}
                      style={{ top: y(min(a.hora)) + 2, height: Math.max(a.duracao * PX - 4, 30) }} title={`${a.nome} · ${a.servico}`}>
                      <span className="ag-bloco__hora">{hora(a.hora)}</span>
                      <strong>{a.alertas?.length > 0 && <i className="ag-bloco__alerta" aria-label="Atenção">!</i>}{a.nome}</strong>
                      {a.duracao >= 40 && <span className="ag-bloco__info">{a.servico}</span>}
                      {a.status === 'atendido' && <i className="ag-bloco__sel ag-sel--atendido" title="Atendido" aria-hidden="true">✓</i>}
                      {a.status === 'confirmado' && <i className="ag-bloco__sel ag-sel--confirmado" title="Confirmado" aria-hidden="true">✓</i>}
                      {a.status === 'falta' && <i className="ag-bloco__sel ag-sel--falta" title="Faltou" aria-hidden="true">×</i>}
                      {(a.status === 'atendido' || a.status === 'confirmado' || a.status === 'falta') && <span className="ag-vh">{STATUS[a.status][0]}</span>}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {novo && catalogo && <NovoAtendimento inicial={novo} catalogo={catalogo} aoFechar={() => setNovo(null)} aoSalvar={(r) => { setNovo(null); aplicar(r); }} />}
    </>
  );
}
