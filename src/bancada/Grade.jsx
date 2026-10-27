import { useEffect, useState } from 'react';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Esqueleto, Erro, Cabecalho, Abas, Modal, BotaoAcao, Vazio, Tag, Aviso, Secao, real, dataBR, hora, hojeIso, linkWhats, primeiro, plural, MESES, DIAS_LONGOS } from './ui.jsx';
import { IconeWhatsapp } from '../components/Marca.jsx';
import { CatalogoServicos, Profissionais } from './Servicos.jsx';
import { Interruptor, BlocoForm, Barra } from './CatalogoPecas.jsx';
import './css/catalogo.css';

export default function Grade() {
  const { membro } = useBancada();
  const admin = pode(membro, 'admin');
  // a administração começa no que mais usa; a recepção só vê feriados e bloqueios
  const [aba, setAba] = useState(admin ? 'servicos' : 'bloqueios');
  const itens = [['bloqueios', 'Feriados e bloqueios']];
  if (admin) itens.push(['grade', 'Grade de aulas'], ['planos', 'Planos de aula'], ['servicos', 'Serviços e pacotes'], ['profissionais', 'Profissionais']);
  return (
    <>
      <Cabecalho titulo="Catálogo" ajuda="O que mudar aqui vale na hora para o site e para a bancada.">Aulas, serviços, preços e quem atende</Cabecalho>
      <Abas atual={aba} aoMudar={setAba} itens={itens} />
      {aba === 'bloqueios' && <Bloqueios />}
      {aba === 'grade' && admin && <GradeSemanal />}
      {aba === 'planos' && admin && <Planos />}
      {aba === 'servicos' && admin && <CatalogoServicos />}
      {aba === 'profissionais' && admin && <Profissionais />}
    </>
  );
}

// "2026-10-27" -> { dia: '27', mes: 'out' } (cartãozinho de data nas listas)
const diaMes = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(String(iso)) ? { dia: String(iso).slice(8, 10), mes: MESES[Number(String(iso).slice(5, 7)) - 1] } : { dia: '·', mes: '' });
const NOVA_AULA = () => ({ _k: Date.now(), dia: 1, hora: '07:00', modalidade: 'Yoga', professor: '', capacidade: 12, ativo: true });

function Bloqueios() {
  const { chamar } = useBancada();
  const { dados, erro, carregando, recarregar } = useDados('bloqueios', {});
  const [f, setF] = useState({ data: hojeIso(), modalidade: '', hora: '', motivo: '' });
  const [afetados, setAfetados] = useState(null);
  const [erroForm, setErroForm] = useState('');
  return (
    <div className="b-duas b-duas--larga cg-duas">
      <section className="b-cartao">
        <Secao titulo="Bloquear dia ou aula" ajuda="A aula some da agenda do site. Quem já tinha reservado é cancelado e aparece aqui para você avisar.">
          <div className="b-form">
            <div className="b-linha2">
              <label className="b-campo"><span className="rotulo">Data</span><input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
              <label className="b-campo"><span className="rotulo">Modalidade</span>
                <select value={f.modalidade} onChange={(e) => setF({ ...f, modalidade: e.target.value })}><option value="">Todas (dia inteiro)</option><option>Yoga</option><option>Pilates</option></select></label>
            </div>
            <div className="b-linha2">
              <label className="b-campo"><span className="rotulo">Horário (opcional)</span><input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} /></label>
              <label className="b-campo"><span className="rotulo">Motivo</span><input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ex.: feriado" /></label>
            </div>
            <Erro>{erroForm}</Erro>
            <BotaoAcao className="botao botao--cheio" confirmar="Bloquear? Reservas nesse período serão canceladas." acao={async () => {
              setErroForm('');
              try { const r = await chamar('bloquear', f); setAfetados(r.afetados); recarregar(); } catch (e) { setErroForm(e.message); }
            }}>Bloquear</BotaoAcao>
          </div>
        </Secao>
      </section>
      <section className="b-cartao">
        <Secao titulo="Próximos bloqueios" acoes={dados && dados.length > 0 ? <Tag tom="neutro">{dados.length}</Tag> : null}>
          <Erro>{erro}</Erro>
          {carregando && !dados && <Esqueleto linhas={3} altura={48} />}
          {dados && dados.length === 0 && <Vazio titulo="Nenhum bloqueio marcado">Feriados e folgas bloqueados aparecem aqui.</Vazio>}
          {dados && dados.length > 0 && (
            <ul className="cg-lista">
              {dados.map((b) => {
                const d = diaMes(b.data);
                return (
                  <li key={b.linha} className="cg-linha">
                    <span className="cg-data" aria-hidden="true"><strong>{d.dia}</strong><small>{d.mes}</small></span>
                    <div className="cg-linha__corpo">
                      <strong className="cg-linha__titulo">{b.hora ? hora(b.hora) : 'Dia todo'} · {b.modalidade || 'Todas as modalidades'}</strong>
                      <span className="b-meta"><span>{dataBR(b.data)}</span>{b.motivo && <span>{b.motivo}</span>}</span>
                    </div>
                    <BotaoAcao className="botao botao--fantasma botao--p" confirmar="Liberar de novo? As aulas voltam para a agenda (as reservas canceladas não voltam)." acao={async () => { await chamar('desbloquear', { linha: b.linha, data: b.data, hora: b.hora, modalidade: b.modalidade }); recarregar(); }}>Liberar</BotaoAcao>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>
      </section>
      {afetados && (
        <Modal rotulo="Bloqueio feito" titulo={afetados.length ? `Avise ${afetados.length} aluno${afetados.length > 1 ? 's' : ''}` : 'Nenhuma reserva afetada'} aoFechar={() => setAfetados(null)}>
          {afetados.length === 0 ? <p>Ninguém tinha reservado nesse período.</p> : (
            <ul className="cg-lista">
              {afetados.map((a, i) => (
                <li key={i} className="cg-linha">
                  <div className="cg-linha__corpo"><strong className="cg-linha__titulo">{a.nome}</strong><span className="b-suave">{a.aula}</span></div>
                  {a.whatsapp && <a className="botao botao--linha botao--p com-icone" target="_blank" rel="noreferrer"
                    href={linkWhats(a.whatsapp, `Olá, ${primeiro(a.nome)}! A aula de ${a.aula} do dia ${dataBR(f.data)} na Casa Âmbar foi cancelada${f.motivo ? ' (' + f.motivo + ')' : ''}. Sua aula não foi descontada. Quer remarcar?`)}>
                    <IconeWhatsapp tamanho={14} /> Avisar</a>}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function GradeSemanal() {
  const { chamar } = useBancada();
  const { dados, erro, carregando } = useDados('grade', {});
  const [linhas, setLinhas] = useState(null);
  const [aviso, setAviso] = useState('');
  const [erroS, setErroS] = useState('');
  useEffect(() => { if (dados) setLinhas(dados.map((l, i) => ({ ...l, _k: i }))); }, [dados]);
  if (carregando && !linhas) return <Esqueleto linhas={5} altura={52} />;
  if (!linhas) return <Erro>{erro}</Erro>;
  const mudar = (k, campo, v) => setLinhas((ls) => ls.map((l) => (l._k === k ? { ...l, [campo]: v } : l)));
  const ordenadas = [...linhas].sort((a, b) => ((a.dia + 6) % 7) - ((b.dia + 6) % 7) || a.hora.localeCompare(b.hora) || a.modalidade.localeCompare(b.modalidade));
  // um bloco por dia da semana, de segunda a domingo
  const dias = [];
  ordenadas.forEach((l) => {
    const ult = dias[dias.length - 1];
    if (ult && ult.dia === l.dia) ult.aulas.push(l); else dias.push({ dia: l.dia, aulas: [l] });
  });
  const ativas = linhas.filter((l) => l.ativo).length;
  return (
    <>
      <Barra resumo={`${plural(ativas, 'aula ativa', 'aulas ativas')} por semana`} titulo="Grade de aulas" ajuda="Cada linha é uma aula que se repete toda semana. As mudanças valem para as próximas aulas; reservas já feitas continuam.">
        <button type="button" className="botao botao--linha botao--p" onClick={() => setLinhas((ls) => [...ls, NOVA_AULA()])}>+ Adicionar horário</button>
      </Barra>
      {linhas.length === 0 && <Vazio titulo="Nenhuma aula na grade" acao={<button type="button" className="botao botao--cheio botao--p" onClick={() => setLinhas([NOVA_AULA()])}>+ Adicionar horário</button>} />}
      <div className="cg-grade">
        {dias.length > 0 && (
          <div className="cg-aula-cab" aria-hidden="true"><span>Dia</span><span>Horário</span><span>Modalidade</span><span>Profissional</span><span>Vagas</span><span>Situação</span><span /></div>
        )}
        {dias.map(({ dia, aulas }) => (
          <section key={dia} className="cg-dia">
            <h3 className="cg-dia__titulo">{DIAS_LONGOS[dia]}<span>{plural(aulas.filter((l) => l.ativo).length, 'aula', 'aulas')}</span></h3>
            <div className="b-itens">
              {aulas.map((l) => (
                <div key={l._k} className={`cg-aula cg-aula--${l.modalidade === 'Pilates' ? 'pilates' : 'yoga'}${l.ativo ? '' : ' cg-aula--off'}`}>
                  <label className="cg-f cg-f--dia"><span>Dia</span>
                    <select value={l.dia} onChange={(e) => mudar(l._k, 'dia', Number(e.target.value))}>{DIAS_LONGOS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></label>
                  <label className="cg-f cg-f--hora"><span>Horário</span>
                    <input type="time" value={l.hora} onChange={(e) => mudar(l._k, 'hora', e.target.value)} /></label>
                  <label className="cg-f cg-f--mod"><span>Modalidade</span>
                    <select value={l.modalidade} onChange={(e) => mudar(l._k, 'modalidade', e.target.value)}><option>Yoga</option><option>Pilates</option></select></label>
                  <label className="cg-f cg-f--prof"><span>Profissional</span>
                    <input value={l.professor} onChange={(e) => mudar(l._k, 'professor', e.target.value)} /></label>
                  <label className="cg-f cg-f--vagas"><span>Vagas</span>
                    <input type="number" min={1} max={30} value={l.capacidade} onChange={(e) => mudar(l._k, 'capacidade', Number(e.target.value))} /></label>
                  <Interruptor className="cg-f--ativa" checked={l.ativo} onChange={(e) => mudar(l._k, 'ativo', e.target.checked)} aria-label="Aula ativa">Ativa</Interruptor>
                  <button type="button" className="botao botao--fantasma botao--p cg-perigo cg-f--remover" onClick={() => setLinhas((ls) => ls.filter((x) => x._k !== l._k))}>Remover</button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="b-salvar-fixo cg-salvar">
        <div className="cg-salvar__msg">
          {aviso && <Aviso tom="ok">{aviso}</Aviso>}
          <Erro>{erroS}</Erro>
        </div>
        <BotaoAcao className="botao botao--cheio botao--p" acao={async () => {
          setAviso(''); setErroS('');
          try { await chamar('salvarGrade', { linhas }); setAviso('Grade salva. O site já mostra os novos horários.'); } catch (e) { setErroS(e.message); }
        }}>Salvar grade</BotaoAcao>
      </div>
    </>
  );
}

function Planos() {
  const { dados, erro, carregando, recarregar } = useDados('planos', {});
  const [editar, setEditar] = useState(null);
  if (carregando && !dados) return <Esqueleto linhas={5} altura={52} />;
  const novo = () => setEditar({ modalidade: 'Yoga', tipo: 'mensal', ativo: true });
  return (
    <>
      <Barra resumo={dados ? plural(dados.length, 'plano', 'planos') : null} titulo="Planos de aula" ajuda="É este catálogo que aparece em Meu plano no site e na venda do balcão.">
        <button type="button" className="botao botao--cheio botao--p" onClick={novo}>+ Novo plano</button>
      </Barra>
      <Erro>{erro}</Erro>
      {dados && dados.length === 0 && <Vazio titulo="Catálogo vazio" acao={<button type="button" className="botao botao--cheio botao--p" onClick={novo}>+ Novo plano</button>} />}
      <div className="cg-planos">
        {['Yoga', 'Pilates'].map((m) => {
          const lista = (dados || []).filter((p) => p.modalidade === m);
          if (!lista.length) return null;
          return (
            <Secao key={m} titulo={m} acoes={<span className="b-suave">{plural(lista.length, 'plano', 'planos')}</span>}>
              <div className="b-itens">
                {lista.map((p) => (
                  <div key={p.id} className={`b-item cg-plano${p.ativo ? '' : ' cg-inativo'}`}>
                    <div className="b-item__corpo">
                      <span className="b-item__titulo">{p.nome}</span>
                      <span className="b-meta">
                        <span>{p.tipo}</span>
                        <span>{p.aulasSemana ? `${p.aulasSemana}x por semana` : plural(p.aulasTotal, 'aula', 'aulas')}</span>
                        <span>{plural(p.validadeDias, 'dia', 'dias')}</span>
                        <span>até {p.semJurosAte}x sem juros</span>
                      </span>
                    </div>
                    <div className="b-item__lado">
                      {!p.ativo && <Tag tom="apagado">fora do site</Tag>}
                      <strong className="cg-preco">{real(p.preco)}</strong>
                      <button type="button" className="botao botao--fantasma botao--p" aria-label={`Editar ${p.nome}`} onClick={() => setEditar(p)}>Editar</button>
                    </div>
                  </div>
                ))}
              </div>
            </Secao>
          );
        })}
      </div>
      {editar && <EditarPlano p={editar} aoFechar={() => setEditar(null)} aoSalvar={() => { setEditar(null); recarregar(); }} />}
    </>
  );
}

function EditarPlano({ p, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const novo = !p.id;
  const [f, setF] = useState({ id: p.id || '', nome: p.nome || '', modalidade: p.modalidade, tipo: p.tipo, aulasSemana: p.aulasSemana || 2, aulasTotal: p.aulasTotal || 1,
    validadeDias: p.validadeDias || 30, preco: p.preco || '', descricao: p.descricao || '', semJurosAte: p.semJurosAte || (p.tipo === 'trimestral' ? 3 : 1), ativo: p.ativo !== false });
  const [erro, setErro] = useState('');
  const campo = (k, num) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: num ? e.target.value.replace(/[^\d,.]/g, '') : e.target.value }) });
  return (
    <Modal rotulo={f.modalidade} titulo={novo ? 'Novo plano' : f.nome} aoFechar={aoFechar} largo>
      <div className="b-form">
        <BlocoForm titulo="Plano">
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Modalidade</span><select {...campo('modalidade')}><option>Yoga</option><option>Pilates</option></select></label>
            <label className="b-campo"><span className="rotulo">Tipo</span><select {...campo('tipo')}><option value="avulsa">Aula avulsa</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option></select></label>
          </div>
          <label className="b-campo"><span className="rotulo">Nome que aparece no site</span><input {...campo('nome')} placeholder={`${f.modalidade} · 2x na semana`} /></label>
          {novo && <label className="b-campo"><span className="rotulo">Código interno</span><input {...campo('id')} placeholder={`${f.modalidade.toLowerCase()}-${f.tipo}-2x`} /></label>}
          <label className="b-campo"><span className="rotulo">Descrição curta</span><input {...campo('descricao')} /></label>
        </BlocoForm>
        <BlocoForm titulo="Valor e regras">
          <div className="b-linha3">
            <label className="b-campo"><span className="rotulo">Preço (R$)</span><input inputMode="decimal" {...campo('preco', true)} /></label>
            {f.tipo === 'avulsa'
              ? <label className="b-campo"><span className="rotulo">Aulas</span><input type="number" min={1} {...campo('aulasTotal')} /></label>
              : <label className="b-campo"><span className="rotulo">Aulas por semana</span><input type="number" min={1} max={7} {...campo('aulasSemana')} /></label>}
            <label className="b-campo"><span className="rotulo">Validade (dias)</span><input type="number" min={1} {...campo('validadeDias')} /></label>
          </div>
          <label className="b-campo"><span className="rotulo">Parcelas sem juros (site)</span><select {...campo('semJurosAte')}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
        </BlocoForm>
        <Interruptor checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })}>Mostrar no site</Interruptor>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try {
            await chamar('salvarPlano', { plano: { ...f, id: f.id || `${f.modalidade}-${f.tipo}-${f.tipo === 'avulsa' ? f.aulasTotal : f.aulasSemana + 'x'}`, preco: Number(String(f.preco).replace(',', '.')), aulasSemana: Number(f.aulasSemana), aulasTotal: Number(f.aulasTotal), validadeDias: Number(f.validadeDias), semJurosAte: Number(f.semJurosAte) } });
            aoSalvar();
          } catch (e) { setErro(e.message); }
        }}>Salvar plano</BotaoAcao>
      </div>
    </Modal>
  );
}
