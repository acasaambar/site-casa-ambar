import { useState } from 'react';
import { COMO_CONHECEU, UFS, buscarCep, mascaraCep } from '../lib/clientes.js';

// Endereço com preenchimento pelo CEP (rua, bairro, cidade e UF)
export function CamposEndereco({ valor, aoMudar }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');
  const mudar = (k, v) => aoMudar({ ...valor, [k]: v });
  async function cep(v) {
    const novo = { ...valor, cep: mascaraCep(v) };
    aoMudar(novo);
    setAviso('');
    if (novo.cep.length !== 9) return;
    setBuscando(true);
    const r = await buscarCep(novo.cep);
    setBuscando(false);
    if (r?.erro === 'cep') setAviso('CEP não encontrado. Confira os números ou preencha o endereço à mão.');
    else if (r?.erro) setAviso('Não deu para buscar o CEP agora. Preencha o endereço à mão.');
    else if (r) aoMudar({ ...novo, ...Object.fromEntries(Object.entries(r).filter(([, x]) => x)) });
  }
  return (
    <fieldset className="cc-endereco">
      <legend className="rotulo">Endereço</legend>
      <div className="cc-grade">
        <label className="b-campo cc-cep"><span className="rotulo">CEP</span>
          <input inputMode="numeric" autoComplete="postal-code" value={valor.cep} onChange={(e) => cep(e.target.value)} placeholder="60150-160" />
          {buscando && <small className="cc-dica">Buscando…</small>}
        </label>
        <label className="b-campo cc-rua"><span className="rotulo">Rua / avenida</span>
          <input autoComplete="address-line1" value={valor.endereco} onChange={(e) => mudar('endereco', e.target.value)} /></label>
        <label className="b-campo cc-num"><span className="rotulo">Número</span>
          <input value={valor.numero} onChange={(e) => mudar('numero', e.target.value)} /></label>
        <label className="b-campo cc-comp"><span className="rotulo">Complemento</span>
          <input autoComplete="address-line2" value={valor.complemento} onChange={(e) => mudar('complemento', e.target.value)} placeholder="Apto, bloco…" /></label>
        <label className="b-campo cc-bairro"><span className="rotulo">Bairro</span>
          <input value={valor.bairro} onChange={(e) => mudar('bairro', e.target.value)} /></label>
        <label className="b-campo cc-cidade"><span className="rotulo">Cidade</span>
          <input autoComplete="address-level2" value={valor.cidade} onChange={(e) => mudar('cidade', e.target.value)} /></label>
        <label className="b-campo cc-uf"><span className="rotulo">UF</span>
          <select value={valor.uf} onChange={(e) => mudar('uf', e.target.value)}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></label>
      </div>
      {aviso && <p className="cc-aviso" role="status">{aviso}</p>}
    </fieldset>
  );
}

// "Como nos conheceu?": opções da casa + "Outro" com texto livre
export function CampoComoConheceu({ valor, aoMudar, rotulo = 'Como nos conheceu?' }) {
  const naLista = !valor || COMO_CONHECEU.includes(valor);
  const [outro, setOutro] = useState(!naLista);
  return (
    <div className="cc-como">
      <label className="b-campo"><span className="rotulo">{rotulo}</span>
        <select value={outro ? 'Outro' : valor} onChange={(e) => {
          const v = e.target.value;
          setOutro(v === 'Outro');
          aoMudar(v === 'Outro' ? '' : v);
        }}>
          <option value="">Escolha…</option>
          {COMO_CONHECEU.map((o) => <option key={o}>{o}</option>)}
          <option>Outro</option>
        </select>
      </label>
      {outro && (
        <label className="b-campo"><span className="rotulo">Qual?</span>
          <input value={valor} maxLength={60} onChange={(e) => aoMudar(e.target.value)} placeholder="Ex.: rádio, panfleto, evento no shopping" /></label>
      )}
    </div>
  );
}
