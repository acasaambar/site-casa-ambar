import { useEffect, useMemo, useState } from 'react';
import { useBancada } from './sessao.jsx';
import { useDados, Esqueleto, Erro, Modal, BotaoAcao, Vazio, Tag, Aviso, plural, DIAS, DIAS_LONGOS } from './ui.jsx';
import { Interruptor, BlocoForm, Barra } from './CatalogoPecas.jsx';
import { rolagemSuave } from '../lib/movimento.js';
import './css/grade-aulas.css';

// ============================================================
//  GRADE DE AULAS (Yoga e Pilates): a semana em colunas, cada aula abre numa folha
//  Usada no Catálogo → Grade de aulas e no cadastro de quem dá aula (Catálogo → Profissionais).
// ============================================================

const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // segunda a domingo
const VAGAS_PADRAO = { Yoga: 12, Pilates: 4 };
const MODALIDADES = ['Yoga', 'Pilates'];
// a aula é identificada por dia + horário + modalidade (é assim que o servidor monta o aula_id das reservas)
const chaveAula = (l) => `${l.dia}|${l.hora}|${l.modalidade}`;
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const mesmaPessoa = (a, b) => !!semAcento(a) && semAcento(a) === semAcento(b);
const ordenar = (ls) => [...ls].sort((a, b) => ORDEM.indexOf(a.dia) - ORDEM.indexOf(b.dia) || a.hora.localeCompare(b.hora) || a.modalidade.localeCompare(b.modalidade));
const limpar = (l) => ({ dia: Number(l.dia), hora: l.hora, modalidade: l.modalidade, professor: String(l.professor || '').trim(), capacidade: Number(l.capacidade) || VAGAS_PADRAO[l.modalidade], ativo: l.ativo !== false });
// "na segunda", "no sábado"
const noDia = (d) => `${d === 0 || d === 6 ? 'no' : 'na'} ${DIAS_LONGOS[d].toLowerCase()}`;
const juntar = (l) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`);

// a grade inteira + salvar (o servidor grava a lista toda e devolve a grade como ficou)
export function useGrade() {
  const { chamar } = useBancada();
  const g = useDados('grade', {}, true, Array.isArray);
  const salvar = async (linhas) => {
    const nova = await chamar('salvarGrade', { linhas: linhas.map(limpar) });
    g.setDados(nova);
    return nova;
  };
  return { ...g, salvar };
}

// "4 aulas por semana · seg, qua e sex" (para a lista de profissionais)
export function resumoAulas(linhas, nome) {
  const minhas = (linhas || []).filter((l) => l.ativo && mesmaPessoa(l.professor, nome));
  if (!minhas.length) return '';
  return `${plural(minhas.length, 'aula', 'aulas')} por semana · ${juntar(ORDEM.filter((d) => minhas.some((l) => l.dia === d)).map((d) => DIAS[d]))}`;
}

// quem pode dar aula: quem já está na grade, quem tem valor de aula cadastrado e quem atende serviços
function useProfessores(linhas) {
  const { dados: pag } = useDados('pagamentoAulas', {});
  const { dados: cat } = useDados('catalogoServicos', {});
  return useMemo(() => {
    const mapa = new Map();
    const pos = (n) => { const t = String(n || '').trim(); if (t && !mapa.has(semAcento(t))) mapa.set(semAcento(t), t); };
    (linhas || []).forEach((l) => pos(l.professor));
    (pag?.professoras || []).forEach((p) => pos(p.nome));
    (cat?.profissionais || []).forEach((p) => pos(p.nome));
    return [...mapa.values()].sort((a, b) => a.localeCompare(b));
  }, [linhas, pag, cat]);
}

// depois de salvar: a aula nova ou mudada pisca e a tela rola até ela
function useDestaque() {
  const [destaque, setDestaque] = useState([]);
  useEffect(() => {
    if (!destaque.length) return undefined;
    // espera a tela mostrar o dia da aula (no celular aparece um dia por vez)
    const rolar = setTimeout(() => document.querySelector(`[data-aula="${CSS.escape(destaque[0])}"]`)?.scrollIntoView({ behavior: rolagemSuave(), block: 'center' }), 60);
    const t = setTimeout(() => setDestaque([]), 6000);
    return () => { clearTimeout(rolar); clearTimeout(t); };
  }, [destaque]);
  return [destaque, setDestaque];
}

// ---------- Catálogo → Grade de aulas ----------
export function GradeSemanal() {
  const g = useGrade();
  const linhas = g.dados;
  const professores = useProfessores(linhas);
  const [mod, setMod] = useState('');
  const [quem, setQuem] = useState('');
  const [editar, setEditar] = useState(null);
  const [aviso, setAviso] = useState('');
  const [destaque, setDestaque] = useDestaque();
  if (g.carregando && !linhas) return <Esqueleto linhas={5} altura={52} />;
  if (!linhas) return <Erro>{g.erro}</Erro>;
  const ativas = linhas.filter((l) => l.ativo);
  const pausadas = linhas.length - ativas.length;
  const porMod = MODALIDADES.map((m) => [m, ativas.filter((l) => l.modalidade === m).length]);
  const visiveis = linhas.filter((l) => (!mod || l.modalidade === mod) && (!quem || mesmaPessoa(l.professor, quem)));
  const salvar = async (novas, chaves, msg) => {
    await g.salvar(novas);
    setEditar(null);
    // a aula nova precisa aparecer mesmo com um filtro ligado
    const feitas = novas.filter((l) => chaves.includes(chaveAula(l)));
    if (feitas.some((l) => (mod && l.modalidade !== mod) || (quem && !mesmaPessoa(l.professor, quem)))) { setMod(''); setQuem(''); }
    setAviso(msg);
    setDestaque(chaves);
  };
  const resumo = `${plural(ativas.length, 'aula ativa', 'aulas ativas')} por semana${porMod.filter(([, n]) => n).map(([m, n]) => ` · ${m} ${n}`).join('')}${pausadas ? ` · ${plural(pausadas, 'pausada', 'pausadas')}` : ''}`;
  return (
    <>
      <Barra resumo={resumo} titulo="Grade de aulas" ajuda="Cada aula se repete toda semana. Toque numa aula para mudar horário, quem dá, vagas ou pausar. As mudanças valem para as próximas aulas; reservas já feitas continuam.">
        <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ nova: true, professor: quem, modalidade: mod || 'Yoga' })}>+ Adicionar aula</button>
      </Barra>
      <div className="ga-filtros" role="group" aria-label="Filtrar a grade">
        <div className="ga-chips" role="group" aria-label="Modalidade">
          {[['', 'Todas'], ...MODALIDADES.map((m) => [m, m])].map(([v, t]) => (
            <button key={t} type="button" className={`ga-chip${v ? ` ga-chip--${v.toLowerCase()}` : ''}`} aria-pressed={mod === v} onClick={() => setMod(v)}>{t}</button>
          ))}
        </div>
        <label className="b-campo ga-filtro-quem"><span className="b-so-leitor">Quem dá a aula</span>
          <select value={quem} onChange={(e) => setQuem(e.target.value)}>
            <option value="">Todas as pessoas</option>
            {professores.filter((n) => linhas.some((l) => mesmaPessoa(l.professor, n))).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {(mod || quem) && <button type="button" className="botao botao--fantasma botao--p" onClick={() => { setMod(''); setQuem(''); }}>Limpar filtros</button>}
      </div>
      {aviso && <Aviso tom="ok">{aviso}</Aviso>}
      {linhas.length === 0
        ? <Vazio titulo="Nenhuma aula na grade" acao={<button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ nova: true })}>+ Adicionar aula</button>}>As aulas da grade aparecem no site e na agenda.</Vazio>
        : <SemanaDeAulas linhas={visiveis} destaque={destaque} aoAbrir={(l) => setEditar(l)} aoNovo={(d) => setEditar({ nova: true, dias: [d], professor: quem, modalidade: mod || 'Yoga' })} />}
      {editar && <EditarAula aula={editar} linhas={linhas} professores={professores} aoFechar={() => setEditar(null)} aoSalvar={salvar} />}
    </>
  );
}

// a semana de segunda a domingo, uma coluna por dia (no celular, um dia embaixo do outro)
function SemanaDeAulas({ linhas, destaque, aoAbrir, aoNovo, semProfessor = false }) {
  // no celular, um dia por vez (faixa de segunda a domingo); começa no dia de hoje
  const [sel, setSel] = useState(() => new Date().getDay());
  useEffect(() => { if (destaque[0]) setSel(Number(destaque[0].split('|')[0])); }, [destaque]);
  return (
    <>
    <div className="ga-diascel" role="group" aria-label="Escolher o dia">
      {ORDEM.map((d) => (
        <button key={d} type="button" className="ga-chip ga-chip--dia" aria-pressed={sel === d} onClick={() => setSel(d)} aria-label={`${DIAS_LONGOS[d]}: ${plural(linhas.filter((l) => l.dia === d && l.ativo).length, 'aula', 'aulas')}`}>
          {DIAS[d]}<small>{linhas.filter((l) => l.dia === d && l.ativo).length}</small>
        </button>
      ))}
    </div>
    <div className="ga-semana">
      {ORDEM.map((d) => {
        const doDia = ordenar(linhas.filter((l) => l.dia === d));
        const n = doDia.filter((l) => l.ativo).length;
        return (
          <section key={d} className={`ga-dia${doDia.length ? '' : ' ga-dia--vazio'}${sel === d ? ' ga-dia--sel' : ''}`} aria-label={DIAS_LONGOS[d]}>
            <header className="ga-dia__topo">
              <h3>{DIAS_LONGOS[d]}</h3>
              <span>{doDia.length ? plural(n, 'aula', 'aulas') : 'sem aulas'}</span>
            </header>
            {doDia.length > 0 && (
              <ul className="ga-aulas">
                {doDia.map((l) => {
                  const k = chaveAula(l);
                  return (
                    <li key={k}>
                      <button type="button" data-aula={k} onClick={() => aoAbrir(l)}
                        className={`ga-aula ga-aula--${l.modalidade.toLowerCase()}${l.ativo ? '' : ' ga-aula--off'}${destaque.includes(k) ? ' ga-aula--nova' : ''}`}
                        aria-label={`${l.modalidade} ${noDia(d)} às ${l.hora}${l.professor ? ` com ${l.professor}` : ''}${l.ativo ? '' : ', pausada'}. Abrir para editar`}>
                        <span className="ga-aula__hora">{l.hora}</span>
                        <span className="ga-aula__mod">{l.modalidade}</span>
                        {!semProfessor && <span className={`ga-aula__prof${l.professor ? '' : ' ga-aula__prof--falta'}`}>{l.professor || 'Falta quem dá a aula'}</span>}
                        <span className="ga-aula__vagas">{plural(l.capacidade, 'vaga', 'vagas')}{l.ativo ? '' : ' · pausada'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" className="ga-dia__mais" onClick={() => aoNovo(d)} aria-label={`Adicionar aula ${noDia(d)}`}>+ Aula</button>
          </section>
        );
      })}
    </div>
    </>
  );
}

// folha de uma aula: nova (pode marcar vários dias de uma vez) ou uma que já existe
// pessoa: quando vem do cadastro de quem dá aula, quem dá a aula já fica escolhido
export function EditarAula({ aula, linhas, professores, pessoa, aoFechar, aoSalvar }) {
  const nova = !!aula.nova;
  const original = nova ? '' : chaveAula(aula);
  const prof0 = pessoa || aula.professor || '';
  const [f, setF] = useState(() => ({
    dias: aula.dias || (aula.dia != null ? [aula.dia] : []),
    hora: aula.hora || '',
    modalidade: aula.modalidade || 'Yoga',
    professor: prof0,
    capacidade: String(aula.capacidade || VAGAS_PADRAO[aula.modalidade || 'Yoga']),
    ativo: aula.ativo !== false,
  }));
  const [vagasMexidas, setVagasMexidas] = useState(!nova);
  const [outra, setOutra] = useState(!!prof0 && !professores.some((n) => mesmaPessoa(n, prof0)));
  const [erro, setErro] = useState('');
  const set = (campo, v) => setF((x) => ({ ...x, [campo]: v }));
  const alternarDia = (d) => setF((x) => ({ ...x, dias: nova ? (x.dias.includes(d) ? x.dias.filter((y) => y !== d) : [...x.dias, d]) : [d] }));
  const mudarModalidade = (m) => setF((x) => ({ ...x, modalidade: m, capacidade: vagasMexidas ? x.capacidade : String(VAGAS_PADRAO[m]) }));
  const resto = linhas.filter((l) => chaveAula(l) !== original);

  async function salvar() {
    setErro('');
    const hora = String(f.hora || '').slice(0, 5);
    const vagas = Number(f.capacidade);
    const professor = f.professor.trim();
    if (!f.dias.length) { setErro('Escolha o dia da aula.'); return; }
    if (!/^\d{2}:\d{2}$/.test(hora)) { setErro('Escolha o horário da aula.'); return; }
    if (!professor) { setErro('Escolha quem dá a aula.'); return; }
    if (!(vagas >= 1 && vagas <= 30)) { setErro('As vagas vão de 1 a 30.'); return; }
    const novas = ordenar(f.dias).map((dia) => ({ dia, hora, modalidade: f.modalidade, professor, capacidade: vagas, ativo: f.ativo }));
    for (const n of novas) {
      if (resto.some((l) => chaveAula(l) === chaveAula(n))) { setErro(`Já existe ${n.modalidade} ${noDia(n.dia)} às ${hora}. Abra essa aula na grade para mudar.`); return; }
      const choque = n.ativo && resto.find((l) => l.ativo && l.dia === n.dia && l.hora === hora && mesmaPessoa(l.professor, professor));
      if (choque) { setErro(`${professor} já dá ${choque.modalidade} ${noDia(n.dia)} às ${hora}.`); return; }
    }
    const quando = juntar(novas.map((n) => DIAS[n.dia]));
    const msg = nova
      ? `${plural(novas.length, 'Aula adicionada', 'Aulas adicionadas')}: ${f.modalidade} ${novas.length > 1 ? `(${quando})` : noDia(novas[0].dia)} às ${hora} com ${professor}. O site já mostra.`
      : `Aula salva: ${f.modalidade} ${noDia(novas[0].dia)} às ${hora} com ${professor}.`;
    try { await aoSalvar([...resto, ...novas], novas.map(chaveAula), msg); } catch (e) { setErro(e.message); }
  }

  return (
    <Modal rotulo={nova ? 'Nova aula' : 'Aula da grade'} titulo={nova ? 'Adicionar aula' : `${aula.modalidade} ${noDia(aula.dia)} às ${aula.hora}`} aoFechar={aoFechar}>
      <div className="b-form">
        <BlocoForm titulo={nova ? 'Em que dias' : 'Dia'} ajuda={nova ? 'Marque mais de um dia para criar a mesma aula em todos eles, no mesmo horário.' : undefined}>
          <div className="ga-dias" role="group" aria-label="Dias da semana">
            {ORDEM.map((d) => (
              <button key={d} type="button" className="ga-chip ga-chip--dia" aria-pressed={f.dias.includes(d)} onClick={() => alternarDia(d)} aria-label={DIAS_LONGOS[d]}>{DIAS[d]}</button>
            ))}
          </div>
        </BlocoForm>
        <BlocoForm titulo="Aula">
          <div className="ga-chips" role="group" aria-label="Modalidade">
            {MODALIDADES.map((m) => <button key={m} type="button" className={`ga-chip ga-chip--${m.toLowerCase()}`} aria-pressed={f.modalidade === m} onClick={() => mudarModalidade(m)}>{m}</button>)}
          </div>
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Horário</span>
              <input type="time" value={f.hora} step={300} onChange={(e) => set('hora', e.target.value)} /></label>
            <label className="b-campo"><span className="rotulo">Vagas</span>
              <input type="number" inputMode="numeric" min={1} max={30} value={f.capacidade} onChange={(e) => { setVagasMexidas(true); set('capacidade', e.target.value.replace(/\D/g, '').slice(0, 2)); }} /></label>
          </div>
          {pessoa
            ? <p className="ga-quem">Quem dá a aula: <strong>{pessoa}</strong></p>
            : (
              <>
                <label className="b-campo"><span className="rotulo">Quem dá a aula</span>
                  <select value={outra ? '__outra' : (professores.find((n) => mesmaPessoa(n, f.professor)) || '')}
                    onChange={(e) => { if (e.target.value === '__outra') { setOutra(true); set('professor', ''); } else { setOutra(false); set('professor', e.target.value); } }}>
                    <option value="">Escolha…</option>
                    {professores.map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value="__outra">Outra pessoa…</option>
                  </select>
                </label>
                {outra && <label className="b-campo"><span className="rotulo">Nome de quem dá a aula</span>
                  <input value={f.professor} onChange={(e) => set('professor', e.target.value)} placeholder="Como aparece na agenda" /></label>}
              </>
            )}
          <Interruptor checked={f.ativo} onChange={(e) => set('ativo', e.target.checked)} detalhe="Desligada, some do site e da agenda (as reservas feitas continuam)">Aula ativa</Interruptor>
        </BlocoForm>
        {!nova && (f.dias[0] !== aula.dia || f.hora !== aula.hora || f.modalidade !== aula.modalidade) && (
          <Aviso tom="aviso">Quem já reservou esta aula continua com a reserva no horário antigo. Avise os alunos sobre a mudança.</Aviso>
        )}
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={salvar}>{nova ? (f.dias.length > 1 ? `Adicionar ${f.dias.length} aulas` : 'Adicionar aula') : 'Salvar aula'}</BotaoAcao>
        {!nova && (
          <BotaoAcao className="botao botao--linha botao--p cg-perigo" confirmar={`Tirar ${aula.modalidade} ${noDia(aula.dia)} às ${aula.hora} da grade?`}
            acao={async () => { setErro(''); try { await aoSalvar(resto, [], `Aula tirada da grade: ${aula.modalidade} ${noDia(aula.dia)} às ${aula.hora}.`); } catch (e) { setErro(e.message); } }}>
            Tirar esta aula da grade
          </BotaoAcao>
        )}
      </div>
    </Modal>
  );
}

// ---------- no cadastro de quem dá aula: os dias e horários dela na grade ----------
export function AulasDaPessoa({ nome, modalidades = [], aoMudar }) {
  const g = useGrade();
  const linhas = g.dados;
  const professores = useProfessores(linhas);
  const [editar, setEditar] = useState(null);
  const [aviso, setAviso] = useState('');
  const [destaque, setDestaque] = useDestaque();
  const minhas = useMemo(() => ordenar((linhas || []).filter((l) => mesmaPessoa(l.professor, nome))), [linhas, nome]);
  if (!nome) return <Aviso tom="info">Escreva o nome acima para montar os dias e horários das aulas.</Aviso>;
  if (g.carregando && !linhas) return <Esqueleto linhas={2} altura={40} />;
  if (!linhas) return <Erro>{g.erro}</Erro>;
  const ativas = minhas.filter((l) => l.ativo);
  const salvar = async (novas, chaves, msg) => {
    const grade = await g.salvar(novas);
    setEditar(null);
    setAviso(msg);
    setDestaque(chaves);
    aoMudar?.(grade.filter((l) => mesmaPessoa(l.professor, nome)));
  };
  return (
    <div className="ga-pessoa">
      <div className="ga-pessoa__dias" aria-label="Dias de aula">
        {ORDEM.map((d) => <span key={d} className={`ga-diazinho${ativas.some((l) => l.dia === d) ? ' ga-diazinho--on' : ''}`} title={DIAS_LONGOS[d]}>{DIAS[d]}</span>)}
        <span className="ga-pessoa__resumo">{ativas.length ? `${plural(ativas.length, 'aula', 'aulas')} por semana` : 'Nenhuma aula na grade ainda'}</span>
      </div>
      {aviso && <Aviso tom="ok">{aviso}</Aviso>}
      {minhas.length > 0 && (
        <ul className="ga-lista">
          {minhas.map((l) => {
            const k = chaveAula(l);
            return (
              <li key={k}>
                <button type="button" data-aula={k} className={`ga-linha ga-aula--${l.modalidade.toLowerCase()}${l.ativo ? '' : ' ga-aula--off'}${destaque.includes(k) ? ' ga-aula--nova' : ''}`} onClick={() => setEditar(l)}>
                  <span className="ga-linha__dia">{DIAS_LONGOS[l.dia]}</span>
                  <span className="ga-linha__hora">{l.hora}</span>
                  <Tag tom={l.modalidade === 'Pilates' ? 'ambar' : 'neutro'}>{l.modalidade}</Tag>
                  <span className="ga-linha__vagas">{plural(l.capacidade, 'vaga', 'vagas')}{l.ativo ? '' : ' · pausada'}</span>
                  <span className="ga-linha__editar" aria-hidden="true">Editar</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className="botao botao--linha botao--p" onClick={() => setEditar({ nova: true, modalidade: modalidades[0] || 'Yoga' })}>+ Adicionar aula</button>
      {editar && <EditarAula aula={editar} linhas={linhas} professores={professores} pessoa={nome} aoFechar={() => setEditar(null)} aoSalvar={salvar} />}
    </div>
  );
}
