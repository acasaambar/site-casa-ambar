import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import AreaNav from '../components/AreaNav.jsx';
import { Forma, IconeWhatsapp, Sol } from '../components/Marca.jsx';
import { Carregando } from './Aulas.jsx';
import { CONFIG, AVISO_RENOVAR_DIAS, condicaoPagamento, semJuros } from '../config.js';
import { dataDeIso, MESES } from '../lib/util.js';

const real = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const realCurto = (v) => {
  const n = Number(v || 0);
  return Number.isInteger(n) ? `R$ ${n.toLocaleString('pt-BR')}` : real(n);
};
const dataCurta = (iso) => {
  if (!iso) return '';
  const d = iso.length > 10 ? new Date(iso.replace(' ', 'T')) : dataDeIso(iso);
  return isNaN(d) ? iso : `${d.getDate()} ${MESES[d.getMonth()]}`;
};
const diasAte = (iso) => Math.round((dataDeIso(iso) - new Date(new Date().toDateString())) / 86400000);

const MODALIDADES = {
  Yoga: { cor: 'yoga', detalhe: '12 tapetes · com Ana Paula e Hanna', forma: 'equilibrio' },
  Pilates: { cor: 'pilates', detalhe: '4 aparelhos · com Kalliny e Sara', forma: 'presenca' },
};

export default function MeuPlano() {
  const { token, expirou } = useAuth();
  const nav = useNavigate();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [modalidade, setModalidade] = useState('Yoga');
  const [escolhido, setEscolhido] = useState(null);
  const [indo, setIndo] = useState(false);

  const carregar = useCallback(
    () =>
      api.meuPlano(token).then(setDados).catch((e) => {
        if (/sessão/i.test(e.message)) {
          expirou();
          nav('/entrar', { state: { de: '/meu-plano' } });
        } else setErro(e.message);
      }),
    [token, expirou, nav]
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function irParaPagamento() {
    setErro('');
    setIndo(true);
    try {
      const pg = await api.comprar(token, escolhido.id);
      window.location.href = pg.link;
    } catch (e) {
      setErro(e.message);
      setIndo(false);
      setEscolhido(null);
    }
  }

  const catalogo = dados?.catalogo || [];
  const ativos = (dados?.creditos || []).filter((c) => c.tipo !== 'avulsa' || c.restantes > 0);
  const daModalidade = catalogo.filter((p) => p.modalidade === modalidade);
  const avulsa = daModalidade.find((p) => p.tipo === 'avulsa');
  const frequencias = [...new Set(daModalidade.filter((p) => p.tipo !== 'avulsa').map((p) => p.aulasSemana))].sort((a, b) => a - b);
  const plano = (tipo, freq) => daModalidade.find((p) => p.tipo === tipo && p.aulasSemana === freq);

  const estorno = (p) =>
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(
      `Olá! Gostaria de cancelar/solicitar estorno do pagamento ${p.orderNsu} (${p.descricao}, ${real(p.valor)}).`
    )}`;

  return (
    <main className="app">
      <div className="app__topo">
        <div className="largura">
          <span className="rotulo-espacado cor-caramelo">Área do aluno</span>
          <h1 className="display-m">Meu plano</h1>
          <p className="app__sub">Sua prática no seu ritmo. Escolha uma aula avulsa ou um plano e reserve quando quiser.</p>
        </div>
      </div>
      <AreaNav />

      <div className="largura app__corpo plano">
        {erro && <p className="erro erro--destaque" role="alert">{erro}</p>}
        {!dados && !erro && <Carregando />}

        {dados && (
          <>
            {/* ---------- PLANO ATIVO ---------- */}
            <section className="plano__secao">
              <h2 className="titulo-secao"><Sol tamanho={14} /> Seu plano agora</h2>
              {ativos.length === 0 ? (
                <div className="boas-vindas">
                  <div className="boas-vindas__texto">
                    <span className="rotulo-espacado">Comece sua prática</span>
                    <p className="display-p">Você ainda não tem um plano ativo</p>
                    <p>Experimente com uma aula avulsa ou garanta sua frequência com um plano mensal ou trimestral.</p>
                  </div>
                  <div className="boas-vindas__formas" aria-hidden="true">
                    <Forma nome="presenca" tamanho={58} cor="var(--creme)" />
                    <Forma nome="equilibrio" tamanho={58} cor="var(--caramelo)" />
                    <Forma nome="sutileza" tamanho={58} cor="var(--creme)" />
                  </div>
                </div>
              ) : (
                <>
                  <ul className="creditos">
                    {ativos.map((c) => {
                      const faltam = diasAte(c.fim);
                      const renovar = c.tipo !== 'avulsa' && faltam <= AVISO_RENOVAR_DIAS;
                      const p = catalogo.find((x) => x.id === c.planoId);
                      return (
                        <li key={c.id} className={`credito credito--${String(c.modalidade).toLowerCase()}`}>
                          <Sol tamanho={70} className="credito__sol" />
                          <div className="credito__topo">
                            <span className="rotulo">{c.modalidade}</span>
                            <span className="credito__validade">até {dataCurta(c.fim)}</span>
                          </div>
                          <strong className="credito__nome">{c.descricao.replace(/^(Yoga|Pilates) · /, '')}</strong>
                          <div className="credito__uso" role="img" aria-label={`${c.usadas} de ${c.limite} aulas usadas`}>
                            {[...Array(c.limite)].map((_, i) => <i key={i} className={i < c.usadas ? 'usada' : ''} />)}
                          </div>
                          <p className="credito__texto">
                            {c.aulasSemana > 0
                              ? `Esta semana: ${c.usadas} de ${c.limite} aulas`
                              : `${c.restantes} ${c.restantes === 1 ? 'aula disponível' : 'aulas disponíveis'}`}
                          </p>
                          {renovar && p && (
                            <div className="credito__renovar">
                              <span>{faltam <= 0 ? 'Vence hoje' : `Vence em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}</span>
                              <button type="button" className="botao botao--ambar botao--pequeno" onClick={() => setEscolhido(p)}>
                                Renovar
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <Link to="/aulas" className="botao botao--cheio plano__reservar">Reservar uma aula</Link>
                </>
              )}
            </section>

            {/* ---------- CARDÁPIO DE PLANOS ---------- */}
            <section className="plano__secao">
              <h2 className="titulo-secao"><Sol tamanho={14} /> Planos e aulas</h2>

              <div className="modalidades" role="tablist" aria-label="Modalidade">
                {Object.entries(MODALIDADES).map(([nome, m]) => (
                  <button
                    key={nome}
                    type="button"
                    role="tab"
                    aria-selected={modalidade === nome}
                    className={`modalidade modalidade--${m.cor}`}
                    onClick={() => setModalidade(nome)}
                  >
                    <Forma nome={m.forma} tamanho={44} cor="currentColor" />
                    <span className="modalidade__nome">{nome}</span>
                    <span className="modalidade__det">{m.detalhe}</span>
                    <span className="modalidade__marca" aria-hidden="true">✓</span>
                  </button>
                ))}
              </div>

              {daModalidade.length === 0 ? (
                <div className="plano__vazio">
                  <p>Os planos estão sendo atualizados. Para comprar agora, fale com a recepção pelo WhatsApp {CONFIG.telefone}.</p>
                </div>
              ) : (
                <div className={`cardapio cardapio--${MODALIDADES[modalidade].cor}`}>
                  <header className="cardapio__cabeca">
                    <span className="rotulo-espacado">Casa Âmbar</span>
                    <h3 className="display-m">{modalidade}</h3>
                    <p className="script">harmonia em estado natural</p>
                  </header>

                  {avulsa && (
                    <div className="cardapio__avulsa">
                      <div>
                        <strong className="cardapio__item">Aula avulsa</strong>
                        <span className="cardapio__nota">Válida por {avulsa.validadeDias} dias · ideal para experimentar</span>
                      </div>
                      <span className="cardapio__pontos" aria-hidden="true" />
                      <button type="button" className="preco" onClick={() => setEscolhido(avulsa)}>
                        {realCurto(avulsa.preco)}
                      </button>
                    </div>
                  )}

                  <div className="cardapio__tabela" role="table" aria-label={`Planos de ${modalidade}`}>
                    <div className="cardapio__linha cardapio__linha--cabeca" role="row">
                      <span role="columnheader">Frequência</span>
                      <span role="columnheader">Mensal<small>30 dias</small></span>
                      <span role="columnheader">Trimestral<small>3 meses · até 3x sem juros</small></span>
                    </div>
                    {frequencias.map((f) => {
                      const m = plano('mensal', f);
                      const t = plano('trimestral', f);
                      return (
                        <div key={f} className="cardapio__linha" role="row">
                          <span role="rowheader" className="cardapio__item">{f}x na semana</span>
                          <span role="cell" className="cardapio__celula" data-rotulo="Mensal">
                            {m ? (
                              <button type="button" className="preco" onClick={() => setEscolhido(m)}>{realCurto(m.preco)}</button>
                            ) : <span className="cardapio__traco">—</span>}
                          </span>
                          <span role="cell" className="cardapio__celula" data-rotulo="Trimestral">
                            {t ? (
                              <button type="button" className="preco preco--destaque" onClick={() => setEscolhido(t)}>
                                {realCurto(t.preco / 3)}<small>/mês</small>
                              </button>
                            ) : <span className="cardapio__traco">—</span>}
                            {t && m && t.preco / 3 < m.preco && (
                              <span className="cardapio__economia">economize {realCurto(m.preco * 3 - t.preco)}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <footer className="cardapio__rodape">
                    <Sol tamanho={16} />
                    <span>Toque no valor para escolher · Avulsa e mensal: 1x sem juros · Trimestral: até 3x sem juros · Todos em até 12x com juros</span>
                  </footer>
                </div>
              )}
            </section>

            {/* ---------- PAGAMENTOS ---------- */}
            <section className="plano__secao">
              <h2 className="titulo-secao"><Sol tamanho={14} /> Meus pagamentos</h2>
              {dados.pagamentos.length === 0 ? (
                <p className="plano__nada">Seus pagamentos aparecem aqui, com o comprovante.</p>
              ) : (
                <ul className="pagamentos">
                  {dados.pagamentos.map((p) => (
                    <li key={p.orderNsu} className="pagamento">
                      <div className="pagamento__info">
                        <strong>{p.descricao}</strong>
                        <span>
                          {dataCurta(p.pagoEm || p.criadoEm)}
                          {p.metodo ? ` · ${p.metodo}` : ''}
                          {Number(p.parcelas) > 1 ? ` em ${p.parcelas}x` : ''}
                        </span>
                      </div>
                      <span className="pagamento__valor">{real(p.valor)}</span>
                      <span className={`status status--${p.status}`}>{p.status === 'pago' ? 'Pago' : p.status === 'pendente' ? 'Pendente' : p.status}</span>
                      <div className="pagamento__acoes">
                        {p.status === 'pendente' && p.link && <a className="link-acao" href={p.link}>Pagar agora</a>}
                        {p.recibo && <a className="link-acao" href={p.recibo} target="_blank" rel="noreferrer">Comprovante</a>}
                        {p.status === 'pago' && <a className="link-acao link-acao--suave" href={estorno(p)} target="_blank" rel="noreferrer">Cancelar ou pedir estorno</a>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside className="plano__ajuda">
              <IconeWhatsapp tamanho={22} />
              <p>
                <strong>Cancelamentos e estornos</strong> são feitos com a nossa recepção.{' '}
                <a href={`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Olá! Preciso de ajuda com meu plano na Casa Âmbar.')}`} target="_blank" rel="noreferrer">
                  Fale no WhatsApp {CONFIG.telefone}
                </a>
                .
              </p>
            </aside>
          </>
        )}
      </div>

      {/* ---------- CONFIRMAÇÃO ANTES DE PAGAR ---------- */}
      {escolhido && (
        <div className="confirmado" role="dialog" aria-modal="true" aria-labelledby="compra-titulo" onClick={(e) => e.target === e.currentTarget && !indo && setEscolhido(null)}>
          <div className="confirmado__caixa compra">
            <Sol tamanho={44} className="cor-caramelo" />
            <span className="rotulo-espacado cor-terracota">{escolhido.modalidade}</span>
            <h2 id="compra-titulo" className="display-m">{escolhido.nome.replace(/^(Yoga|Pilates) · /, '').replace(' · trimestral', '')}</h2>
            <ul className="compra__resumo">
              <li>
                <span>Tipo</span>
                <strong>{escolhido.tipo === 'avulsa' ? 'Aula avulsa' : escolhido.tipo === 'mensal' ? 'Plano mensal' : 'Plano trimestral'}</strong>
              </li>
              <li>
                <span>Aulas</span>
                <strong>{escolhido.aulasSemana > 0 ? `até ${escolhido.aulasSemana} por semana` : '1 aula'}</strong>
              </li>
              <li>
                <span>Validade</span>
                <strong>{escolhido.validadeDias} dias a partir do pagamento</strong>
              </li>
              <li className="compra__total">
                <span>Total</span>
                <strong>{real(escolhido.preco)}</strong>
              </li>
              <li className="compra__condicao">
                <span>Pagamento</span>
                <strong>
                  {condicaoPagamento(escolhido)}
                  {semJuros(escolhido) > 1 && <em> · {semJuros(escolhido)}x de {real(escolhido.preco / semJuros(escolhido))}</em>}
                </strong>
              </li>
            </ul>
            <button type="button" className="botao botao--cheio compra__ir" disabled={indo} onClick={irParaPagamento}>
              {indo ? 'Abrindo pagamento…' : 'Ir para o pagamento'}
            </button>
            <ol className="compra__passos">
              <li>Você vai para a página segura da InfinitePay.</li>
              <li>Escolha Pix ou cartão e conclua o pagamento.</li>
              <li>Toque em <strong>Continuar</strong> para voltar à Casa Âmbar.</li>
            </ol>
            <button type="button" className="link-sair" disabled={indo} onClick={() => setEscolhido(null)}>Voltar</button>
          </div>
        </div>
      )}
    </main>
  );
}
