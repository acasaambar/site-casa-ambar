import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Logo, Forma, Sol, IconeWhatsapp, img } from '../components/Marca.jsx';
import { mascaraCPF, cpfValido, soDigitos } from '../lib/util.js';
import { CONFIG } from '../config.js';
import { problemaSenha } from './Entrar.jsx';

function Moldura({ children }) {
  return (
    <main className="entrar">
      <aside className="entrar__arte">
        <img className="entrar__foto" src={img('yoga.jpg')} alt="" aria-hidden="true" />
        <div className="entrar__veu" />
        <div className="entrar__arte-conteudo">
          <Logo variante="creme" largura={150} />
          <p className="script">harmonia em estado natural</p>
        </div>
      </aside>
      <section className="entrar__painel">
        <div className="entrar__caixa">{children}</div>
      </section>
    </main>
  );
}

// ---------- Esqueci minha senha (aluno, pelo CPF) ----------
export function EsqueciSenha() {
  const [cpf, setCpf] = useState('');
  const [erro, setErro] = useState(null);
  const [enviado, setEnviado] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    if (!cpfValido(cpf)) return setErro({ msg: 'Confira o CPF digitado.' });
    setEnviando(true);
    try {
      const r = await api.esqueciSenha(soDigitos(cpf));
      setEnviado(r.email);
    } catch (err) {
      setErro({ msg: err.message, codigo: err.codigo });
    } finally {
      setEnviando(false);
    }
  }

  const whats = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Olá! Preciso recuperar o acesso à área do aluno. Meu CPF é ' + cpf + '.')}`;

  return (
    <Moldura>
      {enviado ? (
        <div className="senha-ok">
          <Sol tamanho={48} className="cor-caramelo" />
          <h1 className="display-m">Confira seu e-mail</h1>
          <p className="entrar__sub">
            Enviamos um link para <strong>{enviado}</strong>. Ele vale por 1 hora. Se não aparecer em alguns minutos, olhe também a caixa de spam.
          </p>
          <Link className="botao botao--linha" to="/entrar">Voltar para entrar</Link>
        </div>
      ) : (
        <>
          <span className="rotulo-espacado cor-terracota">Área do aluno</span>
          <h1 className="display-m">Esqueci minha senha</h1>
          <p className="entrar__sub">Digite seu CPF. Vamos enviar um link para o e-mail do seu cadastro para você criar uma senha nova.</p>
          <form onSubmit={enviar} noValidate className="form">
            <label>
              CPF
              <input type="text" inputMode="numeric" autoComplete="username" placeholder="000.000.000-00" value={cpf}
                onChange={(e) => setCpf(mascaraCPF(e.target.value))} />
            </label>
            {erro && <p className="erro" role="alert">{erro.msg}</p>}
            {erro?.codigo === 'SEM_EMAIL' && (
              <a className="botao botao--linha" href={whats} target="_blank" rel="noreferrer"><IconeWhatsapp /> Falar com a recepção</a>
            )}
            <button type="submit" className="botao botao--cheio" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar link'}</button>
          </form>
          <p className="entrar__ajuda"><Link to="/entrar">Lembrei a senha</Link></p>
        </>
      )}
    </Moldura>
  );
}

// ---------- Nova senha (link do e-mail: aluno ou equipe) ----------
export function NovaSenha() {
  const [params] = useSearchParams();
  const t = params.get('t') || '';
  const [info, setInfo] = useState(null);
  const [erroLink, setErroLink] = useState('');
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(null);

  useEffect(() => {
    if (!t) {
      setErroLink('Link incompleto. Abra o link do e-mail de novo.');
      return;
    }
    api.verLinkSenha(t).then(setInfo).catch((e) => setErroLink(e.message));
  }, [t]);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    const p = problemaSenha(s1);
    if (p) return setErro(p);
    if (s1 !== s2) return setErro('As senhas não conferem.');
    setEnviando(true);
    try {
      const r = await api.novaSenha(t, s1);
      setPronto(r.tipo);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const regras = [
    ['8 caracteres ou mais', s1.length >= 8],
    ['letras', /[A-Za-z]/.test(s1)],
    ['números', /\d/.test(s1)],
  ];

  return (
    <Moldura>
      {pronto ? (
        <div className="senha-ok">
          <Sol tamanho={48} className="cor-caramelo" />
          <h1 className="display-m">Senha criada</h1>
          <p className="entrar__sub">Tudo certo. Agora é só entrar com a senha nova.</p>
          <Link className="botao botao--cheio" to={pronto === 'equipe' ? '/bancada' : '/entrar'}>{pronto === 'equipe' ? 'Entrar na bancada' : 'Entrar'}</Link>
        </div>
      ) : erroLink ? (
        <div className="senha-ok">
          <Forma nome="sutileza" tamanho={56} cor="var(--terracota)" />
          <h1 className="display-m">Link expirado</h1>
          <p className="entrar__sub">{erroLink}</p>
          <Link className="botao botao--linha" to="/esqueci-senha">Pedir um novo link</Link>
        </div>
      ) : !info ? (
        <p className="entrar__sub">Conferindo o link…</p>
      ) : (
        <>
          <span className="rotulo-espacado cor-terracota">{info.tipo === 'equipe' ? 'Bancada Casa Âmbar' : 'Área do aluno'}</span>
          <h1 className="display-m">{info.convite ? 'Crie sua senha' : 'Nova senha'}</h1>
          <p className="entrar__sub">{info.nome ? `Olá, ${info.nome}. ` : ''}Escolha uma senha que você não usa em outros sites.</p>
          <form onSubmit={enviar} noValidate className="form">
            <label>
              Nova senha
              <input type="password" autoComplete="new-password" value={s1} onChange={(e) => setS1(e.target.value)} />
            </label>
            <ul className="regras-senha" aria-label="Requisitos da senha">
              {regras.map(([r, ok]) => <li key={r} className={ok ? 'ok' : ''}>{ok ? '✓' : '·'} {r}</li>)}
            </ul>
            <label>
              Repita a senha
              <input type="password" autoComplete="new-password" value={s2} onChange={(e) => setS2(e.target.value)} />
            </label>
            {erro && <p className="erro" role="alert">{erro}</p>}
            <button type="submit" className="botao botao--cheio" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar senha'}</button>
          </form>
        </>
      )}
    </Moldura>
  );
}
