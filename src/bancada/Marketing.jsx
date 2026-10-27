import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './css/marketing.css';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Esqueleto, Erro, Cabecalho, Modal, BotaoAcao, Vazio, Tag, Abas, Aviso, Secao, real, dataBR, dataCurta, hora, linkWhats, primeiro, telFmt, somarDias, hojeIso,
  numBR, MESES_LONGOS, DIAS_LONGOS, diaSemana, plural } from './ui.jsx';
import { Cupons } from './Vales.jsx';
import { useCatalogoComanda } from './Comandas.jsx';
import { NovoAtendimento } from './Servicos.jsx';
import { IconeWhatsapp } from '../components/Marca.jsx';
import { comNumeros } from '../components/Num.jsx';

const DIAS_LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const GRUPOS = ['Yoga', 'Pilates', 'Estética facial', 'Estética corporal', 'Estética capilar', 'Fisioterapia', 'Produtos'];

export default function Marketing() {
  const local = useLocation();
  const { membro } = useBancada();
  const [aba, setAba] = useState(local.state?.aba || 'promocoes');
  return (
    <>
      <Cabecalho titulo="Marketing">Promoções, campanhas, lembretes e retornos para a casa cheia</Cabecalho>
      <Abas atual={aba} aoMudar={setAba} itens={[['promocoes', 'Promoções'], ['campanhas', 'Campanhas'], ['lembretes', 'Lembretes'], ['retornos', 'Retornos'], ['cupons', 'Cupons']]} />
      {aba === 'promocoes' && <Promocoes admin={pode(membro, 'admin')} />}
      {aba === 'campanhas' && <Campanhas admin={pode(membro, 'admin')} />}
      {aba === 'lembretes' && <Lembretes />}
      {aba === 'retornos' && <Retornos admin={pode(membro, 'admin')} />}
      {aba === 'cupons' && <Cupons podeEditar={pode(membro, 'admin')} />}
    </>
  );
}

// ============================================================
//  PROMOÇÕES
// ============================================================
function textoDesconto(p) {
  if (p.tipo === 'percentual') return [`${String(p.valor).replace('.', ',')}%`, 'de desconto'];
  if (p.tipo === 'preco_fixo') return [real(p.valor).replace(',00', ''), 'preço fixo'];
  return [real(p.valor).replace(',00', ''), 'de desconto'];
}

function Promocoes({ admin }) {
  const { dados, erro, carregando, setDados } = useDados('promocoes', {});
  const catalogo = useCatalogoComanda();
  const [editar, setEditar] = useState(null);
  const nomeItem = (id) => catalogo?.itens.find((i) => i.id === id)?.nome || id;
  const nova = () => setEditar({ tipo: 'percentual', onde: 'ambos', ativo: true, grupos: [], itens: [], dias: [] });
  return (
    <>
      <Secao titulo="Promoções" ajuda="A promoção entra sozinha no preço, sem código. Se também houver cupom, vale o maior desconto." acoes={admin && <button type="button" className="botao botao--cheio botao--p" onClick={nova}>Nova promoção</button>}>
        <Erro>{erro}</Erro>
        {carregando && !dados && <Esqueleto linhas={3} altura={96} />}
        {dados && dados.length === 0 && (
          <Vazio titulo="Nenhuma promoção" forma="equilibrio" acao={admin && <button type="button" className="botao botao--cheio botao--p" onClick={nova}>Nova promoção</button>}>
            Ex.: 10% em estética facial às terças, ou drenagem por R$ 159 em novembro.
          </Vazio>
        )}
        <ul className="mk-promos">
          {(dados || []).map((p) => {
            const [grande, pequeno] = textoDesconto(p);
            const todos = !p.itens.length && !p.grupos.length;
            const alvos = [...p.grupos, ...p.itens.map(nomeItem)];
            return (
              <li key={p.id} className={`mk-promo mk-promo--${p.situacao.replace(' ', '-')}`}>
                <div className="mk-promo__selo" aria-hidden="true"><strong>{comNumeros(grande)}</strong><span>{pequeno}</span></div>
                <div className="mk-promo__corpo">
                  <div className="mk-promo__topo">
                    <h3>{p.nome}</h3>
                    <Tag tom={p.situacao === 'no ar' ? 'ok' : p.situacao === 'agendada' ? 'aviso' : 'apagado'}>{p.situacao}</Tag>
                  </div>
                  {p.descricao && <p className="mk-promo__desc">{p.descricao}</p>}
                  <div className="mk-promo__alvos">
                    {todos ? <Tag>Todos os serviços, aulas e produtos</Tag> : alvos.map((a) => <Tag key={a}>{a}</Tag>)}
                  </div>
                  <div className="mk-promo__pe">
                    <span className="mk-promo__dias" aria-label={p.dias.length ? 'Dias: ' + p.dias.map((d) => DIAS_LONGOS[d]).join(', ') : 'Todos os dias'}>
                      {DIAS_LETRA.map((l, i) => <b key={i} className={!p.dias.length || p.dias.includes(i) ? 'sim' : ''}>{l}</b>)}
                    </span>
                    <span className="b-meta">
                      <span>{p.de || p.ate ? `${p.de ? dataCurta(p.de) : '…'} a ${p.ate ? dataCurta(p.ate) : '…'}` : 'sem prazo'}</span>
                      <span>{p.onde === 'ambos' ? 'site e balcão' : p.onde === 'site' ? 'só no site' : 'só no balcão'}</span>
                      <span>{plural(p.usos, 'uso', 'usos')} · {real(p.descontoTotal)} em descontos</span>
                    </span>
                  </div>
                </div>
                {admin && <button type="button" className="botao botao--fantasma botao--p mk-promo__editar" onClick={() => setEditar(p)}>Editar</button>}
              </li>
            );
          })}
        </ul>
      </Secao>
      {editar && <EditarPromocao p={editar} catalogo={catalogo} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
    </>
  );
}

function EditarPromocao({ p, catalogo, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ id: p.id, nome: p.nome || '', descricao: p.descricao || '', tipo: p.tipo, valor: p.valor ? String(p.valor).replace('.', ',') : '',
    grupos: p.grupos || [], itens: p.itens || [], dias: p.dias || [], de: p.de || '', ate: p.ate || '', onde: p.onde, ativo: p.ativo !== false });
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const alterna = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const achados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q || !catalogo) return [];
    return catalogo.itens.filter((i) => i.nome.toLowerCase().includes(q) && !f.itens.includes(i.id)).slice(0, 8);
  }, [busca, catalogo, f.itens]);
  const exemplo = (() => {
    const id = f.itens[0];
    const it = catalogo?.itens.find((i) => i.id === id) || catalogo?.itens.find((i) => f.grupos.includes(i.grupo)) || catalogo?.itens[0];
    if (!it || !numBR(f.valor)) return '';
    const v = numBR(f.valor);
    const final = f.tipo === 'percentual' ? it.preco * (1 - v / 100) : f.tipo === 'preco_fixo' ? v : it.preco - v;
    return `Ex.: ${it.nome} de ${real(it.preco)} por ${real(Math.max(0, final))}`;
  })();
  return (
    <Modal titulo={p.id ? p.nome : 'Nova promoção'} rotulo="Desconto automático, sem código" aoFechar={aoFechar} largo>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Nome</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Terça da pele" /></label>
        <label className="b-campo"><span className="rotulo">Descrição (opcional)</span><input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></label>
        <fieldset className="b-opcoes b-opcoes--linha">
          <legend className="rotulo">Tipo de desconto</legend>
          {[['percentual', 'Porcentagem', '% sobre o preço'], ['valor', 'Valor', 'R$ a menos'], ['preco_fixo', 'Preço fixo', 'para um item']].map(([id, t, d]) => (
            <label key={id} className={f.tipo === id ? 'ativo' : ''}><input type="radio" checked={f.tipo === id} onChange={() => setF({ ...f, tipo: id })} /><span><strong>{t}</strong><small>{d}</small></span></label>
          ))}
        </fieldset>
        <label className="b-campo"><span className="rotulo">{f.tipo === 'percentual' ? 'Desconto (%)' : f.tipo === 'valor' ? 'Desconto (R$)' : 'Preço na promoção (R$)'}</span>
          <input inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value.replace(/[^\d,.]/g, '') })} /></label>
        {exemplo && <Aviso tom="info">{exemplo}</Aviso>}
        <fieldset className="b-opcoes">
          <legend className="rotulo">Vale para</legend>
          <div className="b-filtros">
            {GRUPOS.map((g) => <button key={g} type="button" className={`b-chip${f.grupos.includes(g) ? ' b-chip--ativo' : ''}`} onClick={() => alterna('grupos', g)}>{g}</button>)}
          </div>
          {f.itens.length > 0 && (
            <div className="b-filtros">
              {f.itens.map((id) => <button key={id} type="button" className="b-chip b-chip--ativo" onClick={() => alterna('itens', id)}>{catalogo?.itens.find((i) => i.id === id)?.nome || id} ×</button>)}
            </div>
          )}
          <div className="b-busca">
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ou escolha itens específicos (ex.: drenagem)" aria-label="Buscar item" />
            {achados.length > 0 && (
              <ul className="b-busca__lista">{achados.map((i) => <li key={i.id}><button type="button" onClick={() => { alterna('itens', i.id); setBusca(''); }}><strong>{i.nome}</strong><span>{i.grupo} · {real(i.preco)}</span></button></li>)}</ul>
            )}
          </div>
          <span className="b-suave">{!f.grupos.length && !f.itens.length ? 'Nada marcado: vale para tudo.' : ''}</span>
        </fieldset>
        <fieldset className="b-opcoes">
          <legend className="rotulo">Dias da semana</legend>
          <div className="b-filtros">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" className={`b-chip${f.dias.includes(d) ? ' b-chip--ativo' : ''}`} onClick={() => alterna('dias', d)}>{DIAS_LONGOS[d]}</button>)}
          </div>
          <span className="b-suave">{!f.dias.length ? 'Nenhum marcado: todos os dias.' : 'Conta o dia do atendimento.'}</span>
        </fieldset>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Começa</span><input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /></label>
          <label className="b-campo"><span className="rotulo">Termina</span><input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} /></label>
        </div>
        <fieldset className="b-opcoes b-opcoes--linha">
          <legend className="rotulo">Onde vale</legend>
          {[['ambos', 'Site e balcão'], ['bancada', 'Só no balcão'], ['site', 'Só no site']].map(([id, t]) => (
            <label key={id} className={f.onde === id ? 'ativo' : ''}><input type="radio" checked={f.onde === id} onChange={() => setF({ ...f, onde: id })} /><span><strong>{t}</strong></span></label>
          ))}
        </fieldset>
        <Aviso tom="info">No site entram só aulas de Yoga e Pilates (serviços são agendados pela bancada).</Aviso>
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Promoção ativa</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { aoSalvar(await chamar('salvarPromocao', { promocao: { ...f, valor: numBR(f.valor) } })); } catch (e) { setErro(e.message); }
        }}>Salvar promoção</BotaoAcao>
        {p.id && <BotaoAcao className="link-sair" confirmar="Apagar esta promoção?" acao={async () => { try { aoSalvar(await chamar('excluirPromocao', { id: p.id })); } catch (e) { setErro(e.message); } }}>Apagar</BotaoAcao>}
      </div>
    </Modal>
  );
}

// ============================================================
//  CAMPANHAS
// ============================================================
const PUBLICOS = [
  ['sumidos', 'Quem sumiu', 'não vem há um tempo e não tem nada marcado'],
  ['aniversariantes', 'Aniversariantes', 'do mês escolhido'],
  ['semRetorno', 'Vieram uma vez', 'e não voltaram'],
  ['pacoteAcabando', 'Pacote acabando', 'última sessão ou vencendo em 15 dias'],
  ['categoria', 'Por área', 'quem já fez estética facial, corporal…'],
  ['servico', 'Por serviço', 'quem já fez um serviço'],
  ['modalidade', 'Yoga ou Pilates', 'quem já fez aula'],
  ['todos', 'Todo mundo', 'todos os cadastros'],
];
const MODELOS = {
  sumidos: ['Sentimos sua falta, {nome}', 'Oi, {nome}! Faz um tempinho que você não vem à Casa Âmbar e a gente sentiu sua falta.\n\nQue tal reservar um momento para você esta semana? É só responder esta mensagem ou chamar no WhatsApp.'],
  aniversariantes: ['Feliz aniversário, {nome}!', 'Feliz aniversário, {nome}! 🎂\n\nA Casa Âmbar deseja um novo ciclo leve e cheio de cuidado. Preparamos um presente para você aproveitar neste mês: fale com a gente para agendar.'],
  semRetorno: ['Volte para a Casa Âmbar, {nome}', 'Oi, {nome}! Foi muito bom receber você na Casa Âmbar.\n\nQueremos ver você de novo: responda esta mensagem e a gente encontra o melhor horário.'],
  pacoteAcabando: ['Seu pacote está chegando ao fim', 'Oi, {nome}! Seu pacote na Casa Âmbar está chegando ao fim.\n\nPara não perder os resultados, que tal renovar? Fale com a gente pelo WhatsApp.'],
  padrao: ['Novidades da Casa Âmbar', 'Oi, {nome}!\n\n'],
};

function Campanhas({ admin }) {
  const { chamar } = useBancada();
  const { dados: historico, setDados: setHistorico } = useDados('campanhas', {});
  const { dados: cat } = useDados('catalogoServicos', {});
  const [filtro, setFiltro] = useState({ tipo: 'sumidos', dias: 45, mes: hojeIso().slice(5, 7) });
  const [publico, setPublico] = useState(null);
  const [canal, setCanal] = useState('whatsapp');
  const [assunto, setAssunto] = useState(MODELOS.sumidos[0]);
  const [mensagem, setMensagem] = useState(MODELOS.sumidos[1]);
  const [enviadosW, setEnviadosW] = useState({});
  const [resultado, setResultado] = useState('');
  const [erro, setErro] = useState('');
  const [buscando, setBuscando] = useState(false);

  const mudarTipo = (tipo) => {
    setFiltro({ ...filtro, tipo });
    setPublico(null);
    const m = MODELOS[tipo] || MODELOS.padrao;
    setAssunto(m[0]); setMensagem(m[1]);
  };
  async function buscar() {
    setErro(''); setResultado(''); setBuscando(true);
    try { setPublico(await chamar('publicoCampanha', { filtro })); setEnviadosW({}); } catch (e) { setErro(e.message); } finally { setBuscando(false); }
  }
  const personal = (t, p) => t.replace(/\{nome\}/gi, primeiro(p.nome));
  // quem desmarcou "receber novidades" (aceitaEmail = marketing) não entra na lista do WhatsApp
  const comWhats = (publico?.pessoas || []).filter((p) => p.aceitaEmail && p.whatsapp.replace(/\D/g, '').length >= 10);

  const nomeCanal = canal === 'email' ? 'E-mail' : 'WhatsApp';
  return (
    <>
      <Secao titulo="Nova campanha" ajuda="Escolha quem recebe, ajuste a mensagem e envie. No e-mail, cada pessoa pode sair da lista pelo link “não quero mais receber”.">
        <ol className="mk-passos">
          <li className="mk-passo">
            <header className="mk-passo__topo"><span className="mk-passo__num">1</span><h3>Para quem</h3></header>
            <div className="mk-publicos" role="group" aria-label="Público da campanha">
              {PUBLICOS.map(([id, t, d]) => (
                <button key={id} type="button" aria-pressed={filtro.tipo === id} className={`mk-publico${filtro.tipo === id ? ' mk-publico--ativo' : ''}`} onClick={() => mudarTipo(id)}>
                  <strong>{t}</strong>{d && <span>{d}</span>}
                </button>
              ))}
            </div>
            {['sumidos', 'aniversariantes', 'categoria', 'servico', 'modalidade'].includes(filtro.tipo) && (
              <div className="mk-passo__filtro">
                {filtro.tipo === 'sumidos' && (
                  <label className="b-campo"><span className="rotulo">Sem vir há mais de</span>
                    <select value={filtro.dias} onChange={(e) => { setFiltro({ ...filtro, dias: Number(e.target.value) }); setPublico(null); }}>{[21, 30, 45, 60, 90, 180].map((n) => <option key={n} value={n}>{n} dias</option>)}</select></label>
                )}
                {filtro.tipo === 'aniversariantes' && (
                  <label className="b-campo"><span className="rotulo">Mês</span>
                    <select value={filtro.mes} onChange={(e) => { setFiltro({ ...filtro, mes: e.target.value }); setPublico(null); }}>{MESES_LONGOS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</select></label>
                )}
                {filtro.tipo === 'categoria' && cat && (
                  <label className="b-campo"><span className="rotulo">Área</span>
                    <select value={filtro.categoria || ''} onChange={(e) => { setFiltro({ ...filtro, categoria: e.target.value }); setPublico(null); }}><option value="">Escolha…</option>{cat.categorias.map((c) => <option key={c}>{c}</option>)}</select></label>
                )}
                {filtro.tipo === 'servico' && cat && (
                  <label className="b-campo"><span className="rotulo">Serviço</span>
                    <select value={filtro.servicoId || ''} onChange={(e) => { setFiltro({ ...filtro, servicoId: e.target.value }); setPublico(null); }}><option value="">Escolha…</option>{cat.servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
                )}
                {filtro.tipo === 'modalidade' && (
                  <label className="b-campo"><span className="rotulo">Modalidade</span>
                    <select value={filtro.modalidade || ''} onChange={(e) => { setFiltro({ ...filtro, modalidade: e.target.value }); setPublico(null); }}><option value="">Escolha…</option><option>Yoga</option><option>Pilates</option></select></label>
                )}
              </div>
            )}
            <div className="mk-passo__acao">
              <button type="button" className="botao botao--cheio botao--p" disabled={buscando} onClick={buscar}>{buscando ? 'Procurando…' : 'Ver quem entra'}</button>
              {publico && (
                <p className="mk-contagem" aria-live="polite">
                  <span><strong>{publico.total}</strong> {publico.total === 1 ? 'cliente' : 'clientes'}</span>
                  <span><strong>{publico.comWhats}</strong> com WhatsApp</span>
                  <span><strong>{publico.comEmail}</strong> {publico.comEmail === 1 ? 'recebe' : 'recebem'} e-mail</span>
                </p>
              )}
            </div>
            {publico && publico.total === 0 && <Aviso tom="aviso">Ninguém entra neste público agora. Mude a escolha e veja de novo.</Aviso>}
          </li>

          {publico && publico.total > 0 && (
            <>
              <li className="mk-passo">
                <header className="mk-passo__topo"><span className="mk-passo__num">2</span><h3>A mensagem</h3></header>
                <div className="mk-mensagem">
                  <div className="mk-mensagem__editor">
                    <div className="b-segmento" role="tablist" aria-label="Canal">
                      <button type="button" role="tab" aria-selected={canal === 'whatsapp'} onClick={() => setCanal('whatsapp')}>WhatsApp</button>
                      <button type="button" role="tab" aria-selected={canal === 'email'} onClick={() => setCanal('email')}>E-mail</button>
                    </div>
                    {canal === 'email' && <label className="b-campo"><span className="rotulo">Assunto</span><input value={assunto} onChange={(e) => setAssunto(e.target.value)} /></label>}
                    <label className="b-campo"><span className="rotulo">Texto · {'{nome}'} vira o primeiro nome</span><textarea rows={7} value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></label>
                  </div>
                  <div className={`mk-previa mk-previa--${canal}`} aria-label="Prévia">
                    <span className="mk-previa__rotulo">Prévia para {primeiro(publico.pessoas[0].nome)} · {nomeCanal}</span>
                    <div className="mk-previa__balao">
                      {canal === 'email' && <strong>{personal(assunto, publico.pessoas[0])}</strong>}
                      <p>{personal(mensagem, publico.pessoas[0])}</p>
                    </div>
                  </div>
                </div>
              </li>
              <li className="mk-passo">
                <header className="mk-passo__topo"><span className="mk-passo__num">3</span><h3>Enviar</h3></header>
                {canal === 'email' ? (
                  admin ? (
                    <>
                      <Aviso tom="info">Sai da conta Google da Casa Âmbar, com o link “não quero mais receber” no rodapé. Hoje ainda dá para enviar {plural(publico.cotaEmail, 'e-mail', 'e-mails')}.</Aviso>
                      <div className="mk-passo__acao">
                        <BotaoAcao className="botao botao--cheio" confirmar={`Enviar para ${plural(publico.comEmail, 'pessoa', 'pessoas')} por e-mail?`} acao={async () => {
                          setErro(''); setResultado('');
                          try {
                            const r = await chamar('enviarCampanha', { filtro, assunto, mensagem, nome: assunto });
                            setResultado(`${plural(r.enviados, 'e-mail enviado', 'e-mails enviados')}.${r.faltaram ? ` ${r.faltaram} ${r.faltaram === 1 ? 'ficou' : 'ficaram'} para amanhã (limite diário).` : ''}`);
                            setHistorico(await chamar('campanhas', {}));
                          } catch (e) { setErro(e.message); }
                        }}>Enviar {publico.comEmail} e-mails</BotaoAcao>
                      </div>
                    </>
                  ) : <Aviso tom="info">E-mail em massa é enviado pela administração. Use o WhatsApp.</Aviso>
                ) : (
                  <>
                    <div className="mk-progresso">
                      <span className="b-suave">Toque em “Abrir” em cada nome: a mensagem já vai pronta. Envie uma a uma.</span>
                      <strong>{Object.keys(enviadosW).length} de {comWhats.length}</strong>
                      <span className="mk-progresso__barra"><i style={{ width: `${comWhats.length ? (Object.keys(enviadosW).length / comWhats.length) * 100 : 0}%` }} /></span>
                    </div>
                    {comWhats.length === 0 && <Aviso tom="aviso">Ninguém deste público tem WhatsApp para receber novidades.</Aviso>}
                    <ul className="mk-fila">
                      {comWhats.map((p) => (
                        <li key={p.cpf} className={enviadosW[p.cpf] ? 'feito' : ''}>
                          <span className="mk-fila__ini" aria-hidden="true">{enviadosW[p.cpf] ? '✓' : primeiro(p.nome).slice(0, 1)}</span>
                          <span className="mk-fila__nome"><strong>{p.nome}</strong><small>{p.motivo || telFmt(p.whatsapp)}</small></span>
                          <a className={`botao ${enviadosW[p.cpf] ? 'botao--linha' : 'botao--cheio'} botao--p com-icone`} href={linkWhats(p.whatsapp, personal(mensagem, p))} target="_blank" rel="noreferrer"
                            onClick={() => setEnviadosW((x) => ({ ...x, [p.cpf]: true }))}><IconeWhatsapp tamanho={14} /> {enviadosW[p.cpf] ? 'Abrir de novo' : 'Abrir'}</a>
                        </li>
                      ))}
                    </ul>
                    <div className="mk-passo__acao">
                      <BotaoAcao className="botao botao--cheio botao--p" disabled={!Object.keys(enviadosW).length} acao={async () => {
                        try {
                          setHistorico(await chamar('registrarCampanha', { nome: PUBLICOS.find((x) => x[0] === filtro.tipo)[1] + ' · WhatsApp', filtro, mensagem, total: comWhats.length, enviados: Object.keys(enviadosW).length }));
                          setResultado('Campanha registrada.');
                        } catch (e) { setErro(e.message); }
                      }}>Concluir ({Object.keys(enviadosW).length} de {comWhats.length})</BotaoAcao>
                    </div>
                  </>
                )}
                {resultado && <Aviso tom="ok">{resultado}</Aviso>}
              </li>
            </>
          )}
        </ol>
        <Erro>{erro}</Erro>
      </Secao>
      {historico && historico.length > 0 && (
        <Secao titulo="Campanhas anteriores">
          <ul className="b-itens">
            {historico.map((c) => (
              <li key={c.id} className="b-item">
                <div className="b-item__corpo">
                  <span className="b-item__titulo">{c.nome}</span>
                  <span className="b-meta"><span>{dataBR(c.criadaEm)}</span><span>{c.publico}</span><span>{c.enviados} de {c.total}</span><span>{c.criadoPor}</span></span>
                </div>
                <div className="b-item__lado"><Tag>{c.canal}</Tag></div>
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </>
  );
}

// ============================================================
//  LEMBRETES DA VÉSPERA
// ============================================================
function Lembretes() {
  const { chamar } = useBancada();
  const [data, setData] = useState(somarDias(hojeIso(), 1));
  const { dados, erro, carregando, setDados } = useDados('lembretes', { data });
  const [aviso, setAviso] = useState('');
  if (carregando && !dados) return <Esqueleto linhas={4} altura={56} />;
  if (!dados) return <Erro>{erro}</Erro>;
  const semEnvio = dados.lista.filter((x) => !x.enviado);
  const comEmail = semEnvio.filter((x) => x.temEmail);
  const dia = `${DIAS_LONGOS[diaSemana(data)].toLowerCase()}, ${dataBR(data)}`;
  return (
    <Secao titulo="Lembretes da véspera"
      ajuda={`${dados.automatico ? 'O e-mail da véspera sai sozinho quando a bancada é aberta.' : 'Lembrete automático desligado em Ajustes.'} O WhatsApp é enviado por você, um a um.`}
      acoes={
        <>
          <label className="mk-data"><span>Horários de</span><input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} /></label>
          <BotaoAcao className="botao botao--cheio botao--p" disabled={!comEmail.length} acao={async () => {
            try { const r = await chamar('enviarLembretes', { data }); setDados(r); setAviso(`${plural(r.enviados, 'e-mail enviado', 'e-mails enviados')}.`); } catch (e) { setAviso(e.message); }
          }}>Enviar {plural(comEmail.length, 'e-mail', 'e-mails')} agora</BotaoAcao>
        </>
      }>
      <div className="mk-resumo">
        <Tag tom={dados.automatico ? 'ok' : 'aviso'}>{dados.automatico ? 'Envio automático ligado' : 'Envio automático desligado'}</Tag>
        <span className="b-meta">
          <span>{plural(dados.lista.length, 'horário', 'horários')} em {dia}</span>
          <span>{semEnvio.length} sem aviso</span>
          {dados.ultimoEnvio && <span>último envio {dataBR(dados.ultimoEnvio)} {hora(dados.ultimoEnvio.slice(11, 16))}</span>}
        </span>
      </div>
      {aviso && <Aviso tom="ok">{aviso}</Aviso>}
      {dados.lista.length === 0 ? <Vazio titulo={`Nada marcado para ${dia}`} forma="presenca">Troque a data para ver os horários de outro dia.</Vazio> : (
        <ul className="b-itens mk-lembretes">
          {dados.lista.map((x) => (
            <li key={x.tipo + x.id} className={`b-item mk-lembrete${x.enviado ? ' mk-lembrete--ok' : ''}`}>
              <span className="mk-lembrete__hora">{hora(x.hora)}</span>
              <div className="b-item__corpo">
                <span className="b-item__titulo">{x.nome}</span>
                <span className="b-meta"><span>{x.titulo}</span>{x.com && <span>{x.com}</span>}</span>
              </div>
              <div className="b-item__lado b-item__lado--tira">
                {x.enviado ? <Tag tom="ok">{x.enviado.split(' ')[0]}</Tag> : x.temEmail ? <Tag tom="aviso">e-mail pendente</Tag> : <Tag>sem e-mail</Tag>}
                {x.whatsapp && (
                  <a className="botao botao--linha botao--p com-icone" href={linkWhats(x.whatsapp, x.texto)} target="_blank" rel="noreferrer"
                    onClick={() => chamar('marcarLembrete', { id: x.id, tipo: x.tipo }).then(() => setDados((d) => ({ ...d, lista: d.lista.map((y) => (y.id === x.id ? { ...y, enviado: 'WhatsApp' } : y)) }))).catch(() => {})}>
                    <IconeWhatsapp tamanho={14} /> WhatsApp
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

// ============================================================
//  RETORNOS: quem fez um serviço com retorno sugerido e ainda não voltou
// ============================================================
function Retornos({ admin }) {
  const { chamar } = useBancada();
  const navegar = useNavigate();
  const { dados, erro, carregando, setDados, recarregar } = useDados('retornos', {});
  const { dados: catalogo } = useDados('catalogoServicos', {});
  const [agendar, setAgendar] = useState(null);
  if (carregando && !dados) return <Esqueleto linhas={4} altura={64} />;
  if (!dados) return <Erro>{erro}</Erro>;
  const tirar = (x) => setDados((d) => ({ ...d, lista: d.lista.filter((y) => y.atendimentoId !== x.atendimentoId) }));
  const marcar = (x, como) => chamar('marcarRetorno', { atendimentoId: x.atendimentoId, como }).then(() => tirar(x));
  const hoje = hojeIso();
  const texto = (x) => `Olá, ${primeiro(x.nome)}! Aqui é da Casa Âmbar. Já faz ${plural(Math.max(1, Math.round((new Date(hoje) - new Date(x.ultima)) / 86400000)), 'dia', 'dias')} da sua sessão de ${x.servico}${x.profissional ? ` com ${primeiro(x.profissional)}` : ''}: é um bom momento para o retorno. Quer que a gente reserve um horário?`;
  return (
    <>
      <Secao titulo="Retornos" ajuda={`Aparece aqui quem fez um serviço com retorno sugerido, chegou no prazo e ainda não tem nada marcado. ${admin ? 'O prazo de cada serviço fica em Catálogo → Serviços.' : 'O prazo de cada serviço é definido pela administração no Catálogo.'}`}
        acoes={dados.lista.length > 0 && <span className="b-meta"><span>{plural(dados.lista.length, 'pessoa para chamar', 'pessoas para chamar')}</span></span>}>
        {dados.semConfiguracao && (
          <Vazio titulo="Nenhum serviço com retorno sugerido" forma="equilibrio" acao={admin && <button type="button" className="botao botao--linha botao--p" onClick={() => navegar('/bancada/grade')}>Abrir o catálogo</button>}>
            {admin ? 'Em Catálogo → Serviços, edite um serviço e preencha "Retorno sugerido". Ex.: limpeza de pele em 30 dias, peeling em 7.' : 'Peça à administração para preencher o retorno sugerido dos serviços no Catálogo.'}
          </Vazio>
        )}
        {!dados.semConfiguracao && dados.lista.length === 0 && <Vazio titulo="Ninguém para chamar agora" forma="presenca">Quando alguém chegar no prazo do retorno, aparece aqui.</Vazio>}
        {dados.lista.length > 0 && (
          <ul className="b-itens mk-retornos">
            {dados.lista.map((x) => (
              <li key={x.atendimentoId} className={`b-item mk-retorno${x.retornoEm < hoje ? ' mk-retorno--passou' : ''}`}>
                <span className="mk-retorno__quando">{x.retornoEm <= hoje ? 'já' : dataCurta(x.retornoEm)}</span>
                <div className="b-item__corpo">
                  <span className="b-item__titulo">{x.nome}</span>
                  <span className="b-meta"><span>{x.servico} em {dataBR(x.ultima)}</span>{x.profissional && <span>com {x.profissional}</span>}<span>retorno em {plural(x.dias, 'dia', 'dias')}</span></span>
                </div>
                <div className="b-item__lado b-item__lado--tira">
                  {x.whatsapp && <a className="botao botao--cheio botao--p com-icone" href={linkWhats(x.whatsapp, texto(x))} target="_blank" rel="noreferrer" onClick={() => marcar(x, 'avisado').catch(() => {})}><IconeWhatsapp tamanho={14} /> Chamar</a>}
                  <button type="button" className="botao botao--linha botao--p" disabled={!catalogo} onClick={() => setAgendar(x)}>Agendar</button>
                  <BotaoAcao className="botao botao--fantasma botao--p" confirmar={`Tirar ${x.nome} dos retornos?`} acao={() => marcar(x, 'dispensado')}>Dispensar</BotaoAcao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Secao>
      {agendar && catalogo && <NovoAtendimento catalogo={catalogo} inicial={{ data: hoje, servicoId: agendar.servicoId, profissional: agendar.profissional, cliente: { nome: agendar.nome, cpf: agendar.cpf, whatsapp: agendar.whatsapp } }}
        aoFechar={() => setAgendar(null)} aoSalvar={() => { setAgendar(null); recarregar(); }} />}
    </>
  );
}
