import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Logo, Forma, img } from '../components/Marca.jsx';
import { mascaraCPF, mascaraTelefone, cpfValido, soDigitos } from '../lib/util.js';
import { MODO_DEMO } from '../lib/api.js';
import { CampoSenha, ConfereSenha } from '../components/CampoSenha.jsx';
import { COMO_CONHECEU, ENDERECO_VAZIO, faltaNoEndereco } from '../lib/clientes.js';
import { EnderecoSite } from '../components/EnderecoSite.jsx';

export function problemaSenha(s) {
  if (String(s).length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Use letras e números na senha.';
  return '';
}

export default function Entrar() {
  const { entrar, cadastrar } = useAuth();
  const nav = useNavigate();
  const local = useLocation();
  const destino = local.state?.de || '/aulas';
  const [modo, setModo] = useState('entrar');
  const [f, setF] = useState({ cpf: '', senha: '', nome: '', whatsapp: '', email: '', senha2: '', comoConheceu: '' });
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO);
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return setErro('Informe um e-mail válido. É por ele que você recupera a senha.');
      const faltaEnd = faltaNoEndereco(endereco);
      if (faltaEnd) return setErro(faltaEnd);
      const problema = problemaSenha(f.senha);
      if (problema) return setErro(problema);
      if (f.senha !== f.senha2) return setErro('As senhas não conferem.');
    }
    setEnviando(true);
    try {
      const s =
        modo === 'entrar'
          ? await entrar(soDigitos(f.cpf), f.senha)
          : await cadastrar({ nome: f.nome.trim(), cpf: soDigitos(f.cpf), whatsapp: soDigitos(f.whatsapp), email: f.email.trim(), senha: f.senha, comoConheceu: f.comoConheceu, endereco });
      // sem ficha de saúde: preenche antes de seguir
      if (!s.aluno.anamnese) nav('/ficha-saude', { replace: true, state: { de: destino, novo: modo === 'cadastro' } });
      else nav(destino, { replace: true });
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
            {modo === 'entrar' ? 'Entre com seu CPF e senha para reservar sua aula.' : 'Crie sua conta em 2 passos: seus dados e uma ficha de saúde rápida.'}
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
                  E-mail
                  <input type="email" autoComplete="email" required {...campo('email')} />
                  <span className="dica-campo">Usado para recuperar a senha.</span>
                </label>
                <label>
                  Como nos conheceu?
                  <select {...campo('comoConheceu')}>
                    <option value="">Escolha (opcional)</option>
                    {COMO_CONHECEU.map((o) => <option key={o}>{o}</option>)}
                    <option>Outro</option>
                  </select>
                </label>
                <EnderecoSite valor={endereco} aoMudar={setEndereco} />
              </>
            )}
            <label>
              Senha
              <CampoSenha autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required {...campo('senha')} />
              {modo === 'cadastro' && !f.senha && <span className="dica-campo">Mínimo de 8 caracteres, com letras e números.</span>}
            </label>
            {modo === 'cadastro' && (
              <label>
                Confirmar senha
                <CampoSenha autoComplete="new-password" required {...campo('senha2')} />
                <ConfereSenha senha={f.senha} confirmacao={f.senha2} />
              </label>
            )}

            {erro && <p className="erro" role="alert">{erro}</p>}

            <button type="submit" className="botao botao--cheio" disabled={enviando}>
              {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar minha conta'}
            </button>
          </form>

          {modo === 'entrar' && (
            <p className="entrar__ajuda"><Link to="/esqueci-senha">Esqueci minha senha</Link></p>
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
