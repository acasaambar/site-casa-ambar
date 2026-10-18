import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Sol, Forma } from '../components/Marca.jsx';
import { CONFIG } from '../config.js';
import { dataExtensa, formatarHora } from '../lib/util.js';

const real = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function lerRetorno() {
  try {
    return JSON.parse(sessionStorage.getItem('ambar_retorno')) || null;
  } catch {
    return null;
  }
}

// Tela de volta da InfinitePay: confirma o pagamento e mostra o resultado
export default function Pagamento() {
  const { token } = useAuth();
  const [retorno] = useState(lerRetorno);
  const [res, setRes] = useState(null);
  const [erro, setErro] = useState('');
  const tentativas = useRef(0);
  // esta aba foi aberta pelo site para pagar (a aba do site continua aberta)
  const [abertaPeloSite] = useState(() => {
    try {
      return !!window.opener && !window.opener.closed;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!retorno) return undefined;
    let parar = false;
    let timer;
    const conferir = async () => {
      try {
        const r = await api.confirmarPagamento(token, retorno);
        if (parar) return;
        setRes(r);
        // ainda não confirmado: a InfinitePay pode avisar alguns segundos depois
        // aguardando o pagamento na outra aba: confere por até 15 minutos
        const limite = retorno.aguardando ? 180 : 15;
        if (r.status !== 'pago' && tentativas.current < limite) {
          tentativas.current += 1;
          timer = setTimeout(conferir, 5000);
        } else if (r.status === 'pago') {
          try {
            sessionStorage.removeItem('ambar_retorno');
          } catch {
            /* ignora */
          }
        }
      } catch (e) {
        if (!parar) setErro(e.message);
      }
    };
    conferir();
    return () => {
      parar = true;
      clearTimeout(timer);
    };
  }, [retorno, token]);

  if (!retorno) return <Navigate to="/meu-plano" replace />;

  const pago = res?.status === 'pago';
  const reserva = res?.reserva;
  const reservaOk = reserva && reserva.status !== 'pendente' && reserva.status !== 'cancelado';

  return (
    <main className="app">
      <div className="largura app__corpo">
        <div className="pagamento-retorno">
          {!pago && !erro && retorno.aguardando && (
            <>
              <Sol tamanho={54} className="cor-caramelo girando" />
              <span className="rotulo-espacado cor-terracota">Pagamento em andamento</span>
              <h1 className="display-m">Conclua o pagamento na nova aba</h1>
              <p>
                O pagamento seguro da InfinitePay abriu em outra aba. Assim que você pagar, esta página confirma sozinha.
                {tentativas.current >= 180 && ' Se já pagou e não apareceu, fale com a recepção.'}
              </p>
              <div className="pagamento-retorno__botoes">
                {retorno.link && (
                  <a className="botao botao--cheio" href={retorno.link} target="_blank" rel="noreferrer">Abrir o pagamento de novo</a>
                )}
                <Link className="botao botao--linha" to="/meu-plano">Ir para Meu plano</Link>
              </div>
            </>
          )}

          {!res && !erro && !retorno.aguardando && (
            <>
              <Sol tamanho={54} className="cor-caramelo girando" />
              <h1 className="display-m">Confirmando seu pagamento</h1>
              <p>Isso leva só alguns segundos.</p>
            </>
          )}

          {erro && (
            <>
              <Forma nome="sutileza" tamanho={64} cor="var(--terracota)" />
              <h1 className="display-m">Não conseguimos confirmar</h1>
              <p className="erro">{erro}</p>
              <Link className="botao botao--cheio" to="/meu-plano">Ver meus pagamentos</Link>
            </>
          )}

          {res && !pago && !retorno.aguardando && (
            <>
              <Sol tamanho={54} className="cor-caramelo girando" />
              <h1 className="display-m">Aguardando a confirmação</h1>
              <p>
                Assim que a InfinitePay confirmar, sua compra aparece em Meu plano. No Pix costuma ser imediato.
                {tentativas.current >= 15 && ' Se já pagou e não apareceu, fale com a recepção.'}
              </p>
              <div className="pagamento-retorno__botoes">
                <Link className="botao botao--cheio" to="/meu-plano">Ir para Meu plano</Link>
                <a className="botao botao--linha" href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer">Falar com a recepção</a>
              </div>
            </>
          )}

          {pago && (
            <>
              <Sol tamanho={58} className="cor-caramelo girando-lento" />
              <span className="rotulo-espacado cor-terracota">Pagamento aprovado</span>
              <h1 className="display-m">{reservaOk ? 'Aula paga e reservada' : 'Tudo certo'}</h1>
              <p>{res.descricao} · {real(res.valor)}</p>

              {reservaOk && (
                <div className="pagamento-retorno__reserva">
                  <div>
                    <span className="rotulo">{reserva.modalidade}</span>
                    <strong>{dataExtensa(reserva.data)} · {formatarHora(reserva.hora)}</strong>
                    <span>com {reserva.professor}</span>
                  </div>
                  {reserva.tapete && (
                    <div className="pagamento-retorno__tapete">
                      <span className="rotulo">tapete</span>
                      <strong>{reserva.tapete}</strong>
                    </div>
                  )}
                </div>
              )}
              {res.observacao && <p className="aviso">{res.observacao}</p>}

              <div className="pagamento-retorno__botoes">
                {res.recibo && <a className="botao botao--linha" href={res.recibo} target="_blank" rel="noreferrer">Ver comprovante</a>}
                {abertaPeloSite ? (
                  <button type="button" className="botao botao--cheio" onClick={() => window.close()}>
                    Fechar esta aba e voltar ao site
                  </button>
                ) : (
                  <Link className="botao botao--cheio" to={reservaOk ? '/minhas-reservas' : '/aulas'}>
                    {reservaOk ? 'Minhas reservas' : 'Reservar aula'}
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
