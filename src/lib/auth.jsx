import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from './api.js';
import { CONFIG } from '../config.js';

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

  // regras definidas na bancada (check-in, cancelamento...)
  useEffect(() => {
    api.regras().then((r) => {
      ['checkinAbreMinAntes', 'cancelarAteHorasAntes', 'diasVisiveis'].forEach((k) => {
        if (r && r[k] != null) CONFIG[k] = r[k];
      });
    }).catch(() => {});
  }, []);

  const guardar = useCallback((s) => {
    setSessao(s);
    try {
      if (s) localStorage.setItem(CHAVE, JSON.stringify(s));
      else localStorage.removeItem(CHAVE);
    } catch {
      /* sem armazenamento */
    }
  }, []);

  const entrar = useCallback(async (cpf, senha) => {
    const s = await api.entrar({ cpf, senha });
    guardar(s);
    return s;
  }, [guardar]);
  const cadastrar = useCallback(async (dados) => {
    const s = await api.cadastrar(dados);
    guardar(s);
    return s;
  }, [guardar]);
  const sair = useCallback(() => {
    if (sessao?.token) api.sair(sessao.token).catch(() => {});
    guardar(null);
  }, [sessao, guardar]);

  const expirou = useCallback(() => guardar(null), [guardar]);
  const atualizarAluno = useCallback((dados) => guardar(sessao ? { ...sessao, aluno: { ...sessao.aluno, ...dados } } : null), [sessao, guardar]);

  return (
    <AuthCtx.Provider value={{ token: sessao?.token, aluno: sessao?.aluno, entrar, cadastrar, sair, expirou, atualizarAluno, guardarSessao: guardar }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
