import { useMemo, useState } from 'react';
import { useBancada, pode } from './sessao.jsx';
import './css/shell.css';
import { Cabecalho, BotaoAcao, Erro, Vazio, Aviso, Ajuda, plural } from './ui.jsx';
import { Icone } from './icones.jsx';
import { lerMedidas, limparMedidas } from '../lib/api.js';

// ============================================================
//  VELOCIDADE DESTE COMPUTADOR
//  Quanto tempo cada ação levou aqui: o total (o que a pessoa espera) e a parte que foi do nosso servidor.
//  A diferença é a internet + o Google preparando o pedido (não depende do nosso código).
// ============================================================
const NOMES = {
  b_agendaSemana: 'Agenda (semana)', b_agendarServico: 'Agendar ou remarcar serviço', b_atualizarAtendimento: 'Mudar atendimento (atendido, falta…)',
  b_horarios: 'Horários livres', b_novoAluno: 'Cadastrar cliente', b_aluno: 'Abrir ficha do cliente', b_alunos: 'Lista e busca de clientes',
  b_salvarAluno: 'Salvar ficha do cliente', b_comanda: 'Abrir comanda', b_comandas: 'Comandas abertas', b_salvarComanda: 'Mudar comanda (itens)',
  b_fecharComanda: 'Fechar comanda', b_comandaDoAtendimento: 'Comanda do atendimento', b_resumo: 'Tela Hoje', b_presenca: 'Presença na aula',
  b_catalogoServicos: 'Catálogo', b_caixa: 'Caixa do dia', b_espera: 'Lista de espera', b_entrar: 'Entrar na bancada', b_agendar: 'Agendar aluno na aula',
  b_planos: 'Planos', b_eu: 'Conferir login', regras: 'Regras do site', b_atendimentos: 'Atendimentos do dia', b_agenda: 'Aulas do dia', b_minhasClientes: 'Minhas clientes',
  b_registro: 'Registro de ações', b_lerPlanilhaDeNovo: 'Ler a planilha de novo', b_cancelarReserva: 'Cancelar reserva', b_lembretesAuto: 'Lembretes automáticos', b_pagamentos: 'Vendas', b_financeiro: 'Financeiro',
};
const nomeDe = (a) => NOMES[a] || String(a).replace(/^b_/, '');
const mediana = (l) => {
  const v = l.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const seg = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`);

export function PainelVelocidade() {
  const { membro, chamar } = useBancada();
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState('');
  const medidas = useMemo(() => lerMedidas(), [versao]); // eslint-disable-line react-hooks/exhaustive-deps

  const linhas = useMemo(() => {
    const g = {};
    medidas.forEach((m) => { (g[m.a] = g[m.a] || []).push(m); });
    return Object.entries(g).map(([a, l]) => ({
      acao: a, nome: nomeDe(a), vezes: l.length,
      total: mediana(l.map((x) => x.t)), servidor: mediana(l.map((x) => x.s)),
      planilha: l.some((x) => x.p != null) ? l.reduce((t, x) => t + (x.p || 0), 0) / l.length : null,
      cache: l.some((x) => x.c != null) ? l.reduce((t, x) => t + (x.c || 0), 0) / l.length : null,
    })).sort((x, y) => y.vezes - x.vezes);
  }, [medidas]);
  const geral = { total: mediana(medidas.map((x) => x.t)), servidor: mediana(medidas.map((x) => x.s)) };
  const fora = geral.total != null && geral.servidor != null ? Math.max(0, geral.total - geral.servidor) : null;
  // respostas que chegaram trocadas (de outro pedido) e foram descartadas
  const trocas = medidas.filter((x) => x.x);
  const textoTrocas = trocas.length ? `Respostas trocadas descartadas: ${trocas.length} (${[...new Set(trocas.map((x) => nomeDe(x.a)))].join(', ')})` : '';

  const texto = () => [
    `Velocidade da bancada (${medidas.length} pedidos, ${new Date().toLocaleString('pt-BR')})`,
    `Geral: total ${seg(geral.total)} · servidor ${seg(geral.servidor)} · internet + Google ${seg(fora)}`,
    ...(textoTrocas ? [textoTrocas] : []),
    ...linhas.map((l) => `${l.nome}: ${l.vezes}x · total ${seg(l.total)} · servidor ${seg(l.servidor)} · planilha ${l.planilha == null ? '—' : l.planilha.toFixed(1)} · cache ${l.cache == null ? '—' : l.cache.toFixed(1)}`),
  ].join('\n');

  const maxTotal = Math.max(1, ...linhas.map((l) => l.total || 0));
  // parte do tempo que é do nosso servidor e parte que é internet + Google
  const fatiaServidor = geral.total && geral.servidor != null ? Math.min(100, Math.round((geral.servidor / geral.total) * 100)) : null;
  const tom = (ms) => (ms == null ? '' : ms < 2000 ? ' vel-tempo--ok' : ms < 5000 ? ' vel-tempo--aviso' : ' vel-tempo--alerta');

  return (
    <div className="vel">
      <div className="vel-topo">
        <span className="b-meta"><span>Neste computador</span><span>{medidas.length} {medidas.length === 1 ? 'pedido medido' : 'pedidos medidos'}</span></span>
        <Ajuda titulo="Como ler esta tela">
          Medições deste computador (as últimas {plural(400, 'ida', 'idas')} ao servidor). Cada linha mostra o tempo típico (a mediana): o total é o que a pessoa espera;
          o servidor é a parte do nosso sistema; o resto é a internet e o Google preparando o pedido.
        </Ajuda>
      </div>
      {medidas.length === 0 ? (
        <Vazio titulo="Ainda sem medições">Use a bancada normalmente e volte aqui depois.</Vazio>
      ) : (<>
        <div className="vel-resumo">
          <div className="vel-cartao vel-cartao--destaque"><span className="vel-cartao__icone"><Icone nome="relogio" tamanho={20} /></span><span className="rotulo">Tempo típico de um pedido</span><strong>{seg(geral.total)}</strong></div>
          <div className="vel-cartao"><span className="vel-cartao__icone"><Icone nome="velocidade" tamanho={20} /></span><span className="rotulo">No nosso servidor</span><strong>{seg(geral.servidor)}</strong></div>
          <div className="vel-cartao"><span className="vel-cartao__icone"><Icone nome="externo" tamanho={20} /></span><span className="rotulo">Internet e Google</span><strong>{seg(fora)}</strong></div>
        </div>
        {fatiaServidor != null && (
          <div className="vel-divisao" role="img" aria-label={`${fatiaServidor}% do tempo é do servidor e ${100 - fatiaServidor}% é internet e Google`}>
            <span className="vel-divisao__servidor" style={{ width: `${fatiaServidor}%` }}>{fatiaServidor >= 14 ? 'Servidor' : ''}</span>
            <span className="vel-divisao__fora">{100 - fatiaServidor >= 14 ? 'Internet e Google' : ''}</span>
          </div>
        )}
        {textoTrocas && <Aviso tom="aviso" titulo={textoTrocas}>A bancada descartou e buscou de novo; se o número crescer, mande o resumo para o Fábio.</Aviso>}
        <div className="b-tabela-caixa vel-tabela">
          <table className="b-tabela">
            <thead><tr><th>Ação</th><th>Vezes</th><th>Total</th><th>Servidor</th><th>Abas da planilha</th><th>Abas do cache</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.acao}>
                  <td data-rotulo="Ação"><strong className="vel-nome">{l.nome}</strong></td>
                  <td data-rotulo="Vezes">{l.vezes}</td>
                  <td data-rotulo="Total">
                    <span className="vel-total">
                      <strong className={`vel-tempo${tom(l.total)}`}>{seg(l.total)}</strong>
                      <span className="vel-barra" aria-hidden="true"><i style={{ width: `${Math.round(((l.total || 0) / maxTotal) * 100)}%` }} /></span>
                    </span>
                  </td>
                  <td data-rotulo="Servidor">{seg(l.servidor)}</td>
                  <td data-rotulo="Abas da planilha">{l.planilha == null ? '—' : l.planilha.toFixed(1).replace('.', ',')}</td>
                  <td data-rotulo="Abas do cache">{l.cache == null ? '—' : l.cache.toFixed(1).replace('.', ',')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
      <Erro>{aviso}</Erro>
      <div className="b-botoes vel-botoes">
        {medidas.length > 0 && (
          <BotaoAcao className="botao botao--linha botao--p" acao={async () => {
            try { await navigator.clipboard.writeText(texto()); setAviso(''); } catch { setAviso('Não deu para copiar. Tire um print desta tela.'); }
          }}><Icone nome="copiar" tamanho={16} />Copiar o resumo</BotaoAcao>
        )}
        {medidas.length > 0 && <button type="button" className="botao botao--linha botao--p" onClick={() => { limparMedidas(); setVersao((v) => v + 1); }}><Icone nome="atualizar" tamanho={16} />Começar a medir de novo</button>}
        {pode(membro, 'admin') && (
          <BotaoAcao className="botao botao--linha botao--p" confirmar="Ler a planilha de novo? Use depois de mudar algo direto na planilha (as telas mostram a mudança na hora)."
            acao={async () => { await chamar('lerPlanilhaDeNovo', {}); setAviso(''); }}><Icone nome="folha" tamanho={16} />Ler a planilha de novo</BotaoAcao>
        )}
      </div>
    </div>
  );
}

export default function Velocidade() {
  return (
    <>
      <Cabecalho titulo="Velocidade">Quanto a bancada está demorando neste computador.</Cabecalho>
      <PainelVelocidade />
    </>
  );
}
