import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Logo, Sol, IconeWhatsapp, img } from '../components/Marca.jsx';
import { CONFIG } from '../config.js';
import { formatarHora } from '../lib/util.js';
import { comNumeros } from '../components/Num.jsx';

// Link do lembrete: a cliente confirma o horário ou pede para remarcar, sem precisar de senha
export default function Confirmar() {
  const { t } = useParams();
  const [x, setX] = useState(null);
  const [erro, setErro] = useState('');
  const [remarcar, setRemarcar] = useState(false);
  const [recado, setRecado] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.verConfirmacao(t).then(setX).catch((e) => setErro(e.message));
  }, [t]);

  async function responder(resposta) {
    setEnviando(true);
    setErro('');
    try {
      setX(await api.responderConfirmacao(t, resposta, recado));
      setRemarcar(false);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const whats = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(x ? `Olá! Sobre meu horário de ${x.servico} ${x.quando} às ${formatarHora(x.hora)}.` : 'Olá! Sobre meu horário na Casa Âmbar.')}`;
  const fechado = x && (x.passou || x.status === 'cancelado' || x.status === 'atendido');

  return (
    <main className="entrar">
      <div className="entrar__arte" aria-hidden="true">
        <img className="entrar__foto" src={img('yoga.jpg')} alt="" aria-hidden="true" />
        <div className="entrar__veu" />
        <div className="entrar__arte-conteudo">
          <Logo variante="creme" largura={150} />
          <p className="script">harmonia em estado natural</p>
        </div>
      </div>
      <section className="entrar__painel">
        <div className="entrar__caixa confirmar">
          {!x && !erro && <div className="senha-ok" role="status"><Sol tamanho={30} className="girando cor-caramelo" /><p className="entrar__sub">Um momento…</p></div>}
          {!x && erro && (
            <>
              <h1 className="display-m">Não deu certo</h1>
              <p className="entrar__sub">{erro}</p>
              <a className="botao botao--linha com-icone" href={whats} target="_blank" rel="noreferrer"><IconeWhatsapp /> Falar no WhatsApp</a>
            </>
          )}
          {x && (
            <>
              <span className="rotulo-espacado cor-terracota">Seu horário</span>
              <h1 className="display-m">{x.resposta === 'confirmou' ? `Até lá, ${x.nome}!` : x.resposta === 'remarcar' ? 'Recebemos seu pedido' : `Olá, ${x.nome}!`}</h1>
              <div className="confirmar__cartao">
                <span className="confirmar__quando">{x.quando}</span>
                <strong className="confirmar__hora">{comNumeros(formatarHora(x.hora))}</strong>
                <span className="confirmar__servico">{x.servico}</span>
                <span className="confirmar__com">com {x.profissional}</span>
              </div>
              {fechado ? (
                <p className="entrar__sub">{x.status === 'cancelado' ? 'Este horário foi cancelado.' : 'Este horário já passou.'} Para marcar outro, fale com a gente pelo WhatsApp.</p>
              ) : x.resposta === 'confirmou' && !remarcar ? (
                <>
                  <p className="entrar__sub">Horário confirmado. Chegue com 10 minutos de antecedência.</p>
                  <button type="button" className="link-acao" onClick={() => setRemarcar(true)}>Mudou algo? Preciso remarcar</button>
                </>
              ) : x.resposta === 'remarcar' && !remarcar ? (
                <p className="entrar__sub">A recepção vai falar com você pelo WhatsApp para combinar um novo horário.</p>
              ) : remarcar ? (
                <div className="form">
                  <label>
                    Quer deixar um recado? (opcional)
                    <textarea rows={3} maxLength={200} value={recado} onChange={(e) => setRecado(e.target.value)} placeholder="Ex.: prefiro na quinta à tarde" />
                  </label>
                  <button type="button" className="botao botao--cheio" disabled={enviando} onClick={() => responder('remarcar')}>{enviando ? 'Enviando…' : 'Pedir para remarcar'}</button>
                  <button type="button" className="link-acao" onClick={() => setRemarcar(false)}>Voltar</button>
                </div>
              ) : (
                <div className="confirmar__botoes">
                  <button type="button" className="botao botao--cheio" disabled={enviando} onClick={() => responder('confirmo')}>{enviando ? 'Enviando…' : 'Confirmo'}</button>
                  <button type="button" className="botao botao--linha" disabled={enviando} onClick={() => setRemarcar(true)}>Preciso remarcar</button>
                </div>
              )}
              {erro && <p className="erro" role="alert">{erro}</p>}
              <p className="entrar__ajuda entrar__ajuda--duplo"><a href={whats} target="_blank" rel="noreferrer">Falar no WhatsApp</a> <Link to="/">Conhecer a Casa Âmbar</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
