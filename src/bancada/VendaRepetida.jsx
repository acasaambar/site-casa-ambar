import { useEffect, useRef, useState } from 'react';
import './css/vendas.css';
import { registrarPerguntaDeVendaRepetida } from '../lib/api.js';
import { Modal, Aviso, real, dataBR } from './ui.jsx';

// Janela única da proteção contra venda duplicada: o servidor recusou (VENDA_DUPLICADA) porque já existe uma venda
// do mesmo cliente, item e valor no dia. Vale para todas as portas (Vendas, agenda, aula avulsa, comanda).
// Fica montada na bancada e responde às chamadas de api.js; "Registrar mesmo assim" pede um motivo.
const ONDE = { comanda: 'na comanda', site: 'pelo site', 'balcão': 'no balcão' };

function quem(email) {
  const nome = String(email || '').split('@')[0];
  return nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : '';
}

export default function VendaRepetida() {
  const [pergunta, setPergunta] = useState(null);
  const resolver = useRef(null);
  const [motivo, setMotivo] = useState('');
  const [outro, setOutro] = useState('');

  useEffect(() => registrarPerguntaDeVendaRepetida((dados) => new Promise((resolve) => {
    resolver.current = resolve;
    setMotivo('');
    setOutro('');
    setPergunta(dados);
  })), []);

  function responder(r) {
    resolver.current?.(r);
    resolver.current = null;
    setPergunta(null);
  }

  if (!pergunta) return null;
  const lista = pergunta.repetidas || [];
  const texto = motivo === 'Outro motivo' ? outro.trim() : motivo;
  const pode = texto.length >= 3;
  return (
    <Modal titulo="Venda parecida já registrada" rotulo="Mesmo cliente, mesmo item e mesmo valor hoje" aoFechar={() => responder(null)}>
      <div className="vr">
        <Aviso tom="aviso" titulo="Confira antes de lançar de novo">
          Se for a mesma venda, cancele: o dinheiro entraria em dobro no caixa e nas comissões.
        </Aviso>
        <ul className="b-itens vr__lista">
          {lista.map((v) => (
            <li key={v.nsu} className="b-item">
              <div className="b-item__corpo">
                <span className="b-item__titulo">{v.item}</span>
                <span className="b-meta">
                  <span>{real(v.valor)}</span>
                  {v.metodo && <span>{v.metodo}</span>}
                  <span>{ONDE[v.origem] || v.origem}{v.comanda ? ` · ${v.comanda}` : ''}</span>
                  <span>{dataBR(v.dia)}{v.hora ? ` às ${v.hora}` : ''}</span>
                  {(v.porNome || v.por) && <span>por {v.porNome || quem(v.por)}</span>}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <fieldset className="vr__motivos">
          <legend className="rotulo">É outra venda mesmo? Diga por quê</legend>
          <div className="vr__chips">
            {(pergunta.motivos || []).map((t) => (
              <button key={t} type="button" className={`b-chip${motivo === t ? ' b-chip--ativo' : ''}`} aria-pressed={motivo === t} onClick={() => setMotivo(t)}>{t}</button>
            ))}
          </div>
          {motivo === 'Outro motivo' && (
            <label className="b-campo">
              <span className="rotulo">Qual?</span>
              <input value={outro} maxLength={100} onChange={(e) => setOutro(e.target.value)} autoFocus />
            </label>
          )}
        </fieldset>
        <div className="vr__acoes">
          <button type="button" className="botao botao--cheio" onClick={() => responder(null)}>Cancelar, já está lançada</button>
          <button type="button" className="botao botao--linha" disabled={!pode} onClick={() => responder({ motivo: texto })}>Registrar mesmo assim</button>
        </div>
      </div>
    </Modal>
  );
}
