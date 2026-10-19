import { Link } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Erro, Kpi, realCurto, hora, primeiro, DIAS_LONGOS, MESES, diaSemana } from './ui.jsx';
import { Ocupacao } from './Graficos.jsx';
import { Sol } from '../components/Marca.jsx';

export default function Inicio() {
  const { membro } = useBancada();
  const { dados: r, erro, carregando } = useDados('resumo');
  const saud = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <header className="b-cabecalho b-cabecalho--inicio">
        <div>
          <span className="rotulo-espacado cor-terracota">
            {r ? `${DIAS_LONGOS[diaSemana(r.hoje)]}, ${Number(r.hoje.slice(8))} de ${MESES[Number(r.hoje.slice(5, 7)) - 1]}` : 'Hoje'}
          </span>
          <h1 className="display-m">{saud}, {primeiro(membro.nome)}</h1>
        </div>
        <Sol tamanho={46} className="cor-caramelo girando-lento" />
      </header>
      <Erro>{erro}</Erro>
      {carregando && !r && <Carregando />}
      {r && (
        <>
          <section className="b-kpis">
            <Kpi rotulo="Aulas hoje" valor={r.aulasHoje} />
            <Kpi rotulo="Reservas hoje" valor={r.reservasHoje} detalhe={`${r.presentesHoje} presentes até agora`} />
            {pode(membro, 'admin', 'recepcao') && <Kpi rotulo="Vendas hoje" valor={realCurto(r.vendasHoje)} />}
            {pode(membro, 'admin', 'recepcao') && <Kpi rotulo="Vendas no mês" valor={realCurto(r.vendasMes)} />}
          </section>

          <div className="b-duas">
            <section className="b-cartao">
              <header className="b-cartao__topo">
                <h2 className="b-cartao__titulo">Próximas aulas de hoje</h2>
                <Link to="/bancada/agenda" className="link-acao">Abrir agenda</Link>
              </header>
              {r.proximas.length === 0 ? (
                <p className="b-suave">Não há mais aulas hoje.</p>
              ) : (
                <ul className="b-proximas">
                  {r.proximas.map((a) => (
                    <li key={a.id}>
                      <Link to="/bancada/agenda" state={{ abrir: a.id }}>
                        <strong className="b-proximas__hora">{hora(a.hora)}</strong>
                        <span className="b-proximas__info">
                          <span>{a.modalidade} · {a.professor}</span>
                          <Ocupacao valor={a.reservas} total={a.capacidade} />
                        </span>
                        <span className="b-proximas__num">{a.reservas}/{a.capacidade}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {pode(membro, 'admin', 'recepcao') && (
              <section className="b-cartao">
                <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Pede atenção</h2></header>
                <ul className="b-atencao">
                  <Atencao n={r.wellhubPendentes} texto="Wellhub para confirmar" para="/bancada/alunos" estado={{ filtro: 'wellhub' }} />
                  <Atencao n={r.devolverJuros} texto="juros para devolver" para="/bancada/vendas" estado={{ filtro: 'devolver' }} />
                  <Atencao n={r.vencendo} texto="planos vencendo em 7 dias" para={pode(membro, 'admin') ? '/bancada/relatorios' : '/bancada/alunos'} estado={{ aba: 'alunos' }} />
                </ul>
                {!r.wellhubPendentes && !r.devolverJuros && !r.vencendo && <p className="b-suave">Nada pendente. Tudo em harmonia.</p>}
              </section>
            )}
          </div>

          {pode(membro, 'admin', 'recepcao') && (
            <section className="b-atalhos">
              <Link to="/bancada/agenda" className="b-atalho"><strong>Agendar aluno</strong><span>escolher aula e tapete</span></Link>
              <Link to="/bancada/vendas" state={{ nova: true }} className="b-atalho"><strong>Registrar venda</strong><span>Pix, dinheiro ou cartão no balcão</span></Link>
              <Link to="/bancada/vales" state={{ novo: true }} className="b-atalho"><strong>Dar um vale-presente</strong><span>aniversário, campanha, cortesia</span></Link>
              <Link to="/bancada/alunos" state={{ novo: true }} className="b-atalho"><strong>Cadastrar aluno</strong><span>com convite por e-mail</span></Link>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Atencao({ n, texto, para, estado }) {
  if (!n) return null;
  return (
    <li>
      <Link to={para} state={estado}>
        <strong>{n}</strong>
        <span>{texto}</span>
      </Link>
    </li>
  );
}
