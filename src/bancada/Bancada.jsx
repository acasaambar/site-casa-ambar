import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SessaoBancada, useBancada, pode } from './sessao.jsx';
import { Logo, Sol, Selo, img } from '../components/Marca.jsx';
import { bancada } from '../lib/api.js';
import { Atualizando, preCarregar } from './ui.jsx';
import { CampoSenha } from '../components/CampoSenha.jsx';
import Inicio from './Inicio.jsx';
import Agenda from './Agenda.jsx';
import { Alunos, AlunoDetalhe } from './Alunos.jsx';
import Vendas from './Vendas.jsx';
import Comandas from './Comandas.jsx';
import Estoque from './Estoque.jsx';
import Financeiro, { MeusGanhos } from './Financeiro.jsx';
import Marketing from './Marketing.jsx';
import Relatorios from './Relatorios.jsx';
import Grade from './Grade.jsx';
import Equipe from './Equipe.jsx';
import Ajustes from './Ajustes.jsx';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import './bancada.css';

const PAPEL = { admin: 'Administração', recepcao: 'Recepção', professora: 'Professora · profissional' };

const I = {
  inicio: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  agenda: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  alunos: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.2c2.3.2 4 1.8 4.6 4.8" /></>,
  vendas: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  vales: <><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M12 9v11M3.5 13h17M12 9c-1.5-3.5-5-3.5-5-1.2C7 9 9.5 9 12 9zm0 0c1.5-3.5 5-3.5 5-1.2C17 9 14.5 9 12 9z" /></>,
  relatorios: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  grade: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="10" cy="18" r="1.6" /></>,
  equipe: <><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1-3.6 3.8-5.6 7-5.6s6 2 7 5.6" /></>,
  comandas: <><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  estoque: <><path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z" /><path d="M3.5 8 12 12l8.5-4M12 12v8" /></>,
  financeiro: <><ellipse cx="9" cy="7" rx="5.5" ry="2.5" /><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" /><path d="M9.5 16.2c.6.2 1.2.3 1.9.3 3 0 5.5-1.1 5.5-2.5v-4" /><ellipse cx="15" cy="17" rx="5.5" ry="2.5" /></>,
  marketing: <><path d="M4 10v4l3 .5L15 19V5L7 9.5z" /><path d="M7 14.5 8.5 20h2.5L10 15" /><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" /></>,
  ganhos: <><circle cx="12" cy="12" r="8.5" /><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2c1.6.3 2.8.9 2.8 2.1s-1.2 2.1-2.8 2.1c-1.3 0-2.4-.6-2.9-1.5M12 6.3v1.5M12 16.2v1.5" /></>,
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
    ['comandas', 'Comandas e caixa', 'comandas', ['admin', 'recepcao']],
    ['vendas', 'Vendas', 'vendas', ['admin', 'recepcao']],
    ['estoque', 'Estoque', 'estoque', ['admin', 'recepcao']],
    ['ganhos', 'Meus ganhos', 'ganhos', ['professora']],
  ]],
  ['Relacionamento', [
    ['marketing', 'Marketing', 'marketing', ['admin', 'recepcao']],
  ]],
  ['A casa', [
    ['financeiro', 'Financeiro', 'financeiro', ['admin']],
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
  const { membro, sair, chamar, token } = useBancada();
  const [menu, setMenu] = useState(false);
  const local = useLocation();
  useEffect(() => { setMenu(false); }, [local.pathname]);
  useEffect(() => {
    document.title = 'Bancada · Casa Âmbar';
    return () => { document.title = 'Casa Âmbar · harmonia em estado natural'; };
  }, []);
  // o que quase toda tela da recepção usa (catálogo e planos) já vem carregado
  useEffect(() => {
    if (!pode(membro, 'admin', 'recepcao')) return undefined;
    const t = setTimeout(() => { preCarregar(chamar, token, 'catalogoServicos'); preCarregar(chamar, token, 'planos'); }, 1500);
    return () => clearTimeout(t);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
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

      <Atualizando />
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
                <Route path="comandas" element={<Comandas />} />
                <Route path="estoque" element={<Estoque />} />
                <Route path="marketing" element={<Marketing />} />
                <Route path="vales" element={<Navigate to="/bancada/marketing" replace state={{ aba: 'vales' }} />} />
                <Route path="grade" element={<Grade />} />
              </>
            )}
            {pode(membro, 'admin') && (
              <>
                <Route path="relatorios" element={<Relatorios />} />
                <Route path="financeiro" element={<Financeiro />} />
                <Route path="equipe" element={<Equipe />} />
                <Route path="ajustes" element={<Ajustes />} />
              </>
            )}
            {pode(membro, 'professora') && <Route path="ganhos" element={<MeusGanhos />} />}
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
                <CampoSenha autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
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
