import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { bancada } from '../lib/api.js';
import { esquecerTudo } from './memoria.js';
import { hojeIso } from './ui.jsx';

// Sessão da equipe (separada da sessão do aluno)
const Ctx = createContext(null);
const CHAVE = 'ambar_bancada';
// o login da bancada vale só no dia (até a meia-noite) e cai depois de 3 h sem uso (o servidor confere o mesmo)
const PARADA_MS = 3 * 3600e3;

// (o prazo exato fica com o servidor: relógio errado no aparelho não derruba o login)
const venceu = (s) => !s || s.dia !== hojeIso() || Date.now() - (s.usoEm || 0) > PARADA_MS;

function ler() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE)) || null;
    if (s && venceu(s)) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

// marca o uso (no máximo uma gravação por minuto)
function marcarUso(s) {
  if (!s || Date.now() - (s.usoEm || 0) < 60e3) return;
  s.usoEm = Date.now();
  try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch { /* sem armazenamento */ }
}

export function SessaoBancada({ children }) {
  const [s, setS] = useState(ler);

  const guardar = useCallback((v) => {
    esquecerTudo();
    setS(v);
    try {
      if (v) localStorage.setItem(CHAVE, JSON.stringify(v));
      else localStorage.removeItem(CHAVE);
    } catch {
      /* sem armazenamento */
    }
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const r = await bancada('entrar', { email, senha });
    guardar({ ...r, dia: hojeIso(), usoEm: Date.now() });
    return r;
  }, [guardar]);

  const sair = useCallback(() => {
    if (s?.token) bancada('sair', { token: s.token }).catch(() => {});
    guardar(null);
  }, [s, guardar]);

  // chama uma ação da bancada já com o token; sessão vencida → volta ao login
  const chamar = useCallback(async (acao, dados = {}) => {
    try {
      return await bancada(acao, { ...dados, token: s?.token });
    } catch (e) {
      if (e.codigo === 'SESSAO_EQUIPE') guardar(null);
      throw e;
    }
  }, [s, guardar]);

  // ao abrir a bancada, confere papel e "nome na agenda" no servidor (a administração pode ter mudado)
  useEffect(() => {
    if (!s?.token) return undefined;
    let vivo = true;
    bancada('eu', { token: s.token }).then((m) => {
      if (!vivo || !m || JSON.stringify(m) === JSON.stringify(s.membro)) return;
      setS((atual) => {
        const novo = atual ? { ...atual, membro: m } : atual;
        try { if (novo) localStorage.setItem(CHAVE, JSON.stringify(novo)); } catch { /* sem armazenamento */ }
        return novo;
      });
    }).catch((e) => { if (vivo && e.codigo === 'SESSAO_EQUIPE') guardar(null); });
    return () => { vivo = false; };
  }, [s?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  // passou da meia-noite ou ficou parada demais: volta ao login (confere a cada minuto e ao voltar à aba)
  useEffect(() => {
    if (!s?.token) return undefined;
    const conferir = () => { if (venceu(s)) { bancada('sair', { token: s.token }).catch(() => {}); guardar(null); } };
    // uso = alguém tocou ou digitou (a agenda que se atualiza sozinha não conta)
    const usou = () => (venceu(s) ? conferir() : marcarUso(s));
    const t = setInterval(conferir, 60e3);
    document.addEventListener('visibilitychange', conferir);
    document.addEventListener('pointerdown', usou, true);
    document.addEventListener('keydown', usou, true);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', conferir);
      document.removeEventListener('pointerdown', usou, true);
      document.removeEventListener('keydown', usou, true);
    };
  }, [s, guardar]);

  const valor = useMemo(() => ({ token: s?.token, membro: s?.membro, entrar, sair, chamar }), [s, entrar, sair, chamar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useBancada = () => useContext(Ctx);

export const pode = (membro, ...papeis) => !!membro && papeis.includes(membro.papel);
