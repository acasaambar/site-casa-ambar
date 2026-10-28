import { useMemo, useState } from 'react';
import './css/vendas.css';
import { useBancada } from './sessao.jsx';
import { useDados, Esqueleto, Erro, Tag, Modal, BotaoAcao, Vazio, Aviso, Secao, Kpi, real, realCurto, dataBR, linkWhats, baixarCSV, cpfFmt } from './ui.jsx';
import { Sol, Forma, IconeWhatsapp, Logo } from '../components/Marca.jsx';
import { mascaraTelefone, soDigitos } from '../lib/util.js';
import { ComandaModal } from './Comandas.jsx';

const TOM_VALE = { ativo: 'ok', resgatado: 'apagado', usado: 'apagado', cancelado: 'alerta', vencido: 'aviso' };

const NOME_VALE = { ativo: 'ativo', resgatado: 'usado', usado: 'usado', cancelado: 'cancelado', vencido: 'vencido' };
const FILTROS_VALE = [['ativo', 'Ativos'], ['usado', 'Usados'], ['vencido', 'Vencidos'], ['cancelado', 'Cancelados'], ['todos', 'Todos']];
const passaVale = (v, filtro) => filtro === 'todos' || v.status === filtro || (filtro === 'usado' && v.status === 'resgatado');

const IconePresente = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
  </svg>
);

export function ListaVales({ abrirNovo }) {
  const [novo, setNovo] = useState(abrirNovo);
  const [entregar, setEntregar] = useState(null);
  const [filtro, setFiltro] = useState('ativo');
  const [busca, setBusca] = useState('');
  const { dados, erro, carregando, recarregar } = useDados('vales', {});
  const lista = useMemo(() => (dados || []).filter((v) => {
    if (!passaVale(v, filtro)) return false;
    const q = busca.trim().toLowerCase();
    return !q || [v.codigo, v.nome, v.campanha, v.motivo, v.email].some((x) => String(x || '').toLowerCase().includes(q));
  }), [dados, filtro, busca]);
  const contagem = useMemo(() => Object.fromEntries(FILTROS_VALE.map(([id]) => [id, (dados || []).filter((v) => passaVale(v, id)).length])), [dados]);
  const ativos = (dados || []).filter((v) => v.status === 'ativo');
  const aberto = ativos.reduce((s, v) => s + Number(v.saldo ?? v.valor ?? 0), 0);
  const naoEntregues = ativos.filter((v) => !v.enviado).length;

  return (
    <>
      {dados && (
        <section className="b-kpis">
          <Kpi rotulo="Vales ativos" valor={ativos.length} detalhe="dentro da validade" />
          <Kpi rotulo="Valor a usar" valor={Math.abs(aberto) >= 100000 ? realCurto(aberto) : real(aberto)} detalhe="saldo dos vales ativos" />
          <Kpi rotulo="Ainda não entregues" valor={naoEntregues} tom={naoEntregues ? 'aviso' : ''} detalhe="ativos sem entrega" />
        </section>
      )}
      <div className="b-barra-acoes vl-barra">
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, nome ou quem comprou" aria-label="Buscar vale" />
        <button type="button" className="botao botao--linha botao--p" disabled={!lista.length} onClick={() => baixarCSV('vales-presente', [
          ['codigo', 'Código'], ['descricao', 'Presente'], ['nome', 'Para'], [(v) => cpfFmt(v.cpf), 'CPF'], ['email', 'E-mail'], ['whatsapp', 'WhatsApp'],
          ['motivo', 'Motivo'], ['campanha', 'Campanha'], ['status', 'Situação'], [(v) => (v.saldo == null ? '' : String(v.saldo).replace('.', ',')), 'Saldo'],
          [(v) => dataBR(v.validade), 'Validade'], ['enviado', 'Entregue'], [(v) => dataBR(v.criadoEm), 'Criado em'], ['criadoPor', 'Criado por']], lista)}>Exportar CSV</button>
        <button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo(true)}>Vender vale-presente</button>
      </div>
      <div className="b-barra-fixa vn-barra">
        <div className="b-filtros vn-chips" role="group" aria-label="Filtrar vales">
          {FILTROS_VALE.map(([id, t]) => (
            <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(id)}>{t}{dados && contagem[id] > 0 && <span>{contagem[id]}</span>}</button>
          ))}
        </div>
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Esqueleto linhas={4} altura={64} />}
      {dados && lista.length === 0 && (
        <Vazio titulo="Nenhum vale aqui" forma="presenca" acao={<button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo(true)}>Vender vale-presente</button>}>
          O código aparece aqui quando a comanda com o vale é paga.
        </Vazio>
      )}
      {lista.length > 0 && (
        <ul className="vl-lista">
          {lista.map((v) => (
            <li key={v.codigo} className={`vl-vale vl-vale--${v.status}`}>
              <span className="b-icone-chip vl-vale__icone"><IconePresente /></span>
              <div className="vl-vale__cod">
                <span className="vl-vale__motivo">{v.motivo || 'Vale-presente'}{v.campanha ? ' · ' + v.campanha : ''}</span>
                <strong>{v.codigo}</strong>
                <span className="vl-vale__desc">{v.descricao}{v.saldo != null && v.status === 'ativo' && v.saldo < v.valor ? ` · saldo ${real(v.saldo)}` : ''}</span>
              </div>
              <div className="vl-vale__para">
                <strong>{v.nome || 'Sem nome (qualquer pessoa)'}</strong>
                <span className="b-meta"><span>válido até {dataBR(v.validade)}</span><span>{v.enviado ? 'entregue por ' + v.enviado.split(' ')[0] : 'ainda não entregue'}</span></span>
              </div>
              <div className="vl-vale__lado">
                <Tag tom={TOM_VALE[v.status] || 'neutro'}>{NOME_VALE[v.status] || v.status}</Tag>
                {v.status === 'ativo' && <button type="button" className="botao botao--linha botao--p" onClick={() => setEntregar(v)}>Entregar</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {novo && <ComandaModal inicial={{ vale: true }} aoFechar={() => { setNovo(false); recarregar(); }} />}
      {entregar && <Entregar v={entregar} aoFechar={() => { setEntregar(null); recarregar(); }} />}
    </>
  );
}

// Entregar: copiar, WhatsApp, e-mail, imprimir ou aplicar na conta
function Entregar({ v, aoFechar }) {
  const { chamar } = useBancada();
  const [email, setEmail] = useState(v.email || '');
  const [whats, setWhats] = useState(mascaraTelefone(v.whatsapp || ''));
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const copiar = async () => {
    try { await navigator.clipboard.writeText(v.codigo); setAviso('Código copiado.'); } catch { setAviso('Copie o código: ' + v.codigo); }
  };
  return (
    <Modal rotulo={v.motivo || 'Vale-presente'} titulo="Entregar vale" aoFechar={aoFechar} largo>
      <div className="b-vale-cartao" id="vale-impressao">
        <div className="b-vale-cartao__topo">
          <Logo variante="creme" largura={80} />
          <Sol tamanho={26} className="b-vale-cartao__sol" />
        </div>
        <span className="rotulo">Vale-presente{v.nome ? ' para ' + v.nome.split(' ')[0] : ''}</span>
        <strong className="b-vale-cartao__presente">{v.descricao}</strong>
        {v.mensagem && <p className="b-vale-cartao__msg">“{v.mensagem}”</p>}
        <code className="b-vale-cartao__codigo">{v.codigo}</code>
        <span className="b-vale-cartao__val">válido até {dataBR(v.validade)} · use em acasambar.com.br → Meu plano</span>
        <Forma nome="sutileza" tamanho={110} cor="rgba(233,221,197,0.08)" className="b-vale-cartao__forma" />
      </div>
      <div className="b-entregar vl-entregar">
        <button type="button" className="botao botao--linha botao--p" onClick={copiar}>Copiar código</button>
        <button type="button" className="botao botao--linha botao--p" onClick={() => window.print()}>Imprimir</button>
        <BotaoAcao className="botao botao--fantasma botao--p" acao={async () => { await chamar('enviarVale', { codigo: v.codigo, canal: 'balcao' }); setAviso('Marcado como entregue no balcão.'); }}>
          Entreguei no balcão
        </BotaoAcao>
      </div>
      {aviso && <Aviso tom="ok">{aviso}</Aviso>}
      <Erro>{erro}</Erro>
      <div className="vl-canais b-entregar__canais">
        <div className="vl-canal">
          <h3 className="vl-canal__titulo">WhatsApp</h3>
          <label className="b-campo"><span className="rotulo">Número</span><input inputMode="numeric" value={whats} onChange={(e) => setWhats(mascaraTelefone(e.target.value))} /></label>
          <a className={`botao botao--cheio botao--p com-icone${soDigitos(whats).length < 10 ? ' desativado' : ''}`} href={soDigitos(whats).length >= 10 ? linkWhats(whats, v.textoWhats) : undefined}
            target="_blank" rel="noreferrer" onClick={() => chamar('enviarVale', { codigo: v.codigo, canal: 'whatsapp' }).catch(() => {})}>
            <IconeWhatsapp tamanho={15} /> Enviar no WhatsApp
          </a>
        </div>
        <div className="vl-canal">
          <h3 className="vl-canal__titulo">E-mail</h3>
          <label className="b-campo"><span className="rotulo">Endereço</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <BotaoAcao className="botao botao--cheio botao--p" disabled={!email.includes('@')} acao={async () => {
            setErro(''); setAviso('');
            try { await chamar('enviarVale', { codigo: v.codigo, canal: 'email', email }); setAviso('E-mail enviado para ' + email + '.'); } catch (e) { setErro(e.message); }
          }}>Enviar por e-mail</BotaoAcao>
        </div>
      </div>
      <div className="b-separador" />
      <BotaoAcao className="botao botao--fantasma botao--p vl-cancelar" confirmar="Cancelar este vale? O código deixa de funcionar." acao={async () => { await chamar('cancelarVale', { codigo: v.codigo }); aoFechar(); }}>
        Cancelar este vale
      </BotaoAcao>
    </Modal>
  );
}

const DESCONTO_CUPOM = (c) => (c.tipo === 'percentual' ? `${String(c.valor).replace('.', ',')}%` : real(c.valor));

export function Cupons({ podeEditar }) {
  const { dados, erro, carregando, recarregar } = useDados('cupons', {});
  const [editar, setEditar] = useState(null);
  const novo = () => setEditar({});
  return (
    <>
      <Secao titulo="Cupons de desconto" ajuda="Quem compra digita o cupom no pagamento do site; a recepção também pode aplicar na venda do balcão." acoes={podeEditar && <button type="button" className="botao botao--cheio botao--p" onClick={novo}>Novo cupom</button>}>
        <Erro>{erro}</Erro>
        {carregando && !dados && <Esqueleto linhas={3} altura={64} />}
        {dados && dados.length === 0 && (
          <Vazio titulo="Nenhum cupom ainda" forma="equilibrio" acao={podeEditar && <button type="button" className="botao botao--cheio botao--p" onClick={novo}>Novo cupom</button>}>
            Crie um cupom para campanhas, parcerias ou primeira aula.
          </Vazio>
        )}
        {dados && dados.length > 0 && (
          <ul className="vl-lista">
            {dados.map((c) => {
              const estado = !c.ativo ? 'pausado' : c.vencido ? 'vencido' : 'ativo';
              return (
                <li key={c.codigo} className={`cq-cupom${estado === 'ativo' ? '' : ' cq-cupom--apagado'}`}>
                  <div className="cq-cupom__cod">
                    <code className="b-cupom">{c.codigo}</code>
                    {c.descricao && <span className="b-suave">{c.descricao}</span>}
                  </div>
                  <div className="cq-cupom__desconto"><strong>{DESCONTO_CUPOM(c)}</strong><small>de desconto</small></div>
                  <div className="cq-cupom__regras">
                    <span className="cq-etiquetas">
                      <Tag>{c.modalidade === 'Todas' ? 'Tudo' : c.modalidade === 'Serviço' ? 'Serviços' : c.modalidade}</Tag>
                      <Tag>{c.tipoPlano === 'todos' ? 'todos os planos' : c.tipoPlano}</Tag>
                      {c.primeiraCompra && <Tag tom="aviso">1ª compra</Tag>}
                    </span>
                    <span className="b-meta"><span>{c.inicio || c.fim ? `${c.inicio ? dataBR(c.inicio) : '…'} a ${c.fim ? dataBR(c.fim) : '…'}` : 'sem prazo'}</span></span>
                  </div>
                  <div className="cq-cupom__uso">
                    <span><strong>{c.usos}{c.limiteTotal ? `/${c.limiteTotal}` : ''}</strong> {Number(c.usos) === 1 && !c.limiteTotal ? 'uso' : 'usos'}</span>
                    <small>{real(c.descontoTotal)} em descontos</small>
                  </div>
                  <div className="vl-vale__lado">
                    <Tag tom={estado === 'ativo' ? 'ok' : estado === 'vencido' ? 'aviso' : 'apagado'}>{estado}</Tag>
                    {podeEditar && <button type="button" className="botao botao--fantasma botao--p" onClick={() => setEditar(c)}>Editar</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Secao>
      {editar && <EditarCupom c={editar} aoFechar={() => setEditar(null)} aoSalvar={() => { setEditar(null); recarregar(); }} />}
    </>
  );
}

function EditarCupom({ c, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const novo = !c.codigo;
  const [f, setF] = useState({ codigo: c.codigo || '', tipo: c.tipo || 'percentual', valor: c.valor || '', modalidade: c.modalidade || 'Todas', tipoPlano: c.tipoPlano || 'todos',
    inicio: c.inicio || '', fim: c.fim || '', limiteTotal: c.limiteTotal || '', limitePorAluno: c.limitePorAluno || 1, primeiraCompra: !!c.primeiraCompra,
    descricao: c.descricao || '', ativo: c.ativo !== false });
  const [erro, setErro] = useState('');
  const campo = (k, t) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: t ? t(e.target.value) : e.target.value })) });
  return (
    <Modal rotulo="Cupom de desconto" titulo={novo ? 'Novo cupom' : c.codigo} aoFechar={aoFechar} largo>
      <div className="b-form">
        {novo && <label className="b-campo"><span className="rotulo">Código</span><input {...campo('codigo', (v) => v.toUpperCase().replace(/\s/g, ''))} placeholder="Ex.: BEMVINDA10" /></label>}
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Tipo</span>
            <select {...campo('tipo')}><option value="percentual">Porcentagem (%)</option><option value="valor">Valor fixo (R$)</option></select></label>
          <label className="b-campo"><span className="rotulo">{f.tipo === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}</span><input inputMode="decimal" {...campo('valor', (v) => v.replace(/[^\d,.]/g, ''))} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Modalidade</span>
            <select {...campo('modalidade')}><option value="Todas">Tudo</option><option>Yoga</option><option>Pilates</option><option value="Serviço">Serviços de estética e fisio</option></select></label>
          <label className="b-campo"><span className="rotulo">Planos</span>
            <select {...campo('tipoPlano')}><option value="todos">Todos</option><option value="avulsa">Só aula avulsa</option><option value="mensal">Só mensal</option><option value="trimestral">Só trimestral</option><option value="servico">Só serviço avulso</option><option value="pacote">Só pacotes de serviço</option></select></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Começa em</span><input type="date" {...campo('inicio')} /></label>
          <label className="b-campo"><span className="rotulo">Termina em</span><input type="date" {...campo('fim')} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Limite de usos (total)</span><input type="number" min={0} {...campo('limiteTotal')} placeholder="sem limite" /></label>
          <label className="b-campo"><span className="rotulo">Usos por cliente</span><input type="number" min={0} {...campo('limitePorAluno')} placeholder="sem limite" /></label>
        </div>
        <label className="b-campo"><span className="rotulo">Descrição interna</span><input {...campo('descricao')} placeholder="Ex.: parceria com a loja X" /></label>
        <label className="b-check"><input type="checkbox" checked={f.primeiraCompra} onChange={(e) => setF({ ...f, primeiraCompra: e.target.checked })} /> Só para a primeira compra de cada cliente</label>
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Cupom ativo</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { await chamar('salvarCupom', { cupom: { ...f, valor: Number(String(f.valor).replace(',', '.')) } }); aoSalvar(); } catch (e) { setErro(e.message); }
        }}>Salvar cupom</BotaoAcao>
      </div>
    </Modal>
  );
}
