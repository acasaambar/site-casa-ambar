import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import Tapete from '../components/Tapete.jsx';
import Aparelho from '../components/Reformer.jsx';
import { Sol, Forma } from '../components/Marca.jsx';
import { Carregando } from './Aulas.jsx';
import { SALA_YOGA, CONFIG, APARELHOS_PILATES } from '../config.js';
import { dataExtensa, formatarHora, horaFim } from '../lib/util.js';

// distribui as vagas ocupadas entre os aparelhos (sempre igual para a mesma aula)
function ocupadosPilates(aula) {
  const total = aula.capacidade;
  const ocup = Math.min(aula.ocupadosQtd, total);
  let h = 0;
  for (const c of aula.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const ordem = [...Array(total).keys()].sort((a, b) => ((a * 7 + h) % 11) - ((b * 7 + h) % 11));
  const marcados = new Set(ordem.slice(0, ocup));
  return [...Array(total)].map((_, i) => marcados.has(i));
}

export default function Reservar() {
  const { id } = useParams();
  const { token, aluno, expirou } = useAuth();
  const nav = useNavigate();
  const [aula, setAula] = useState(null);
  const [escolhido, setEscolhido] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(null);
  const [semCredito, setSemCredito] = useState(null);
  const [pagando, setPagando] = useState(false);

  const carregar = useCallback(() => {
    return api.aula(token, id).then(setAula).catch((e) => {
      if (/sessão/i.test(e.message)) {
        expirou();
        nav('/entrar', { state: { de: `/aula/${encodeURIComponent(id)}` } });
      } else setErro(e.message);
    });
  }, [token, id, expirou, nav]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (aluno && !aluno.anamnese) return <Navigate to="/ficha-saude" replace state={{ de: `/aula/${encodeURIComponent(id)}` }} />;

  if (!aula) return <main className="app"><div className="largura app__corpo">{erro ? <p className="erro">{erro}</p> : <Carregando />}</div></main>;

  const yoga = aula.modalidade === 'Yoga';
  const livres = aula.capacidade - aula.ocupadosQtd;

  async function usarWellhub() {
    setPagando(true);
    setErro('');
    try {
      const r = await api.reservar(token, aula.id, yoga ? escolhido : null, false, true);
      setSemCredito(null);
      setFeito(r);
    } catch (e) {
      setSemCredito(null);
      setErro(e.message);
      carregar();
    } finally {
      setPagando(false);
    }
  }

  async function pagarAvulsa() {
    setPagando(true);
    setErro('');
    try {
      const r = await api.reservar(token, aula.id, yoga ? escolhido : null, true);
      window.location.href = r.pagamento.link;
    } catch (e) {
      setSemCredito(null);
      setErro(e.message);
      setPagando(false);
      carregar();
    }
  }

  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      const r = await api.reservar(token, aula.id, yoga ? escolhido : null);
      setFeito(r);
    } catch (e) {
      if (e.codigo === 'SEM_CREDITO') {
        setSemCredito(e.dados || {});
        return;
      }
      if (/ficha de saúde/i.test(e.message)) return nav('/ficha-saude', { state: { de: `/aula/${encodeURIComponent(id)}` } });
      setErro(e.message);
      setEscolhido(null);
      carregar();
    } finally {
      setEnviando(false);
    }
  }

  if (aula.minhaReserva && !feito) {
    return (
      <main className="app">
        <div className="largura app__corpo">
          <div className="vazio-estado">
            <Forma nome="sutileza" tamanho={70} cor="var(--terracota)" />
            <p>Você já reservou esta aula{yoga ? `, no tapete ${aula.minhaReserva.tapete}` : ''}.</p>
            <Link className="botao" to="/minhas-reservas">Ver minhas reservas</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <div className="app__topo">
        <div className="largura reserva-cabeca">
          <Link to="/aulas" className="voltar" aria-label="Voltar para as aulas">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
          <div>
            <span className="rotulo-espacado cor-caramelo">{aula.modalidade}</span>
            <h1 className="display-m">{dataExtensa(aula.data)}</h1>
            <p className="reserva-cabeca__info">
              {formatarHora(aula.hora)} às {formatarHora(horaFim(aula.hora, aula.duracao || 60))} · com {aula.professor} · {livres} {yoga ? 'tapetes livres' : 'vagas'}
            </p>
          </div>
        </div>
      </div>

      <div className="largura app__corpo">
        {erro && <p className="erro" role="alert">{erro}</p>}

        {yoga ? (
          <>
            <p className="instrucao">Toque no tapete onde você quer praticar.</p>
            <div className={`sala ${SALA_YOGA.colunas === 2 ? 'sala--duas' : ''}`}>
              <div className="sala__frente">
                <div className="sala__plantas" aria-hidden="true">
                  {[...Array(9)].map((_, i) => <span key={i} style={{ '--i': i, '--s': [0.8, 0.95, 1.05][i % 3] }} />)}
                </div>
                <div className="sala__prof">
                  <span className="sala__prof-tapete" aria-hidden="true" />
                  <span className="rotulo">frente · {aula.professor}</span>
                </div>
              </div>
              <div className={`sala__piso ${SALA_YOGA.colunas === 2 ? 'sala__piso--duas' : ''}`} style={{ gridTemplateColumns: `repeat(${SALA_YOGA.colunas}, minmax(0, 1fr))` }}>
                {[...Array(aula.capacidade)].map((_, i) => {
                  const n = i + 1;
                  const estado = aula.ocupados.includes(n) ? 'ocupado' : escolhido === n ? 'meu' : 'livre';
                  return <Tapete key={n} numero={n} estado={estado} onClick={() => setEscolhido(n)} />;
                })}
              </div>
              <div className="sala__fundo rotulo" aria-hidden="true">entrada</div>
            </div>
            <ul className="legenda" aria-label="Legenda">
              <li><i className="legenda__livre" />Livre</li>
              <li><i className="legenda__meu" />Seu tapete</li>
              <li><i className="legenda__ocupado" />Ocupado</li>
            </ul>
          </>
        ) : (
          <div className="pilates-reserva">
            <div className="estudio">
              <div className="estudio__frente">
                <span className="estudio__espelho" aria-hidden="true" />
                <span className="rotulo">frente · {aula.professor}</span>
              </div>
              <div className="estudio__piso">
                {ocupadosPilates(aula).map((ocupado, i) => (
                  <Aparelho key={i} numero={i + 1} tipo={APARELHOS_PILATES[i % APARELHOS_PILATES.length]} ocupado={ocupado} />
                ))}
              </div>
            </div>

            <aside className="detalhes">
              <span className="rotulo-espacado cor-terracota">Pilates</span>
              <p className="detalhes__vagas">
                <strong>{livres}</strong> de {aula.capacidade} aparelhos livres
              </p>
              <dl className="detalhes__lista">
                <div><dt>Professora</dt><dd>{aula.professor}</dd></div>
                <div><dt>Dia</dt><dd>{dataExtensa(aula.data)}</dd></div>
                <div><dt>Horário</dt><dd>{formatarHora(aula.hora)} às {formatarHora(horaFim(aula.hora, aula.duracao || 60))}</dd></div>
                <div><dt>Duração</dt><dd>{aula.duracao || 60} minutos</dd></div>
              </dl>
              <div className="detalhes__dicas">
                <span className="rotulo">Para a sua aula</span>
                <ul>
                  <li><Forma nome="presenca" tamanho={18} cor="var(--caramelo)" /> Chegue 10 minutos antes</li>
                  <li><Forma nome="equilibrio" tamanho={18} cor="var(--caramelo)" /> Use meia antiderrapante</li>
                  <li><Forma nome="sutileza" tamanho={18} cor="var(--caramelo)" /> Traga sua garrafinha de água</li>
                </ul>
              </div>
              <p className="detalhes__nota">A professora organiza os aparelhos no início da aula.</p>
            </aside>
          </div>
        )}
      </div>

      <div className="barra-confirmar">
        <div className="largura barra-confirmar__in">
          <div>
            {yoga ? (
              escolhido ? (
                <>
                  <span className="rotulo">Seu tapete</span>
                  <strong className="barra-confirmar__num">{escolhido}</strong>
                </>
              ) : (
                <span className="barra-confirmar__dica">Escolha um tapete livre</span>
              )
            ) : (
              <span className="barra-confirmar__dica">Pilates · {formatarHora(aula.hora)}</span>
            )}
          </div>
          <button type="button" className="botao botao--ambar" disabled={(yoga && !escolhido) || enviando || livres <= 0} onClick={confirmar}>
            {enviando ? 'Reservando…' : 'Confirmar reserva'}
          </button>
        </div>
      </div>

      {semCredito && (
        <div className="confirmado" role="dialog" aria-modal="true" aria-labelledby="sc-titulo">
          <div className="confirmado__caixa sem-credito">
            <Forma nome="presenca" tamanho={56} cor="var(--terracota)" />
            <h2 id="sc-titulo" className="display-m">{semCredito.wellhub?.pode?.ok ? 'Como quer reservar?' : 'Falta só o pagamento'}</h2>
            <p>Você ainda não tem aulas de {aula.modalidade} disponíveis no seu plano.</p>
            {semCredito.wellhub?.pode?.ok && (
              <button type="button" className="botao botao--wellhub sem-credito__pagar" disabled={pagando} onClick={usarWellhub}>
                {pagando ? 'Reservando…' : 'Usar meu Wellhub'}
              </button>
            )}
            {semCredito.wellhub && !semCredito.wellhub.pode?.ok && semCredito.wellhub.status !== 'nao_informado' && semCredito.wellhub.status !== 'desligado' && (
              <p className="confirmado__nota">{semCredito.wellhub.pode?.motivo}</p>
            )}
            {semCredito.avulsa && (
              <button type="button" className="botao botao--cheio sem-credito__pagar" disabled={pagando} onClick={pagarAvulsa}>
                {pagando
                  ? 'Abrindo pagamento…'
                  : `Pagar esta aula · ${Number(semCredito.avulsa.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
              </button>
            )}
            <p className="confirmado__nota">
              {yoga && escolhido ? `O tapete ${escolhido} fica guardado por 20 minutos enquanto você paga. ` : ''}
              Pix ou cartão 1x sem juros (ou até 12x com juros), pela InfinitePay. Ao concluir, toque em “Continuar” para voltar.
            </p>
            <div className="confirmado__botoes">
              <Link className="botao botao--linha" to="/meu-plano">Ver planos mensais e trimestrais</Link>
              {semCredito.wellhub?.status === 'nao_informado' && (
                <Link className="link-acao" to="/meu-plano" state={{ rolar: 'wellhub' }}>Tenho Wellhub Gold+ · ativar</Link>
              )}
              <button type="button" className="link-sair" onClick={() => setSemCredito(null)}>Voltar</button>
            </div>
          </div>
        </div>
      )}

      {feito && (
        <div className="confirmado" role="dialog" aria-modal="true" aria-labelledby="ok-titulo">
          <div className="confirmado__caixa">
            <Sol tamanho={52} className="cor-caramelo confirmado__sol" />
            <h2 id="ok-titulo" className="display-m">Reserva confirmada</h2>
            {yoga && (
              <div className="confirmado__tapete">
                <span className="rotulo">Tapete</span>
                <strong>{feito.tapete}</strong>
              </div>
            )}
            <p>{dataExtensa(aula.data)} · {formatarHora(aula.hora)} · {aula.professor}</p>
            {feito.wellhub ? (
              <p className="aviso">Reserva pelo Wellhub: ao chegar, faça o <strong>check-in no app Wellhub</strong>.</p>
            ) : (
              feito.credito && <p className="confirmado__nota">Descontada de: {feito.credito}</p>
            )}
            <p className="confirmado__nota">O check-in abre {CONFIG.checkinAbreMinAntes} minutos antes da aula.</p>
            <div className="confirmado__botoes">
              <Link className="botao botao--cheio" to="/minhas-reservas">Minhas reservas</Link>
              <Link className="botao botao--linha" to="/aulas">Voltar às aulas</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
