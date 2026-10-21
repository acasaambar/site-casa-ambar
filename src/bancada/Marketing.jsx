import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Modal, BotaoAcao, Vazio, Tag, Abas, real, dataBR, dataCurta, hora, linkWhats, primeiro, telFmt, somarDias, hojeIso,
  numBR, MESES_LONGOS, DIAS_LONGOS, diaSemana, plural } from './ui.jsx';
import { Cupons } from './Vales.jsx';
import { useCatalogoComanda } from './Comandas.jsx';
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
      <Cabecalho titulo="Marketing">Promoções automáticas, campanhas para trazer de volta quem sumiu, lembretes e cupons.</Cabecalho>
      <Abas atual={aba} aoMudar={setAba} itens={[['promocoes', 'Promoções'], ['campanhas', 'Campanhas'], ['lembretes', 'Lembretes'], ['cupons', 'Cupons']]} />
      {aba === 'promocoes' && <Promocoes admin={pode(membro, 'admin')} />}
      {aba === 'campanhas' && <Campanhas admin={pode(membro, 'admin')} />}
      {aba === 'lembretes' && <Lembretes />}
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
  return (
    <>
      <div className="b-barra-acoes">
        <p className="b-suave">A promoção entra sozinha no preço, sem código. Se também houver cupom, vale o maior desconto.</p>
        {admin && <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ tipo: 'percentual', onde: 'ambos', ativo: true, grupos: [], itens: [], dias: [] })}>Nova promoção</button>}
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && dados.length === 0 && <Vazio titulo="Nenhuma promoção" forma="equilibrio">Ex.: 10% em estética facial às terças, ou drenagem por R$ 159 em novembro.</Vazio>}
      <ul className="pr-lista">
        {(dados || []).map((p) => {
          const [grande, pequeno] = textoDesconto(p);
          const alvo = !p.itens.length && !p.grupos.length ? 'Todos os serviços, aulas e produtos' : [...p.grupos, ...p.itens.map(nomeItem)].join(' · ');
          return (
            <li key={p.id} className={`pr pr--${p.situacao.replace(' ', '-')}`}>
              <div className="pr__selo" aria-hidden="true"><strong>{comNumeros(grande)}</strong><span>{pequeno}</span></div>
              <div className="pr__corpo">
                <div className="pr__topo">
                  <h3>{p.nome}</h3>
                  <Tag tom={p.situacao === 'no ar' ? 'ok' : p.situacao === 'agendada' ? 'aviso' : 'apagado'}>{p.situacao}</Tag>
                </div>
                {p.descricao && <p className="pr__desc">{p.descricao}</p>}
                <p className="b-suave">{alvo}</p>
                <div className="pr__pe">
                  <span className="pr__dias" aria-label={p.dias.length ? 'Dias: ' + p.dias.map((d) => DIAS_LONGOS[d]).join(', ') : 'Todos os dias'}>
                    {DIAS_LETRA.map((l, i) => <b key={i} className={!p.dias.length || p.dias.includes(i) ? 'sim' : ''}>{l}</b>)}
                  </span>
                  <span className="b-suave">{p.de || p.ate ? `${p.de ? dataCurta(p.de) : '…'} a ${p.ate ? dataCurta(p.ate) : '…'}` : 'sem prazo'}</span>
                  <span className="b-suave">{p.onde === 'ambos' ? 'site e balcão' : p.onde === 'site' ? 'só no site' : 'só no balcão'}</span>
                  <span className="b-suave">{plural(p.usos, 'uso', 'usos')} · {real(p.descontoTotal)} em descontos</span>
                </div>
              </div>
              {admin && <button type="button" className="link-acao pr__editar" onClick={() => setEditar(p)}>editar</button>}
            </li>
          );
        })}
      </ul>
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
        {exemplo && <p className="b-suave">{exemplo}</p>}
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
        <span className="b-suave">No site entram só aulas de Yoga e Pilates (serviços são agendados pela bancada).</span>
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

  return (
    <>
      <section className="b-cartao cp">
        <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Nova campanha</h2></header>
        <div className="cp__passo">
          <span className="cp__num">1</span>
          <div className="cp__conteudo">
            <strong>Para quem</strong>
            <div className="cp-publicos">
              {PUBLICOS.map(([id, t, d]) => (
                <button key={id} type="button" className={`cp-publico${filtro.tipo === id ? ' cp-publico--ativo' : ''}`} onClick={() => mudarTipo(id)}>
                  <strong>{t}</strong>{d && <span>{d}</span>}
                </button>
              ))}
            </div>
            <div className="b-linha2">
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
            <button type="button" className="botao botao--linha botao--p" disabled={buscando} onClick={buscar}>{buscando ? 'Procurando…' : 'Ver quem entra'}</button>
            {publico && (
              <p className="cp__contagem"><strong>{publico.total}</strong> cliente{publico.total === 1 ? '' : 's'} · {publico.comWhats} com WhatsApp · {publico.comEmail} {publico.comEmail === 1 ? 'recebe' : 'recebem'} e-mail</p>
            )}
          </div>
        </div>

        {publico && publico.total > 0 && (
          <>
            <div className="cp__passo">
              <span className="cp__num">2</span>
              <div className="cp__conteudo">
                <strong>A mensagem</strong>
                <div className="b-segmento" role="tablist" aria-label="Canal">
                  <button type="button" role="tab" aria-selected={canal === 'whatsapp'} onClick={() => setCanal('whatsapp')}>WhatsApp</button>
                  <button type="button" role="tab" aria-selected={canal === 'email'} onClick={() => setCanal('email')}>E-mail</button>
                </div>
                {canal === 'email' && <label className="b-campo"><span className="rotulo">Assunto</span><input value={assunto} onChange={(e) => setAssunto(e.target.value)} /></label>}
                <label className="b-campo"><span className="rotulo">Texto · use {'{nome}'} para o primeiro nome</span><textarea rows={6} value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></label>
                <div className="cp__previa" aria-label="Prévia">
                  <span className="b-suave">Prévia para {primeiro(publico.pessoas[0].nome)}</span>
                  {canal === 'email' && <strong>{personal(assunto, publico.pessoas[0])}</strong>}
                  <p>{personal(mensagem, publico.pessoas[0])}</p>
                </div>
              </div>
            </div>
            <div className="cp__passo">
              <span className="cp__num">3</span>
              <div className="cp__conteudo">
                <strong>Enviar</strong>
                {canal === 'email' ? (
                  admin ? (
                    <>
                      <p className="b-suave">Sai da conta Google da Casa Âmbar, com o link “não quero mais receber” no rodapé. Hoje ainda dá para enviar {publico.cotaEmail} e-mails.</p>
                      <BotaoAcao className="botao botao--cheio" confirmar={`Enviar para ${plural(publico.comEmail, 'pessoa', 'pessoas')} por e-mail?`} acao={async () => {
                        setErro(''); setResultado('');
                        try {
                          const r = await chamar('enviarCampanha', { filtro, assunto, mensagem, nome: assunto });
                          setResultado(`${plural(r.enviados, 'e-mail enviado', 'e-mails enviados')}.${r.faltaram ? ` ${r.faltaram} ${r.faltaram === 1 ? 'ficou' : 'ficaram'} para amanhã (limite diário).` : ''}`);
                          setHistorico(await chamar('campanhas', {}));
                        } catch (e) { setErro(e.message); }
                      }}>Enviar {publico.comEmail} e-mails</BotaoAcao>
                    </>
                  ) : <p className="b-suave">E-mail em massa é enviado pela administração. Use o WhatsApp.</p>
                ) : (
                  <>
                    <p className="b-suave">Toque em cada nome para abrir o WhatsApp com a mensagem pronta. Envie uma a uma.</p>
                    <ul className="cp-fila">
                      {comWhats.map((p) => (
                        <li key={p.cpf} className={enviadosW[p.cpf] ? 'feito' : ''}>
                          <span><strong>{p.nome}</strong><small>{p.motivo || telFmt(p.whatsapp)}</small></span>
                          <a className="botao botao--linha botao--p com-icone" href={linkWhats(p.whatsapp, personal(mensagem, p))} target="_blank" rel="noreferrer"
                            onClick={() => setEnviadosW((x) => ({ ...x, [p.cpf]: true }))}><IconeWhatsapp tamanho={14} /> {enviadosW[p.cpf] ? 'Abrir de novo' : 'Abrir'}</a>
                        </li>
                      ))}
                    </ul>
                    <BotaoAcao className="botao botao--cheio botao--p" disabled={!Object.keys(enviadosW).length} acao={async () => {
                      try {
                        setHistorico(await chamar('registrarCampanha', { nome: PUBLICOS.find((x) => x[0] === filtro.tipo)[1] + ' · WhatsApp', filtro, mensagem, total: comWhats.length, enviados: Object.keys(enviadosW).length }));
                        setResultado('Campanha registrada.');
                      } catch (e) { setErro(e.message); }
                    }}>Concluir ({Object.keys(enviadosW).length} de {comWhats.length})</BotaoAcao>
                  </>
                )}
                {resultado && <p className="aviso">{resultado}</p>}
              </div>
            </div>
          </>
        )}
        <Erro>{erro}</Erro>
      </section>
      {historico && historico.length > 0 && (
        <section className="b-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Campanhas anteriores</h2></header>
          <ul className="b-lista-simples">
            {historico.map((c) => <li key={c.id}><strong>{c.nome} · {c.canal}</strong><span>{dataBR(c.criadaEm)} · {c.publico} · {c.enviados} de {c.total} · {c.criadoPor}</span></li>)}
          </ul>
        </section>
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
  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  const semEnvio = dados.lista.filter((x) => !x.enviado);
  const comEmail = semEnvio.filter((x) => x.temEmail);
  const dia = `${DIAS_LONGOS[diaSemana(data)].toLowerCase()}, ${dataBR(data)}`;
  return (
    <>
      <div className="b-barra-acoes">
        <label className="b-campo"><span className="rotulo">Horários de</span><input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} /></label>
        <p className="b-suave">{dados.automatico ? 'O e-mail da véspera sai sozinho quando a bancada é aberta.' : 'Lembrete automático desligado em Ajustes.'}{dados.ultimoEnvio ? ` Último envio: ${dataBR(dados.ultimoEnvio)} ${hora(dados.ultimoEnvio.slice(11, 16))}.` : ''}</p>
        <BotaoAcao className="botao botao--cheio botao--p" disabled={!comEmail.length} acao={async () => {
          try { const r = await chamar('enviarLembretes', { data }); setDados(r); setAviso(`${plural(r.enviados, 'e-mail enviado', 'e-mails enviados')}.`); } catch (e) { setAviso(e.message); }
        }}>Enviar {plural(comEmail.length, 'e-mail', 'e-mails')} agora</BotaoAcao>
      </div>
      {aviso && <p className="aviso">{aviso}</p>}
      {dados.lista.length === 0 ? <Vazio titulo={`Nada marcado para ${dia}`} forma="presenca" /> : (
        <ul className="lb-lista">
          {dados.lista.map((x) => (
            <li key={x.tipo + x.id} className={x.enviado ? 'lb lb--ok' : 'lb'}>
              <span className="lb__hora">{hora(x.hora)}</span>
              <span className="lb__quem"><strong>{x.nome}</strong><small>{x.titulo}{x.com ? ` · ${x.com}` : ''}</small></span>
              <span className="lb__status">
                {x.enviado ? <Tag tom="ok">{x.enviado.split(' ')[0]}</Tag> : x.temEmail ? <Tag tom="aviso">e-mail pendente</Tag> : <Tag>sem e-mail</Tag>}
              </span>
              {x.whatsapp && (
                <a className="link-acao com-icone" href={linkWhats(x.whatsapp, x.texto)} target="_blank" rel="noreferrer"
                  onClick={() => chamar('marcarLembrete', { id: x.id, tipo: x.tipo }).then(() => setDados((d) => ({ ...d, lista: d.lista.map((y) => (y.id === x.id ? { ...y, enviado: 'WhatsApp' } : y)) }))).catch(() => {})}>
                  <IconeWhatsapp tamanho={14} /> WhatsApp
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
