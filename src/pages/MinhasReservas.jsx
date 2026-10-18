import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Forma, Sol } from '../components/Marca.jsx';
import { Carregando } from './Aulas.jsx';
import { CONFIG } from '../config.js';
import { dataExtensa, formatarHora, horaFim, inicioDaAula } from '../lib/util.js';

export default function MinhasReservas() {
  const { token, aluno, sair, expirou } = useAuth();
  const nav = useNavigate();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [agora, setAgora] = useState(Date.now());

  const carregar = useCallback(
    () =>
      api.minhasReservas(token).then(setLista).catch((e) => {
        if (/sessão/i.test(e.message)) {
          expirou();
          nav('/entrar', { state: { de: '/minhas-reservas' } });
        } else setErro(e.message);
      }),
    [token, expirou, nav]
  );

  useEffect(() => {
    carregar();
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, [carregar]);

  async function acao(tipo, r) {
    if (tipo === 'cancelar' && !window.confirm('Cancelar esta reserva? O tapete fica livre para outra pessoa.')) return;
    setErro('');
    setOcupado(r.id);
    try {
      if (tipo === 'checkin') await api.checkin(token, r.id);
      else await api.cancelar(token, r.id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado('');
    }
  }

  const futuras = (lista || []).filter((r) => inicioDaAula(r).getTime() + 60 * 60e3 > agora);
  const passadas = (lista || []).filter((r) => inicioDaAula(r).getTime() + 60 * 60e3 <= agora).reverse();

  return (
    <main className="app">
      <div className="app__topo">
        <div className="largura app__topo-linha">
          <div>
            <span className="rotulo-espacado cor-caramelo">Área do aluno</span>
            <h1 className="display-m">Minhas reservas</h1>
          </div>
          <button type="button" className="link-sair" onClick={() => { sair(); nav('/'); }}>Sair</button>
        </div>
      </div>

      <div className="largura app__corpo">
        {erro && <p className="erro" role="alert">{erro}</p>}
        {!lista && !erro && <Carregando />}

        {lista && futuras.length === 0 && (
          <div className="vazio-estado">
            <Forma nome="presenca" tamanho={72} cor="var(--terracota)" />
            <p>Nenhuma aula reservada por enquanto.</p>
            <Link to="/aulas" className="botao botao--cheio">Ver aulas da semana</Link>
          </div>
        )}

        <ul className="bilhetes">
          {futuras.map((r) => {
            const ini = inicioDaAula(r).getTime();
            const abreCheckin = ini - CONFIG.checkinAbreMinAntes * 60e3;
            const podeCheckin = r.status === 'reservado' && agora >= abreCheckin;
            const podeCancelar = r.status === 'reservado' && agora < ini - CONFIG.cancelarAteHorasAntes * 3600e3;
            const fez = r.status === 'check-in';
            return (
              <li key={r.id} className={`bilhete ${fez ? 'bilhete--feito' : ''}`}>
                <div className="bilhete__corpo">
                  <span className="rotulo-espacado">{r.modalidade}</span>
                  <h2 className="display-p">{dataExtensa(r.data)}</h2>
                  <p>{formatarHora(r.hora)} às {formatarHora(horaFim(r.hora))}</p>
                  <p className="bilhete__prof">com {r.professor}</p>
                </div>
                <div className="bilhete__lado">
                  {r.tapete ? (
                    <>
                      <span className="rotulo">tapete</span>
                      <strong>{r.tapete}</strong>
                    </>
                  ) : (
                    <Forma nome="equilibrio" tamanho={50} cor="currentColor" />
                  )}
                </div>
                <div className="bilhete__acoes">
                  {fez ? (
                    <span className="bilhete__ok"><Sol tamanho={16} /> Check-in feito. Boa prática!</span>
                  ) : (
                    <>
                      <button type="button" className="botao botao--ambar" disabled={!podeCheckin || ocupado === r.id} onClick={() => acao('checkin', r)}>
                        {ocupado === r.id ? 'Aguarde…' : 'Fazer check-in'}
                      </button>
                      <span className="bilhete__dica">
                        {podeCheckin ? 'Você já pode confirmar sua chegada.' : `Libera às ${formatarHora(new Date(abreCheckin).toTimeString().slice(0, 5))}`}
                      </span>
                      {podeCancelar && (
                        <button type="button" className="link-cancelar" onClick={() => acao('cancelar', r)}>Cancelar reserva</button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {passadas.length > 0 && (
          <section className="historico">
            <h2 className="rotulo-espacado">Histórico</h2>
            <ul>
              {passadas.slice(0, 10).map((r) => (
                <li key={r.id}>
                  <span>{r.modalidade} · {dataExtensa(r.data)}</span>
                  <span>{r.status === 'check-in' ? 'presente' : 'não compareceu'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {aluno && (
          <p className="logado-como">
            Conectado como {aluno.nome} · <Link to="/ficha-saude" state={{ de: '/minhas-reservas' }}>{aluno.anamnese ? 'Atualizar ficha de saúde' : 'Preencher ficha de saúde'}</Link>
          </p>
        )}
      </div>
    </main>
  );
}
