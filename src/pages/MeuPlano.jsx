import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import AreaNav from '../components/AreaNav.jsx';
import { Forma, IconeWhatsapp } from '../components/Marca.jsx';
import { Carregando } from './Aulas.jsx';
import { CONFIG, AVISO_RENOVAR_DIAS } from '../config.js';
import { dataDeIso, MESES } from '../lib/util.js';

const real = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataCurta = (iso) => {
  if (!iso) return '';
  const d = iso.length > 10 ? new Date(iso.replace(' ', 'T')) : dataDeIso(iso);
  return isNaN(d) ? iso : `${d.getDate()} ${MESES[d.getMonth()]}`;
};
const diasAte = (iso) => Math.round((dataDeIso(iso) - new Date(new Date().toDateString())) / 86400000);

const TIPOS = [
  ['avulsa', 'Aula avulsa', 'Para experimentar ou para semanas diferentes.'],
  ['mensal', 'Plano mensal', 'Sua frequência garantida por 30 dias.'],
  ['trimestral', 'Plano trimestral', 'O melhor valor por aula, por 3 meses.'],
];

export default function MeuPlano() {
  const { token, expirou } = useAuth();
  const nav = useNavigate();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [modalidade, setModalidade] = useState('Yoga');
  const [comprando, setComprando] = useState('');

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

  async function comprar(plano) {
    setErro('');
    setComprando(plano.id);
    try {
      const pg = await api.comprar(token, plano.id);
      window.location.href = pg.link;
    } catch (e) {
      setErro(e.message);
      setComprando('');
    }
  }

  // aulas avulsas já usadas saem da lista; planos aparecem até vencer
  const ativos = (dados?.creditos || []).filter((c) => c.tipo !== 'avulsa' || c.restantes > 0);

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
              <h2 className="rotulo-espacado">Seu plano agora</h2>
              {ativos.length === 0 ? (
                <div className="plano__vazio">
                  <Forma nome="equilibrio" tamanho={56} cor="var(--caramelo)" />
                  <p>Você ainda não tem plano ativo. Escolha abaixo uma aula avulsa ou um plano.</p>
                </div>
              ) : (
                <ul className="creditos">
                  {ativos.map((c) => {
                    const faltam = diasAte(c.fim);
                    const renovar = c.tipo !== 'avulsa' && faltam <= AVISO_RENOVAR_DIAS;
                    const plano = dados.catalogo.find((p) => p.id === c.planoId);
                    return (
                      <li key={c.id} className={`credito credito--${String(c.modalidade).toLowerCase()}`}>
                        <div className="credito__topo">
                          <span className="rotulo">{c.modalidade}</span>
                          <span className="credito__validade">válido até {dataCurta(c.fim)}</span>
                        </div>
                        <strong className="credito__nome">{c.descricao}</strong>
                        <div className="credito__uso" role="img" aria-label={`${c.usadas} de ${c.limite} aulas usadas`}>
                          {[...Array(c.limite)].map((_, i) => <i key={i} className={i < c.usadas ? 'usada' : ''} />)}
                        </div>
                        <p className="credito__texto">
                          {c.aulasSemana > 0
                            ? `Esta semana: ${c.usadas} de ${c.limite} aulas reservadas`
                            : `${c.restantes} ${c.restantes === 1 ? 'aula disponível' : 'aulas disponíveis'}`}
                        </p>
                        {renovar && (
                          <div className="credito__renovar">
                            <span>{faltam <= 0 ? 'Vence hoje' : `Vence em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}</span>
                            {plano && (
                              <button type="button" className="botao botao--ambar botao--pequeno" disabled={!!comprando} onClick={() => comprar(plano)}>
                                {comprando === plano.id ? 'Abrindo…' : `Renovar · ${real(plano.preco)}`}
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {ativos.length > 0 && (
                <Link to="/aulas" className="botao botao--cheio plano__reservar">Reservar uma aula</Link>
              )}
            </section>

            {/* ---------- COMPRAR ---------- */}
            <section className="plano__secao">
              <div className="plano__cabeca">
                <h2 className="rotulo-espacado">Planos e aulas</h2>
                <div className="filtros" role="tablist" aria-label="Modalidade">
                  {['Yoga', 'Pilates'].map((m) => (
                    <button key={m} type="button" role="tab" aria-pressed={modalidade === m} onClick={() => setModalidade(m)}>{m}</button>
                  ))}
                </div>
              </div>

              {TIPOS.map(([tipo, titulo, sub]) => {
                const itens = dados.catalogo.filter((p) => p.modalidade === modalidade && p.tipo === tipo);
                if (!itens.length) return null;
                return (
                  <div key={tipo} className="catalogo">
                    <div className="catalogo__titulo">
                      <h3 className="display-p">{titulo}</h3>
                      <p>{sub}</p>
                    </div>
                    <ul className="catalogo__lista">
                      {itens.map((p) => {
                        const freq = p.aulasSemana > 0 ? `${p.aulasSemana}x na semana` : '1 aula';
                        return (
                          <li key={p.id} className={`oferta ${tipo === 'trimestral' ? 'oferta--destaque' : ''}`}>
                            {tipo === 'trimestral' && <span className="oferta__selo">melhor valor</span>}
                            <span className="oferta__freq">{freq}</span>
                            <strong className="oferta__preco">{real(p.preco)}</strong>
                            <span className="oferta__det">
                              {tipo === 'mensal' && 'por 30 dias'}
                              {tipo === 'trimestral' && `em até 3x de ${real(p.preco / 3)} no cartão`}
                              {tipo === 'avulsa' && `válida por ${p.validadeDias} dias`}
                            </span>
                            <button type="button" className="botao botao--cheio botao--pequeno" disabled={!!comprando} onClick={() => comprar(p)}>
                              {comprando === p.id ? 'Abrindo…' : 'Comprar'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              <p className="plano__formas">Pagamento seguro pela InfinitePay · Pix ou cartão de crédito.</p>
            </section>

            {/* ---------- PAGAMENTOS ---------- */}
            <section className="plano__secao">
              <h2 className="rotulo-espacado">Meus pagamentos</h2>
              {dados.pagamentos.length === 0 ? (
                <p className="plano__nada">Nenhum pagamento ainda.</p>
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
    </main>
  );
}
