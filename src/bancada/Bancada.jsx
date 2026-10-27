import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './bancada.css';
import './css/base.css';
import './css/shell.css';
import { SessaoBancada, useBancada, pode } from './sessao.jsx';
import { Logo, Sol, Selo, img } from '../components/Marca.jsx';
import { bancada } from '../lib/api.js';
import { Atualizando, preCarregar, hojeIso, segundaDe, Aviso } from './ui.jsx';
import { Icone } from './icones.jsx';
import { CampoSenha } from '../components/CampoSenha.jsx';
import Assinatura from '../components/Assinatura.jsx';
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
import Velocidade from './Velocidade.jsx';
import { MinhasClientes, ClienteProfissional } from './Anamnese.jsx';
import { Busca, BotaoBusca, useAtalhoBusca } from './Busca.jsx';
import VendaRepetida from './VendaRepetida.jsx';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';

const PAPEL = { admin: 'Administração', recepcao: 'Recepção', professora: 'Profissional' };

// iniciais para o avatar: primeiro e último nome (nome só: as duas primeiras letras)
function iniciais(nome) {
  const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '·';
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
}

const MENU = [
  ['Dia a dia', [
    ['', 'Hoje', 'inicio', ['admin', 'recepcao', 'professora']],
    ['agenda', 'Agenda', 'agenda', ['admin', 'recepcao', 'professora']],
    ['alunos', 'Clientes', 'alunos', ['admin', 'recepcao']],
    ['clientes', 'Clientes', 'alunos', ['professora']],
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
  const [busca, setBusca] = useState(false);
  useAtalhoBusca(() => setBusca(true));
  const local = useLocation();
  useEffect(() => { setMenu(false); }, [local.pathname]);
  useEffect(() => {
    document.title = 'Bancada · Casa Âmbar';
    return () => { document.title = 'Casa Âmbar · harmonia em estado natural'; };
  }, []);
  // as telas mais usadas já vêm carregadas por trás (abrem na hora): catálogo, planos,
  // a agenda desta semana, comandas abertas e a lista de clientes; para a profissional, as clientes dela
  useEffect(() => {
    const semana = ['agendaSemana', { de: segundaDe(hojeIso()) }];
    const pedidos = pode(membro, 'admin', 'recepcao')
      ? [semana, ['catalogoServicos'], ['planos'], ['comandas', { status: 'aberta' }], ['alunos', {}]]
      : [semana, ['minhasClientes']];
    const timers = pedidos.map(([acao, params], i) => setTimeout(() => preCarregar(chamar, token, acao, params), 600 + i * 400));
    return () => timers.forEach(clearTimeout);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const grupos = MENU.map(([g, l]) => [g, l.filter((m) => pode(membro, ...m[3]))]).filter(([, l]) => l.length);
  return (
    <div className="bancada">
      <aside className={`b-lateral${menu ? ' b-lateral--aberta' : ''}`} aria-label="Menu da bancada">
        <div className="b-lateral__marca">
          <Logo variante="creme" largura={64} />
          <span className="b-lateral__nome">Bancada</span>
          <button type="button" className="b-lateral__fechar" aria-label="Fechar menu" onClick={() => setMenu(false)}><Icone nome="fechar" tamanho={20} /></button>
        </div>
        <BotaoBusca className="bg-botao--lateral" aoAbrir={() => setBusca(true)} />
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
            <div className="b-eu__avatar" aria-hidden="true">{iniciais(membro.nome)}</div>
            <div className="b-eu__texto">
              <strong title={membro.nome}>{membro.nome}</strong>
              <small>{PAPEL[membro.papel]}</small>
            </div>
          </div>
          <div className="b-lateral__acoes">
            <a className="b-lateral__site" href="#/" target="_blank" rel="noreferrer"><Icone nome="externo" tamanho={16} />Ver site</a>
            <button type="button" className="b-lateral__sair" onClick={sair}><Icone nome="sair" tamanho={16} />Sair</button>
          </div>
          <Assinatura className="assinatura--menu" />
        </div>
        <Selo tamanho={210} className="b-lateral__selo" />
      </aside>
      {menu && <button type="button" className="b-veu" aria-label="Fechar menu" onClick={() => setMenu(false)} />}

      {busca && <Busca aoFechar={() => setBusca(false)} />}
      <Atualizando />
      <div className="b-conteudo">
        <div className="b-topo-cel">
          <button type="button" className="b-topo-cel__menu" aria-label="Abrir menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <span /><span /><span />
          </button>
          <Logo variante="verde" largura={56} />
          <span className="b-topo-cel__nome">Bancada</span>
          <BotaoBusca className="bg-botao--cel" aoAbrir={() => setBusca(true)} />
        </div>
        <main className="b-pagina">
          <Routes>
            <Route index element={<Inicio />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="velocidade" element={<Velocidade />} />
            {pode(membro, 'admin', 'recepcao') && (
              <>
                <Route path="alunos" element={<Alunos />} />
                <Route path="alunos/:cpf" element={<AlunoDetalhe />} />
                <Route path="vendas" element={<Vendas />} />
                <Route path="comandas" element={<Comandas />} />
                <Route path="estoque" element={<Estoque />} />
                <Route path="marketing" element={<Marketing />} />
                <Route path="vales" element={<Navigate to="/bancada/vendas" replace state={{ aba: 'vales' }} />} />
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
            {pode(membro, 'professora') && (
              <>
                <Route path="ganhos" element={<MeusGanhos />} />
                <Route path="clientes" element={<MinhasClientes />} />
                <Route path="clientes/:ref" element={<ClienteProfissional />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/bancada" replace />} />
          </Routes>
        </main>
      </div>
      {/* por último: a pergunta de venda repetida abre por cima da folha de venda ou da comanda */}
      <VendaRepetida />
    </div>
  );
}

function Login() {
  const { entrar } = useBancada();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // por que voltou para o login (sessão vencida, 3 h sem uso…): aparece uma vez
  const [erro, setErro] = useState(() => {
    try { const m = sessionStorage.getItem('ambar_bancada_aviso') || ''; sessionStorage.removeItem('ambar_bancada_aviso'); return m; } catch { return ''; }
  });
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
      <section className="b-login__lado" aria-hidden="true">
        <img className="b-login__foto" src={img('yoga.jpg')} alt="" />
        <div className="b-login__veu" />
        <div className="b-login__marca">
          <Logo variante="creme" largura={96} />
          <p className="b-login__frase">Harmonia em estado natural</p>
        </div>
        <Selo tamanho={260} className="b-login__selo" />
      </section>
      <div className="b-login__painel">
        <div className="b-login__caixa">
          <header className="b-login__topo">
            <span className="b-login__tag"><Icone nome="cadeado" tamanho={14} />Bancada interna</span>
          </header>
          <h1 className="b-login__titulo">{esqueci ? 'Nova senha' : 'Boas-vindas'}</h1>
          {enviado ? (
            <>
              <Aviso tom="ok" titulo="Confira seu e-mail">Se este e-mail tiver acesso à bancada, enviamos um link para criar uma nova senha. Olhe também o spam.</Aviso>
              <button type="button" className="botao botao--linha" onClick={() => { setEsqueci(false); setEnviado(false); }}>Voltar para entrar</button>
            </>
          ) : (
            <form className="form" onSubmit={enviar} noValidate>
              <p className="b-login__sub">{esqueci ? 'Enviaremos um link para criar uma nova senha.' : 'Acesso da equipe da Casa Âmbar.'}</p>
              <label>
                E-mail
                <input type="email" autoComplete="username" placeholder="voce@acasaambar.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
          <footer className="b-login__pe"><Sol tamanho={16} className="b-login__sol" />Casa Âmbar · Fortaleza</footer>
        </div>
      </div>
    </main>
  );
}
