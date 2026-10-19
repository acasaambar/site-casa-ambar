import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Erro, Kpi, realCurto, hora, primeiro, DIAS_LONGOS, MESES, diaSemana } from './ui.jsx';
import { Sol } from '../components/Marca.jsx';
import { COR_CATEGORIA } from './Servicos.jsx';

const INI = 6 * 60, FIM = 20 * 60;
const min = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); };
const pos = (m) => `${((m - INI) / (FIM - INI)) * 100}%`;

function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return agora;
}

// distribui itens que se sobrepõem em linhas diferentes da mesma faixa
function emLinhas(itens) {
  const fins = [];
  return [...itens].sort((a, b) => min(a.hora) - min(b.hora)).map((x) => {
    const ini = min(x.hora);
    let l = fins.findIndex((f) => f <= ini);
    if (l < 0) { l = fins.length; fins.push(0); }
    fins[l] = ini + x.duracao;
    return { ...x, linha: l };
  });
}

function Faixa({ nome, itens, m, dentro, render }) {
  const dist = emLinhas(itens);
  const linhas = Math.max(1, ...dist.map((x) => x.linha + 1));
  return (
    <div className="linha__faixa" style={{ height: linhas * 46 + 8 }}>
      <span className="linha__nome">{nome}</span>
      {dist.map((x) => {
        const ini = min(x.hora);
        const passou = dentro ? ini + x.duracao < m : m > FIM;
        return render(x, {
          left: pos(ini), width: `calc(${(x.duracao / (FIM - INI)) * 100}% - 3px)`, top: 4 + x.linha * 46, height: 42,
        }, passou);
      })}
    </div>
  );
}

// A linha do dia: das 6h às 20h, com o sol marcando a hora e cada aula/atendimento no lugar dele
function LinhaDoDia({ aulas, servicos, agora }) {
  const caixa = useRef(null);
  const m = agora.getHours() * 60 + agora.getMinutes();
  const dentro = m >= INI && m <= FIM;
  useEffect(() => {
    // no celular a linha rola até a hora atual (depois das 20h, mostra o fim do dia)
    const el = caixa.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (dentro) el.scrollLeft = ((m - INI) / (FIM - INI)) * el.scrollWidth - el.clientWidth / 3;
    else if (m > FIM) el.scrollLeft = el.scrollWidth;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const horas = [];
  for (let h = 6; h <= 20; h += 2) horas.push(h);
  const aula = (a, estilo, passou) => (
    <Link key={a.id} to="/bancada/agenda" state={{ abrir: a.id }} title={`${a.modalidade} ${hora(a.hora)} com ${a.professor} · ${a.reservas} de ${a.capacidade}`}
      className={`pedra pedra--${a.modalidade.toLowerCase()}${passou ? ' pedra--passou' : ''}`} style={estilo}>
      <strong>{hora(a.hora)}</strong>
      <span>{a.reservas}/{a.capacidade}</span>
    </Link>
  );
  return (
    <section className="linha" aria-label="Linha do dia">
      <div className="linha__rolagem" ref={caixa}>
        <div className="linha__trilho">
          <Faixa nome="Yoga" itens={aulas.filter((a) => a.modalidade === 'Yoga')} m={m} dentro={dentro} render={aula} />
          <Faixa nome="Pilates" itens={aulas.filter((a) => a.modalidade === 'Pilates')} m={m} dentro={dentro} render={aula} />
          <Faixa nome="Serviços" itens={servicos} m={m} dentro={dentro} render={(a, estilo, passou) => (
            <Link key={a.id} to="/bancada/agenda" state={{ vista: 'servicos' }} title={`${hora(a.hora)} · ${a.servico} · ${a.nome} com ${a.profissional}`}
              className={`pedra pedra--s pedra--${COR_CATEGORIA[a.categoria] || 'facial'}${passou ? ' pedra--passou' : ''}`} style={estilo}>
              <strong>{hora(a.hora)}</strong>
              <span>{primeiro(a.nome)}</span>
            </Link>
          )} />
          {dentro && (
            <div className="linha__agora" style={{ left: pos(m) }} aria-label={`Agora, ${agora.getHours()}h${String(agora.getMinutes()).padStart(2, '0')}`}>
              <Sol tamanho={26} className="linha__sol" />
            </div>
          )}
          <div className="linha__horas" aria-hidden="true">
            {horas.map((h) => <span key={h} style={{ left: pos(h * 60) }}>{h}h</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Inicio() {
  const { membro, chamar } = useBancada();
  const { dados: r, erro, carregando } = useDados('resumo');
  // lembretes da véspera por e-mail: saem sozinhos quando a recepção abre a bancada
  useEffect(() => {
    if (pode(membro, 'admin', 'recepcao')) chamar('lembretesAuto', {}).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const agora = useAgora();
  const h = agora.getHours();
  const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const balcao = pode(membro, 'admin', 'recepcao');

  const aSeguir = r
    ? [
        ...r.proximas.map((a) => ({ id: a.id, hora: a.hora, titulo: `${a.modalidade} com ${a.professor}`, detalhe: `${a.reservas} de ${a.capacidade} lugares`, tipo: a.modalidade.toLowerCase(), aula: true })),
        ...(r.servicos || []).filter((s) => s.status !== 'atendido' && s.status !== 'falta' && min(s.hora) + s.duracao > h * 60 + agora.getMinutes())
          .map((s) => ({ id: s.id, hora: s.hora, titulo: s.servico, detalhe: `${s.nome} · ${s.profissional}`, tipo: COR_CATEGORIA[s.categoria] || 'facial' })),
      ].sort((a, b) => a.hora.localeCompare(b.hora)).slice(0, 6)
    : [];

  return (
    <>
      <header className="inicio__topo">
        <div>
          <p className="inicio__data">
            {r ? `${DIAS_LONGOS[diaSemana(r.hoje)]}, ${Number(r.hoje.slice(8))} de ${MESES[Number(r.hoje.slice(5, 7)) - 1]}` : ' '}
          </p>
          <h1 className="inicio__saudacao">{saud}, {primeiro(membro.nome)}</h1>
        </div>
        {r && (
          <p className="inicio__resumo">
            {r.aulasHoje} aula{r.aulasHoje === 1 ? '' : 's'} e {r.servicosHoje || 0} atendimento{r.servicosHoje === 1 ? '' : 's'} hoje
          </p>
        )}
      </header>
      <Erro>{erro}</Erro>
      {carregando && !r && <Carregando />}
      {r && (
        <>
          <LinhaDoDia aulas={r.linha || []} servicos={r.servicos || []} agora={agora} />

          <section className="b-kpis">
            <Kpi rotulo="Reservas de aula hoje" valor={r.reservasHoje} detalhe={`${r.presentesHoje} com presença marcada`} />
            <Kpi rotulo="Atendimentos hoje" valor={r.servicosHoje || 0} detalhe="estética e fisioterapia" />
            {balcao && <Kpi rotulo="Recebido hoje" valor={realCurto(r.vendasHoje)} detalhe={r.caixa === 'nao_aberto' ? 'caixa ainda não aberto' : r.caixa === 'aberto' ? 'caixa aberto' : 'caixa fechado'} />}
            {balcao && <Kpi rotulo="Recebido no mês" valor={realCurto(r.vendasMes)} />}
            {!balcao && <Kpi rotulo="Meus ganhos no mês" valor={realCurto(r.meusGanhosMes || 0)} detalhe="comissões" />}
          </section>
          {r.folgasHoje && r.folgasHoje.length > 0 && (
            <p className="b-suave inicio__folgas">Horários bloqueados hoje: {r.folgasHoje.map((f) => `${f.profissional} (${f.motivo}${f.diaTodo ? ', dia todo' : `, ${hora(f.inicio)}–${hora(f.fim)}`})`).join(' · ')}</p>
          )}

          <div className="b-duas b-duas--larga">
            <section className="b-cartao">
              <header className="b-cartao__topo">
                <h2 className="b-cartao__titulo">A seguir</h2>
                <Link to="/bancada/agenda" className="link-acao">Abrir agenda</Link>
              </header>
              {aSeguir.length === 0 ? (
                <p className="b-suave">O dia já terminou por aqui.</p>
              ) : (
                <ul className="seguir">
                  {aSeguir.map((x) => (
                    <li key={x.id}>
                      <Link to="/bancada/agenda" state={x.aula ? { abrir: x.id } : { vista: 'servicos' }} className={`seguir__item seguir__item--${x.tipo}`}>
                        <strong className="seguir__hora">{hora(x.hora)}</strong>
                        <span className="seguir__texto"><span>{x.titulo}</span><small>{x.detalhe}</small></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {balcao ? (
              <section className="b-cartao">
                <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Pede atenção</h2></header>
                <ul className="b-atencao">
                  <Atencao n={r.wellhubPendentes} texto="Wellhub para confirmar" para="/bancada/alunos" estado={{ filtro: 'wellhub' }} />
                  <Atencao n={r.devolverJuros} texto="juros para devolver" para="/bancada/vendas" estado={{ filtro: 'devolver' }} />
                  <Atencao n={r.vencendo} texto="planos vencem em 7 dias" para={pode(membro, 'admin') ? '/bancada/relatorios' : '/bancada/alunos'} estado={{ aba: 'alunos' }} />
                  <Atencao n={r.caixa === 'nao_aberto' ? 1 : 0} simbolo="R$" texto="abrir o caixa de hoje" para="/bancada/comandas" estado={{ vista: 'caixa' }} />
                  <Atencao n={r.comandasAbertas} texto={r.comandasAbertas === 1 ? 'comanda aberta' : 'comandas abertas'} para="/bancada/comandas" />
                  <Atencao n={r.estoqueBaixo} texto="produtos acabando" para="/bancada/estoque" estado={{ filtro: 'falta' }} />
                  <Atencao n={r.lembretesWhats} texto="lembretes de amanhã para mandar no WhatsApp" para="/bancada/marketing" estado={{ aba: 'lembretes' }} />
                  <Atencao n={r.contasVencendo} texto="contas vencendo" para="/bancada/financeiro" estado={{ aba: 'despesas' }} />
                </ul>
                {!r.wellhubPendentes && !r.devolverJuros && !r.vencendo && !r.comandasAbertas && !r.estoqueBaixo && !r.lembretesWhats && !r.contasVencendo && r.caixa !== 'nao_aberto' && <p className="b-suave">Nada pendente.</p>}
                <nav className="atalhos" aria-label="Atalhos">
                  <Link to="/bancada/comandas" state={{ nova: true }}>Abrir comanda</Link>
                  <Link to="/bancada/agenda" state={{ vista: 'servicos' }}>Agendar serviço</Link>
                  <Link to="/bancada/marketing" state={{ aba: 'vales', novo: true }}>Dar um vale-presente</Link>
                  <Link to="/bancada/alunos" state={{ novo: true }}>Cadastrar cliente</Link>
                </nav>
              </section>
            ) : (
              <section className="b-cartao">
                <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Lembretes</h2></header>
                <p className="b-suave">Marque a presença de cada aluna e confira a ficha de saúde de quem tem o aviso “saúde: atenção”.</p>
                <p className="b-suave">Nos serviços, abra o atendimento na agenda para preencher a ficha de estética e registrar a evolução com fotos.</p>
                <nav className="atalhos" aria-label="Atalhos"><Link to="/bancada/ganhos">Meus ganhos</Link><Link to="/bancada/agenda" state={{ vista: 'servicos' }}>Minha agenda</Link></nav>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Atencao({ n, texto, para, estado, simbolo }) {
  if (!n) return null;
  return (
    <li>
      <Link to={para} state={estado}>
        <strong>{simbolo || n}</strong>
        <span>{texto}</span>
      </Link>
    </li>
  );
}
