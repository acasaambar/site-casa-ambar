import { useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Logo, Forma, img } from '../components/Marca.jsx';
import { mascaraCPF, mascaraTelefone, cpfValido, soDigitos, apontarCampo } from '../lib/util.js';
import { MODO_DEMO } from '../lib/api.js';
import { CampoSenha, ConfereSenha } from '../components/CampoSenha.jsx';
import { COMO_CONHECEU, ENDERECO_VAZIO, faltaNoEndereco, campoFaltandoNoEndereco } from '../lib/clientes.js';
import { EnderecoSite } from '../components/EnderecoSite.jsx';
import { useVerificacao } from '../components/Verificacao.jsx';

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
  // campo que a mensagem de erro aponta ('' = erro geral, que aparece junto do botão)
  const [erroNome, setErroNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef(null);
  const verif = useVerificacao(modo === 'cadastro');

  const limparErro = () => { setErro(''); setErroNome(''); };
  const campo = (k, mascara) => ({
    name: k,
    value: f[k],
    'aria-describedby': erroNome === k ? 'erro-campo' : undefined,
    onChange: (e) => {
      if (erroNome === k) limparErro();
      setF((v) => ({ ...v, [k]: mascara ? mascara(e.target.value) : e.target.value }));
    },
  });
  // a mensagem de erro aparece logo abaixo do campo que precisa de ajuda (no celular, o botão fica longe)
  const erroDe = (...nomes) => (erro && nomes.includes(erroNome) ? <p id="erro-campo" className="erro erro--campo" role="alert">{erro}</p> : null);
  const CAMPOS_ENDERECO = ['cep', 'endereco', 'numero', 'bairro', 'cidade', 'uf'];

  function trocarModo(novo) {
    setModo(novo);
    limparErro();
    apontarCampo(formRef.current, '');
  }
  // setas esquerda/direita trocam de aba, como em qualquer grupo de abas
  function teclaDasAbas(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const novo = modo === 'entrar' ? 'cadastro' : 'entrar';
    trocarModo(novo);
    document.getElementById(`aba-${novo}`)?.focus();
  }

  async function enviar(e) {
    e.preventDefault();
    limparErro();
    apontarCampo(formRef.current, '');
    // erro de preenchimento: mostra a mensagem e leva até o campo
    const falhar = (msg, nome) => {
      setErro(msg);
      setErroNome(nome);
      apontarCampo(formRef.current, nome);
    };
    if (!cpfValido(f.cpf)) return falhar('Confira o CPF digitado.', 'cpf');
    if (modo === 'cadastro') {
      if (f.nome.trim().split(' ').length < 2) return falhar('Informe nome e sobrenome.', 'nome');
      if (soDigitos(f.whatsapp).length < 10) return falhar('Informe um WhatsApp com DDD.', 'whatsapp');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return falhar('Informe um e-mail válido. É por ele que você recupera a senha.', 'email');
      const faltaEnd = faltaNoEndereco(endereco);
      if (faltaEnd) return falhar(faltaEnd, campoFaltandoNoEndereco(endereco));
      const problema = problemaSenha(f.senha);
      if (problema) return falhar(problema, 'senha');
      if (f.senha !== f.senha2) return falhar('As senhas não conferem.', 'senha2');
      if (verif.falta) return setErro(verif.falta);
    }
    setEnviando(true);
    try {
      await (
        modo === 'entrar'
          ? await entrar(soDigitos(f.cpf), f.senha)
          : await cadastrar({ nome: f.nome.trim(), cpf: soDigitos(f.cpf), whatsapp: soDigitos(f.whatsapp), email: f.email.trim(), senha: f.senha, comoConheceu: f.comoConheceu, endereco, verificacao: verif.token })
      );
      // a ficha de saúde não é pedida aqui: aparece na primeira reserva e na primeira contratação de plano
      nav(destino, { replace: true });
    } catch (err) {
      setErro(err.message);
      // a confirmação de "não sou robô" vale uma vez só
      if (modo === 'cadastro') verif.renovar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="entrar">
      <div className="entrar__arte" aria-hidden="true">
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
      </div>

      <section className="entrar__painel">
        <div className="entrar__caixa">
          <div className="abas" role="tablist" aria-label="Entrar ou criar conta" onKeyDown={teclaDasAbas}>
            <button type="button" role="tab" id="aba-entrar" aria-controls="painel-conta" aria-selected={modo === 'entrar'} tabIndex={modo === 'entrar' ? 0 : -1} onClick={() => trocarModo('entrar')}>Entrar</button>
            <button type="button" role="tab" id="aba-cadastro" aria-controls="painel-conta" aria-selected={modo === 'cadastro'} tabIndex={modo === 'cadastro' ? 0 : -1} onClick={() => trocarModo('cadastro')}>Criar conta</button>
          </div>

          <h1 className="display-m">{modo === 'entrar' ? 'Que bom te ver' : 'Seu primeiro passo'}</h1>
          <p className="entrar__sub">
            {modo === 'entrar' ? 'Entre com seu CPF e senha para reservar sua aula.' : 'Crie sua conta em um minuto. A ficha de saúde só é pedida na sua primeira reserva.'}
          </p>

          <div id="painel-conta" role="tabpanel" aria-labelledby={`aba-${modo}`}>
          <form ref={formRef} onSubmit={enviar} noValidate className={`form ${modo === 'cadastro' ? 'form--cadastro' : ''}`} aria-label={modo === 'entrar' ? 'Entrar' : 'Criar conta'}>
            {modo === 'cadastro' ? (
              <>
                <fieldset className="grupo-form">
                  <legend className="display-p">Seus dados</legend>
                  <label>
                    Nome completo
                    <input type="text" autoComplete="name" required {...campo('nome')} />
                  </label>
                  {erroDe('nome')}
                  <label>
                    CPF
                    <input type="text" inputMode="numeric" autoComplete="username" placeholder="000.000.000-00" required {...campo('cpf', mascaraCPF)} />
                  </label>
                  {erroDe('cpf')}
                  <label>
                    WhatsApp
                    <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="(85) 90000-0000" required {...campo('whatsapp', mascaraTelefone)} />
                  </label>
                  {erroDe('whatsapp')}
                  <label>
                    E-mail
                    <input type="email" autoComplete="email" required {...campo('email')} />
                    <span className="dica-campo">Usado para recuperar a senha.</span>
                  </label>
                  {erroDe('email')}
                  <label>
                    Como nos conheceu?
                    <select {...campo('comoConheceu')}>
                      <option value="">Escolha (opcional)</option>
                      {COMO_CONHECEU.map((o) => <option key={o}>{o}</option>)}
                      <option>Outro</option>
                    </select>
                  </label>
                </fieldset>

                <EnderecoSite valor={endereco} aoMudar={(v) => { if (CAMPOS_ENDERECO.includes(erroNome)) limparErro(); setEndereco(v); }} />
                {erroDe(...CAMPOS_ENDERECO)}

                <fieldset className="grupo-form">
                  <legend className="display-p">Sua senha</legend>
                  <label>
                    Senha
                    <CampoSenha autoComplete="new-password" required {...campo('senha')} />
                    {!f.senha && <span className="dica-campo">Mínimo de 8 caracteres, com letras e números.</span>}
                  </label>
                  {erroDe('senha')}
                  <label>
                    Confirmar senha
                    <CampoSenha autoComplete="new-password" required {...campo('senha2')} />
                    <ConfereSenha senha={f.senha} confirmacao={f.senha2} />
                  </label>
                  {erroDe('senha2')}
                </fieldset>
              </>
            ) : (
              <>
                <label>
                  CPF
                  <input type="text" inputMode="numeric" autoComplete="username" placeholder="000.000.000-00" required {...campo('cpf', mascaraCPF)} />
                </label>
                {erroDe('cpf')}
                <label>
                  Senha
                  <CampoSenha autoComplete="current-password" required {...campo('senha')} />
                </label>
              </>
            )}

            {modo === 'cadastro' && verif.caixa}
            {erro && !erroNome && <p className="erro" role="alert">{erro}</p>}

            <button type="submit" className="botao botao--cheio" disabled={enviando} aria-busy={enviando}>
              {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar minha conta'}
            </button>
          </form>
          </div>

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
