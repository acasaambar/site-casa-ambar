import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBancada } from './sessao.jsx';
import { useDados, Esqueleto, Erro, Cabecalho, Abas, BotaoAcao, Tag, Aviso, Secao, Vazio, BANDEIRAS, real, numBR, plural, hojeIso, dataBR, DIAS, DIAS_LONGOS } from './ui.jsx';
import { FORMAS_TAXA, taxaPct, aPartirDoCobrado, aPartirDoLiquido, prazoDias, somarDiasUteis } from './taxas.js';
import { PainelVelocidade } from './Velocidade.jsx';
import { Interruptor, Barra } from './CatalogoPecas.jsx';
import './css/catalogo.css';
import './css/grade-aulas.css';

// [chave, texto, unidade]: o que o site e a bancada seguem
const CAMPOS = [
  ['checkinAbreMinAntes', 'Check-in abre antes da aula', 'min'],
  ['reservarAteHorasAntes', 'Reserva pelo site até', 'h antes'],
  ['cancelarAteHorasAntes', 'Cancelamento permitido até', 'h antes'],
  ['diasVisiveis', 'Dias de aulas que o site mostra', 'dias'],
  ['reservaPendenteMin', 'Tapete guardado durante o pagamento', 'min'],
  ['valeValidadeDias', 'Validade padrão do vale-presente', 'dias'],
  ['wellhubReservasPorDia', 'Reservas pelo Wellhub por dia', 'por dia'],
];
const CAMPO = Object.fromEntries(CAMPOS.map((c) => [c[0], c]));

export default function Ajustes() {
  const local = useLocation();
  const [aba, setAba] = useState(local.state?.aba || 'site');
  return (
    <>
      <Cabecalho titulo="Ajustes">Site, regras da bancada, taxas e registro</Cabecalho>
      <Abas atual={aba} aoMudar={setAba} itens={[['site', 'Site'], ['regras', 'Regras'], ['taxas', 'Taxas da maquininha'], ['calculadora', 'Calculadora de taxas'], ['registro', 'Registro de ações'], ['velocidade', 'Velocidade']]} />
      {aba === 'site' && <Site />}
      {aba === 'regras' && <Regras />}
      {aba === 'taxas' && <Taxas />}
      {aba === 'calculadora' && <CalculadoraTaxas />}
      {aba === 'registro' && <Registro />}
      {aba === 'velocidade' && <PainelVelocidade />}
    </>
  );
}

function Regras() {
  const { chamar } = useBancada();
  const { dados, erro, carregando, setDados } = useDados('ajustes', {});
  const [f, setF] = useState(null);
  const [aviso, setAviso] = useState('');
  const [erroS, setErroS] = useState('');
  useEffect(() => { if (dados) setF(dados); }, [dados]);
  if (carregando && !f) return <Esqueleto linhas={6} altura={48} />;
  if (!f) return <Erro>{erro}</Erro>;
  const numero = (k) => {
    const [, t, u] = CAMPO[k];
    return (
      <label key={k} className="cg-regra">
        <span className="cg-regra__txt">{t}</span>
        <span className="cg-regra__valor"><input type="number" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /><small>{u}</small></span>
      </label>
    );
  };
  const chave = (k, texto) => <Interruptor key={k} checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })}>{texto}</Interruptor>;
  return (
    <>
      <div className="cg-regras">
        <div className="cg-regras__col">
        <section className="b-cartao cg-regras__cartao">
          <Secao titulo="Lembretes por e-mail" ajuda="Enviados na véspera, para quem tem horário marcado.">
            {chave('lembreteServicos', 'Véspera dos serviços')}
            {chave('lembreteAulas', 'Véspera das aulas de Yoga e Pilates')}
          </Secao>
        </section>
        </div>
        <div className="cg-regras__col">
        <section className="b-cartao cg-regras__cartao">
          <Secao titulo="Wellhub">
            {chave('wellhubAtivo', 'Aceitar reservas pelo Wellhub')}
            {chave('wellhubPendentePodeReservar', 'Pode reservar antes da recepção confirmar')}
            {numero('wellhubReservasPorDia')}
          </Secao>
        </section>
        <section className="b-cartao cg-regras__cartao">
          <Secao titulo="Vale-presente">
            {numero('valeValidadeDias')}
          </Secao>
        </section>
        <section className="b-cartao cg-regras__cartao cg-sistema">
          <Secao titulo="Sistema">
            <dl className="cg-dados">
              <div><dt>Pagamento online</dt><dd>{f.pagamentoComChave ? <Tag tom="ok">Chave InfinitePay ativa</Tag> : <Tag tom="aviso">Sem chave: trimestral pela recepção</Tag>}</dd></div>
              <div><dt>E-mails restantes hoje</dt><dd><strong>{f.emailsRestantes ?? '—'}</strong></dd></div>
              <div><dt>Últimos lembretes</dt><dd>{f.ultimosLembretes ? f.ultimosLembretes.slice(0, 16).split(' ').map((x, i) => (i ? x : x.split('-').reverse().join('/'))).join(' ') : 'nenhum ainda'}</dd></div>
              <div><dt>Versão</dt><dd className="b-suave">{f.versao}</dd></div>
            </dl>
          </Secao>
        </section>
        </div>
      </div>
      <div className="b-salvar-fixo cg-salvar">
        <div className="cg-salvar__msg">
          {aviso && <Aviso tom="ok">{aviso}</Aviso>}
          <Erro>{erroS}</Erro>
        </div>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setAviso(''); setErroS('');
          try {
            const r = await chamar('salvarAjustes', { ajustes: Object.fromEntries(['valeValidadeDias', 'wellhubReservasPorDia'].map((k) => [k, Number(f[k])]).concat([['wellhubAtivo', !!f.wellhubAtivo], ['wellhubPendentePodeReservar', !!f.wellhubPendentePodeReservar], ['lembreteServicos', !!f.lembreteServicos], ['lembreteAulas', !!f.lembreteAulas]])) });
            setDados(r); setAviso('Salvo.');
          } catch (e) { setErroS(e.message); }
        }}>Salvar regras</BotaoAcao>
      </div>
    </>
  );
}

// ============================================================
//  SITE: o que o público vê e pode fazer pelo site
// ============================================================
const PRAZOS_SITE = ['reservarAteHorasAntes', 'cancelarAteHorasAntes', 'checkinAbreMinAntes', 'diasVisiveis', 'reservaPendenteMin'];
const SEMANA = [1, 2, 3, 4, 5, 6, 0]; // seg … dom
const MODS = ['Yoga', 'Pilates'];

function Site() {
  const { chamar } = useBancada();
  const navegar = useNavigate();
  const { dados, erro, carregando, setDados } = useDados('ajustes', {});
  const { dados: grade } = useDados('grade', {});
  const [f, setF] = useState(null);
  const [ok, setOk] = useState('');
  const [erroS, setErroS] = useState('');
  useEffect(() => {
    if (!dados) return;
    setF({ ...dados, siteAviso: { ativo: false, texto: '', ate: '', ...(dados.siteAviso || {}) }, siteSemReserva: { Yoga: [], Pilates: [], ...(dados.siteSemReserva || {}) } });
  }, [dados]);
  if (carregando && !f) return <Esqueleto linhas={6} altura={48} />;
  if (!f) return <Erro>{erro}</Erro>;

  const av = f.siteAviso;
  const mudarAviso = (mud) => { setF({ ...f, siteAviso: { ...av, ...mud } }); setOk(''); };
  const fechados = f.siteSemReserva;
  const alternar = (m, d) => {
    const l = fechados[m] || [];
    setF({ ...f, siteSemReserva: { ...fechados, [m]: l.includes(d) ? l.filter((x) => x !== d) : [...l, d] } });
    setOk('');
  };
  const todos = (m, fechar) => { setF({ ...f, siteSemReserva: { ...fechados, [m]: fechar ? [...SEMANA] : [] } }); setOk(''); };
  const aulasNoDia = (m, d) => (grade || []).filter((g) => g.ativo && g.modalidade === m && g.dia === d).length;
  const numero = (k) => {
    const [, t, u] = CAMPO[k];
    return (
      <label key={k} className="cg-regra">
        <span className="cg-regra__txt">{t}</span>
        <span className="cg-regra__valor"><input type="number" value={f[k]} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setOk(''); }} /><small>{u}</small></span>
      </label>
    );
  };
  const vencido = av.ate && av.ate < hojeIso();
  const noAr = av.ativo && av.texto.trim().length >= 3 && !vencido;
  const fechadosTexto = MODS.filter((m) => (fechados[m] || []).length).map((m) => (fechados[m].length === 7 ? `${m}: todos os dias` : `${m}: ${SEMANA.filter((d) => fechados[m].includes(d)).map((d) => DIAS[d]).join(', ')}`));
  const atalho = (titulo, linha, para, estado) => (
    <button type="button" className="st-atalho" onClick={() => navegar(para, estado ? { state: estado } : undefined)}>
      <strong>{titulo}</strong><span>{linha}</span><span className="st-atalho__seta" aria-hidden="true">→</span>
    </button>
  );

  return (
    <>
      <div className="st-resumo" aria-live="polite">
        <span className={`st-resumo__item${noAr ? ' st-resumo__item--on' : ''}`}><strong>Aviso no topo</strong>{noAr ? (av.ate ? `no ar até ${dataBR(av.ate)}` : 'no ar') : 'desligado'}</span>
        <span className={`st-resumo__item${fechadosTexto.length ? ' st-resumo__item--alerta' : ' st-resumo__item--on'}`}><strong>Reservas pelo site</strong>{fechadosTexto.length ? `só recepção · ${fechadosTexto.join(' · ')}` : 'abertas em todos os dias'}</span>
        <span className="st-resumo__item"><strong>Prazos</strong>reserva {f.reservarAteHorasAntes} h antes · cancela até {f.cancelarAteHorasAntes} h antes</span>
      </div>

      <div className="cg-regras">
        <div className="cg-regras__col">
          <section className="b-cartao cg-regras__cartao">
            <Secao titulo="Reservas pelo site" ajuda="Dia desmarcado: as aulas daquela modalidade continuam aparecendo no site, mas com o botão &quot;Falar com a recepção&quot; (WhatsApp). A recepção continua marcando pela bancada normalmente. Para tirar a aula de um dia específico (feriado, folga), use Bloquear um dia ou aula.">
              <p className="st-legenda"><span className="st-legenda__ok">✓ reserva pelo site</span><span className="st-legenda__nao">✕ só pela recepção</span><span>toque no dia para trocar</span></p>
              {MODS.map((m) => {
                const l = fechados[m] || [];
                return (
                  <div key={m} className="st-mod">
                    <div className="st-mod__topo">
                      <strong className={`st-mod__nome st-mod__nome--${m.toLowerCase()}`}>{m}</strong>
                      <span className="b-suave">{l.length === 0 ? 'todos os dias pelo site' : l.length === 7 ? 'só pela recepção' : `${plural(7 - l.length, 'dia', 'dias')} pelo site`}</span>
                      <button type="button" className="botao botao--fantasma botao--p" onClick={() => todos(m, l.length < 7)}>{l.length < 7 ? 'Pausar tudo' : 'Abrir tudo'}</button>
                    </div>
                    <div className="st-dias" role="group" aria-label={`Dias em que ${m} pode ser reservado pelo site`}>
                      {SEMANA.map((d) => {
                        const aberto = !l.includes(d);
                        const n = aulasNoDia(m, d);
                        return (
                          <button key={d} type="button" className={`st-dia${aberto ? '' : ' st-dia--fechado'}${n ? '' : ' st-dia--sem'}`} aria-pressed={aberto} onClick={() => alternar(m, d)}
                            aria-label={`${DIAS_LONGOS[d]}: ${aberto ? 'reserva pelo site' : 'só pela recepção'}${grade ? ` (${plural(n, 'aula', 'aulas')} na grade)` : ''}`}>
                            <span className="st-dia__nome">{DIAS[d]}</span>
                            <span className="st-dia__marca" aria-hidden="true">{aberto ? '✓' : '✕'}</span>
                            {grade && <small className="st-dia__n">{n ? plural(n, 'aula', 'aulas') : 'sem aula'}</small>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Secao>
          </section>
          <section className="b-cartao cg-regras__cartao">
            <Secao titulo="Prazos do site">
              {PRAZOS_SITE.map(numero)}
            </Secao>
          </section>
        </div>
        <div className="cg-regras__col">
          <section className="b-cartao cg-regras__cartao">
            <Secao titulo="Aviso no topo do site" ajuda="Uma faixa no alto de todas as páginas do site e da área do aluno. Bom para feriado, aula cancelada, horário especial. Quem fecha a faixa não a vê de novo até o texto mudar.">
              <Interruptor checked={!!av.ativo} onChange={(e) => mudarAviso({ ativo: e.target.checked })}>Mostrar o aviso no site</Interruptor>
              <label className="b-campo">
                <span className="rotulo">Texto do aviso</span>
                <textarea rows={3} maxLength={200} value={av.texto} placeholder="Ex.: Sábado, 22/11, não teremos aula de Yoga. Bom descanso!" onChange={(e) => mudarAviso({ texto: e.target.value })} />
                <small className="cl-dica st-conta">{av.texto.length}/200</small>
              </label>
              <label className="b-campo">
                <span className="rotulo">Mostrar até (opcional)</span>
                <input type="date" value={av.ate} min={hojeIso()} onChange={(e) => mudarAviso({ ate: e.target.value })} />
                <small className="cl-dica">{av.ate ? `Some sozinho depois de ${dataBR(av.ate)}.` : 'Vazio: fica até você desligar.'}</small>
              </label>
              {vencido && <Aviso tom="aviso">A data já passou: o aviso não aparece. Mude a data ou deixe em branco.</Aviso>}
              <div className="st-previa" aria-hidden={!av.texto}>
                <span className="rotulo">Como fica no site</span>
                <div className={`st-previa__faixa${noAr ? '' : ' st-previa__faixa--off'}`}>{av.texto.trim() || 'Escreva o aviso acima'}</div>
              </div>
            </Secao>
          </section>
          <section className="b-cartao cg-regras__cartao">
            <Secao titulo="Mais do site">
              <div className="st-atalhos">
                {atalho('Bloquear um dia ou aula', 'Feriado, folga, aula cancelada (some do site)', '/bancada/grade', { aba: 'bloqueios' })}
                {atalho('Grade de aulas', 'Dias, horários, vagas e pausar uma aula fixa', '/bancada/grade', { aba: 'grade' })}
                {atalho('Planos e preços', 'O que aparece em Meu plano no site', '/bancada/grade', { aba: 'planos' })}
                {atalho('Promoções e cupons', 'Descontos e aulas de presente do site', '/bancada/marketing', { aba: 'promocoes' })}
                <a className="st-atalho" href={`${import.meta.env.BASE_URL}#/`} target="_blank" rel="noreferrer">
                  <strong>Ver o site</strong><span>Abre numa aba nova</span><span className="st-atalho__seta" aria-hidden="true">↗</span>
                </a>
              </div>
            </Secao>
          </section>
        </div>
      </div>
      <div className="b-salvar-fixo cg-salvar">
        <div className="cg-salvar__msg">
          {ok && <Aviso tom="ok">{ok}</Aviso>}
          <Erro>{erroS}</Erro>
        </div>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setOk(''); setErroS('');
          try {
            const ajustes = Object.fromEntries(PRAZOS_SITE.map((k) => [k, Number(f[k])]));
            ajustes.siteAviso = { ativo: !!av.ativo, texto: av.texto, ate: av.ate || '' };
            ajustes.siteSemReserva = fechados;
            const r = await chamar('salvarAjustes', { ajustes });
            setDados(r); setOk('Salvo. O site já mostra as mudanças (quem está com o site aberto vê em até 5 minutos).');
          } catch (e) { setErroS(e.message); }
        }}>Salvar o site</BotaoAcao>
      </div>
    </>
  );
}

// taxas da InfinitePay (maquininha e link): o Financeiro e o Caixa desconta de cada venda a taxa da bandeira e das parcelas
const PARCELAS = Array.from({ length: 12 }, (_, i) => i + 1);
const PRAZOS = [['pix', 'Pix'], ['debito', 'Débito'], ['credito', 'Crédito'], ['link', 'Link e site']];
const GRUPOS = [['vm', 'Visa e Mastercard', 'Visa / Master'], ['elo', 'Elo', 'Elo'], ['amex', 'American Express', 'Amex']];
const pctTxt = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const pctNum = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return String(v ?? '').trim() === '' || Number.isNaN(n) ? null : n; };
const colunaTxt = (c) => PARCELAS.map((_, i) => pctTxt(c?.[i]));
const colunaNum = (c) => c.map(pctNum);
const comoTexto = (tx) => ({
  pix: pctTxt(tx?.pix ?? 0),
  debito: Object.fromEntries(GRUPOS.map(([g]) => [g, pctTxt(tx?.debito?.[g])])),
  credito: Object.fromEntries(GRUPOS.map(([g]) => [g, colunaTxt(tx?.credito?.[g])])),
  link: colunaTxt(tx?.link),
  linkAcrescimo: pctTxt(tx?.linkAcrescimo ?? 1),
  prazos: Object.fromEntries(PRAZOS.map(([k]) => [k, String(tx?.prazos?.[k] ?? 0)])),
});
// completa as parcelas em branco entre duas informadas (ex.: 2x e 12x), em passos iguais
function completarMeio(col) {
  const novo = col.slice();
  const cheios = col.map((v, i) => [pctNum(v), i]).filter(([n]) => n != null);
  for (let k = 0; k < cheios.length - 1; k++) {
    const [n0, i0] = cheios[k]; const [n1, i1] = cheios[k + 1];
    for (let i = i0 + 1; i < i1; i++) novo[i] = pctTxt(Math.round((n0 + ((n1 - n0) * (i - i0)) / (i1 - i0)) * 100) / 100);
  }
  return novo;
}
const faltando = (t, comLink = true) => {
  const falta = (c, quem) => (c.slice(1).some((v) => pctNum(v) == null) ? [quem] : []);
  return [...falta(t.credito.vm, 'crédito Visa e Mastercard'), ...falta(t.credito.elo, 'crédito Elo'), ...falta(t.credito.amex, 'crédito American Express'), ...(comLink ? falta(t.link, 'link') : [])];
};
const paraSalvar = (t, comLink) => ({
  pix: pctNum(t.pix) ?? 0, debito: Object.fromEntries(GRUPOS.map(([g]) => [g, pctNum(t.debito[g])])),
  credito: Object.fromEntries(GRUPOS.map(([g]) => [g, colunaNum(t.credito[g])])), link: comLink ? colunaNum(t.link) : null,
  ...(comLink ? {} : { linkAcrescimo: pctNum(t.linkAcrescimo) ?? 0 }),
  prazos: Object.fromEntries(PRAZOS.map(([k]) => [k, Number(t.prazos[k]) || 0])),
});
// duas tabelas: a maquininha da Rede (balcão a partir de redeDesde) e a InfinitePay (site, link e vendas antes da troca)
const TABELAS = [['rede', 'Rede · balcão'], ['infinite', 'InfinitePay · site e link']];

function CampoPct({ valor, aoMudar, rotulo, vazio }) {
  return (
    <span className="tx-pct">
      <input inputMode="decimal" value={valor} placeholder={vazio || '—'} aria-label={rotulo} onChange={(e) => aoMudar(e.target.value.replace(/[^\d,.]/g, ''))} />
      <small>%</small>
    </span>
  );
}

function Taxas() {
  const { chamar } = useBancada();
  const { dados, erro, carregando, setDados } = useDados('ajustes', {});
  const [tabs, setTabs] = useState(null);
  const [qual, setQual] = useState('rede');
  const [desde, setDesde] = useState('');
  const [liquida, setLiquida] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erroS, setErroS] = useState('');
  useEffect(() => {
    if (!dados) return;
    setTabs({ rede: comoTexto(dados.taxasRede), infinite: comoTexto(dados.taxas) });
    setDesde(dados.redeDesde || '');
    setLiquida(dados.comissaoLiquida !== false);
  }, [dados]);
  if (carregando && !tabs) return <Esqueleto linhas={6} altura={48} />;
  if (!tabs) return <Erro>{erro}</Erro>;
  const rede = qual === 'rede';
  const t = tabs[qual];
  const setT = (n) => setTabs({ ...tabs, [qual]: n });
  const mudaCredito = (g, i, v) => setT({ ...t, credito: { ...t.credito, [g]: t.credito[g].map((x, k) => (k === i ? v : x)) } });
  const mudaLink = (i, v) => setT({ ...t, link: t.link.map((x, k) => (k === i ? v : x)) });
  const pendentes = faltando(t, !rede);
  const nomeMaq = rede ? 'Rede' : 'InfinitePay';
  return (
    <div className="tx">
      <Barra resumo={rede ? 'Maquininha da Rede (Itaú), com antecipação' : 'InfinitePay: site, link e vendas antes da troca'} titulo="Taxas da maquininha" ajuda={(
        <>
          <span>Em cada venda o sistema usa a taxa da <strong>bandeira</strong> e do <strong>número de parcelas</strong>, e o Financeiro e o Caixa mostram quanto realmente cai na conta.</span>
          <span><strong>Duas tabelas:</strong> a da <strong>Rede</strong> vale para o débito, o crédito e o Pix do balcão (venda, agenda e comanda) a partir do dia escolhido abaixo. A da <strong>InfinitePay</strong> vale para o pagamento pelo site, para o link e para tudo o que foi vendido antes da troca, assim o caixa, os relatórios e as comissões antigos não mudam.</span>
          <span>Se uma taxa mudar, é só editar aqui.</span>
        </>
      )} />
      <section className="b-cartao tx-cartao tx-troca">
        <div className="tx-troca__linha">
          <label className="b-campo tx-troca__data">
            <span className="rotulo">Maquininha da Rede a partir de</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <p className="b-suave tx-troca__txt">
            {desde ? <>Do dia <strong>{dataBR(desde)}</strong> em diante, débito, crédito e Pix do balcão usam a tabela da <strong>Rede</strong>. Antes disso, e no site e no link, vale a da <strong>InfinitePay</strong>.</>
              : <>Ainda sem data: todas as vendas usam a tabela da <strong>InfinitePay</strong>. Escolha o dia em que a maquininha da Rede começou a ser usada e salve.</>}
          </p>
        </div>
        <div className="b-seg-linha" role="tablist" aria-label="Tabela">
          {TABELAS.map(([k, nome]) => (
            <button key={k} type="button" role="tab" aria-selected={qual === k} className={`tx-aba${qual === k ? ' tx-aba--ativa' : ''}`} onClick={() => setQual(k)}>{nome}</button>
          ))}
        </div>
      </section>
      {pendentes.length > 0 && (
        <Aviso tom="aviso" titulo="Faltam as taxas de 2x a 12x">
          {pendentes.join(', ')}. Enquanto isso, a venda parcelada usa a última taxa informada, e o Financeiro avisa quantas vendas ficaram assim.
        </Aviso>
      )}

      <div className="tx-linha">
        <section className="b-cartao tx-cartao">
          <Secao titulo="Pix" ajuda={rede ? 'Pix recebido no balcão. Pela proposta da Rede, o Pix na chave é isento e o Pix por QR Code custa 0,89%: use a taxa da forma que a recepção mais usa.' : 'A InfinitePay não cobra do Pix. Se mudar, é só digitar aqui.'}>
            <label className="tx-campo"><span>{rede ? 'No balcão' : 'Na maquininha ou no link'}</span><CampoPct valor={t.pix} rotulo="Taxa do Pix" aoMudar={(v) => setT({ ...t, pix: v })} vazio="0" /></label>
          </Secao>
        </section>
        <section className="b-cartao tx-cartao">
          <Secao titulo={`Débito · ${nomeMaq}`}>
            {GRUPOS.map(([g, nome]) => (
              <label key={g} className="tx-campo"><span>{nome}{g === 'amex' && <small> (sem taxa própria: usa Visa e Mastercard)</small>}</span>
                <CampoPct valor={t.debito[g]} rotulo={`Débito ${nome}`} aoMudar={(v) => setT({ ...t, debito: { ...t.debito, [g]: v } })} /></label>
            ))}
          </Secao>
        </section>
      </div>

      <section className="b-cartao tx-cartao">
        <Secao titulo={`Crédito · ${nomeMaq}`} ajuda={(
          <>
            <span>Taxa de cada bandeira por número de parcelas. Outras bandeiras (Hipercard, Diners…) usam a coluna Visa e Mastercard.</span>
            <span>Dica: digite 2x e 12x e toque em “Completar o meio da tabela” para preencher as parcelas de 3x a 11x em passos iguais; depois confira com o app.</span>
          </>
        )} acoes={<button type="button" className="botao botao--linha botao--p" onClick={() => setT({ ...t, credito: Object.fromEntries(GRUPOS.map(([g]) => [g, completarMeio(t.credito[g])])) })}>Completar o meio da tabela</button>}>
          <div className="b-tabela-caixa tx-tabela tx-tabela--campos">
            <table className="b-tabela b-tabela--compacta">
              <thead><tr><th>Parcelas</th>{GRUPOS.map(([g, , curto]) => <th key={g} className="num">{curto}</th>)}</tr></thead>
              <tbody>
                {PARCELAS.map((n, i) => (
                  <tr key={n}>
                    <th scope="row" className="tx-parcela">{n === 1 ? 'À vista' : `${n}x`}</th>
                    {GRUPOS.map(([g, nome]) => (
                      <td key={g} data-rotulo={nome} className="num"><CampoPct valor={t.credito[g][i]} rotulo={`${nome} ${n === 1 ? 'à vista' : n + 'x'}`} aoMudar={(v) => mudaCredito(g, i, v)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      </section>

      {rede && (
        <section className="b-cartao tx-cartao">
          <Secao titulo="Link de pagamento · Rede" ajuda='Forma "Link Rede" nas vendas, na agenda e na comanda. A Rede cobra a mesma taxa do crédito (bandeira e parcelas) com um acréscimo.'>
            <label className="tx-campo"><span>Acréscimo sobre o crédito<small> (ex.: crédito à vista Visa {pctTxt(pctNum(t.credito.vm[0]))}% → link {pctTxt(Math.round(((pctNum(t.credito.vm[0]) || 0) + (pctNum(t.linkAcrescimo) || 0)) * 100) / 100)}%)</small></span>
              <CampoPct valor={t.linkAcrescimo} rotulo="Acréscimo do link da Rede" aoMudar={(v) => setT({ ...t, linkAcrescimo: v })} vazio="0" /></label>
          </Secao>
        </section>
      )}
      {!rede && <section className="b-cartao tx-cartao">
        <Secao titulo="Link da InfinitePay e pagamento pelo site" ajuda="Vale para qualquer bandeira. O cartão pago pelo site entra aqui."
          acoes={<button type="button" className="botao botao--linha botao--p" onClick={() => setT({ ...t, link: completarMeio(t.link) })}>Completar o meio da tabela</button>}>
          <div className="tx-link">
            {PARCELAS.map((n, i) => (
              <label key={n} className="tx-campo"><span>{n === 1 ? 'À vista' : `${n}x`}</span><CampoPct valor={t.link[i]} rotulo={`Link ${n === 1 ? 'à vista' : n + 'x'}`} aoMudar={(v) => mudaLink(i, v)} /></label>
            ))}
          </div>
        </Secao>
      </section>}

      <div className="tx-linha">
        <section className="b-cartao tx-cartao">
          <Secao titulo={`Prazo de recebimento · ${nomeMaq}`} ajuda='Dias úteis até o dinheiro cair na conta. Aparece no Caixa, no Financeiro ("a cair na conta") e na calculadora.'>
            {PRAZOS.map(([k, nome]) => (rede && k === 'link' ? ['link', 'Link Rede'] : [k, nome])).map(([k, nome]) => (
              <label key={k} className="tx-campo"><span>{nome}</span>
                <span className="tx-pct"><input inputMode="numeric" value={t.prazos[k]} aria-label={`Prazo de ${nome}`} onChange={(e) => setT({ ...t, prazos: { ...t.prazos, [k]: e.target.value.replace(/\D/g, '').slice(0, 2) } })} /><small className="tx-dias">dias</small></span></label>
            ))}
          </Secao>
        </section>
        <section className="b-cartao tx-cartao">
          <Secao titulo="Comissão das profissionais" ajuda="Ligado: a comissão de atendimentos, aulas de Pilates, produtos e vendas na comanda é sobre o que sobra depois da taxa de cada forma de pagamento (Pix e dinheiro não têm taxa; vale-presente não conta como taxa). Vale para o que for lançado daqui para a frente; o que já está a pagar continua como estava.">
            <Interruptor checked={liquida} onChange={(e) => setLiquida(e.target.checked)} detalhe={liquida ? 'Base: valor depois da taxa da maquininha' : 'Base: valor cheio da venda'}>Calcular sobre o valor líquido</Interruptor>
          </Secao>
        </section>
      </div>

      <details className="b-cartao cg-detalhes">
        <summary>Como as taxas entram na conta</summary>
        <ul className="cg-lista cg-lista--texto">
          <li><strong>Cada venda, cada taxa</strong><span>A forma, a bandeira e as parcelas escolhidas na venda decidem a taxa; comanda dividida usa a taxa de cada parte.</span></li>
          <li><strong>Financeiro</strong><span>Mostra as taxas do mês (por forma e por bandeira) e o resultado líquido.</span></li>
          <li><strong>Caixa do dia (administração)</strong><span>Ao conferir o extrato, vê a taxa estimada e quanto deve cair na conta por forma.</span></li>
          <li><strong>Dinheiro e vale-presente</strong><span>Sem taxa. Comissão das profissionais é sobre o valor cheio da venda.</span></li>
          <li><strong>Rede e InfinitePay</strong><span>Balcão a partir da data da troca: Rede. Site, link e o que foi vendido antes: InfinitePay. Nada do que já foi fechado muda.</span></li>
          <li><strong>É uma estimativa</strong><span>A maquininha pode ajustar a taxa conforme o faturamento; confira com o extrato.</span></li>
        </ul>
      </details>

      <div className="tx-salvar b-salvar-fixo">
        <div className="cg-salvar__msg">{aviso && <Aviso tom="ok">{aviso}</Aviso>}<Erro>{erroS}</Erro></div>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setAviso(''); setErroS('');
          try {
            const r = await chamar('salvarAjustes', { ajustes: { taxas: paraSalvar(tabs.infinite, true), taxasRede: paraSalvar(tabs.rede, false), redeDesde: desde, comissaoLiquida: liquida } });
            setDados(r); setAviso(desde ? `Salvo. Do dia ${dataBR(desde)} em diante o balcão usa a tabela da Rede.` : 'Salvo. Sem data da Rede: tudo segue a tabela da InfinitePay.');
          } catch (e) { setErroS(e.message); }
        }}>Salvar taxas</BotaoAcao>
      </div>
    </div>
  );
}

// calculadora: usa a tabela salva em "Taxas da maquininha" (sem abrir o app da InfinitePay)
const BANDEIRAS_CALC = BANDEIRAS.filter((b) => b !== 'Outra');
function CalculadoraTaxas() {
  const { dados, erro, carregando } = useDados('ajustes', {});
  const [forma, setForma] = useState('credito');
  const [maq, setMaq] = useState('rede');
  const [bandeira, setBandeira] = useState('Visa');
  const [parcelas, setParcelas] = useState(1);
  const [modo, setModo] = useState('cobrei');
  const [texto, setTexto] = useState('');
  if (carregando && !dados) return <Esqueleto linhas={6} altura={48} />;
  if (!dados) return <Erro>{erro}</Erro>;
  // link só existe na InfinitePay; na Rede, a calculadora mostra débito, crédito e Pix da maquininha
  const ehRede = maq === 'rede';
  const taxas = ehRede ? dados.taxasRede : dados.taxas;
  const valor = numBR(texto) || 0;
  const usaBandeira = forma === 'debito' || forma === 'credito' || (forma === 'link' && ehRede);
  const usaParcelas = forma === 'credito' || forma === 'link';
  const calcular = (n) => {
    const t = taxaPct(taxas, forma, bandeira, n);
    const c = modo === 'cobrei' ? aPartirDoCobrado(valor, t.pct) : aPartirDoLiquido(valor, t.pct);
    return { ...t, ...c, parcelas: n, valorParcela: Math.round((c.cobrado / n) * 100) / 100 };
  };
  const r = calcular(usaParcelas ? Number(parcelas) : 1);
  const todas = usaParcelas && valor > 0 ? Array.from({ length: 12 }, (_, i) => calcular(i + 1)) : [];
  const quando = (n) => (n === 1 ? 'à vista' : `em ${n}x`);
  const dias = prazoDias(taxas, forma);
  const diaCai = somarDiasUteis(hojeIso(), dias);
  const nomeDia = new Date(`${diaCai}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
  return (
    <div className="tx">
      <section className="b-cartao tx-cartao">
        <Secao titulo="Calculadora de taxas" ajuda='Usa as tabelas de "Taxas da maquininha" (Rede no balcão, InfinitePay no link e no site). Se uma taxa mudar, atualize lá e a calculadora, o Financeiro e o Caixa acompanham.'>
          <div className="tx-calc">
            <div className="tx-calc__campos">
              <div className="tx-seg" role="group" aria-label="Maquininha">
                {[['rede', 'Rede (maquininha e link)'], ['infinite', 'InfinitePay (site e link antigo)']].map(([id, nome]) => (
                  <button key={id} type="button" className={maq === id ? 'tx-seg--ativo' : ''} aria-pressed={maq === id}
                    onClick={() => setMaq(id)}>{nome}</button>
                ))}
              </div>
              <div className="tx-seg" role="group" aria-label="Forma de pagamento">
                {FORMAS_TAXA.map(([id, nome]) => <button key={id} type="button" className={forma === id ? 'tx-seg--ativo' : ''} aria-pressed={forma === id} onClick={() => setForma(id)}>{nome}</button>)}
              </div>
              <div className="tx-seg" role="group" aria-label="O que você sabe">
                <button type="button" className={modo === 'cobrei' ? 'tx-seg--ativo' : ''} aria-pressed={modo === 'cobrei'} onClick={() => setModo('cobrei')}>Quanto cai se eu cobrar…</button>
                <button type="button" className={modo === 'receber' ? 'tx-seg--ativo' : ''} aria-pressed={modo === 'receber'} onClick={() => setModo('receber')}>Quanto cobrar para receber…</button>
              </div>
              <label className="b-campo"><span className="rotulo">{modo === 'cobrei' ? 'Valor cobrado do cliente' : 'Valor que você quer receber na conta'}</span>
                <input inputMode="decimal" value={texto} placeholder="R$ 0,00" onChange={(e) => setTexto(e.target.value.replace(/[^\d,.]/g, ''))} /></label>
              {(usaBandeira || usaParcelas) && (
                <div className={usaBandeira && usaParcelas ? 'b-linha2' : ''}>
                  {usaBandeira && <label className="b-campo"><span className="rotulo">Bandeira</span>
                    <select value={bandeira} onChange={(e) => setBandeira(e.target.value)}>{BANDEIRAS_CALC.map((b) => <option key={b}>{b}</option>)}</select></label>}
                  {usaParcelas && <label className="b-campo"><span className="rotulo">Parcelas</span>
                    <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>)}</select></label>}
                </div>
              )}
            </div>
            <div className="tx-calc__resultado" aria-live="polite">
              {valor > 0 ? (
                <>
                  <div className="tx-res tx-res--destaque"><span>{modo === 'cobrei' ? 'Cai na conta' : 'Cobre do cliente'}</span><strong>{real(modo === 'cobrei' ? r.liquido : r.cobrado)}</strong>
                    {usaParcelas && r.parcelas > 1 && <small>{modo === 'cobrei' ? `${r.parcelas}x de ${real(r.valorParcela)} para o cliente` : `${r.parcelas}x de ${real(r.valorParcela)}`}</small>}</div>
                  <div className="tx-res-grade">
                    <div className="tx-res"><span>Taxa</span><strong>{String(r.pct).replace('.', ',')}%</strong><small>{real(r.taxa)} {quando(r.parcelas)}</small></div>
                    <div className="tx-res"><span>{modo === 'cobrei' ? 'Cobrado' : 'Fica na conta'}</span><strong>{real(modo === 'cobrei' ? r.cobrado : r.liquido)}</strong></div>
                    <div className="tx-res tx-res--larga"><span>Quando cai na conta</span><strong>{dias === 0 ? 'No mesmo dia' : `${dias} ${dias === 1 ? 'dia útil' : 'dias úteis'}`}</strong><small>se for hoje: {nomeDia}, {dataBR(diaCai)}</small></div>
                  </div>
                  {r.falta && <Aviso tom="aviso">A taxa {quando(r.parcelas)} ainda não está na tabela; usamos a última informada. Complete em “Taxas da maquininha”.</Aviso>}
                </>
              ) : <div className="tx-calc__vazio"><strong>Digite um valor</strong><span>Veja a taxa e quanto cai na conta.</span></div>}
            </div>
          </div>
        </Secao>
      </section>
      {todas.length > 0 && (
        <section className="b-cartao tx-cartao">
          <Secao titulo={`${forma === 'link' ? 'Link' : `Crédito ${bandeira}`}: cada parcelamento`}>
            <div className="b-tabela-caixa tx-tabela">
              <table className="b-tabela b-tabela--compacta tx-tabela-parc">
                <thead><tr><th>Parcelas</th><th className="num">Taxa</th><th className="num">Cobrar</th><th className="num">Cai na conta</th></tr></thead>
                <tbody>
                  {todas.map((x) => (
                    <tr key={x.parcelas} className={x.parcelas === r.parcelas ? 'tx-linha--atual' : ''}>
                      <th scope="row" className="tx-parcela">{x.parcelas === 1 ? 'À vista' : `${x.parcelas}x`}</th>
                      <td data-rotulo="Taxa" className="num">{String(x.pct).replace('.', ',')}%{x.falta && <small className="tx-falta">sem taxa</small>}</td>
                      <td data-rotulo="Cobrar" className="num">{real(x.cobrado)}{x.parcelas > 1 && <small className="tx-parcela-valor">{x.parcelas}x {real(x.valorParcela)}</small>}</td>
                      <td data-rotulo="Cai na conta" className="num"><strong>{real(x.liquido)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {todas.some((x) => x.falta) && <Aviso tom="aviso">{plural(todas.filter((x) => x.falta).length, 'parcelamento está', 'parcelamentos estão')} sem taxa na tabela; usamos a última informada. Complete em “Taxas da maquininha”.</Aviso>}
          </Secao>
        </section>
      )}
    </div>
  );
}

function Registro() {
  const { dados, erro, carregando } = useDados('registro', {});
  const [q, setQ] = useState('');
  const [ate, setAte] = useState(60);
  if (carregando && !dados) return <Esqueleto linhas={6} altura={44} />;
  const lista = (dados || []).filter((r) => !q || [r.quem, r.acao, r.detalhe].join(' ').toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Erro>{erro}</Erro>
      <div className="cg-filtro">
        <div className="b-barra-busca"><input type="search" value={q} onChange={(e) => { setQ(e.target.value); setAte(60); }} placeholder="Filtrar por pessoa ou ação" aria-label="Filtrar o registro" /></div>
        {dados && <span className="b-suave cg-filtro__conta">{q ? `${lista.length} de ${plural(dados.length, 'registro', 'registros')}` : plural(dados.length, 'registro', 'registros')}</span>}
      </div>
      {dados && lista.length === 0 && <Vazio titulo={q ? 'Nada com esse filtro' : 'Nada registrado ainda'} />}
      {lista.length > 0 && (
        <ul className="b-itens cg-registro">
          {lista.slice(0, ate).map((r, i) => (
            <li key={i} className="b-item cg-reg">
              <span className="cg-reg__quando">{r.quando.slice(0, 16).replace(/^(\d{4})-(\d{2})-(\d{2})/, '$3/$2')}</span>
              <div className="b-item__corpo">
                <span className="b-item__titulo">{r.acao}</span>
                {r.detalhe && <span className="cg-reg__detalhe">{r.detalhe}</span>}
              </div>
              <span className="cg-reg__quem">{r.quem.split('@')[0]}</span>
            </li>
          ))}
        </ul>
      )}
      {lista.length > ate && (
        <div className="cg-mais-itens">
          <span className="b-suave">Mostrando {ate} de {lista.length}</span>
          <button type="button" className="botao botao--linha botao--p" onClick={() => setAte((n) => n + 60)}>Mostrar mais</button>
        </div>
      )}
    </>
  );
}
