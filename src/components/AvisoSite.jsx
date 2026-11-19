import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// Faixa de aviso no topo do site (Ajustes → Site → "Aviso no topo do site").
// Lê as regras públicas uma vez a cada 5 min por aba do navegador; quem fecha a faixa não a vê de novo até o texto mudar.
const CHAVE = 'ambar_aviso_site';
const FECHADO = 'ambar_aviso_fechado';
const VALIDADE = 5 * 60 * 1000;

function lerGuardado() {
  try {
    const g = JSON.parse(sessionStorage.getItem(CHAVE) || 'null');
    return g && Date.now() - g.em < VALIDADE ? g : null;
  } catch { return null; }
}

export default function AvisoSite() {
  const guardado = lerGuardado();
  const [aviso, setAviso] = useState(guardado ? guardado.aviso : null);
  const [fechado, setFechado] = useState(() => { try { return sessionStorage.getItem(FECHADO) || ''; } catch { return ''; } });

  useEffect(() => {
    if (lerGuardado()) return undefined;
    let vivo = true;
    api.regras().then((r) => {
      const a = r && r.aviso && r.aviso.texto ? r.aviso : null;
      try { sessionStorage.setItem(CHAVE, JSON.stringify({ em: Date.now(), aviso: a })); } catch { /* navegador sem armazenamento */ }
      if (vivo) setAviso(a);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  if (!aviso || fechado === aviso.texto) return null;
  const fechar = () => {
    setFechado(aviso.texto);
    try { sessionStorage.setItem(FECHADO, aviso.texto); } catch { /* sem armazenamento */ }
  };
  return (
    <div className="aviso-site" role="status">
      <p className="aviso-site__texto">{aviso.texto}</p>
      <button type="button" className="aviso-site__fechar" onClick={fechar} aria-label="Fechar aviso">×</button>
    </div>
  );
}
