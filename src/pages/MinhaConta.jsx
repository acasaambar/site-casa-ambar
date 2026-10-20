import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import AreaNav from '../components/AreaNav.jsx';
import { useAuth } from '../lib/auth.jsx';
import { Carregando } from './Aulas.jsx';
import { CampoSenha, ConfereSenha } from '../components/CampoSenha.jsx';
import { EnderecoSite } from '../components/EnderecoSite.jsx';
import { faltaNoEndereco } from '../lib/clientes.js';
import { mascaraCPF, mascaraTelefone, soDigitos } from '../lib/util.js';
import { problemaSenha } from './Entrar.jsx';
import { CONFIG } from '../config.js';

const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 10);

// Minha conta: a aluna vê e corrige os próprios dados. E-mail e senha pedem a senha atual.
export default function MinhaConta() {
  const { token, expirou, atualizarAluno, guardarSessao } = useAuth();
  const nav = useNavigate();
  const [conta, setConta] = useState(null);
  const [erroGeral, setErroGeral] = useState('');

  const tratarErro = useCallback((e, setErro) => {
    if (/sessão/i.test(e.message)) {
      expirou();
      nav('/entrar', { state: { de: '/minha-conta' } });
    } else setErro(e.message);
  }, [expirou, nav]);

  useEffect(() => {
    api.minhaConta(token).then(setConta).catch((e) => tratarErro(e, setErroGeral));
  }, [token, tratarErro]);

  function aoSalvar(c) {
    setConta(c);
    atualizarAluno(c.aluno);
  }

  return (
    <main className="app">
      <div className="app__topo">
        <div className="largura">
          <span className="rotulo-espacado cor-caramelo">Área do aluno</span>
          <h1 className="display-m">Minha conta</h1>
        </div>
      </div>

      <AreaNav />
      <div className="largura app__corpo ficha conta">
        {erroGeral && <p className="erro" role="alert">{erroGeral}</p>}
        {!conta && !erroGeral && <Carregando />}
        {conta && (
          <>
            <DadosPessoais conta={conta} token={token} aoSalvar={aoSalvar} tratarErro={tratarErro} />
            <TrocarEmail conta={conta} token={token} aoSalvar={aoSalvar} tratarErro={tratarErro} />
            <TrocarSenha token={token} aoTrocar={guardarSessao} tratarErro={tratarErro} />
            <section className="conta__rodape">
              <p>
                Para corrigir o CPF ou pedir a exclusão dos seus dados, fale com a recepção pelo{' '}
                <a href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp {CONFIG.telefone}</a>.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Aviso({ ok, erro }) {
  if (erro) return <p className="erro" role="alert">{erro}</p>;
  if (ok) return <p className="conta__ok" role="status">{ok}</p>;
  return null;
}

function DadosPessoais({ conta, token, aoSalvar, tratarErro }) {
  const inicial = () => ({ nome: conta.nome, whatsapp: mascaraTelefone(conta.whatsapp), nascimento: conta.nascimento, novidades: conta.novidades });
  const [f, setF] = useState(inicial);
  const [endereco, setEndereco] = useState(conta.endereco);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudar = (k, mascara) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: mascara ? mascara(v) : v }));
    setOk('');
  };

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    if (f.nome.trim().split(/\s+/).length < 2) return setErro('Informe nome e sobrenome.');
    if (soDigitos(f.whatsapp).length < 10) return setErro('Informe um WhatsApp com DDD.');
    if (f.nascimento && f.nascimento > hoje()) return setErro('Confira a data de nascimento.');
    const faltaEnd = faltaNoEndereco(endereco);
    if (faltaEnd) return setErro(faltaEnd);
    setSalvando(true);
    try {
      const c = await api.salvarConta(token, { nome: f.nome.trim(), whatsapp: soDigitos(f.whatsapp), nascimento: f.nascimento || '', novidades: f.novidades, endereco });
      aoSalvar(c);
      setEndereco(c.endereco);
      setOk('Dados salvos.');
    } catch (err) {
      tratarErro(err, setErro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="form ficha__form" onSubmit={salvar} noValidate>
      <fieldset className="bloco">
        <legend className="display-p">Seus dados</legend>
        <label>
          Nome completo
          <input type="text" autoComplete="name" required value={f.nome} onChange={mudar('nome')} />
        </label>
        <div className="duas-colunas">
          <label>
            CPF
            <input type="text" value={mascaraCPF(conta.cpf)} readOnly aria-readonly="true" className="conta__fixo" />
            <span className="dica-campo">É o seu login: não muda por aqui.</span>
          </label>
          <label>
            Data de nascimento
            <input type="date" max={hoje()} value={f.nascimento} onChange={mudar('nascimento')} />
            <span className="dica-campo">Opcional. Para a gente lembrar do seu aniversário.</span>
          </label>
        </div>
        <label>
          WhatsApp
          <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="(85) 90000-0000" required value={f.whatsapp} onChange={mudar('whatsapp', mascaraTelefone)} />
          <span className="dica-campo">Usado para lembretes das aulas e contato da recepção.</span>
        </label>
        <label className="termo">
          <input type="checkbox" checked={f.novidades} onChange={mudar('novidades')} />
          <span>Quero receber novidades, promoções e mensagens de aniversário da Casa Âmbar por e-mail e WhatsApp.</span>
        </label>
      </fieldset>
      <div className="bloco">
        <EnderecoSite valor={endereco} aoMudar={(v) => { setEndereco(v); setOk(''); }} />
      </div>
      <Aviso ok={ok} erro={erro} />
      <button type="submit" className="botao botao--cheio" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar meus dados'}</button>
    </form>
  );
}

function TrocarEmail({ conta, token, aoSalvar, tratarErro }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (email.trim().toLowerCase() === conta.email.toLowerCase()) return setErro('Este já é o seu e-mail.');
    if (!senha) return setErro('Digite sua senha atual para confirmar.');
    setSalvando(true);
    try {
      const c = await api.trocarEmail(token, email.trim(), senha);
      aoSalvar(c);
      setEmail('');
      setSenha('');
      setOk('E-mail trocado. Avisamos o e-mail antigo, por segurança.');
    } catch (err) {
      tratarErro(err, setErro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="form ficha__form" onSubmit={salvar} noValidate>
      <fieldset className="bloco">
        <legend className="display-p">E-mail</legend>
        <p className="bloco__ajuda">
          {conta.email ? <>Atual: <strong className="conta__email">{conta.email}</strong>. </> : 'Você ainda não tem e-mail cadastrado. '}
          É por ele que você recupera a senha.
        </p>
        <label>
          Novo e-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setOk(''); }} />
        </label>
        <label>
          Sua senha atual
          <CampoSenha autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        <Aviso ok={ok} erro={erro} />
        <button type="submit" className="botao botao--cheio" disabled={salvando}>{salvando ? 'Salvando…' : 'Trocar e-mail'}</button>
      </fieldset>
    </form>
  );
}

function TrocarSenha({ token, aoTrocar, tratarErro }) {
  const [f, setF] = useState({ atual: '', nova: '', nova2: '' });
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudar = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setOk(''); };

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    if (!f.atual) return setErro('Digite sua senha atual.');
    const problema = problemaSenha(f.nova);
    if (problema) return setErro(problema);
    if (f.nova !== f.nova2) return setErro('As senhas novas não conferem.');
    if (f.nova === f.atual) return setErro('A nova senha precisa ser diferente da atual.');
    setSalvando(true);
    try {
      const s = await api.trocarSenha(token, f.atual, f.nova);
      aoTrocar(s);
      setF({ atual: '', nova: '', nova2: '' });
      setOk('Senha trocada. Os outros aparelhos foram desconectados.');
    } catch (err) {
      tratarErro(err, setErro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="form ficha__form" onSubmit={salvar} noValidate>
      <fieldset className="bloco">
        <legend className="display-p">Senha</legend>
        <label>
          Senha atual
          <CampoSenha autoComplete="current-password" value={f.atual} onChange={mudar('atual')} />
        </label>
        <label>
          Nova senha
          <CampoSenha autoComplete="new-password" value={f.nova} onChange={mudar('nova')} />
        </label>
        <label>
          Confirmar nova senha
          <CampoSenha autoComplete="new-password" value={f.nova2} onChange={mudar('nova2')} />
          <ConfereSenha senha={f.nova} confirmacao={f.nova2} />
        </label>
        <Aviso ok={ok} erro={erro} />
        <button type="submit" className="botao botao--cheio" disabled={salvando}>{salvando ? 'Salvando…' : 'Trocar senha'}</button>
      </fieldset>
    </form>
  );
}
