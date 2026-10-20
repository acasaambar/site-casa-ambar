import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Tag, Modal, BotaoAcao, Vazio, Abas, real, dataBR, linkWhats, baixarCSV, cpfFmt } from './ui.jsx';
import { Sol, Forma, IconeWhatsapp, Logo } from '../components/Marca.jsx';
import { mascaraTelefone, soDigitos } from '../lib/util.js';
import { ComandaModal } from './Comandas.jsx';

const TOM_VALE = { ativo: 'ok', resgatado: 'apagado', usado: 'apagado', cancelado: 'alerta', vencido: 'aviso' };

export default function Vales() {
  const local = useLocation();
  const { membro } = useBancada();
  const [aba, setAba] = useState('vales');
  return (
    <>
      <Cabecalho titulo="Vales e cupons">
        Vale-presente é sempre vendido: entra como item da comanda e o código nasce quando ela é paga. Cupom é desconto no pagamento.
      </Cabecalho>
      <Abas atual={aba} aoMudar={setAba} itens={[['vales', 'Vales-presente'], ['cupons', 'Cupons de desconto']]} />
      {aba === 'vales' ? <ListaVales abrirNovo={!!local.state?.novo} /> : <Cupons podeEditar={pode(membro, 'admin')} />}
    </>
  );
}

export function ListaVales({ abrirNovo }) {
  const [novo, setNovo] = useState(abrirNovo);
  const [entregar, setEntregar] = useState(null);
  const [filtro, setFiltro] = useState('ativo');
  const [busca, setBusca] = useState('');
  const { dados, erro, carregando, recarregar } = useDados('vales', {});
  const lista = useMemo(() => (dados || []).filter((v) => {
    if (filtro !== 'todos' && v.status !== filtro && !(filtro === 'usado' && v.status === 'resgatado')) return false;
    const q = busca.trim().toLowerCase();
    return !q || [v.codigo, v.nome, v.campanha, v.motivo, v.email].some((x) => String(x || '').toLowerCase().includes(q));
  }), [dados, filtro, busca]);

  return (
    <>
      <div className="b-barra-acoes">
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, nome ou quem comprou" aria-label="Buscar vale" />
        <button type="button" className="botao botao--linha botao--p" disabled={!lista.length} onClick={() => baixarCSV('vales-presente', [
          ['codigo', 'Código'], ['descricao', 'Presente'], ['nome', 'Para'], [(v) => cpfFmt(v.cpf), 'CPF'], ['email', 'E-mail'], ['whatsapp', 'WhatsApp'],
          ['motivo', 'Motivo'], ['campanha', 'Campanha'], ['status', 'Situação'], [(v) => (v.saldo == null ? '' : String(v.saldo).replace('.', ',')), 'Saldo'],
          [(v) => dataBR(v.validade), 'Validade'], ['enviado', 'Entregue'], [(v) => dataBR(v.criadoEm), 'Criado em'], ['criadoPor', 'Criado por']], lista)}>Exportar CSV</button>
        <button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo(true)}>Vender vale-presente</button>
      </div>
      <div className="b-filtros">
        {[['ativo', 'Ativos'], ['usado', 'Usados'], ['vencido', 'Vencidos'], ['cancelado', 'Cancelados'], ['todos', 'Todos']].map(([id, t]) => (
          <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(id)}>{t}</button>
        ))}
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && lista.length === 0 && <Vazio titulo="Nenhum vale aqui" forma="presenca">Venda um vale-presente pela comanda: o código aparece aqui quando ela é paga.</Vazio>}
      <ul className="b-vales">
        {lista.map((v) => (
          <li key={v.codigo} className={`b-vale b-vale--${v.status}`}>
            <div className="b-vale__cod">
              <span className="rotulo">{v.motivo || 'Vale-presente'}{v.campanha ? ' · ' + v.campanha : ''}</span>
              <strong>{v.codigo}</strong>
              <span>{v.descricao}{v.saldo != null && v.status === 'ativo' && v.saldo < v.valor ? ` · saldo ${real(v.saldo)}` : ''}</span>
            </div>
            <div className="b-vale__para">
              <strong>{v.nome || 'Sem nome (qualquer pessoa)'}</strong>
              <span className="b-suave">válido até {dataBR(v.validade)}{v.enviado ? ' · entregue por ' + v.enviado.split(' ')[0] : ' · ainda não entregue'}</span>
            </div>
            <Tag tom={TOM_VALE[v.status] || 'neutro'}>{v.status}</Tag>
            {v.status === 'ativo' && <button type="button" className="botao botao--linha botao--p" onClick={() => setEntregar(v)}>Entregar</button>}
          </li>
        ))}
      </ul>
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
      <div className="b-entregar">
        <button type="button" className="botao botao--linha botao--p" onClick={copiar}>Copiar código</button>
        <button type="button" className="botao botao--linha botao--p" onClick={() => window.print()}>Imprimir</button>
      </div>
      <div className="b-linha2 b-entregar__canais">
        <div className="b-form">
          <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" value={whats} onChange={(e) => setWhats(mascaraTelefone(e.target.value))} /></label>
          <a className={`botao botao--cheio botao--p com-icone${soDigitos(whats).length < 10 ? ' desativado' : ''}`} href={soDigitos(whats).length >= 10 ? linkWhats(whats, v.textoWhats) : undefined}
            target="_blank" rel="noreferrer" onClick={() => chamar('enviarVale', { codigo: v.codigo, canal: 'whatsapp' }).catch(() => {})}>
            <IconeWhatsapp tamanho={15} /> Enviar no WhatsApp
          </a>
        </div>
        <div className="b-form">
          <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <BotaoAcao className="botao botao--cheio botao--p" disabled={!email.includes('@')} acao={async () => {
            setErro(''); setAviso('');
            try { await chamar('enviarVale', { codigo: v.codigo, canal: 'email', email }); setAviso('E-mail enviado para ' + email + '.'); } catch (e) { setErro(e.message); }
          }}>Enviar por e-mail</BotaoAcao>
        </div>
      </div>
      <BotaoAcao className="link-acao" acao={async () => { await chamar('enviarVale', { codigo: v.codigo, canal: 'balcao' }); setAviso('Marcado como entregue no balcão.'); }}>
        Entreguei no balcão
      </BotaoAcao>
      {aviso && <p className="aviso">{aviso}</p>}
      <Erro>{erro}</Erro>
      <div className="b-separador" />
      <BotaoAcao className="link-sair" confirmar="Cancelar este vale? O código deixa de funcionar." acao={async () => { await chamar('cancelarVale', { codigo: v.codigo }); aoFechar(); }}>
        cancelar este vale
      </BotaoAcao>
    </Modal>
  );
}

export function Cupons({ podeEditar }) {
  const { dados, erro, carregando, recarregar } = useDados('cupons', {});
  const [editar, setEditar] = useState(null);
  return (
    <>
      <div className="b-barra-acoes">
        <p className="b-suave">O aluno digita o cupom no pagamento do site; a recepção também pode aplicar na venda do balcão.</p>
        {podeEditar && <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({})}>Novo cupom</button>}
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && dados.length === 0 && <Vazio titulo="Nenhum cupom ainda" forma="equilibrio">Crie um cupom para campanhas, parcerias ou primeira aula.</Vazio>}
      {dados && dados.length > 0 && (
        <div className="b-tabela-caixa">
          <table className="b-tabela">
            <thead><tr><th>Cupom</th><th>Desconto</th><th>Vale para</th><th>Período</th><th className="num">Usos</th><th className="num">Desconto dado</th><th /></tr></thead>
            <tbody>
              {dados.map((c) => (
                <tr key={c.codigo}>
                  <td data-rotulo="Cupom"><code className="b-cupom">{c.codigo}</code>{c.descricao && <span className="b-suave b-bloco">{c.descricao}</span>}</td>
                  <td data-rotulo="Desconto">{c.tipo === 'percentual' ? `${c.valor}%` : real(c.valor)}</td>
                  <td data-rotulo="Vale para">{c.modalidade === 'Todas' ? 'Tudo' : c.modalidade === 'Serviço' ? 'Serviços' : c.modalidade} · {c.tipoPlano === 'todos' ? 'todos os planos' : c.tipoPlano}{c.primeiraCompra ? ' · 1ª compra' : ''}</td>
                  <td data-rotulo="Período">{c.inicio || c.fim ? `${c.inicio ? dataBR(c.inicio) : '…'} a ${c.fim ? dataBR(c.fim) : '…'}` : 'sem prazo'}</td>
                  <td data-rotulo="Usos" className="num">{c.usos}{c.limiteTotal ? `/${c.limiteTotal}` : ''}</td>
                  <td data-rotulo="Desconto dado" className="num">{real(c.descontoTotal)}</td>
                  <td>
                    <span className="b-reserva__tags">
                      <Tag tom={!c.ativo ? 'apagado' : c.vencido ? 'aviso' : 'ok'}>{!c.ativo ? 'pausado' : c.vencido ? 'vencido' : 'ativo'}</Tag>
                      {podeEditar && <button type="button" className="link-acao" onClick={() => setEditar(c)}>editar</button>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
