import { DIAS_LONGOS, dataBR, hojeIso, hora } from './ui.jsx';

// Horário de cada profissional: por dia da semana (até 3 turnos, ex.: 8h–12h e 14h–18h)
// e datas especiais (um sábado diferente, uma folga). Formato: { "1": [["08:00","12:00"]], ... }

const ORDEM = [1, 2, 3, 4, 5, 6, 0];
const CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TURNO_PADRAO = ['08:00', '18:00'];

// horário com que o formulário abre (cadastro antigo vira turnos)
export function horariosIniciais(p, casa = {}) {
  if (p.horarios && Object.keys(p.horarios).length) return p.horarios;
  if (!p.nome) return Object.fromEntries([1, 2, 3, 4, 5].map((d) => [d, [TURNO_PADRAO]]));
  const dias = p.dias?.length ? p.dias : [1, 2, 3, 4, 5, 6];
  return Object.fromEntries(dias.map((d) => {
    const c = casa[d] || TURNO_PADRAO;
    return [d, [[p.inicio || c[0], p.fim || c[1]]]];
  }));
}

const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const mins = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

// novo turno: se o último atravessa o almoço, divide em manhã e tarde; senão, 1h depois do fim
function maisUmTurno(turnos) {
  const ult = turnos[turnos.length - 1];
  if (!ult) return [TURNO_PADRAO];
  if (ult[0] < '12:00' && ult[1] > '14:00') return [...turnos.slice(0, -1), [ult[0], '12:00'], ['14:00', ult[1]]];
  const ini = Math.min(mins(ult[1]) + 60, 22 * 60);
  return [...turnos, [hhmm(ini), hhmm(Math.min(ini + 180, 23 * 60 + 45))]];
}

const faixa = (t) => `${hora(t[0])}–${hora(t[1])}`;

// "Seg a Sex 8h–12h, 14h–18h · Sáb 8h–11h"
export function resumoHorario(p) {
  const h = p.horarios && Object.keys(p.horarios).length ? p.horarios : null;
  if (!h) return p.inicio && p.fim ? `${p.dias.map((d) => CURTO[d]).join(' ')} · ${hora(p.inicio)} às ${hora(p.fim)}` : 'horário da casa';
  const grupos = [];
  ORDEM.filter((d) => h[d]?.length).forEach((d) => {
    const txt = h[d].map(faixa).join(', ');
    const ult = grupos[grupos.length - 1];
    if (ult && ult.txt === txt && ORDEM.indexOf(d) === ORDEM.indexOf(ult.fim) + 1) ult.fim = d;
    else grupos.push({ ini: d, fim: d, txt });
  });
  return grupos.map((g) => `${CURTO[g.ini]}${g.fim !== g.ini ? ` a ${CURTO[g.fim]}` : ''} ${g.txt}`).join(' · ');
}

function Turnos({ turnos, aoMudar, rotulo }) {
  const mudar = (i, j, v) => aoMudar(turnos.map((t, k) => (k === i ? (j ? [t[0], v] : [v, t[1]]) : t)));
  return (
    <div className="hr-turnos">
      {turnos.map((t, i) => (
        <span key={i} className="hr-turno">
          <input type="time" step="900" value={t[0]} aria-label={`${rotulo}: início do turno ${i + 1}`} onChange={(e) => mudar(i, 0, e.target.value)} />
          <span aria-hidden="true">às</span>
          <input type="time" step="900" value={t[1]} aria-label={`${rotulo}: fim do turno ${i + 1}`} onChange={(e) => mudar(i, 1, e.target.value)} />
          {turnos.length > 1 && <button type="button" className="hr-tirar" aria-label={`Tirar o turno ${i + 1}`} onClick={() => aoMudar(turnos.filter((_, k) => k !== i))}>×</button>}
        </span>
      ))}
      {turnos.length < 3 && (
        <button type="button" className="hr-mais" onClick={() => aoMudar(maisUmTurno(turnos))}>+ turno</button>
      )}
    </div>
  );
}

export function HorarioSemanal({ valor, aoMudar }) {
  const ligar = (d, sim) => {
    const novo = { ...valor };
    if (sim) novo[d] = valor[1]?.length ? valor[1] : [TURNO_PADRAO];
    else delete novo[d];
    aoMudar(novo);
  };
  const copiar = () => {
    const base = valor[1];
    if (!base) return;
    aoMudar({ ...valor, ...Object.fromEntries([2, 3, 4, 5].map((d) => [d, base])) });
  };
  return (
    <fieldset className="hr">
      <legend className="rotulo">Horário de atendimento</legend>
      <p className="b-suave">Marque os dias e os turnos. Para o almoço, use dois turnos (ex.: 8h às 12h e 14h às 18h).</p>
      <ul className="hr-dias">
        {ORDEM.map((d) => {
          const turnos = valor[d];
          return (
            <li key={d} className={`hr-dia${turnos ? '' : ' hr-dia--fora'}`}>
              <label className="hr-dia__nome">
                <input type="checkbox" checked={!!turnos} onChange={(e) => ligar(d, e.target.checked)} />
                <span>{DIAS_LONGOS[d]}</span>
              </label>
              {turnos ? <Turnos turnos={turnos} rotulo={DIAS_LONGOS[d]} aoMudar={(t) => aoMudar({ ...valor, [d]: t })} /> : <span className="hr-folga">não atende</span>}
            </li>
          );
        })}
      </ul>
      {valor[1] && <button type="button" className="link-acao hr-copiar" onClick={copiar}>Usar o horário de segunda de terça a sexta</button>}
    </fieldset>
  );
}

// datas com horário diferente (ex.: sábado que varia) ou folga
export function DiasEspeciais({ valor, aoMudar }) {
  const datas = Object.keys(valor).sort();
  const proxima = () => {
    let d = hojeIso();
    while (valor[d]) d = new Date(new Date(d + 'T12:00:00').getTime() + 864e5).toISOString().slice(0, 10);
    return d;
  };
  const trocarData = (antiga, nova) => {
    if (!nova || valor[nova]) return;
    const o = { ...valor, [nova]: valor[antiga] };
    delete o[antiga];
    aoMudar(o);
  };
  return (
    <fieldset className="hr">
      <legend className="rotulo">Dias especiais</legend>
      <p className="b-suave">Um sábado com horário diferente, um feriado em que ela atende ou um dia de folga. Vale só naquela data.</p>
      {datas.length > 0 && (
        <ul className="hr-dias">
          {datas.map((d) => {
            const turnos = valor[d];
            return (
              <li key={d} className={`hr-dia hr-dia--especial${turnos.length ? '' : ' hr-dia--fora'}`}>
                <span className="hr-dia__nome hr-dia__data">
                  <input type="date" value={d} min={hojeIso()} aria-label="Data" onChange={(e) => trocarData(d, e.target.value)} />
                  <small>{CURTO[new Date(d + 'T12:00:00').getDay()]} · {dataBR(d)}</small>
                </span>
                <div className="hr-esp">
                  <label className="hr-esp__folga">
                    <input type="checkbox" checked={!turnos.length} onChange={(e) => aoMudar({ ...valor, [d]: e.target.checked ? [] : [['08:00', '12:00']] })} /> Não atende
                  </label>
                  {turnos.length > 0 && <Turnos turnos={turnos} rotulo={dataBR(d)} aoMudar={(t) => aoMudar({ ...valor, [d]: t })} />}
                </div>
                <button type="button" className="hr-tirar" aria-label={`Tirar ${dataBR(d)}`} onClick={() => { const o = { ...valor }; delete o[d]; aoMudar(o); }}>×</button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className="botao botao--linha botao--p hr-novo" onClick={() => aoMudar({ ...valor, [proxima()]: [['08:00', '12:00']] })}>+ Dia especial</button>
    </fieldset>
  );
}
