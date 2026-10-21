import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { bancada } from '../lib/api.js';
import { esquecerTudo } from './memoria.js';

// Sessão da equipe (separada da sessão do aluno)
const Ctx = createContext(null);
const CHAVE = 'ambar_bancada';

function ler() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) || null;
  } catch {
    return null;
  }
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
    guardar(r);
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

  const valor = useMemo(() => ({ token: s?.token, membro: s?.membro, entrar, sair, chamar }), [s, entrar, sair, chamar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useBancada = () => useContext(Ctx);

export const pode = (membro, ...papeis) => !!membro && papeis.includes(membro.papel);
