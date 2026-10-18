import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { Header, Footer } from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Entrar from './pages/Entrar.jsx';
import Aulas from './pages/Aulas.jsx';
import Reservar from './pages/Reservar.jsx';
import MinhasReservas from './pages/MinhasReservas.jsx';
import ErroTela from './components/ErroTela.jsx';
import FichaSaude from './pages/FichaSaude.jsx';
import WhatsFlutuante from './components/WhatsFlutuante.jsx';

function Protegida({ children }) {
  const { token } = useAuth();
  const local = useLocation();
  if (!token) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
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
  return <ErroTela key={pathname}>{children}</ErroTela>;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <TopoAoNavegar />
        <Header />
        <Paginas>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/aulas" element={<Protegida><Aulas /></Protegida>} />
          <Route path="/aula/:id" element={<Protegida><Reservar /></Protegida>} />
          <Route path="/ficha-saude" element={<Protegida><FichaSaude /></Protegida>} />
          <Route path="/minhas-reservas" element={<Protegida><MinhasReservas /></Protegida>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Paginas>
        <Footer />
        <WhatsFlutuante />
      </HashRouter>
    </AuthProvider>
  );
}
