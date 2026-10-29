import { useMemo } from 'react';
import './css/agenda-celular.css';
import { useDados, Erro, Esqueleto, Vazio, hora, hojeIso, somarDias, segundaDe, diaSemana, primeiro as primeiroNome, plural, MESES_LONGOS } from './ui.jsx';
import { COR_CATEGORIA, iniciais, primeiroDoMes, mesMais, tituloMes, obsDaEquipe } from './agendaUtil.js';

// ============================================================
//  AGENDA NO CELULAR (pedido das profissionais, out/2026: "como no app do Avec")
//  Dia: lista de cartões na ordem do relógio, com os horários livres e a linha de agora.
//  Mês: calendário com os horários de cada dia; toque no dia abre o Dia.
//  (a Semana compacta é a mesma grade de Servicos.jsx, só mais estreita)
// ============================================================
const min = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const SLOT = 30;
const ESTADO = { confirmado: ['✓', 'Confirmado'], atendido: ['✓', 'Atendido'], falta: ['×', 'Faltou'] };
const PAGAMENTO = { pago: 'pago', pacote: 'pacote', cortesia: 'cortesia', no_dia: 'paga no dia' };
const pedeRemarcar = (a) => a.resposta === 'remarcar' && (a.status === 'agendado' || a.status === 'confirmado');
// primeiro nome sem o título ("Dra. Paula Mendes" → "Paula")
const primeiro = (n) => primeiroNome(String(n || '').replace(/^(dra?\.?|prof\.?)\s+/i, ''));
const cor = (a) => COR_CATEGORIA[a.categoria] || 'facial';

// Quem aparece na agenda: "Todas" e uma pastilha por pessoa (só a equipe do balcão escolhe; a profissional vê só a dela)
export function Pessoas({ colunas, pessoa, aoEscolher, contar }) {
  return (
    <div className="am-pessoas" role="group" aria-label="Agenda de quem">
      <button type="button" className="am-pessoa" aria-pressed={!pessoa} onClick={() => aoEscolher('')}>Todas</button>
      {colunas.map((c) => {
        const n = contar(c.nome);
        return (
          <button key={c.nome} type="button" className={`am-pessoa am-pessoa--${c.grupo}`} aria-pressed={pessoa === c.nome} onClick={() => aoEscolher(c.nome)}>
            <span className="am-pessoa__av" aria-hidden="true">{iniciais(c.nome)}</span>{primeiro(c.nome)}{n > 0 && <small>{n}</small>}
          </button>
        );
      })}
    </div>
  );
}

// horários livres de quem atende serviços: o turno menos o que já está ocupado (atendimento, aula ou bloqueio)
function lacunas(turnos, ocupados, desde) {
  const r = [];
  const lista = [...ocupados].sort((a, b) => a[0] - b[0]);
  (turnos || []).forEach(([a, b]) => {
    let p = Math.max(a, desde);
    lista.forEach(([x, y]) => {
      if (y <= p || x >= b) return;
      if (x - p >= SLOT) r.push([p, x]);
      p = Math.max(p, y);
    });
    if (b - p >= SLOT) r.push([p, b]);
  });
  return r;
}

export function DiaLista({ dia, colunas, pessoa, lista, aulas, folgas, ehHoje, minutoAgora, podeAgendar, aoAtendimento, aoAula, aoFolga, aoAgendar }) {
  const col = pessoa ? colunas.find((c) => c.nome === pessoa) : colunas.length === 1 ? colunas[0] : null;
  const unica = !!col; // uma pessoa só: mostra os horários livres e não repete o nome em cada cartão
  const linhas = useMemo(() => {
    const dela = (nome) => !pessoa || nome === pessoa;
    const itens = [];
    lista.filter((a) => dela(a.profissional)).forEach((a) => itens.push({ k: `a${a.id}`, tipo: 'atend', ini: min(a.hora), fim: min(a.hora) + a.duracao, a }));
    aulas.filter((a) => dela(a.professor)).forEach((a) => itens.push({ k: `u${a.id}`, tipo: 'aula', ini: min(a.hora), fim: min(a.hora) + (a.duracao || 60), a }));
    folgas.filter((f) => dela(f.profissional)).forEach((f) => itens.push({ k: `f${f.id}`, tipo: 'folga', ini: f.diaTodo ? 0 : min(f.inicio), fim: f.diaTodo ? 1440 : min(f.fim), f }));
    if (col && col.tipo === 'servico' && col.turnos && dia >= hojeIso()) {
      const ocupados = itens.filter((i) => !(i.tipo === 'atend' && i.a.status === 'falta')).map((i) => [i.ini, i.fim]);
      const desde = ehHoje ? Math.ceil(minutoAgora / 15) * 15 : 0;
      lacunas(col.turnos, ocupados, desde).forEach(([a, b]) => itens.push({ k: `l${a}`, tipo: 'livre', ini: a, fim: b }));
    }
    itens.sort((x, y) => x.ini - y.ini || x.fim - y.fim);
    if (ehHoje && itens.length) {
      const i = itens.findIndex((x) => x.ini > minutoAgora);
      itens.splice(i < 0 ? itens.length : i, 0, { k: 'agora', tipo: 'agora', ini: minutoAgora });
    }
    return itens;
  }, [dia, pessoa, lista, aulas, folgas, ehHoje, minutoAgora, col]);

  if (!linhas.some((x) => x.tipo !== 'agora' && x.tipo !== 'livre')) {
    const livres = linhas.filter((x) => x.tipo === 'livre');
    if (!livres.length) {
      return (
        <Vazio titulo="Nada marcado neste dia" forma="presenca">
          {col && col.turnos && col.turnos.length === 0 ? `${primeiro(col.nome)} não atende neste dia.` : 'Sem atendimentos, aulas nem bloqueios. Escolha outro dia na faixa acima.'}
        </Vazio>
      );
    }
  }
  return (
    <ol className="am-lista" aria-label="Agenda do dia">
      {linhas.map((x) => {
        if (x.tipo === 'agora') {
          return <li key={x.k} className="am-agora" aria-label={`Agora, ${hora(hhmm(x.ini))}`}><span>{hora(hhmm(x.ini))}</span><i aria-hidden="true" /></li>;
        }
        if (x.tipo === 'livre') {
          // toca no começo do horário livre (nas meias horas, como as linhas da agenda no computador)
          const quando = Math.ceil(x.ini / SLOT) * SLOT;
          const texto = <>Livre das {hora(hhmm(x.ini))} às {hora(hhmm(x.fim))}</>;
          return (
            <li key={x.k} className="am-linha am-linha--livre">
              <div className="am-hora"><small>{hora(hhmm(x.ini))}</small></div>
              {podeAgendar && quando < x.fim ? (
                <button type="button" className="am-livre" onClick={() => aoAgendar({ data: dia, profissional: col.nome, hora: hhmm(quando) })}>
                  <span>{texto}</span><b aria-hidden="true">+ Agendar</b>
                </button>
              ) : <div className="am-livre am-livre--so"><span>{texto}</span></div>}
            </li>
          );
        }
        const hh = (
          <div className="am-hora"><strong>{hora(hhmm(x.ini))}</strong>{x.fim < 1440 && <small>{hora(hhmm(x.fim))}</small>}</div>
        );
        if (x.tipo === 'folga') {
          const f = x.f;
          return (
            <li key={x.k} className="am-linha">
              {f.diaTodo ? <div className="am-hora"><strong>Dia</strong><small>todo</small></div> : hh}
              <button type="button" className="am-card am-card--folga" disabled={!podeAgendar} onClick={() => aoFolga(f)}>
                <strong>Bloqueado{!unica && f.profissional ? ` · ${primeiro(f.profissional)}` : ''}</strong>
                <span className="am-card__serv">{f.motivo || 'Horário bloqueado'}</span>
              </button>
            </li>
          );
        }
        if (x.tipo === 'aula') {
          const a = x.a;
          return (
            <li key={x.k} className="am-linha">
              {hh}
              <button type="button" className={`am-card am-card--aula am-card--${a.modalidade.toLowerCase()}`} onClick={() => aoAula(a)}>
                <strong>{a.modalidade}{!unica && a.professor ? ` · ${primeiro(a.professor)}` : ''}</strong>
                <span className="am-card__serv">{a.ocupadosQtd} de {a.capacidade} {a.capacidade === 1 ? 'lugar' : 'lugares'}{a.titular ? ` · cobrindo ${primeiro(a.titular)}` : ''}</span>
              </button>
            </li>
          );
        }
        const a = x.a;
        const est = ESTADO[a.status];
        return (
          <li key={x.k} className="am-linha">
            {hh}
            <button type="button" className={`am-card s-bloco--${cor(a)} am-card--${a.status}${pedeRemarcar(a) ? ' am-card--remarcar' : ''}`} onClick={() => aoAtendimento(a)}>
              <span className="am-card__nome">
                {a.alertas?.length > 0 && <i className="am-alerta" aria-label="Atenção: ver alertas">!</i>}
                <strong>{a.nome}</strong>
                {est && <i className={`am-estado am-estado--${a.status}`} aria-hidden="true">{est[0]}</i>}
                {est && <span className="am-so-leitor">{est[1]}</span>}
              </span>
              <span className="am-card__serv">{a.servico}</span>
              {obsDaEquipe(a.obs) && <span className="am-card__obs">{obsDaEquipe(a.obs)}</span>}
              <span className="am-card__rodape">
                {!unica && <span>{primeiro(a.profissional)}</span>}
                <span>{a.duracao} min</span>
                {(a.pagamento === 'pago' || a.pagamento === 'pacote') && <span className={`am-pg am-pg--${a.pagamento}`}>{PAGAMENTO[a.pagamento]}</span>}
                {pedeRemarcar(a) && <span className="am-pg am-pg--remarcar">quer remarcar</span>}
                {a.titular && <span>cobrindo {primeiro(a.titular)}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ============================================================
//  MÊS: calendário de segunda a domingo, com os horários de cada dia
// ============================================================
const CABECA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
export function MesCelular({ dia, pessoa, balcao, aoAbrirDia, aoEscolherPessoa }) {
  const primeiro1 = primeiroDoMes(dia);
  const de = segundaDe(primeiro1);
  const { dados, erro, atual } = useDados('agendaMes', { de, dias: 42 });
  const pronto = !!dados && atual;
  const hoje = hojeIso();
  const mes = dia.slice(0, 7);
  const diasNoMes = Math.round((new Date(mesMais(primeiro1, 1)) - new Date(primeiro1)) / 86400000);
  const semanas = Math.ceil((((diaSemana(primeiro1) + 6) % 7) + diasNoMes) / 7);
  const dias = Array.from({ length: semanas * 7 }, (_, i) => somarDias(de, i));

  const nomes = useMemo(() => {
    const n = new Set();
    (dados?.atendimentos || []).forEach((a) => n.add(a.profissional));
    (dados?.aulas || []).forEach((a) => n.add(a.professor));
    return [...n].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [dados]);
  const ativa = pessoa && nomes.includes(pessoa) ? pessoa : '';
  const dela = (nome) => !ativa || nome === ativa;
  const porDia = useMemo(() => {
    const m = {};
    const poe = (d, item) => { (m[d] = m[d] || { itens: [], fechado: false }).itens.push(item); };
    (dados?.atendimentos || []).filter((a) => dela(a.profissional)).forEach((a) => poe(a.data, { k: `a${a.id}`, hora: a.hora, classe: `s-bloco--${cor(a)} am-chip--${a.status}` }));
    (dados?.aulas || []).filter((a) => dela(a.professor)).forEach((a) => poe(a.data, { k: `u${a.id}`, hora: a.hora, classe: `am-chip--aula am-chip--${a.modalidade.toLowerCase()}` }));
    (dados?.folgas || []).filter((f) => dela(f.profissional) && f.diaTodo).forEach((f) => { (m[f.data] = m[f.data] || { itens: [] }).fechado = true; });
    Object.values(m).forEach((x) => x.itens.sort((p, q) => p.hora.localeCompare(q.hora)));
    return m;
  }, [dados, ativa]); // eslint-disable-line react-hooks/exhaustive-deps
  const totais = useMemo(() => {
    let at = 0, au = 0;
    (dados?.atendimentos || []).filter((a) => dela(a.profissional) && a.data.startsWith(mes)).forEach(() => { at += 1; });
    (dados?.aulas || []).filter((a) => dela(a.professor) && a.data.startsWith(mes)).forEach(() => { au += 1; });
    return { at, au };
  }, [dados, ativa, mes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Erro>{erro}</Erro>
      {balcao && nomes.length > 1 && (
        <div className="am-pessoas" role="group" aria-label="Agenda de quem">
          <button type="button" className="am-pessoa" aria-pressed={!ativa} onClick={() => aoEscolherPessoa('')}>Todas</button>
          {nomes.map((n) => <button key={n} type="button" className="am-pessoa" aria-pressed={ativa === n} onClick={() => aoEscolherPessoa(n)}><span className="am-pessoa__av" aria-hidden="true">{iniciais(n)}</span>{primeiro(n)}</button>)}
        </div>
      )}
      {!pronto && !erro && <Esqueleto linhas={6} altura={56} />}
      {pronto && (
        <>
          <div className="am-mes" role="grid" aria-label={tituloMes(primeiro1)}>
            <div className="am-mes__cab" role="row">{CABECA.map((d) => <span key={d} role="columnheader">{d}</span>)}</div>
            {Array.from({ length: semanas }, (_, s) => (
              <div key={s} className="am-mes__semana" role="row">
                {dias.slice(s * 7, s * 7 + 7).map((d) => {
                  const x = porDia[d];
                  const n = x?.itens.length || 0;
                  const fora = !d.startsWith(mes);
                  return (
                    <button key={d} type="button" role="gridcell" className={`am-dia${fora ? ' am-dia--fora' : ''}${d === hoje ? ' am-dia--hoje' : ''}${d === dia ? ' am-dia--sel' : ''}${x?.fechado ? ' am-dia--fechado' : ''}`}
                      onClick={() => aoAbrirDia(d)} aria-label={`${Number(d.slice(8))} de ${MESES_LONGOS[Number(d.slice(5, 7)) - 1]}${n ? `, ${plural(n, 'compromisso', 'compromissos')}` : ', nada marcado'}${x?.fechado ? ', dia bloqueado' : ''}`}>
                      <span className="am-dia__n" aria-hidden="true">{Number(d.slice(8))}</span>
                      {x?.itens.slice(0, 2).map((i) => <span key={i.k} className={`am-chip ${i.classe}`} aria-hidden="true">{hora(i.hora)}</span>)}
                      {n > 2 && <span className="am-mais" aria-hidden="true">+{n - 2}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="am-mes__total b-meta">
            <span><strong>{totais.at}</strong> {totais.at === 1 ? 'atendimento' : 'atendimentos'}</span>
            <span><strong>{totais.au}</strong> {totais.au === 1 ? 'aula' : 'aulas'}</span>
            <span>em {MESES_LONGOS[Number(mes.slice(5)) - 1]}</span>
          </p>
        </>
      )}
    </>
  );
}
