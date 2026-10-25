import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import FichaSaude from '../pages/FichaSaude.jsx';
import Contrato from './Contrato.jsx';
import { Carregando } from '../pages/Aulas.jsx';

// Ao escolher um plano mensal ou trimestral: ficha de saúde (só se for a primeira vez) e contrato (quando a Casa o liga).
// Cobre a tela inteira; quando tudo está certo chama aoPronto e o fluxo normal de compra continua.
export default function ExigenciasPlano({ plano, aoPronto, aoCancelar }) {
  const { token, aluno, expirou } = useAuth();
  const [info, setInfo] = useState(null);
  const [passo, setPasso] = useState('');
  const [erro, setErro] = useState('');

  function decidir(i, temFicha) {
    if (!temFicha) setPasso('ficha');
    else if (i.exige && !i.assinado) setPasso('contrato');
    else aoPronto();
  }

  useEffect(() => {
    let vivo = true;
    api.contratoDoPlano(token, plano.id)
      .then((i) => { if (vivo) { setInfo(i); decidir(i, i.ficha || aluno?.anamnese); } })
      .catch((e) => {
        if (!vivo) return;
        if (/sessão/i.test(e.message)) expirou();
        setErro(e.message);
      });
    return () => { vivo = false; };
  }, [token, plano.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="passos-previos" role="dialog" aria-modal="true" aria-label="Antes de contratar">
      {erro && (
        <div className="largura app__corpo">
          <p className="erro erro--destaque" role="alert">{erro}</p>
          <button type="button" className="botao botao--linha" onClick={aoCancelar}>Voltar</button>
        </div>
      )}
      {!erro && (!info || !passo) && <div className="largura app__corpo"><Carregando /></div>}
      {!erro && passo === 'ficha' && (
        <FichaSaude embutida rotulo="Antes de contratar" motivo="Na primeira vez pedimos a sua ficha de saúde."
          aoVoltar={aoCancelar} aoConcluir={() => decidir(info, true)} />
      )}
      {!erro && passo === 'contrato' && info && (
        <Contrato plano={plano} dados={info} aoVoltar={aoCancelar} aoAssinar={aoPronto} />
      )}
    </div>
  );
}
