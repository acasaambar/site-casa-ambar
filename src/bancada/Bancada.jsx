import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SessaoBancada, useBancada, pode } from './sessao.jsx';
import { Logo, Sol, Selo, img } from '../components/Marca.jsx';
import { bancada } from '../lib/api.js';
import Inicio from './Inicio.jsx';
import Agenda from './Agenda.jsx';
import { Alunos, AlunoDetalhe } from './Alunos.jsx';
import Vendas from './Vendas.jsx';
import Vales from './Vales.jsx';
import Relatorios from './Relatorios.jsx';
import Grade from './Grade.jsx';
import Equipe from './Equipe.jsx';
import Ajustes from './Ajustes.jsx';
import './bancada.css';

const PAPEL = { admin: 'Administração', recepcao: 'Recepção', professora: 'Professora' };

const I = {
  inicio: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  agenda: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  alunos: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.2c2.3.2 4 1.8 4.6 4.8" /></>,
  vendas: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  vales: <><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M12 9v11M3.5 13h17M12 9c-1.5-3.5-5-3.5-5-1.2C7 9 9.5 9 12 9zm0 0c1.5-3.5 5-3.5 5-1.2C17 9 14.5 9 12 9z" /></>,
  relatorios: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  grade: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="10" cy="18" r="1.6" /></>,
  equipe: <><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1-3.6 3.8-5.6 7-5.6s6 2 7 5.6" /></>,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
};
const Icone = ({ nome }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[nome]}</svg>
);

const MENU = [
  ['Dia a dia', [
    ['', 'Hoje', 'inicio', ['admin', 'recepcao', 'professora']],
    ['agenda', 'Agenda', 'agenda', ['admin', 'recepcao', 'professora']],
    ['alunos', 'Clientes', 'alunos', ['admin', 'recepcao']],
  ]],
  ['Caixa', [
    ['vendas', 'Vendas', 'vendas', ['admin', 'recepcao']],
    ['vales', 'Vales e cupons', 'vales', ['admin', 'recepcao']],
  ]],
  ['A casa', [
    ['relatorios', 'Relatórios', 'relatorios', ['admin']],
    ['grade', 'Catálogo', 'grade', ['admin', 'recepcao']],
    ['equipe', 'Equipe', 'equipe', ['admin']],
    ['ajustes', 'Ajustes', 'ajustes', ['admin']],
  ]],
];

export default function Bancada() {
  return (
    <SessaoBancada>
      <Portao />
    </SessaoBancada>
  );
}

function Portao() {
  const { token } = useBancada();
  if (!token) return <Login />;
  return <Painel />;
}

function Painel() {
  const { membro, sair } = useBancada();
  const [menu, setMenu] = useState(false);
  const local = useLocation();
  useEffect(() => { setMenu(false); }, [local.pathname]);
  useEffect(() => {
    document.title = 'Bancada · Casa Âmbar';
    return () => { document.title = 'Casa Âmbar · harmonia em estado natural'; };
  }, []);
  const grupos = MENU.map(([g, l]) => [g, l.filter((m) => pode(membro, ...m[3]))]).filter(([, l]) => l.length);
  return (
    <div className="bancada">
      <aside className={`b-lateral${menu ? ' b-lateral--aberta' : ''}`}>
        <div className="b-lateral__marca">
          <Logo variante="creme" largura={92} />
          <span className="rotulo">Bancada</span>
        </div>
        <nav className="b-menu" aria-label="Bancada">
          {grupos.map(([g, l]) => (
            <div key={g} className="b-menu__grupo">
              {grupos.length > 1 && <span className="b-menu__titulo">{g}</span>}
              {l.map(([to, texto, icone]) => (
                <NavLink key={to} to={'/bancada' + (to ? '/' + to : '')} end={!to} className="b-menu__item">
                  <Icone nome={icone} />
                  <span>{texto}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="b-lateral__pe">
          <div className="b-eu">
            <strong>{membro.nome}</strong>
            <span>{PAPEL[membro.papel]}</span>
          </div>
          <a className="b-lateral__site" href="#/" target="_blank" rel="noreferrer">Ver site</a>
          <button type="button" className="b-lateral__sair" onClick={sair}>Sair</button>
        </div>
        <Selo tamanho={210} className="b-lateral__selo" />
      </aside>
      {menu && <button type="button" className="b-veu" aria-label="Fechar menu" onClick={() => setMenu(false)} />}

      <div className="b-conteudo">
        <div className="b-topo-cel">
          <button type="button" className="b-topo-cel__menu" aria-label="Abrir menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <span /><span /><span />
          </button>
          <Logo variante="verde" largura={64} />
          <span className="rotulo">Bancada</span>
        </div>
        <main className="b-pagina">
          <Routes>
            <Route index element={<Inicio />} />
            <Route path="agenda" element={<Agenda />} />
            {pode(membro, 'admin', 'recepcao') && (
              <>
                <Route path="alunos" element={<Alunos />} />
                <Route path="alunos/:cpf" element={<AlunoDetalhe />} />
                <Route path="vendas" element={<Vendas />} />
                <Route path="vales" element={<Vales />} />
                <Route path="grade" element={<Grade />} />
              </>
            )}
            {pode(membro, 'admin') && (
              <>
                <Route path="relatorios" element={<Relatorios />} />
                <Route path="equipe" element={<Equipe />} />
                <Route path="ajustes" element={<Ajustes />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/bancada" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function Login() {
  const { entrar } = useBancada();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [esqueci, setEsqueci] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (esqueci) {
        await bancada('esqueci', { email: email.trim() });
        setEnviado(true);
      } else {
        await entrar(email.trim(), senha);
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="b-login">
      <img className="b-login__foto" src={img('yoga.jpg')} alt="" aria-hidden="true" />
      <div className="b-login__veu" />
      <div className="b-login__caixa">
        <Logo variante="verde" largura={120} />
        <span className="rotulo-espacado cor-terracota">Bancada interna</span>
        <h1 className="display-m">{esqueci ? 'Nova senha' : 'Bem-vinda'}</h1>
        {enviado ? (
          <>
            <p className="b-login__sub">Se este e-mail tiver acesso à bancada, enviamos um link para criar uma nova senha. Confira também o spam.</p>
            <button type="button" className="botao botao--linha" onClick={() => { setEsqueci(false); setEnviado(false); }}>Voltar</button>
          </>
        ) : (
          <form className="form" onSubmit={enviar} noValidate>
            <p className="b-login__sub">{esqueci ? 'Digite seu e-mail de acesso. Enviaremos um link para criar uma nova senha.' : 'Acesso da equipe da Casa Âmbar.'}</p>
            <label>
              E-mail
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {!esqueci && (
              <label>
                Senha
                <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              </label>
            )}
            {erro && <p className="erro" role="alert">{erro}</p>}
            <button type="submit" className="botao botao--cheio" disabled={enviando}>{enviando ? 'Aguarde…' : esqueci ? 'Enviar link' : 'Entrar'}</button>
            <button type="button" className="link-acao b-login__esqueci" onClick={() => { setEsqueci(!esqueci); setErro(''); }}>
              {esqueci ? 'Voltar para entrar' : 'Esqueci minha senha'}
            </button>
          </form>
        )}
        <Sol tamanho={22} className="cor-caramelo b-login__sol" />
      </div>
    </main>
  );
}
