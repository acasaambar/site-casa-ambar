import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBancada } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Tag, Modal, BotaoAcao, Vazio, Abas, BuscaAluno, STATUS_RESERVA, cpfFmt, telFmt, dataBR, dataCurta, hora, real,
  linkWhats, primeiro, baixarCSV, hojeIso } from './ui.jsx';
import { FichaConteudo } from './Agenda.jsx';
import { useItensVenda, OpcoesItens } from './Servicos.jsx';
import { mascaraCPF, mascaraTelefone, soDigitos, cpfValido } from '../lib/util.js';
import { IconeWhatsapp } from '../components/Marca.jsx';

const WELLHUB = { confirmado: ['Wellhub', 'ok'], pendente: ['Wellhub a confirmar', 'aviso'], bloqueado: ['Wellhub recusado', 'alerta'] };

export function Alunos() {
  const local = useLocation();
  const nav = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState(local.state?.filtro || 'todos');
  const [novo, setNovo] = useState(!!local.state?.novo);
  const { dados, erro, carregando } = useDados('alunos', {});

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const d = soDigitos(q);
    return (dados || []).filter((a) => {
      if (filtro === 'ativos' && !a.plano) return false;
      if (filtro === 'sem-plano' && a.plano) return false;
      if (filtro === 'sem-ficha' && a.ficha) return false;
      if (filtro === 'wellhub' && a.wellhub !== 'pendente' && a.wellhub !== 'confirmado') return false;
      if (filtro === 'inativos' && a.ativo) return false;
      if (!q) return true;
      return a.nome.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (d.length >= 3 && (a.cpf.includes(d) || a.whatsapp.includes(d)));
    });
  }, [dados, busca, filtro]);

  const contagem = (f) => (dados || []).filter((a) => (f === 'ativos' ? a.plano : f === 'sem-plano' ? !a.plano : f === 'sem-ficha' ? !a.ficha
    : f === 'wellhub' ? a.wellhub === 'pendente' || a.wellhub === 'confirmado' : f === 'inativos' ? !a.ativo : true)).length;

  return (
    <>
      <Cabecalho titulo="Clientes" acoes={
        <>
          <button type="button" className="botao botao--linha botao--p" disabled={!dados} onClick={() => baixarCSV('alunos-casa-ambar', [
            ['nome', 'Nome'], [(a) => cpfFmt(a.cpf), 'CPF'], [(a) => telFmt(a.whatsapp), 'WhatsApp'], ['email', 'E-mail'], ['plano', 'Plano ativo'],
            [(a) => dataBR(a.planoFim), 'Plano até'], [(a) => dataBR(a.ultimaAula), 'Última aula'], ['presencas', 'Presenças'], [(a) => (a.ficha ? 'sim' : 'não'), 'Ficha'],
            ['wellhub', 'Wellhub'], [(a) => dataBR(a.criadoEm), 'Cadastro']], lista)}>Exportar CSV</button>
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo(true)}>Novo cliente</button>
        </>
      } />
      <div className="b-barra-busca">
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CPF, WhatsApp ou e-mail" aria-label="Buscar aluno" />
      </div>
      <div className="b-filtros">
        {[['todos', 'Todos'], ['ativos', 'Com plano'], ['sem-plano', 'Sem plano'], ['sem-ficha', 'Sem ficha'], ['wellhub', 'Wellhub'], ['inativos', 'Desativados']].map(([id, t]) => (
          <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(id)}>
            {t} {dados && <span>{contagem(id)}</span>}
          </button>
        ))}
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && lista.length === 0 && <Vazio titulo="Ninguém por aqui">Ajuste a busca ou os filtros.</Vazio>}
      {lista.length > 0 && (
        <div className="b-tabela-caixa">
          <table className="b-tabela b-tabela--clicavel">
            <thead>
              <tr><th>Aluno</th><th>Plano</th><th>Última aula</th><th className="num">Presenças</th><th>Situação</th></tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.cpf} onClick={() => nav('/bancada/alunos/' + a.cpf)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav('/bancada/alunos/' + a.cpf)}>
                  <td data-rotulo="Aluno"><strong>{a.nome}</strong><span className="b-suave b-bloco">{telFmt(a.whatsapp)}</span></td>
                  <td data-rotulo="Plano">{a.plano || <span className="b-suave">sem plano ativo</span>}{a.planoFim && <span className="b-suave b-bloco">até {dataCurta(a.planoFim)}</span>}</td>
                  <td data-rotulo="Última aula">{a.ultimaAula ? dataCurta(a.ultimaAula) : <span className="b-suave">—</span>}</td>
                  <td data-rotulo="Presenças" className="num">{a.presencas}</td>
                  <td data-rotulo="Situação">
                    <span className="b-reserva__tags">
                      {!a.ativo && <Tag tom="apagado">desativado</Tag>}
                      {!a.ficha && <Tag tom="aviso">sem ficha</Tag>}
                      {a.alerta && <Tag tom="alerta">saúde: atenção</Tag>}
                      {WELLHUB[a.wellhub] && <Tag tom={WELLHUB[a.wellhub][1]}>{WELLHUB[a.wellhub][0]}</Tag>}
                      {!a.temSenha && <Tag>sem senha</Tag>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {novo && <NovoAluno aoFechar={() => setNovo(false)} aoCriar={(cpf) => nav('/bancada/alunos/' + cpf)} />}
    </>
  );
}

function NovoAluno({ aoFechar, aoCriar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ nome: '', cpf: '', whatsapp: '', email: '', enviarConvite: true });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const campo = (k, m) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: m ? m(e.target.value) : e.target.value })) });
  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!cpfValido(f.cpf)) return setErro('CPF inválido.');
    setEnviando(true);
    try {
      const r = await chamar('novoAluno', { ...f, cpf: soDigitos(f.cpf), whatsapp: soDigitos(f.whatsapp) });
      aoCriar(r.cpf);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal rotulo="Cadastro com convite por e-mail" titulo="Novo cliente" aoFechar={aoFechar}>
      <form className="b-form" onSubmit={salvar} noValidate>
        <label className="b-campo"><span className="rotulo">Nome completo</span><input {...campo('nome')} autoComplete="off" /></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">CPF</span><input inputMode="numeric" {...campo('cpf', mascaraCPF)} /></label>
          <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" {...campo('whatsapp', mascaraTelefone)} /></label>
        </div>
        <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" {...campo('email')} /></label>
        <label className="b-check">
          <input type="checkbox" checked={f.enviarConvite} onChange={(e) => setF((x) => ({ ...x, enviarConvite: e.target.checked }))} />
          Enviar convite por e-mail para o aluno criar a senha
        </label>
        <Erro>{erro}</Erro>
        <button type="submit" className="botao botao--cheio" disabled={enviando}>{enviando ? 'Salvando…' : 'Cadastrar'}</button>
      </form>
    </Modal>
  );
}

export function AlunoDetalhe() {
  const { cpf } = useParams();
  const { chamar } = useBancada();
  const { dados: a, erro, carregando, recarregar, setDados } = useDados('aluno', { cpf });
  const [aba, setAba] = useState('resumo');
  const [editar, setEditar] = useState(false);
  const [vender, setVender] = useState(false);
  const [vale, setVale] = useState(false);
  const [aviso, setAviso] = useState('');

  if (carregando && !a) return <Carregando />;
  if (!a) return <><Erro>{erro}</Erro><Link to="/bancada/alunos" className="link-acao">Voltar para clientes</Link></>;

  async function linkSenha() {
    setAviso('');
    try {
      const r = await chamar('enviarLinkSenha', { cpf });
      setAviso(`Link para criar senha enviado para ${r.email}.`);
    } catch (e) {
      setAviso(e.message);
    }
  }
  async function salvar(dados) {
    const r = await chamar('salvarAluno', { cpf, dados });
    setDados(r);
  }

  const wh = WELLHUB[a.wellhub];
  return (
    <>
      <Link to="/bancada/alunos" className="link-acao b-voltar">Clientes</Link>
      <Cabecalho titulo={a.nome} acoes={
        <>
          {a.whatsapp && <a className="botao botao--linha botao--p com-icone" href={linkWhats(a.whatsapp, `Olá, ${primeiro(a.nome)}! Aqui é da Casa Âmbar.`)} target="_blank" rel="noreferrer"><IconeWhatsapp tamanho={15} /> WhatsApp</a>}
          <button type="button" className="botao botao--linha botao--p" onClick={() => setVale(true)}>Aplicar vale</button>
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setVender(true)}>Vender plano</button>
        </>
      }>
        CPF {cpfFmt(a.cpf)} · {telFmt(a.whatsapp)}{a.email ? ' · ' + a.email : ' · sem e-mail'} · cliente desde {dataBR(a.criadoEm)}
      </Cabecalho>
      <div className="b-reserva__tags b-tags-topo">
        {!a.ativo && <Tag tom="apagado">desativado</Tag>}
        {a.plano ? <Tag tom="ok">{a.plano}</Tag> : <Tag>sem plano ativo</Tag>}
        {!a.ficha && <Tag tom="aviso">sem ficha de saúde</Tag>}
        {a.alerta && <Tag tom="alerta">saúde: atenção</Tag>}
        {wh && <Tag tom={wh[1]}>{wh[0]}{a.wellhubId ? ' · ID ' + a.wellhubId : ''}</Tag>}
        {!a.temSenha && <Tag>ainda não criou senha</Tag>}
      </div>
      <Erro>{erro}</Erro>
      {aviso && <p className="aviso">{aviso}</p>}

      <Abas atual={aba} aoMudar={setAba} itens={[['resumo', 'Resumo'], ['planos', 'Planos'], ['aulas', 'Aulas'], ['pagamentos', 'Pagamentos'], ['saude', 'Saúde']]} />

      {aba === 'resumo' && (
        <div className="b-duas">
          <section className="b-cartao">
            <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Dados</h2><button type="button" className="link-acao" onClick={() => setEditar(true)}>editar</button></header>
            <dl className="b-dados">
              <dt>WhatsApp</dt><dd>{telFmt(a.whatsapp)}</dd>
              <dt>E-mail</dt><dd>{a.email || '—'}</dd>
              <dt>Presenças</dt><dd>{a.presencas}</dd>
              <dt>Última aula</dt><dd>{a.ultimaAula ? dataBR(a.ultimaAula) : '—'}</dd>
              <dt>Acesso ao site</dt><dd>{a.temSenha ? 'com senha' : 'sem senha'} · <button type="button" className="link-acao" onClick={linkSenha}>{a.temSenha ? 'enviar link de nova senha' : 'enviar convite'}</button></dd>
            </dl>
            {a.obs && <div className="b-obs"><span className="rotulo">Observações internas</span><p>{a.obs}</p></div>}
          </section>
          <section className="b-cartao">
            <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Wellhub</h2></header>
            {a.wellhub === 'nao_informado' || a.wellhub === 'desligado' ? (
              <p className="b-suave">Não informou Wellhub.</p>
            ) : (
              <>
                <p>ID <strong>{a.wellhubId || '—'}</strong> · {wh ? wh[0] : a.wellhub}</p>
                <div className="b-botoes">
                  <BotaoAcao acao={() => salvar({ wellhub: 'confirmado' })} disabled={a.wellhub === 'confirmado'}>Confirmar Gold+</BotaoAcao>
                  <BotaoAcao acao={() => salvar({ wellhub: 'bloqueado' })} disabled={a.wellhub === 'bloqueado'} className="botao botao--linha botao--p botao--perigo">Recusar</BotaoAcao>
                </div>
                <p className="b-suave b-nota">Confira no Portal do Parceiro Wellhub se o plano é Gold+ ou superior.</p>
              </>
            )}
          </section>
        </div>
      )}

      {aba === 'planos' && <Creditos a={a} aoMudar={recarregar} />}

      {aba === 'aulas' && (
        a.reservas.length === 0 ? <Vazio titulo="Nenhuma aula ainda" /> : (
          <div className="b-tabela-caixa">
            <table className="b-tabela">
              <thead><tr><th>Data</th><th>Aula</th><th>Tapete</th><th>Pago com</th><th>Situação</th></tr></thead>
              <tbody>
                {a.reservas.map((r) => {
                  const st = STATUS_RESERVA[r.status] || [r.status, 'neutro'];
                  const passou = r.data < hojeIso();
                  return (
                    <tr key={r.id}>
                      <td data-rotulo="Data">{dataBR(r.data)}</td>
                      <td data-rotulo="Aula">{r.modalidade} · {hora(r.hora)} · {r.professor}</td>
                      <td data-rotulo="Tapete">{r.tapete || '—'}</td>
                      <td data-rotulo="Pago com">{r.forma}</td>
                      <td data-rotulo="Situação"><Tag tom={st[1]}>{r.status === 'reservado' && passou ? 'sem registro' : st[0]}</Tag></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {aba === 'pagamentos' && <ListaPagamentos lista={a.pagamentos} />}

      {aba === 'saude' && (
        <section className="b-cartao">{a.ficha ? <FichaConteudo f={a.ficha} /> : <Vazio titulo="Ficha não preenchida">A aluna preenche pela área do aluno, em Ficha de saúde.</Vazio>}</section>
      )}

      {editar && <EditarAluno a={a} aoFechar={() => setEditar(false)} aoSalvar={async (d) => { await salvar(d); setEditar(false); }} />}
      {vender && <VenderModal aluno={a} aoFechar={() => setVender(false)} aoVender={() => { setVender(false); recarregar(); setAba('planos'); }} />}
      {vale && <AplicarVale aluno={a} aoFechar={() => setVale(false)} aoAplicar={() => { setVale(false); recarregar(); }} />}
    </>
  );
}

function Creditos({ a, aoMudar }) {
  const { chamar } = useBancada();
  const [prorrogar, setProrrogar] = useState(null);
  if (!a.creditos.length) return <Vazio titulo="Nenhum plano ainda">Use “Vender plano” para registrar uma compra feita no balcão.</Vazio>;
  return (
    <>
      <ul className="b-creditos">
        {a.creditos.map((c) => (
          <li key={c.id} className={c.vigente ? 'vigente' : ''}>
            <div>
              <strong>{c.descricao}</strong>
              <span className="b-suave">{dataBR(c.inicio)} a {dataBR(c.fim)} · {c.origem}</span>
            </div>
            <div className="b-creditos__uso">
              {c.porSemana ? <span>{c.usadas}/{c.limite} nesta semana</span> : <span>{c.usadas}/{c.limite} usada{c.limite > 1 ? 's' : ''}</span>}
              <Tag tom={!c.ativo ? 'apagado' : c.vigente ? 'ok' : 'neutro'}>{!c.ativo ? 'desativado' : c.vigente ? 'vigente' : c.fim < hojeIso() ? 'vencido' : 'futuro'}</Tag>
            </div>
            <div className="b-botoes">
              <button type="button" className="link-acao" onClick={() => setProrrogar(c)}>mudar validade</button>
              <BotaoAcao className="link-sair" acao={async () => { await chamar('ajustarCredito', { creditoId: c.id, ativo: !c.ativo }); aoMudar(); }}
                confirmar={c.ativo ? 'Desativar este crédito? As aulas dele deixam de poder ser reservadas.' : undefined}>
                {c.ativo ? 'desativar' : 'reativar'}
              </BotaoAcao>
            </div>
          </li>
        ))}
      </ul>
      {prorrogar && (
        <Modal rotulo={prorrogar.descricao} titulo="Mudar validade" aoFechar={() => setProrrogar(null)}>
          <Prorrogar c={prorrogar} aoSalvar={async (fim) => { await chamar('ajustarCredito', { creditoId: prorrogar.id, fim }); setProrrogar(null); aoMudar(); }} />
        </Modal>
      )}
    </>
  );
}

function Prorrogar({ c, aoSalvar }) {
  const [fim, setFim] = useState(c.fim);
  const [erro, setErro] = useState('');
  return (
    <div className="b-form">
      <p className="b-suave">Útil para atestado médico, viagem ou feriado prolongado.</p>
      <label className="b-campo"><span className="rotulo">Válido até</span><input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></label>
      <Erro>{erro}</Erro>
      <BotaoAcao className="botao botao--cheio" acao={async () => { try { await aoSalvar(fim); } catch (e) { setErro(e.message); } }}>Salvar</BotaoAcao>
    </div>
  );
}

function EditarAluno({ a, aoFechar, aoSalvar }) {
  const [f, setF] = useState({ nome: a.nome, whatsapp: telFmt(a.whatsapp), email: a.email, obs: a.obs, ativo: a.ativo, wellhubId: a.wellhubId });
  const [erro, setErro] = useState('');
  const campo = (k, m) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: m ? m(e.target.value) : e.target.value })) });
  return (
    <Modal rotulo="Aluno" titulo="Editar dados" aoFechar={aoFechar}>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Nome</span><input {...campo('nome')} /></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" {...campo('whatsapp', mascaraTelefone)} /></label>
          <label className="b-campo"><span className="rotulo">ID Wellhub</span><input inputMode="numeric" {...campo('wellhubId')} /></label>
        </div>
        <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" {...campo('email')} /></label>
        <label className="b-campo"><span className="rotulo">Observações internas</span><textarea rows={3} {...campo('obs')} placeholder="Só a equipe vê. Ex.: prefere tapete perto da janela" /></label>
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF((x) => ({ ...x, ativo: e.target.checked }))} /> Cadastro ativo (pode entrar e reservar)</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { await aoSalvar({ ...f, whatsapp: soDigitos(f.whatsapp) }); } catch (e) { setErro(e.message); }
        }}>Salvar</BotaoAcao>
      </div>
    </Modal>
  );
}

const METODOS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay', 'Cortesia'];

// Venda feita no balcão (dinheiro, Pix, maquininha...). Usada também em Vendas.
export function VenderModal({ aluno: inicial, aoFechar, aoVender }) {
  const { chamar } = useBancada();
  const itens = useItensVenda();
  const [aluno, setAluno] = useState(inicial || null);
  const [planoId, setPlanoId] = useState('');
  const [metodo, setMetodo] = useState('Pix');
  const [parcelas, setParcelas] = useState(1);
  const [codigo, setCodigo] = useState('');
  const [simulado, setSimulado] = useState(null);
  const [valor, setValor] = useState('');
  const [inicio, setInicio] = useState(hojeIso());
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const plano = itens?.achar(planoId);

  useEffect(() => { setSimulado(null); setValor(''); }, [planoId]);

  async function aplicarCodigo() {
    setErro('');
    try {
      const r = await chamar('simularPreco', { planoId, cpf: aluno?.cpf, codigo });
      setSimulado(r);
      setValor(String(r.valorFinal).replace('.', ','));
    } catch (e) {
      setSimulado(null);
      setErro(e.message);
    }
  }

  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      await chamar('vender', { cpf: aluno.cpf, planoId, metodo, parcelas, codigo: simulado ? codigo : '', valor: valor === '' ? undefined : Number(String(valor).replace(',', '.')), inicio, obs });
      aoVender();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const final = metodo === 'Cortesia' ? 0 : valor !== '' ? Number(String(valor).replace(',', '.')) : plano?.preco;
  return (
    <Modal rotulo="Venda no balcão" titulo="Vender plano ou aula" aoFechar={aoFechar}>
      <div className="b-form">
        {!aluno ? (
          <BuscaAluno aoEscolher={setAluno} autoFocus />
        ) : (
          <div className="b-escolhido">
            <div><strong>{aluno.nome}</strong><span>{aluno.plano || 'sem plano ativo'}</span></div>
            {!inicial && <button type="button" className="link-sair" onClick={() => setAluno(null)}>trocar</button>}
          </div>
        )}
        <label className="b-campo">
          <span className="rotulo">O que foi vendido</span>
          <select value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
            <option value="">{itens ? 'Escolha…' : 'Carregando…'}</option>
            <OpcoesItens itens={itens} />
          </select>
        </label>
        <div className="b-linha2">
          <label className="b-campo">
            <span className="rotulo">Recebido por</span>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          {/Cartão de crédito|Link/.test(metodo) ? (
            <label className="b-campo">
              <span className="rotulo">Parcelas</span>
              <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select>
            </label>
          ) : (
            <label className="b-campo">
              <span className="rotulo">Começa em</span>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
          )}
        </div>
        {plano && metodo !== 'Cortesia' && (
          <>
            <div className="b-linha2">
              <label className="b-campo">
                <span className="rotulo">Cupom ou vale (opcional)</span>
                <span className="codigo__linha">
                  <input value={codigo} onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setSimulado(null); }} placeholder="CÓDIGO" />
                  <button type="button" className="botao botao--linha botao--p" disabled={!codigo.trim()} onClick={aplicarCodigo}>Aplicar</button>
                </span>
              </label>
              <label className="b-campo">
                <span className="rotulo">Valor cobrado (R$)</span>
                <input inputMode="decimal" value={valor} placeholder={String(plano.preco).replace('.', ',')} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))} />
              </label>
            </div>
            {simulado && <p className="aviso">{simulado.mensagem}</p>}
          </>
        )}
        <label className="b-campo"><span className="rotulo">Observação</span><input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></label>
        {plano && (
          <div className="b-total">
            <span>Total</span>
            <strong>{final === 0 ? 'Cortesia' : real(final)}</strong>
            {final < plano.preco && <s>{real(plano.preco)}</s>}
          </div>
        )}
        <Erro>{erro}</Erro>
        <button type="button" className="botao botao--cheio" disabled={!aluno || !planoId || enviando} onClick={confirmar}>
          {enviando ? 'Registrando…' : 'Registrar venda'}
        </button>
        <p className="b-suave b-nota">O plano entra na hora para o aluno. Pagamentos pelo site entram sozinhos — não precisa registrar aqui.</p>
      </div>
    </Modal>
  );
}

function AplicarVale({ aluno, aoFechar, aoAplicar }) {
  const { chamar } = useBancada();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  return (
    <Modal rotulo={aluno.nome} titulo="Aplicar vale-presente" aoFechar={aoFechar}>
      <div className="b-form">
        <p className="b-suave">Vale de aula ou plano entra como crédito na hora. Vale em R$ fica ligado a este aluno para usar na próxima compra.</p>
        <label className="b-campo"><span className="rotulo">Código</span><input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="AMBAR-XXXX-XXXX" /></label>
        <Erro>{erro}</Erro>
        {ok && <p className="aviso">{ok}</p>}
        <BotaoAcao className="botao botao--cheio" disabled={!codigo.trim()} acao={async () => {
          setErro(''); setOk('');
          try {
            const r = await chamar('aplicarVale', { cpf: aluno.cpf, codigo });
            setOk(r.mensagem.replace('Já pode reservar.', '').replace('seu plano', 'o plano de ' + primeiro(aluno.nome)));
            setTimeout(aoAplicar, 1400);
          } catch (e) { setErro(e.message); }
        }}>Aplicar</BotaoAcao>
      </div>
    </Modal>
  );
}

export function ListaPagamentos({ lista, acoes }) {
  if (!lista?.length) return <Vazio titulo="Nenhum pagamento">Os pagamentos do site e do balcão aparecem aqui.</Vazio>;
  const tom = { pago: 'ok', pendente: 'aviso', estornado: 'apagado', expirado: 'apagado', descartado: 'apagado' };
  return (
    <div className="b-tabela-caixa">
      <table className="b-tabela">
        <thead><tr><th>Data</th><th>Aluno</th><th>Item</th><th className="num">Valor</th><th>Forma</th><th>Situação</th>{acoes && <th />}</tr></thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.orderNsu}>
              <td data-rotulo="Data">{dataBR(p.pagoEm || p.criadoEm)}</td>
              <td data-rotulo="Aluno">{p.nome}</td>
              <td data-rotulo="Item">
                {p.descricao}
                {(p.cupom || p.vale) && <span className="b-suave b-bloco">{p.cupom ? 'cupom ' + p.cupom : 'vale ' + p.vale} · −{real(p.desconto)}</span>}
                {p.observacao && <span className={`b-bloco ${/^DEVOLVER/.test(p.observacao) ? 'b-alerta-txt' : 'b-suave'}`}>{p.observacao}</span>}
              </td>
              <td data-rotulo="Valor" className="num">{real(p.valor)}</td>
              <td data-rotulo="Forma">{p.metodo || '—'}{Number(p.parcelas) > 1 ? ` ${p.parcelas}x` : ''}<span className="b-suave b-bloco">{p.origem}</span></td>
              <td data-rotulo="Situação"><Tag tom={tom[p.status] || 'neutro'}>{p.status}</Tag></td>
              {acoes && <td>{acoes(p)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
