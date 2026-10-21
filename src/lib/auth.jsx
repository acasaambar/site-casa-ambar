import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from './api.js';
import { CONFIG } from '../config.js';

const AuthCtx = createContext(null);
const CHAVE = 'ambar_sessao';
// o login da área do aluno vale no máximo 7 dias e cai depois de 3 dias sem abrir o site (o servidor também confere os 7 dias)
const MAXIMO_MS = 7 * 86400e3;
const PARADA_MS = 3 * 86400e3;

const venceu = (s) => !s || Date.now() - (s.entrouEm || Date.now()) > MAXIMO_MS || Date.now() - (s.usoEm || Date.now()) > PARADA_MS;

function lerSessao() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE)) || null;
    if (s && venceu(s)) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    // sessão antiga (sem as datas): conta a partir de agora
    if (s) {
      s.entrouEm = s.entrouEm || Date.now();
      s.usoEm = Date.now();
      localStorage.setItem(CHAVE, JSON.stringify(s));
    }
    return s;
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
    guardar({ ...s, entrouEm: Date.now(), usoEm: Date.now() });
    return s;
  }, [guardar]);
  const cadastrar = useCallback(async (dados) => {
    const s = await api.cadastrar(dados);
    guardar({ ...s, entrouEm: Date.now(), usoEm: Date.now() });
    return s;
  }, [guardar]);

  // site aberto de novo depois de muito tempo (aba esquecida): confere ao voltar e marca o uso
  useEffect(() => {
    if (!sessao?.token) return undefined;
    const conferir = () => {
      if (document.visibilityState !== 'visible') return;
      if (venceu(sessao)) { api.sair(sessao.token).catch(() => {}); guardar(null); return; }
      if (Date.now() - (sessao.usoEm || 0) > 60e3) guardar({ ...sessao, usoEm: Date.now() });
    };
    document.addEventListener('visibilitychange', conferir);
    return () => document.removeEventListener('visibilitychange', conferir);
  }, [sessao, guardar]);
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
