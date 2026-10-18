import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import Tapete from '../components/Tapete.jsx';
import { Sol, Forma } from '../components/Marca.jsx';
import { Carregando } from './Aulas.jsx';
import { SALA_YOGA, CONFIG } from '../config.js';
import { dataExtensa, formatarHora, horaFim } from '../lib/util.js';

export default function Reservar() {
  const { id } = useParams();
  const { token, expirou } = useAuth();
  const nav = useNavigate();
  const [aula, setAula] = useState(null);
  const [escolhido, setEscolhido] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(null);

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

  if (!aula) return <main className="app"><div className="largura app__corpo">{erro ? <p className="erro">{erro}</p> : <Carregando />}</div></main>;

  const yoga = aula.modalidade === 'Yoga';
  const livres = aula.capacidade - aula.ocupadosQtd;

  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      const r = await api.reservar(token, aula.id, yoga ? escolhido : null);
      setFeito(r);
    } catch (e) {
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
            <div className="sala">
              <div className="sala__frente">
                <div className="sala__plantas" aria-hidden="true">
                  {[...Array(9)].map((_, i) => <span key={i} style={{ '--i': i, '--s': [0.8, 0.95, 1.05][i % 3] }} />)}
                </div>
                <div className="sala__prof">
                  <span className="sala__prof-tapete" aria-hidden="true" />
                  <span className="rotulo">frente · {aula.professor}</span>
                </div>
              </div>
              <div className="sala__piso" style={{ gridTemplateColumns: `repeat(${SALA_YOGA.colunas}, minmax(0, 1fr))` }}>
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
            <Forma nome="equilibrio" tamanho={84} cor="var(--oliva)" />
            <p className="display-p">{livres} de {aula.capacidade} vagas livres</p>
            <p>No Pilates o lugar é organizado pela professora na hora da aula.</p>
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
