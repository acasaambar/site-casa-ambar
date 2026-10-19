import { useEffect, useState } from 'react';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Abas, Modal, BotaoAcao, Vazio, Tag, real, dataBR, hora, hojeIso, linkWhats, primeiro, DIAS_LONGOS } from './ui.jsx';
import { IconeWhatsapp } from '../components/Marca.jsx';

export default function Grade() {
  const { membro } = useBancada();
  const admin = pode(membro, 'admin');
  const [aba, setAba] = useState('bloqueios');
  const itens = [['bloqueios', 'Feriados e bloqueios']];
  if (admin) itens.push(['grade', 'Grade semanal'], ['planos', 'Planos e preços']);
  return (
    <>
      <Cabecalho rotulo="Grade e planos" titulo="Como a semana funciona" />
      <Abas atual={aba} aoMudar={setAba} itens={itens} />
      {aba === 'bloqueios' && <Bloqueios />}
      {aba === 'grade' && admin && <GradeSemanal />}
      {aba === 'planos' && admin && <Planos />}
    </>
  );
}

function Bloqueios() {
  const { chamar } = useBancada();
  const { dados, erro, carregando, recarregar } = useDados('bloqueios', {});
  const [f, setF] = useState({ data: hojeIso(), modalidade: '', hora: '', motivo: '' });
  const [afetados, setAfetados] = useState(null);
  const [erroForm, setErroForm] = useState('');
  return (
    <div className="b-duas b-duas--larga">
      <section className="b-cartao">
        <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Bloquear dia ou aula</h2></header>
        <div className="b-form">
          <p className="b-suave">A aula some da agenda do site. Quem já tinha reservado é cancelado e aparece aqui para você avisar.</p>
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
      </section>
      <section className="b-cartao">
        <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Próximos bloqueios</h2></header>
        <Erro>{erro}</Erro>
        {carregando && !dados && <Carregando />}
        {dados && dados.length === 0 && <p className="b-suave">Nenhum bloqueio marcado.</p>}
        <ul className="b-lista-simples">
          {(dados || []).map((b) => (
            <li key={b.linha}>
              <div>
                <strong>{dataBR(b.data)} · {b.hora ? hora(b.hora) : 'dia todo'} · {b.modalidade || 'todas'}</strong>
                <span className="b-suave">{b.motivo}</span>
              </div>
              <BotaoAcao className="link-sair" confirmar="Liberar de novo? As aulas voltam para a agenda (as reservas canceladas não voltam)." acao={async () => { await chamar('desbloquear', { linha: b.linha }); recarregar(); }}>liberar</BotaoAcao>
            </li>
          ))}
        </ul>
      </section>
      {afetados && (
        <Modal rotulo="Bloqueio feito" titulo={afetados.length ? `Avise ${afetados.length} aluno${afetados.length > 1 ? 's' : ''}` : 'Nenhuma reserva afetada'} aoFechar={() => setAfetados(null)}>
          {afetados.length === 0 ? <p>Ninguém tinha reservado nesse período.</p> : (
            <ul className="b-contatos">
              {afetados.map((a, i) => (
                <li key={i}>
                  <div><strong>{a.nome}</strong><span className="b-suave">{a.aula}</span></div>
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
  if (carregando && !linhas) return <Carregando />;
  if (!linhas) return <Erro>{erro}</Erro>;
  const mudar = (k, campo, v) => setLinhas((ls) => ls.map((l) => (l._k === k ? { ...l, [campo]: v } : l)));
  const ordenadas = [...linhas].sort((a, b) => ((a.dia + 6) % 7) - ((b.dia + 6) % 7) || a.hora.localeCompare(b.hora) || a.modalidade.localeCompare(b.modalidade));
  return (
    <>
      <p className="b-suave">Cada linha é uma aula que se repete toda semana. As mudanças valem para as próximas aulas; reservas já feitas continuam.</p>
      <div className="b-tabela-caixa">
        <table className="b-tabela b-tabela--edicao">
          <thead><tr><th>Dia</th><th>Horário</th><th>Modalidade</th><th>Professora</th><th className="num">Vagas</th><th>Ativa</th><th /></tr></thead>
          <tbody>
            {ordenadas.map((l) => (
              <tr key={l._k} className={l.ativo ? '' : 'inativa'}>
                <td data-rotulo="Dia"><select value={l.dia} onChange={(e) => mudar(l._k, 'dia', Number(e.target.value))}>{DIAS_LONGOS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></td>
                <td data-rotulo="Horário"><input type="time" value={l.hora} onChange={(e) => mudar(l._k, 'hora', e.target.value)} /></td>
                <td data-rotulo="Modalidade"><select value={l.modalidade} onChange={(e) => mudar(l._k, 'modalidade', e.target.value)}><option>Yoga</option><option>Pilates</option></select></td>
                <td data-rotulo="Professora"><input value={l.professor} onChange={(e) => mudar(l._k, 'professor', e.target.value)} /></td>
                <td data-rotulo="Vagas" className="num"><input type="number" min={1} max={30} value={l.capacidade} onChange={(e) => mudar(l._k, 'capacidade', Number(e.target.value))} /></td>
                <td data-rotulo="Ativa"><input type="checkbox" checked={l.ativo} onChange={(e) => mudar(l._k, 'ativo', e.target.checked)} aria-label="Aula ativa" /></td>
                <td><button type="button" className="link-sair" onClick={() => setLinhas((ls) => ls.filter((x) => x._k !== l._k))}>remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="b-botoes">
        <button type="button" className="botao botao--linha botao--p" onClick={() => setLinhas((ls) => [...ls, { _k: Date.now(), dia: 1, hora: '07:00', modalidade: 'Yoga', professor: '', capacidade: 12, ativo: true }])}>+ Adicionar horário</button>
        <BotaoAcao className="botao botao--cheio botao--p" acao={async () => {
          setAviso(''); setErroS('');
          try { await chamar('salvarGrade', { linhas }); setAviso('Grade salva. O site já mostra os novos horários.'); } catch (e) { setErroS(e.message); }
        }}>Salvar grade</BotaoAcao>
      </div>
      {aviso && <p className="aviso">{aviso}</p>}
      <Erro>{erroS}</Erro>
    </>
  );
}

function Planos() {
  const { dados, erro, carregando, recarregar } = useDados('planos', {});
  const [editar, setEditar] = useState(null);
  if (carregando && !dados) return <Carregando />;
  return (
    <>
      <div className="b-barra-acoes">
        <p className="b-suave">É este catálogo que aparece em Meu plano no site e na venda do balcão.</p>
        <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ modalidade: 'Yoga', tipo: 'mensal', ativo: true })}>+ Novo plano</button>
      </div>
      <Erro>{erro}</Erro>
      {dados && dados.length === 0 && <Vazio titulo="Catálogo vazio" />}
      {['Yoga', 'Pilates'].map((m) => (
        <section key={m} className="b-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">{m}</h2></header>
          <ul className="b-lista-simples">
            {(dados || []).filter((p) => p.modalidade === m).map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.nome}</strong>
                  <span className="b-suave">{p.tipo} · {p.aulasSemana ? `${p.aulasSemana}x por semana` : `${p.aulasTotal} aula`} · {p.validadeDias} dias · até {p.semJurosAte}x sem juros</span>
                </div>
                <span className="b-reserva__tags">
                  <strong>{real(p.preco)}</strong>
                  {!p.ativo && <Tag tom="apagado">fora do site</Tag>}
                  <button type="button" className="link-acao" onClick={() => setEditar(p)}>editar</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
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
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Modalidade</span><select {...campo('modalidade')}><option>Yoga</option><option>Pilates</option></select></label>
          <label className="b-campo"><span className="rotulo">Tipo</span><select {...campo('tipo')}><option value="avulsa">Aula avulsa</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option></select></label>
        </div>
        <label className="b-campo"><span className="rotulo">Nome que aparece no site</span><input {...campo('nome')} placeholder={`${f.modalidade} · 2x na semana`} /></label>
        {novo && <label className="b-campo"><span className="rotulo">Código interno</span><input {...campo('id')} placeholder={`${f.modalidade.toLowerCase()}-${f.tipo}-2x`} /></label>}
        <div className="b-linha3">
          <label className="b-campo"><span className="rotulo">Preço (R$)</span><input inputMode="decimal" {...campo('preco', true)} /></label>
          {f.tipo === 'avulsa'
            ? <label className="b-campo"><span className="rotulo">Aulas</span><input type="number" min={1} {...campo('aulasTotal')} /></label>
            : <label className="b-campo"><span className="rotulo">Aulas por semana</span><input type="number" min={1} max={7} {...campo('aulasSemana')} /></label>}
          <label className="b-campo"><span className="rotulo">Validade (dias)</span><input type="number" min={1} {...campo('validadeDias')} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Parcelas sem juros (site)</span><select {...campo('semJurosAte')}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Descrição curta</span><input {...campo('descricao')} /></label>
        </div>
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Mostrar no site</label>
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
