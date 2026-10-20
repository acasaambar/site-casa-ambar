import { useState } from 'react';
import { api } from '../lib/api.js';

const real = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Campo "Cupom ou vale-presente" do pagamento.
// aoAplicar(resultado | null): resultado = { codigo, tipo, desconto, valorFinal, mensagem }
export default function CampoCodigo({ token, planoId, aplicado, aoAplicar, inicial = '' }) {
  const [aberto, setAberto] = useState(!!inicial || !!aplicado);
  const [codigo, setCodigo] = useState(inicial);
  const [erro, setErro] = useState('');
  const [conferindo, setConferindo] = useState(false);

  async function aplicar() {
    setErro('');
    if (!codigo.trim()) return;
    setConferindo(true);
    try {
      const r = await api.validarCodigo(token, planoId, codigo.trim());
      aoAplicar(r);
    } catch (e) {
      aoAplicar(null);
      setErro(e.message);
    } finally {
      setConferindo(false);
    }
  }

  if (aplicado) {
    return (
      <div className="codigo codigo--ok">
        <div>
          <span className="rotulo">{aplicado.tipo === 'vale' ? 'Vale-presente' : 'Cupom'} · {aplicado.codigo}</span>
          <p>{aplicado.mensagem}</p>
        </div>
        <div className="codigo__valores">
          <s>{real(aplicado.valorOriginal)}</s>
          <strong>{aplicado.valorFinal > 0 ? real(aplicado.valorFinal) : 'Grátis'}</strong>
        </div>
        <button type="button" className="link-sair" onClick={() => { aoAplicar(null); setCodigo(''); }}>remover</button>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button type="button" className="link-acao codigo__abrir" onClick={() => setAberto(true)}>
        {/* um span só: dentro do link (flex) o espaço antes de "vale-presente" sumiria */}
        <span>Tenho um cupom ou <span className="sem-quebra">vale-presente</span></span>
      </button>
    );
  }

  return (
    <div className="codigo">
      <label className="codigo__campo">
        <span className="rotulo">Cupom ou vale-presente</span>
        <span className="codigo__linha">
          <input type="text" value={codigo} autoCapitalize="characters" autoComplete="off" spellCheck="false" placeholder="Digite o código"
            onChange={(e) => setCodigo(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), aplicar())} />
          <button type="button" className="botao botao--linha botao--p" disabled={conferindo || !codigo.trim()} onClick={aplicar}>
            {conferindo ? '…' : 'Aplicar'}
          </button>
        </span>
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
    </div>
  );
}
