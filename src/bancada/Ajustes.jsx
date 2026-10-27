import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBancada } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Abas, BotaoAcao, Tag, BANDEIRAS, real, numBR, plural, hojeIso, dataBR } from './ui.jsx';
import { FORMAS_TAXA, taxaPct, aPartirDoCobrado, aPartirDoLiquido, prazoDias, somarDiasUteis } from './taxas.js';
import { PainelVelocidade } from './Velocidade.jsx';

const CAMPOS = [
  ['checkinAbreMinAntes', 'Check-in abre quantos minutos antes da aula', 'min'],
  ['cancelarAteHorasAntes', 'Aluno pode cancelar até quantas horas antes', 'h'],
  ['diasVisiveis', 'Quantos dias de aulas o site mostra', 'dias'],
  ['reservaPendenteMin', 'Tapete fica guardado enquanto o aluno paga', 'min'],
  ['valeValidadeDias', 'Validade padrão do vale-presente', 'dias'],
  ['wellhubReservasPorDia', 'Reservas pelo Wellhub por dia', 'por dia'],
];

export default function Ajustes() {
  const local = useLocation();
  const [aba, setAba] = useState(local.state?.aba || 'regras');
  return (
    <>
      <Cabecalho titulo="Ajustes">Regras que valem para o site e para a bancada.</Cabecalho>
      <Abas atual={aba} aoMudar={setAba} itens={[['regras', 'Regras'], ['taxas', 'Taxas da maquininha'], ['calculadora', 'Calculadora de taxas'], ['registro', 'Registro de ações'], ['velocidade', 'Velocidade']]} />
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
  if (carregando && !f) return <Carregando />;
  if (!f) return <Erro>{erro}</Erro>;
  return (
    <div className="b-duas b-duas--larga">
      <section className="b-cartao">
        <div className="b-form">
          {CAMPOS.map(([k, t, u]) => (
            <label key={k} className="b-campo b-campo--linha">
              <span>{t}</span>
              <span className="b-unidade"><input type="number" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /> <small>{u}</small></span>
            </label>
          ))}
          <label className="b-check"><input type="checkbox" checked={!!f.wellhubAtivo} onChange={(e) => setF({ ...f, wellhubAtivo: e.target.checked })} /> Aceitar reservas pelo Wellhub</label>
          <label className="b-check"><input type="checkbox" checked={!!f.wellhubPendentePodeReservar} onChange={(e) => setF({ ...f, wellhubPendentePodeReservar: e.target.checked })} /> Wellhub ainda não confirmado pela recepção já pode reservar</label>
          <label className="b-check"><input type="checkbox" checked={!!f.lembreteServicos} onChange={(e) => setF({ ...f, lembreteServicos: e.target.checked })} /> E-mail de lembrete na véspera dos serviços</label>
          <label className="b-check"><input type="checkbox" checked={!!f.lembreteAulas} onChange={(e) => setF({ ...f, lembreteAulas: e.target.checked })} /> E-mail de lembrete na véspera das aulas de Yoga e Pilates</label>
          {aviso && <p className="aviso">{aviso}</p>}
          <Erro>{erroS}</Erro>
          <BotaoAcao className="botao botao--cheio" acao={async () => {
            setAviso(''); setErroS('');
            try {
              const r = await chamar('salvarAjustes', { ajustes: Object.fromEntries(CAMPOS.map(([k]) => [k, Number(f[k])]).concat([['wellhubAtivo', !!f.wellhubAtivo], ['wellhubPendentePodeReservar', !!f.wellhubPendentePodeReservar], ['lembreteServicos', !!f.lembreteServicos], ['lembreteAulas', !!f.lembreteAulas]])) });
              setDados(r); setAviso('Salvo. O site já segue as regras novas.');
            } catch (e) { setErroS(e.message); }
          }}>Salvar regras</BotaoAcao>
        </div>
      </section>
      <section className="b-cartao">
        <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Sistema</h2></header>
        <dl className="b-dados">
          <dt>Pagamento online</dt><dd>{f.pagamentoComChave ? <Tag tom="ok">chave InfinitePay ativa</Tag> : <Tag tom="aviso">sem chave: trimestral pela recepção</Tag>}</dd>
          <dt>E-mails restantes hoje</dt><dd>{f.emailsRestantes ?? '—'}</dd>
          <dt>Últimos lembretes</dt><dd>{f.ultimosLembretes ? f.ultimosLembretes.slice(0, 16).split(' ').map((x, i) => (i ? x : x.split('-').reverse().join('/'))).join(' ') : 'nenhum ainda'}</dd>
          <dt>Versão</dt><dd className="b-suave">{f.versao}</dd>
        </dl>
      </section>
    </div>
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
const faltando = (t) => {
  const falta = (c, quem) => (c.slice(1).some((v) => pctNum(v) == null) ? [quem] : []);
  return [...falta(t.credito.vm, 'crédito Visa e Mastercard'), ...falta(t.credito.elo, 'crédito Elo'), ...falta(t.credito.amex, 'crédito American Express'), ...falta(t.link, 'link')];
};

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
  const [t, setT] = useState(null);
  const [liquida, setLiquida] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erroS, setErroS] = useState('');
  useEffect(() => { if (dados) { setT(comoTexto(dados.taxas)); setLiquida(dados.comissaoLiquida !== false); } }, [dados]);
  if (carregando && !t) return <Carregando />;
  if (!t) return <Erro>{erro}</Erro>;
  const mudaCredito = (g, i, v) => setT({ ...t, credito: { ...t.credito, [g]: t.credito[g].map((x, k) => (k === i ? v : x)) } });
  const mudaLink = (i, v) => setT({ ...t, link: t.link.map((x, k) => (k === i ? v : x)) });
  const pendentes = faltando(t);
  return (
    <div className="tx">
      <p className="b-suave tx-intro">As taxas da InfinitePay (maquininha e link). Em cada venda o sistema usa a taxa da <strong>bandeira</strong> e do <strong>número de parcelas</strong>, e o Financeiro e o Caixa mostram quanto realmente cai na conta. Os valores são os do app da InfinitePay (calculadora, plano de 1 dia útil): na maquininha, Visa e Mastercard têm a mesma tabela, e Elo e American Express também; o link tem uma tabela só, para qualquer bandeira. Se a InfinitePay mudar uma taxa, é só editar aqui.</p>
      {pendentes.length > 0 && <p className="aviso">Faltam as taxas de 2x a 12x de: {pendentes.join(', ')}. Enquanto isso, uma venda parcelada usa a última taxa informada, e o Financeiro avisa quantas vendas ficaram assim.</p>}

      <div className="tx-linha">
        <section className="b-cartao tx-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Pix</h2></header>
          <label className="tx-campo"><span>Pix na maquininha ou no link</span><CampoPct valor={t.pix} rotulo="Taxa do Pix" aoMudar={(v) => setT({ ...t, pix: v })} vazio="0" /></label>
          <p className="b-suave">A InfinitePay não cobra do Pix. Se mudar, é só digitar aqui.</p>
        </section>
        <section className="b-cartao tx-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Débito na maquininha</h2></header>
          {GRUPOS.map(([g, nome]) => (
            <label key={g} className="tx-campo"><span>{nome}{g === 'amex' && <small> (se não tiver, usa Visa e Mastercard)</small>}</span>
              <CampoPct valor={t.debito[g]} rotulo={`Débito ${nome}`} aoMudar={(v) => setT({ ...t, debito: { ...t.debito, [g]: v } })} /></label>
          ))}
        </section>
      </div>

      <section className="b-cartao tx-cartao">
        <header className="b-cartao__topo">
          <div><h2 className="b-cartao__titulo">Crédito na maquininha</h2><p className="b-suave">Taxa de cada bandeira por número de parcelas. Outras bandeiras (Hipercard, Diners…) usam a coluna Visa e Mastercard.</p></div>
          <button type="button" className="botao botao--linha botao--p" onClick={() => setT({ ...t, credito: Object.fromEntries(GRUPOS.map(([g]) => [g, completarMeio(t.credito[g])])) })}>Completar o meio da tabela</button>
        </header>
        <div className="b-tabela-caixa tx-tabela">
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
        <p className="b-suave">Dica: digite 2x e 12x e toque em "Completar o meio da tabela" para preencher as parcelas de 3x a 11x em passos iguais; depois confira com o app.</p>
      </section>

      <section className="b-cartao tx-cartao">
        <header className="b-cartao__topo">
          <div><h2 className="b-cartao__titulo">Link da InfinitePay e pagamento pelo site</h2><p className="b-suave">Vale para qualquer bandeira. O cartão pago pelo site entra aqui.</p></div>
          <button type="button" className="botao botao--linha botao--p" onClick={() => setT({ ...t, link: completarMeio(t.link) })}>Completar o meio da tabela</button>
        </header>
        <div className="tx-link">
          {PARCELAS.map((n, i) => (
            <label key={n} className="tx-campo"><span>{n === 1 ? 'À vista' : `${n}x`}</span><CampoPct valor={t.link[i]} rotulo={`Link ${n === 1 ? 'à vista' : n + 'x'}`} aoMudar={(v) => mudaLink(i, v)} /></label>
          ))}
        </div>
      </section>

      <div className="tx-linha">
        <section className="b-cartao tx-cartao">
          <header className="b-cartao__topo"><div><h2 className="b-cartao__titulo">Prazo de recebimento</h2><p className="b-suave">Dias úteis até o dinheiro cair na conta. Aparece no Caixa, no Financeiro ("a cair na conta") e na calculadora.</p></div></header>
          {PRAZOS.map(([k, nome]) => (
            <label key={k} className="tx-campo"><span>{nome}</span>
              <span className="tx-pct"><input inputMode="numeric" value={t.prazos[k]} aria-label={`Prazo de ${nome}`} onChange={(e) => setT({ ...t, prazos: { ...t.prazos, [k]: e.target.value.replace(/\D/g, '').slice(0, 2) } })} /><small className="tx-dias">dias</small></span></label>
          ))}
        </section>
        <section className="b-cartao tx-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Comissão das profissionais</h2></header>
          <label className="b-check tx-check"><input type="checkbox" checked={liquida} onChange={(e) => setLiquida(e.target.checked)} /> Calcular a comissão sobre o valor líquido, sem a taxa da maquininha</label>
          <p className="b-suave">Ligado: a comissão de atendimentos, aulas de Pilates, produtos e vendas na comanda é sobre o que sobra depois da taxa de cada forma de pagamento (Pix e dinheiro não têm taxa; vale-presente não conta como taxa). Vale para o que for lançado daqui para a frente; o que já está a pagar continua como estava.</p>
        </section>
      </div>

      <section className="b-cartao tx-cartao">
        <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Como entra na conta</h2></header>
        <ul className="b-lista-simples">
          <li><strong>Cada venda, cada taxa</strong><span>a forma, a bandeira e as parcelas escolhidas na venda decidem a taxa; comanda dividida usa a taxa de cada parte</span></li>
          <li><strong>Financeiro</strong><span>mostra as taxas do mês (por forma e por bandeira) e o resultado líquido</span></li>
          <li><strong>Caixa do dia (administração)</strong><span>ao conferir o extrato, vê a taxa estimada e quanto deve cair na conta por forma</span></li>
          <li><strong>Dinheiro e vale-presente</strong><span>sem taxa. Comissão das profissionais é sobre o valor cheio da venda</span></li>
          <li><strong>É uma estimativa</strong><span>a InfinitePay pode ajustar a taxa conforme o faturamento; confira com o extrato</span></li>
        </ul>
      </section>

      <div className="tx-salvar b-salvar-fixo">
        <div>{aviso && <span className="aviso">{aviso}</span>}<Erro>{erroS}</Erro></div>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setAviso(''); setErroS('');
          try {
            const taxas = { pix: pctNum(t.pix) ?? 0, debito: Object.fromEntries(GRUPOS.map(([g]) => [g, pctNum(t.debito[g])])),
              credito: Object.fromEntries(GRUPOS.map(([g]) => [g, colunaNum(t.credito[g])])), link: colunaNum(t.link), prazos: Object.fromEntries(PRAZOS.map(([k]) => [k, Number(t.prazos[k]) || 0])) };
            const r = await chamar('salvarAjustes', { ajustes: { taxas, comissaoLiquida: liquida } });
            setDados(r); setAviso('Taxas salvas. O Financeiro e o Caixa já usam a nova tabela.');
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
  const [bandeira, setBandeira] = useState('Visa');
  const [parcelas, setParcelas] = useState(1);
  const [modo, setModo] = useState('cobrei');
  const [texto, setTexto] = useState('');
  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  const taxas = dados.taxas;
  const valor = numBR(texto) || 0;
  const usaBandeira = forma === 'debito' || forma === 'credito';
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
        <header className="b-cartao__topo"><div><h2 className="b-cartao__titulo">Calculadora de taxas da InfinitePay</h2>
          <p className="b-suave">Use a tabela de "Taxas da maquininha". Se a InfinitePay mudar uma taxa, atualize lá e a calculadora, o Financeiro e o Caixa acompanham.</p></div></header>
        <div className="tx-calc">
          <div className="tx-calc__campos">
            <div className="tx-seg" role="group" aria-label="Forma de pagamento">
              {FORMAS_TAXA.map(([id, nome]) => <button key={id} type="button" className={forma === id ? 'tx-seg--ativo' : ''} aria-pressed={forma === id} onClick={() => setForma(id)}>{nome}</button>)}
            </div>
            <div className="tx-seg" role="group" aria-label="O que você sabe">
              <button type="button" className={modo === 'cobrei' ? 'tx-seg--ativo' : ''} aria-pressed={modo === 'cobrei'} onClick={() => setModo('cobrei')}>Quanto cai se eu cobrar…</button>
              <button type="button" className={modo === 'receber' ? 'tx-seg--ativo' : ''} aria-pressed={modo === 'receber'} onClick={() => setModo('receber')}>Quanto cobrar para receber…</button>
            </div>
            <label className="b-campo"><span className="rotulo">{modo === 'cobrei' ? 'Valor cobrado do cliente' : 'Valor que você quer receber na conta'}</span>
              <input inputMode="decimal" value={texto} placeholder="R$ 0,00" onChange={(e) => setTexto(e.target.value.replace(/[^\d,.]/g, ''))} /></label>
            {usaBandeira && <label className="b-campo"><span className="rotulo">Bandeira</span>
              <select value={bandeira} onChange={(e) => setBandeira(e.target.value)}>{BANDEIRAS_CALC.map((b) => <option key={b}>{b}</option>)}</select></label>}
            {usaParcelas && <label className="b-campo"><span className="rotulo">Parcelas</span>
              <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>)}</select></label>}
          </div>
          <div className="tx-calc__resultado" aria-live="polite">
            {valor > 0 ? (
              <>
                <div className="tx-res tx-res--destaque"><span>{modo === 'cobrei' ? 'Cai na conta' : 'Cobre do cliente'}</span><strong>{real(modo === 'cobrei' ? r.liquido : r.cobrado)}</strong>
                  {usaParcelas && r.parcelas > 1 && <small>{modo === 'cobrei' ? `${r.parcelas}x de ${real(r.valorParcela)} para o cliente` : `${r.parcelas}x de ${real(r.valorParcela)}`}</small>}</div>
                <div className="tx-res"><span>Taxa</span><strong>{String(r.pct).replace('.', ',')}%</strong><small>{real(r.taxa)} {quando(r.parcelas)}</small></div>
                <div className="tx-res"><span>{modo === 'cobrei' ? 'Cobrado' : 'Fica na conta'}</span><strong>{real(modo === 'cobrei' ? r.cobrado : r.liquido)}</strong></div>
                <div className="tx-res"><span>Quando cai na conta</span><strong>{dias === 0 ? 'No mesmo dia' : `${dias} ${dias === 1 ? 'dia útil' : 'dias úteis'}`}</strong><small>se for hoje: {nomeDia}, {dataBR(diaCai)}</small></div>
                {r.falta && <p className="aviso tx-res__aviso">A taxa {quando(r.parcelas)} ainda não está na tabela; usamos a última informada. Complete em "Taxas da maquininha".</p>}
              </>
            ) : <p className="b-suave">Digite um valor para ver a taxa e quanto cai na conta.</p>}
          </div>
        </div>
      </section>
      {todas.length > 0 && (
        <section className="b-cartao tx-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">{forma === 'link' ? 'Link' : `Crédito ${bandeira}`}: cada parcelamento</h2></header>
          <div className="b-tabela-caixa tx-tabela">
            <table className="b-tabela b-tabela--compacta">
              <thead><tr><th>Parcelas</th><th className="num">Taxa</th><th className="num">Cobrar</th><th className="num">Cai na conta</th></tr></thead>
              <tbody>
                {todas.map((x) => (
                  <tr key={x.parcelas} className={x.parcelas === r.parcelas ? 'tx-linha--atual' : ''}>
                    <th scope="row" className="tx-parcela">{x.parcelas === 1 ? 'À vista' : `${x.parcelas}x`}</th>
                    <td className="num">{String(x.pct).replace('.', ',')}%{x.falta && <small className="tx-falta">sem taxa</small>}</td>
                    <td className="num">{real(x.cobrado)}{x.parcelas > 1 && <small className="tx-parcela-valor">{x.parcelas}x {real(x.valorParcela)}</small>}</td>
                    <td className="num"><strong>{real(x.liquido)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {todas.some((x) => x.falta) && <p className="b-suave">{plural(todas.filter((x) => x.falta).length, 'parcelamento está', 'parcelamentos estão')} sem taxa na tabela; usamos a última informada. Complete em "Taxas da maquininha".</p>}
        </section>
      )}
    </div>
  );
}

function Registro() {
  const { dados, erro, carregando } = useDados('registro', {});
  const [q, setQ] = useState('');
  if (carregando && !dados) return <Carregando />;
  const lista = (dados || []).filter((r) => !q || [r.quem, r.acao, r.detalhe].join(' ').toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Erro>{erro}</Erro>
      <div className="b-barra-busca"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por pessoa ou ação" /></div>
      <div className="b-tabela-caixa">
        <table className="b-tabela">
          <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhe</th></tr></thead>
          <tbody>
            {lista.map((r, i) => (
              <tr key={i}>
                <td data-rotulo="Quando">{r.quando.slice(0, 16).replace(/^(\d{4})-(\d{2})-(\d{2})/, '$3/$2')}</td>
                <td data-rotulo="Quem">{r.quem.split('@')[0]}</td>
                <td data-rotulo="Ação">{r.acao}</td>
                <td data-rotulo="Detalhe" className="b-suave">{r.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
