import { createContext, useContext, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthCtx = createContext(null);
const CHAVE = 'ambar_sessao';

function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessao);

  const guardar = useCallback((s) => {
    setSessao(s);
    try {
      if (s) localStorage.setItem(CHAVE, JSON.stringify(s));
      else localStorage.removeItem(CHAVE);
    } catch {
      /* sem armazenamento */
    }
  }, []);

  const entrar = useCallback(async (cpf, senha) => guardar(await api.entrar({ cpf, senha })), [guardar]);
  const cadastrar = useCallback(async (dados) => guardar(await api.cadastrar(dados)), [guardar]);
  const sair = useCallback(() => {
    if (sessao?.token) api.sair(sessao.token).catch(() => {});
    guardar(null);
  }, [sessao, guardar]);

  const expirou = useCallback(() => guardar(null), [guardar]);

  return (
    <AuthCtx.Provider value={{ token: sessao?.token, aluno: sessao?.aluno, entrar, cadastrar, sair, expirou }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
