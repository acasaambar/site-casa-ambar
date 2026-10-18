import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo, Selo, Sol, IconeInstagram, IconeWhatsapp } from './Marca.jsx';
import { useAuth } from '../lib/auth.jsx';
import { CONFIG } from '../config.js';
import { MODO_DEMO } from '../lib/api.js';

export function Header() {
  const { pathname } = useLocation();
  const { aluno } = useAuth();
  const naHome = pathname === '/';
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const f = () => setRolou(window.scrollY > 40);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  const transparente = naHome && !rolou && !aberto;

  return (
    <header className={`topo ${transparente ? 'topo--transparente' : ''}`}>
      <div className="topo__in">
        <Link to="/" className="topo__logo" aria-label="Casa Âmbar, início">
          <Logo variante={transparente ? 'creme' : 'verde'} largura={52} />
        </Link>
        <nav className={`topo__nav ${aberto ? 'aberto' : ''}`} aria-label="Principal">
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => irPara(e, 'conceito')}>A Casa</a>
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => irPara(e, 'movimento')}>Yoga & Pilates</a>
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => irPara(e, 'cuidados')}>Cuidados</a>
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => irPara(e, 'contato')}>Contato</a>
          {aluno ? (
            <>
              <NavLink to="/aulas">Aulas</NavLink>
              <NavLink to="/minhas-reservas">Minhas reservas</NavLink>
              <NavLink to="/meu-plano">Meu plano</NavLink>
            </>
          ) : null}
        </nav>
        <div className="topo__acoes">
          <Link to={aluno ? '/aulas' : '/entrar'} className="botao botao--pequeno">
            {aluno ? `Olá, ${aluno.nome.split(' ')[0]}` : 'Reservar aula'}
          </Link>
          <button type="button" className="topo__menu" aria-label="Abrir menu" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
            <span /><span />
          </button>
        </div>
      </div>
      {MODO_DEMO && pathname !== '/' && (
        <div className="faixa-demo">Modo demonstração · os dados ficam salvos só neste navegador</div>
      )}
    </header>
  );
}

function irPara(e, id) {
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth' });
  } else {
    // está em outra página: volta para a home e rola depois
    sessionStorage.setItem('ambar_rolar', id);
  }
}

export function Footer() {
  return (
    <footer id="contato" className="rodape">
      <div className="rodape__in">
        <div className="rodape__marca">
          <Selo tamanho={150} />
          <p className="script">harmonia em estado natural</p>
        </div>
        <div className="rodape__col">
          <h2 className="rotulo">Visite</h2>
          <a href={CONFIG.mapa} target="_blank" rel="noreferrer">{CONFIG.endereco}</a>
          {CONFIG.horario && <span>{CONFIG.horario}</span>}
        </div>
        <div className="rodape__col">
          <h2 className="rotulo">Fale com a gente</h2>
          <a className="com-icone" href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer">
            <IconeWhatsapp /> {CONFIG.telefone}
          </a>
          <a className="com-icone" href={`https://instagram.com/${CONFIG.instagram}`} target="_blank" rel="noreferrer">
            <IconeInstagram /> @{CONFIG.instagram}
          </a>
        </div>
        <div className="rodape__col">
          <h2 className="rotulo">Área do aluno</h2>
          <Link to="/entrar">Entrar</Link>
          <Link to="/aulas">Reservar aula</Link>
          <Link to="/minhas-reservas">Minhas reservas</Link>
        </div>
      </div>
      <div className="rodape__base">
        <Sol tamanho={14} />
        <span>Casa Âmbar · desde 26</span>
      </div>
    </footer>
  );
}
