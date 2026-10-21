import { useEffect, useState } from 'react';
import { useBancada } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Abas, BotaoAcao, Tag } from './ui.jsx';

const CAMPOS = [
  ['checkinAbreMinAntes', 'Check-in abre quantos minutos antes da aula', 'min'],
  ['cancelarAteHorasAntes', 'Aluno pode cancelar até quantas horas antes', 'h'],
  ['diasVisiveis', 'Quantos dias de aulas o site mostra', 'dias'],
  ['reservaPendenteMin', 'Tapete fica guardado enquanto o aluno paga', 'min'],
  ['valeValidadeDias', 'Validade padrão do vale-presente', 'dias'],
  ['wellhubReservasPorDia', 'Reservas pelo Wellhub por dia', 'por dia'],
];

export default function Ajustes() {
  const [aba, setAba] = useState('regras');
  return (
    <>
      <Cabecalho titulo="Ajustes">Regras que valem para o site e para a bancada.</Cabecalho>
      <Abas atual={aba} aoMudar={setAba} itens={[['regras', 'Regras'], ['taxas', 'Taxas da maquininha'], ['registro', 'Registro de ações']]} />
      {aba === 'regras' && <Regras />}
      {aba === 'taxas' && <Taxas />}
      {aba === 'registro' && <Registro />}
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

// taxas da maquininha, do link e do Pix: o Financeiro mostra o resultado líquido com elas
const TAXAS = [
  ['pix', 'Pix'],
  ['debito', 'Cartão de débito'],
  ['credito1', 'Crédito à vista'],
  ['credito2a6', 'Crédito parcelado de 2 a 6 vezes'],
  ['credito7a12', 'Crédito parcelado de 7 a 12 vezes'],
  ['link', 'Link InfinitePay e pagamento pelo site'],
];
const pctTxt = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));

function Taxas() {
  const { chamar } = useBancada();
  const { dados, erro, carregando, setDados } = useDados('ajustes', {});
  const [t, setT] = useState(null);
  const [aviso, setAviso] = useState('');
  const [erroS, setErroS] = useState('');
  useEffect(() => { if (dados) setT(Object.fromEntries(TAXAS.map(([k]) => [k, pctTxt(dados.taxas?.[k] || '')]))); }, [dados]);
  if (carregando && !t) return <Carregando />;
  if (!t) return <Erro>{erro}</Erro>;
  return (
    <div className="b-duas b-duas--larga">
      <section className="b-cartao">
        <div className="b-form">
          <p className="b-suave">Copie do app ou do contrato da maquininha a taxa de cada forma (em %). O Financeiro desconta essas taxas das entradas e mostra quanto sobra de verdade.</p>
          {TAXAS.map(([k, rotulo]) => (
            <label key={k} className="b-campo b-campo--linha">
              <span>{rotulo}</span>
              <span className="b-unidade"><input inputMode="decimal" value={t[k]} placeholder="0" onChange={(e) => setT({ ...t, [k]: e.target.value.replace(/[^\d,.]/g, '') })} /> <small>%</small></span>
            </label>
          ))}
          {aviso && <p className="aviso">{aviso}</p>}
          <Erro>{erroS}</Erro>
          <BotaoAcao className="botao botao--cheio" acao={async () => {
            setAviso(''); setErroS('');
            try {
              const r = await chamar('salvarAjustes', { ajustes: { taxas: Object.fromEntries(TAXAS.map(([k]) => [k, Number(String(t[k] || '0').replace(',', '.')) || 0])) } });
              setDados(r); setAviso('Taxas salvas. O Financeiro já mostra o resultado líquido.');
            } catch (e) { setErroS(e.message); }
          }}>Salvar taxas</BotaoAcao>
        </div>
      </section>
      <section className="b-cartao">
        <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Como entra na conta</h2></header>
        <ul className="b-lista-simples">
          <li><strong>Comanda dividida</strong><span>cada forma de pagamento recebe a sua taxa</span></li>
          <li><strong>Pagamento pelo site</strong><span>cartão pelo site usa a taxa do link; Pix, a do Pix</span></li>
          <li><strong>Dinheiro e vale-presente</strong><span>sem taxa</span></li>
          <li><strong>É uma estimativa</strong><span>confira com o extrato da maquininha no fechamento do caixa</span></li>
        </ul>
      </section>
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
