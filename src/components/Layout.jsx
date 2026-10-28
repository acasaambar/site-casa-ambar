import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Logo, Selo, Sol, IconeInstagram, IconeWhatsapp, IconeEmail } from './Marca.jsx';
import { useAuth } from '../lib/auth.jsx';
import { CONFIG } from '../config.js';
import { MODO_DEMO } from '../lib/api.js';
import { rolagemSuave } from '../lib/movimento.js';
import Assinatura from './Assinatura.jsx';

export function Header() {
  const { pathname } = useLocation();
  const { aluno, sair } = useAuth();
  const navegar = useNavigate();
  const naHome = pathname === '/';
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);
  const botaoMenu = useRef(null);

  useEffect(() => {
    const f = () => setRolou(window.scrollY > 40);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => {
    setAberto(false);
  }, [pathname]);
  // Esc fecha o menu do celular e devolve o foco ao botão
  useEffect(() => {
    if (!aberto) return undefined;
    // os links do menu vêm antes do botão no código: ao abrir, o foco vai ao primeiro link (senão o Tab pula o menu inteiro)
    document.querySelector('#menu-principal a')?.focus({ preventScroll: true });
    const f = (e) => {
      if (e.key !== 'Escape') return;
      setAberto(false);
      botaoMenu.current?.focus();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aberto]);
  // título da aba por página (a bancada cuida do próprio título)
  useEffect(() => {
    document.title = tituloDaPagina(pathname);
  }, [pathname]);

  const transparente = naHome && !rolou && !aberto;

  return (
    <header className={`topo ${transparente ? 'topo--transparente' : ''}`}>
      <button type="button" className="pular" onClick={pularParaOConteudo}>Pular para o conteúdo</button>
      <div className="topo__in">
        <Link to="/" className="topo__logo" aria-label="Casa Âmbar, início">
          <Logo variante={transparente ? 'creme' : 'verde'} largura={52} />
        </Link>
        <nav id="menu-principal" className={`topo__nav ${aberto ? 'aberto' : ''}`} aria-label="Principal">
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => { irPara(e, 'conceito'); setAberto(false); }}>A Casa</a>
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => { irPara(e, 'movimento'); setAberto(false); }}>Yoga & Pilates</a>
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => { irPara(e, 'equipe'); setAberto(false); }}>Nossa equipe</a>
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => { irPara(e, 'cuidados'); setAberto(false); }}>Cuidados</a>
          <a href={`${import.meta.env.BASE_URL}#/`} onClick={(e) => { irPara(e, 'contato'); setAberto(false); }}>Contato</a>
          {/* atalhos da área: só no menu do celular (no computador já estão na barra da área do aluno) */}
          {aluno ? (
            <>
              <NavLink className="topo__nav-area" to="/aulas">Aulas</NavLink>
              <NavLink className="topo__nav-area" to="/minhas-reservas">Minhas reservas</NavLink>
              <NavLink className="topo__nav-area" to="/meu-plano">Meu plano</NavLink>
              <NavLink className="topo__nav-area" to="/minha-conta">Minha conta</NavLink>
              <a
                className="topo__nav-area"
                href={`${import.meta.env.BASE_URL}#/`}
                onClick={(e) => {
                  e.preventDefault();
                  if (window.confirm('Deseja sair da sua conta?')) {
                    sair();
                    navegar('/');
                  }
                }}
              >
                Sair
              </a>
            </>
          ) : null}
        </nav>
        <div className="topo__acoes">
          <Link to={aluno ? '/aulas' : '/entrar'} className="botao botao--pequeno">
            {aluno ? `Olá, ${aluno.nome.split(' ')[0]}` : 'Reservar aula'}
          </Link>
          <button ref={botaoMenu} type="button" className="topo__menu" aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={aberto} aria-controls="menu-principal" onClick={() => setAberto((v) => !v)}>
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

const TITULO_INICIO = 'Casa Âmbar · Yoga, Pilates, Estética e Fisioterapia na Aldeota, Fortaleza';
const TITULOS = {
  '/entrar': 'Entrar',
  '/aulas': 'Aulas',
  '/meu-plano': 'Meu plano',
  '/pagamento': 'Pagamento',
  '/ficha-saude': 'Ficha de saúde',
  '/minhas-reservas': 'Minhas reservas',
  '/minha-conta': 'Minha conta',
  '/esqueci-senha': 'Esqueci a senha',
  '/nova-senha': 'Nova senha',
  '/descadastrar': 'Descadastrar',
  '/confirmar': 'Confirmar horário',
};
function tituloDaPagina(pathname) {
  if (pathname === '/') return TITULO_INICIO;
  const nome = TITULOS[pathname] || (pathname.startsWith('/aula/') ? 'Reservar aula' : pathname.startsWith('/confirmar/') ? TITULOS['/confirmar'] : '');
  return nome ? `${nome} · Casa Âmbar` : TITULO_INICIO;
}

// atalho de teclado: pula o cabeçalho e vai direto ao conteúdo da página
function pularParaOConteudo() {
  const m = document.querySelector('main');
  if (!m) return;
  m.setAttribute('tabindex', '-1');
  m.focus({ preventScroll: true });
  m.scrollIntoView({ behavior: 'auto', block: 'start' });
}

function irPara(e, id) {
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior: rolagemSuave() });
  } else {
    // está em outra página: volta para a home e rola depois
    sessionStorage.setItem('ambar_rolar', id);
  }
}

const IconePino = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);
const IconeRelogio = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
const IconeSeta = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" />
  </svg>
);

export function Footer() {
  const { aluno } = useAuth();
  return (
    <footer id="contato" className="rodape">
      <div className="rodape__in">
        <div className="rodape__marca">
          <Selo tamanho={128} />
          <p className="script">harmonia em estado natural</p>
        </div>

        <div className="rodape__col">
          <h2 className="rotulo">Visite</h2>
          <a className="rodape__item" href={CONFIG.mapa} target="_blank" rel="noreferrer">
            <IconePino />
            <span>Rua Eduardo Salgado, 448<small>Aldeota · Fortaleza</small></span>
          </a>
          <div className="rodape__item">
            <IconeRelogio />
            <span>Seg a sex · 6h às 20h<small>Sáb · 7h às 12h</small><small>Dom · fechado</small></span>
          </div>
        </div>

        <div className="rodape__col">
          <h2 className="rotulo">Fale com a gente</h2>
          <a className="rodape__item" href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer">
            <IconeWhatsapp /> <span>{CONFIG.telefone}</span>
          </a>
          <a className="rodape__item" href={`https://instagram.com/${CONFIG.instagram}`} target="_blank" rel="noreferrer">
            <IconeInstagram /> <span>@{CONFIG.instagram}</span>
          </a>
          <a className="rodape__item" href={`mailto:${CONFIG.email}`}>
            <IconeEmail /> <span>{CONFIG.email}</span>
          </a>
        </div>

        <nav className="rodape__col" aria-labelledby="rodape-area">
          <h2 id="rodape-area" className="rotulo">Área do aluno</h2>
          {aluno ? (
            <>
              <Link className="rodape__item" to="/aulas"><IconeSeta /> <span>Aulas</span></Link>
              <Link className="rodape__item" to="/minhas-reservas"><IconeSeta /> <span>Minhas reservas</span></Link>
              <Link className="rodape__item" to="/meu-plano"><IconeSeta /> <span>Meu plano</span></Link>
              <Link className="rodape__item" to="/minha-conta"><IconeSeta /> <span>Minha conta</span></Link>
            </>
          ) : (
            <>
              <Link className="rodape__item" to="/entrar"><IconeSeta /> <span>Entrar</span></Link>
              <Link className="rodape__item" to="/aulas"><IconeSeta /> <span>Reservar aula</span></Link>
              <Link className="rodape__item" to="/minhas-reservas"><IconeSeta /> <span>Minhas reservas</span></Link>
            </>
          )}
        </nav>
      </div>
      <div className="rodape__base">
        <span className="rodape__base-marca"><Sol tamanho={14} /> Casa Âmbar · desde 26</span>
        <span>Fortaleza · Ceará</span>
      </div>
      <Assinatura className="assinatura--rodape" />
    </footer>
  );
}
