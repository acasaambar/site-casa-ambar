import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { bancada } from '../lib/api.js';

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

  const valor = useMemo(() => ({ token: s?.token, membro: s?.membro, entrar, sair, chamar }), [s, entrar, sair, chamar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useBancada = () => useContext(Ctx);

export const pode = (membro, ...papeis) => !!membro && papeis.includes(membro.papel);
