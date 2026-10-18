import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Logo, Forma, img } from '../components/Marca.jsx';
import { mascaraCPF, mascaraTelefone, cpfValido, soDigitos } from '../lib/util.js';
import { MODO_DEMO } from '../lib/api.js';

export default function Entrar() {
  const { entrar, cadastrar } = useAuth();
  const nav = useNavigate();
  const local = useLocation();
  const destino = local.state?.de || '/aulas';
  const [modo, setModo] = useState('entrar');
  const [f, setF] = useState({ cpf: '', senha: '', nome: '', whatsapp: '', email: '', senha2: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const campo = (k, mascara) => ({
    value: f[k],
    onChange: (e) => setF((v) => ({ ...v, [k]: mascara ? mascara(e.target.value) : e.target.value })),
  });

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!cpfValido(f.cpf)) return setErro('Confira o CPF digitado.');
    if (modo === 'cadastro') {
      if (f.nome.trim().split(' ').length < 2) return setErro('Informe nome e sobrenome.');
      if (soDigitos(f.whatsapp).length < 10) return setErro('Informe um WhatsApp com DDD.');
      if (f.senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
      if (f.senha !== f.senha2) return setErro('As senhas não conferem.');
    }
    setEnviando(true);
    try {
      if (modo === 'entrar') await entrar(soDigitos(f.cpf), f.senha);
      else await cadastrar({ nome: f.nome.trim(), cpf: soDigitos(f.cpf), whatsapp: soDigitos(f.whatsapp), email: f.email.trim(), senha: f.senha });
      nav(destino, { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="entrar">
      <aside className="entrar__arte">
        <img className="entrar__foto" src={img('yoga.jpg')} alt="" aria-hidden="true" />
        <div className="entrar__veu" />
        <div className="entrar__arte-conteudo">
          <Logo variante="creme" largura={150} />
          <p className="script">harmonia em estado natural</p>
          <div className="entrar__formas" aria-hidden="true">
            <Forma nome="equilibrio" tamanho={46} cor="var(--creme)" />
            <Forma nome="sutileza" tamanho={46} cor="var(--creme)" />
            <Forma nome="presenca" tamanho={46} cor="var(--creme)" />
          </div>
        </div>
      </aside>

      <section className="entrar__painel">
        <div className="entrar__caixa">
          <div className="abas" role="tablist">
            <button type="button" role="tab" aria-selected={modo === 'entrar'} onClick={() => { setModo('entrar'); setErro(''); }}>Entrar</button>
            <button type="button" role="tab" aria-selected={modo === 'cadastro'} onClick={() => { setModo('cadastro'); setErro(''); }}>Criar conta</button>
          </div>

          <h1 className="display-m">{modo === 'entrar' ? 'Que bom te ver' : 'Seu primeiro passo'}</h1>
          <p className="entrar__sub">
            {modo === 'entrar' ? 'Entre com seu CPF e senha para reservar sua aula.' : 'Crie sua conta para reservar aulas de Yoga e Pilates.'}
          </p>

          <form onSubmit={enviar} noValidate className="form">
            {modo === 'cadastro' && (
              <label>
                Nome completo
                <input type="text" autoComplete="name" required {...campo('nome')} />
              </label>
            )}
            <label>
              CPF
              <input type="text" inputMode="numeric" autoComplete="username" placeholder="000.000.000-00" required {...campo('cpf', mascaraCPF)} />
            </label>
            {modo === 'cadastro' && (
              <>
                <label>
                  WhatsApp
                  <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="(85) 90000-0000" required {...campo('whatsapp', mascaraTelefone)} />
                </label>
                <label>
                  E-mail <span className="opcional">opcional</span>
                  <input type="email" autoComplete="email" {...campo('email')} />
                </label>
              </>
            )}
            <label>
              Senha
              <input type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required {...campo('senha')} />
            </label>
            {modo === 'cadastro' && (
              <label>
                Confirmar senha
                <input type="password" autoComplete="new-password" required {...campo('senha2')} />
              </label>
            )}

            {erro && <p className="erro" role="alert">{erro}</p>}

            <button type="submit" className="botao botao--cheio" disabled={enviando}>
              {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar minha conta'}
            </button>
          </form>

          {modo === 'entrar' && (
            <p className="entrar__ajuda">Esqueceu a senha? Fale com a recepção pelo WhatsApp.</p>
          )}
          {MODO_DEMO && (
            <p className="entrar__demo">
              Demonstração: CPF <strong>123.456.789-09</strong> e senha <strong>ambar123</strong>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
