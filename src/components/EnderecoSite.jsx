import { useState } from 'react';
import { UFS, buscarCep, mascaraCep } from '../lib/clientes.js';

// Endereço no site (cadastro e "Complete seu endereço"): o CEP preenche rua, bairro e cidade
export function EnderecoSite({ valor, aoMudar }) {
  const [aviso, setAviso] = useState('');
  const [buscando, setBuscando] = useState(false);
  const mudar = (k) => (e) => aoMudar({ ...valor, [k]: e.target.value });
  async function cep(e) {
    const novo = { ...valor, cep: mascaraCep(e.target.value) };
    aoMudar(novo);
    setAviso('');
    if (novo.cep.length !== 9) return;
    setBuscando(true);
    const r = await buscarCep(novo.cep);
    setBuscando(false);
    if (r?.erro === 'cep') setAviso('CEP não encontrado. Confira os números ou preencha à mão.');
    else if (r?.erro) setAviso('Não deu para buscar o CEP agora. Preencha o endereço à mão.');
    else if (r) aoMudar({ ...novo, ...Object.fromEntries(Object.entries(r).filter(([, x]) => x)) });
  }
  return (
    <fieldset className="end-site">
      <legend>Endereço</legend>
      <div className="end-site__grade">
        <label className="end-site__cep">
          CEP
          <input inputMode="numeric" autoComplete="postal-code" placeholder="60000-000" required value={valor.cep} onChange={cep} />
          {buscando && <span className="dica-campo">Buscando o endereço…</span>}
        </label>
        <label className="end-site__rua">
          Rua / avenida
          <input autoComplete="address-line1" required value={valor.endereco} onChange={mudar('endereco')} />
        </label>
        <label className="end-site__num">
          Número
          <input autoComplete="off" required value={valor.numero} onChange={mudar('numero')} />
        </label>
        <label className="end-site__comp">
          Complemento
          <input autoComplete="address-line2" placeholder="Opcional" value={valor.complemento} onChange={mudar('complemento')} />
        </label>
        <label className="end-site__bairro">
          Bairro
          <input autoComplete="address-level3" required value={valor.bairro} onChange={mudar('bairro')} />
        </label>
        <label className="end-site__cidade">
          Cidade
          <input autoComplete="address-level2" required value={valor.cidade} onChange={mudar('cidade')} />
        </label>
        <label className="end-site__uf">
          UF
          <select required value={valor.uf} onChange={mudar('uf')}>
            <option value="">—</option>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
      </div>
      {aviso && <p className="end-site__aviso" role="status">{aviso}</p>}
    </fieldset>
  );
}
