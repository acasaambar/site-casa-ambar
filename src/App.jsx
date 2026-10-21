import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { Header, Footer } from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Entrar from './pages/Entrar.jsx';
import Aulas from './pages/Aulas.jsx';
import Reservar from './pages/Reservar.jsx';
import MinhasReservas from './pages/MinhasReservas.jsx';
import MinhaConta from './pages/MinhaConta.jsx';
import ErroTela from './components/ErroTela.jsx';
import FichaSaude from './pages/FichaSaude.jsx';
import MeuPlano from './pages/MeuPlano.jsx';
import Pagamento from './pages/Pagamento.jsx';
import WhatsFlutuante from './components/WhatsFlutuante.jsx';
import { EsqueciSenha, NovaSenha, Descadastrar } from './pages/Senha.jsx';
import Confirmar from './pages/Confirmar.jsx';

// a bancada só é baixada por quem abre /#/bancada (o site do aluno fica leve)
const Bancada = lazy(() => import('./bancada/Bancada.jsx'));

function Protegida({ children }) {
  const { token } = useAuth();
  const local = useLocation();
  if (!token) return <Navigate to="/entrar" replace state={{ de: local.pathname + local.search }} />;
  return children;
}

function TopoAoNavegar() {
  const { pathname } = useLocation();
  useEffect(() => {
    // chaves obrigatórias: no Chrome novo o scrollTo devolve uma Promise,
    // e o React tentaria usá-la como função de limpeza (erro "l is not a function")
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Paginas({ children }) {
  const { pathname } = useLocation();
  return <ErroTela key={pathname.startsWith('/bancada') ? '/bancada' : pathname}>{children}</ErroTela>;
}

// A bancada tem layout próprio (sem cabeçalho, rodapé e WhatsApp do site)
function SoNoSite({ children }) {
  const { pathname } = useLocation();
  return pathname.startsWith('/bancada') ? null : children;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <TopoAoNavegar />
        <SoNoSite><Header /></SoNoSite>
        <Paginas>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/aulas" element={<Protegida><Aulas /></Protegida>} />
          <Route path="/aula/:id" element={<Protegida><Reservar /></Protegida>} />
          <Route path="/meu-plano" element={<Protegida><MeuPlano /></Protegida>} />
          <Route path="/pagamento" element={<Protegida><Pagamento /></Protegida>} />
          <Route path="/ficha-saude" element={<Protegida><FichaSaude /></Protegida>} />
          <Route path="/minhas-reservas" element={<Protegida><MinhasReservas /></Protegida>} />
          <Route path="/minha-conta" element={<Protegida><MinhaConta /></Protegida>} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/nova-senha" element={<NovaSenha />} />
          <Route path="/descadastrar" element={<Descadastrar />} />
          <Route path="/confirmar/:t" element={<Confirmar />} />
          <Route path="/bancada/*" element={<Suspense fallback={<div className="b-carregando-tela" role="status">Abrindo a bancada…</div>}><Bancada /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Paginas>
        <SoNoSite>
          <Footer />
          <WhatsFlutuante />
        </SoNoSite>
      </HashRouter>
    </AuthProvider>
  );
}
