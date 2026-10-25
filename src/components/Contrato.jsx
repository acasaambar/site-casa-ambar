import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

// Contrato do plano mensal ou trimestral: a pessoa lê, marca "li e concordo" e digita o nome completo (aceite eletrônico).
// O texto vem do servidor (Contrato.gs), já com os dados dela e do plano: aqui só aparece e é assinado.
// dados = resposta de contratoDoPlano ({ titulo, versao, texto: [linhas], nomeCadastro })
export default function Contrato({ plano, dados, aoAssinar, aoVoltar }) {
  const { token } = useAuth();
  const [aceito, setAceito] = useState(false);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function assinar(e) {
    e.preventDefault();
    if (!aceito) return setErro('Marque que leu e concorda com o contrato.');
    if (nome.trim().split(/\s+/).length < 2) return setErro('Digite seu nome completo, como no cadastro.');
    setErro('');
    setEnviando(true);
    try {
      await api.assinarContrato(token, plano.id, nome.trim(), true, typeof navigator === 'undefined' ? '' : navigator.userAgent);
      aoAssinar();
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="contrato">
      <div className="app__topo">
        <div className="largura">
          <span className="rotulo-espacado cor-caramelo">Antes de pagar</span>
          <h1 className="display-m">{dados.titulo || 'Contrato'}</h1>
          <p className="ficha__intro">Leia com calma e assine para seguir ao pagamento: {plano.nome.replace(/ · trimestral$/, '')} · {plano.tipo === 'trimestral' ? 'trimestral' : 'mensal'}.</p>
        </div>
      </div>
      <div className="largura app__corpo ficha">
        <article className="contrato__texto" tabIndex={0} aria-label={dados.titulo || 'Contrato'}>
          {dados.texto.map((l, i) => (/^#\s/.test(l) ? <h2 key={i} className="display-p">{l.replace(/^#\s+/, '')}</h2> : <p key={i}>{l}</p>))}
        </article>
        <form className="form ficha__form contrato__assinatura" onSubmit={assinar} noValidate>
          <fieldset className="bloco bloco--termos">
            <label className="termo">
              <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
              <span>Li o contrato e concordo com todas as cláusulas.</span>
            </label>
            <label>
              Para assinar, digite seu nome completo
              <input type="text" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={dados.nomeCadastro} />
              <span className="dica-campo">Igual ao do cadastro. A cópia assinada chega no seu e-mail.</span>
            </label>
          </fieldset>
          {erro && <p className="erro erro--destaque" role="alert">{erro}</p>}
          <div className="ficha__botoes">
            <button type="button" className="botao botao--linha" onClick={aoVoltar} disabled={enviando}>Voltar</button>
            <button type="submit" className="botao botao--cheio" disabled={enviando}>{enviando ? 'Assinando…' : 'Assinar e continuar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
