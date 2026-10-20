import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import AreaNav from '../components/AreaNav.jsx';
import { useAuth } from '../lib/auth.jsx';
import { Sol, Forma } from '../components/Marca.jsx';
import { DIAS_CURTOS, MESES, apontarCampo, dataDeIso, formatarHora, horaFim, inicioDaAula } from '../lib/util.js';
import { ENDERECO_VAZIO, faltaNoEndereco, campoFaltandoNoEndereco } from '../lib/clientes.js';
import { EnderecoSite } from '../components/EnderecoSite.jsx';

export default function Aulas() {
  const { token, aluno, expirou } = useAuth();
  const nav = useNavigate();
  const [aulas, setAulas] = useState(null);
  const [erro, setErro] = useState('');
  const [dia, setDia] = useState(null);
  const [filtro, setFiltro] = useState('Todas');

  useEffect(() => {
    api
      .aulas(token)
      .then((lista) => {
        setAulas(lista);
        const primeiroComAula = lista.find((a) => inicioDaAula(a) > new Date());
        setDia((d) => d || primeiroComAula?.data || lista[0]?.data);
      })
      .catch((e) => {
        if (/sessão/i.test(e.message)) {
          expirou();
          nav('/entrar', { state: { de: '/aulas' } });
        } else setErro(e.message);
      });
  }, [token, expirou, nav]);

  const dias = useMemo(() => [...new Set((aulas || []).map((a) => a.data))], [aulas]);
  const doDia = (aulas || []).filter((a) => a.data === dia && (filtro === 'Todas' || a.modalidade === filtro));
  const reservadas = (aulas || []).filter((x) => x.minhaReserva).length;

  return (
    <main className="app">
      <div className="app__topo">
        <div className="largura">
          <span className="rotulo-espacado cor-caramelo">Área do aluno</span>
          <h1 className="display-m">Olá, {aluno?.nome.split(' ')[0]}. Qual aula hoje?</h1>
          {reservadas > 0 && (
            <Link to="/minhas-reservas" className="atalho-reservas">
              Você tem {reservadas} {reservadas === 1 ? 'aula reservada' : 'aulas reservadas'} · ver minhas reservas →
            </Link>
          )}
        </div>
      </div>

      <AreaNav />
      <AvisoEmail />
      <AvisoEndereco />
      <div className="largura app__corpo">
        {erro && <p className="erro" role="alert">{erro}</p>}
        {!aulas && !erro && <Carregando />}

        {aulas && (
          <>
            <div className="dias" role="tablist" aria-label="Escolha o dia">
              {dias.map((d) => {
                const dt = dataDeIso(d);
                return (
                  <button key={d} type="button" role="tab" aria-selected={d === dia} className="dia" onClick={() => setDia(d)}>
                    <span className="dia__sem">{DIAS_CURTOS[dt.getDay()]}</span>
                    <span className="dia__num">{dt.getDate()}</span>
                    <span className="dia__mes">{MESES[dt.getMonth()]}</span>
                  </button>
                );
              })}
            </div>

            <div className="aulas__ferramentas">
              <div className="filtros" role="group" aria-label="Modalidade">
                {['Todas', 'Yoga', 'Pilates'].map((m) => (
                  <button key={m} type="button" aria-pressed={filtro === m} onClick={() => setFiltro(m)}>{m}</button>
                ))}
              </div>
              {/* explica as bolinhas de vagas do Pilates */}
              {doDia.some((a) => a.modalidade === 'Pilates') && (
                <p className="legenda-vagas">
                  <span><i className="legenda-vagas__livre" aria-hidden="true" />vaga livre</span>
                  <span><i className="legenda-vagas__ocupada" aria-hidden="true" />ocupada</span>
                </p>
              )}
            </div>

            {doDia.length === 0 ? (
              <div className="vazio-estado">
                <Forma nome="equilibrio" tamanho={70} cor="var(--caramelo)" />
                <p>Nenhuma aula neste dia. Escolha outra data.</p>
              </div>
            ) : (
              <ul className="lista-aulas">
                {doDia.map((a) => <ItemAula key={a.id} aula={a} />)}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ItemAula({ aula }) {
  const livres = aula.capacidade - aula.ocupadosQtd;
  const passou = inicioDaAula(aula) < new Date();
  const lotada = livres <= 0;
  const yoga = aula.modalidade === 'Yoga';
  const unidade = yoga ? (livres === 1 ? 'tapete livre' : 'tapetes livres') : livres === 1 ? 'vaga' : 'vagas';

  let acao;
  if (aula.minhaReserva) acao = <Link to="/minhas-reservas" className="botao botao--pequeno botao--reservado">{yoga ? `Tapete ${aula.minhaReserva.tapete}` : 'Reservado'}</Link>;
  else if (passou) acao = <span className="selo-estado">Encerrada</span>;
  else if (lotada) acao = <span className="selo-estado">Lotada</span>;
  else acao = <Link to={`/aula/${encodeURIComponent(aula.id)}`} className="botao botao--pequeno botao--cheio">Reservar</Link>;

  return (
    <li className={`aula aula--${yoga ? 'yoga' : 'pilates'} ${passou || lotada ? 'aula--apagada' : ''}`}>
      <div className="aula__hora">
        <strong>{formatarHora(aula.hora)}</strong>
        <span>até {formatarHora(horaFim(aula.hora, aula.duracao || 60))}</span>
      </div>
      <div className="aula__info">
        <span className="aula__mod">{aula.modalidade}</span>
        <span className="aula__prof">com {aula.professor}</span>
        <div className="aula__vagas">
          <MiniTapetes total={aula.capacidade} ocupados={aula.ocupadosQtd} yoga={yoga} />
          <span>{lotada ? 'sem vagas' : `${livres} ${unidade}`}</span>
        </div>
      </div>
      <div className="aula__acao">{acao}</div>
    </li>
  );
}

function MiniTapetes({ total, ocupados, yoga }) {
  return (
    <span className={`mini ${yoga ? 'mini--yoga' : ''}`} aria-hidden="true">
      {[...Array(total)].map((_, i) => <i key={i} className={i < ocupados ? 'cheio' : ''} />)}
    </span>
  );
}

export function Carregando() {
  return (
    <div className="carregando" role="status">
      <Sol tamanho={36} className="girando" />
      <span>Carregando…</span>
    </div>
  );
}

// Cadastro antigo sem endereço completo (para os recibos): completa aqui mesmo
function AvisoEndereco() {
  const { token, aluno, atualizarAluno } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  if (!aluno || aluno.endereco !== false || aluno.email === '') return null;
  async function salvar(e) {
    e.preventDefault();
    const falta = faltaNoEndereco(endereco);
    apontarCampo(e.currentTarget, falta ? campoFaltandoNoEndereco(endereco) : '');
    if (falta) return setErro(falta);
    setErro('');
    setSalvando(true);
    try {
      const a = await api.salvarEndereco(token, endereco);
      atualizarAluno({ endereco: a.endereco });
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <div className="largura">
      <form className="aviso-email aviso-email--endereco form" onSubmit={salvar} noValidate>
        <div>
          <strong>Complete seu endereço</strong>
          <p>Precisamos dele para os recibos e para manter seu cadastro em dia.</p>
        </div>
        {!aberto ? (
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setAberto(true)}>Preencher agora</button>
        ) : (
          <>
            <EnderecoSite valor={endereco} aoMudar={setEndereco} />
            <button type="submit" className="botao botao--cheio botao--p" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar endereço'}</button>
          </>
        )}
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </div>
  );
}

// Aluno antigo sem e-mail: pede o e-mail para poder recuperar a senha
function AvisoEmail() {
  const { token, aluno, atualizarAluno } = useAuth();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  if (!aluno || aluno.email !== '') return null;
  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const a = await api.salvarEmail(token, email.trim());
      atualizarAluno({ email: a.email });
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <div className="largura">
      <form className="aviso-email" onSubmit={salvar}>
        <div>
          <strong>Cadastre seu e-mail</strong>
          <p>Assim você recupera a senha pelo e-mail, sem precisar chamar a recepção.</p>
        </div>
        <div className="codigo__linha">
          <input type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" />
          <button type="submit" className="botao botao--cheio botao--p" disabled={salvando}>{salvando ? '…' : 'Salvar'}</button>
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </div>
  );
}
