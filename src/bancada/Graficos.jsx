import { useEffect, useRef, useState } from 'react';

// Gráficos simples em SVG/HTML, nas cores da Casa Âmbar.
// Uma série por gráfico (cor única) — o título diz o que está plotado.
// Toda marca tem dica ao passar o mouse (ou tocar) e os números ficam também em tabela/CSV.

const COR = { serie: '#6F784D', destaque: '#7E3717', grade: 'rgba(47,56,33,0.10)', tinta: '#2F3821', suave: '#6B6E58' };

function useDica() {
  const caixa = useRef(null);
  const [dica, setDica] = useState(null);
  const mostrar = (e, conteudo) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    setDica({ x, y, conteudo, largura: r.width });
  };
  const esconder = () => setDica(null);
  const el = dica && (
    <div className="g-dica" style={{ left: Math.min(Math.max(dica.x, 70), dica.largura - 70), top: dica.y }} role="status">
      {dica.conteudo}
    </div>
  );
  return { caixa, mostrar, esconder, el };
}

// Barras horizontais (ranking): itens = [{ nome, valor, detalhe }]
export function BarrasH({ itens, formato = (v) => v, max: maxFixo, vazio = 'Sem dados no período.', limite = 10 }) {
  const { caixa, mostrar, esconder, el } = useDica();
  const lista = (itens || []).slice(0, limite);
  if (!lista.length) return <p className="g-vazio">{vazio}</p>;
  const max = maxFixo || Math.max(...lista.map((i) => i.valor), 1);
  return (
    <div className="g-barras" ref={caixa} onMouseLeave={esconder}>
      {lista.map((i) => (
        <div key={i.nome} className="g-barras__linha"
          onMouseMove={(e) => mostrar(e, <><strong>{i.nome}</strong><span>{formato(i.valor)}{i.detalhe ? ' · ' + i.detalhe : ''}</span></>)}
          onTouchStart={(e) => mostrar(e, <><strong>{i.nome}</strong><span>{formato(i.valor)}{i.detalhe ? ' · ' + i.detalhe : ''}</span></>)}>
          <span className="g-barras__nome" title={i.nome}>{i.nome}</span>
          <span className="g-barras__trilho">
            <span className="g-barras__barra" style={{ width: `${Math.max(1.5, (i.valor / max) * 100)}%` }} />
          </span>
          <span className="g-barras__valor">{formato(i.valor)}</span>
        </div>
      ))}
      {el}
    </div>
  );
}

function passoBonito(max) {
  if (max <= 0) return 1;
  const bruto = max / 4;
  const p = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const compacto = (v) => (v >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : v.toLocaleString('pt-BR'));

// largura real do gráfico (o texto do eixo fica sempre com o mesmo tamanho)
function useLargura(ref) {
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = () => setW(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    medir();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [ref]);
  return w;
}

// Colunas ao longo do tempo: serie = [{ chave, valor }]
export function Colunas({ serie, rotuloX = (k) => k, formato = (v) => v, altura = 220, dicaExtra }) {
  const { caixa, mostrar, esconder, el } = useDica();
  const L = useLargura(caixa);
  const dados = serie || [];
  if (!dados.length) return <p className="g-vazio">Sem dados no período.</p>;
  const max = Math.max(...dados.map((d) => d.valor), 0);
  const passo = passoBonito(max);
  const topo = Math.max(passo, Math.ceil(max / passo) * passo);
  const A = altura, esq = 46, base = A - 26, alturaUtil = base - 10;
  const larg = (L - esq - 6) / dados.length;
  const barra = Math.min(24, Math.max(3, larg - 2));
  const ticks = [];
  for (let v = 0; v <= topo + 0.001; v += passo) ticks.push(v);
  const cada = Math.ceil(dados.length / Math.max(3, Math.floor(L / 70))); // rótulos do eixo X sem encavalar
  const iMax = dados.findIndex((d) => d.valor === max && max > 0);
  return (
    <div className="g-colunas" ref={caixa} onMouseLeave={esconder}>
      <svg viewBox={`0 0 ${L} ${A}`} width={L} height={A} role="img" aria-label="Gráfico de colunas">
        {ticks.map((t) => {
          const y = base - (t / topo) * alturaUtil;
          return (
            <g key={t}>
              <line x1={esq} x2={L - 4} y1={y} y2={y} stroke={COR.grade} strokeWidth="1" />
              <text x={esq - 8} y={y + 4} textAnchor="end" className="g-eixo">{compacto(t)}</text>
            </g>
          );
        })}
        {dados.map((d, i) => {
          const h = topo ? (d.valor / topo) * alturaUtil : 0;
          const x = esq + i * larg + (larg - barra) / 2;
          const y = base - h;
          const r = Math.min(4, barra / 2, h);
          const caminho = h > 0
            ? `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + barra - r} Q${x + barra},${y} ${x + barra},${y + r} V${base} Z`
            : '';
          const conteudo = <><strong>{rotuloX(d.chave, true)}</strong><span>{formato(d.valor)}{dicaExtra ? dicaExtra(d) : ''}</span></>;
          return (
            <g key={d.chave}>
              {caminho && <path d={caminho} fill={i === iMax ? COR.destaque : COR.serie} />}
              <rect x={esq + i * larg} y={10} width={larg} height={base - 10} fill="transparent"
                onMouseMove={(e) => mostrar(e, conteudo)} onTouchStart={(e) => mostrar(e, conteudo)} />
              {i % cada === 0 && <text x={x + barra / 2} y={A - 8} textAnchor="middle" className="g-eixo">{rotuloX(d.chave)}</text>}
            </g>
          );
        })}
        <line x1={esq} x2={L - 4} y1={base} y2={base} stroke="rgba(47,56,33,0.35)" strokeWidth="1" />
      </svg>
      {el}
    </div>
  );
}

// Mapa de calor: linhas = horários, colunas = dias da semana, valor = ocupação %
const RAMPA = ['#F1EDE0', '#DCDDC4', '#C1C69F', '#A1AA78', '#808B57', '#5F6A3E', '#3F4A28'];
function corDe(v) {
  if (v == null) return null;
  return RAMPA[Math.min(RAMPA.length - 1, Math.floor((v / 100) * (RAMPA.length - 1) + 0.0001))];
}
export function MapaCalor({ celulas, dias = [1, 2, 3, 4, 5, 6], nomesDias }) {
  const { caixa, mostrar, esconder, el } = useDica();
  const horas = [...new Set((celulas || []).map((c) => c.hora))].sort();
  if (!horas.length) return <p className="g-vazio">Sem aulas no período.</p>;
  const achar = (h, d) => celulas.find((c) => c.hora === h && c.dia === d);
  return (
    <div className="g-calor" ref={caixa} onMouseLeave={esconder}>
      <table>
        <thead>
          <tr><th />{dias.map((d) => <th key={d} scope="col">{nomesDias[d]}</th>)}</tr>
        </thead>
        <tbody>
          {horas.map((h) => (
            <tr key={h}>
              <th scope="row">{h.replace(':00', 'h').replace(':', 'h')}</th>
              {dias.map((d) => {
                const c = achar(h, d);
                if (!c) return <td key={d} className="g-calor__vazio" />;
                const cor = corDe(c.ocupacao);
                const escuro = c.ocupacao >= 58;
                const conteudo = <><strong>{nomesDias[d]} · {h}</strong><span>{c.ocupacao}% ocupado · {c.reservas} {c.reservas === 1 ? 'reserva' : 'reservas'} em {c.aulas} {c.aulas === 1 ? 'aula' : 'aulas'}</span></>;
                return (
                  <td key={d} style={{ background: cor, color: escuro ? '#FBF8EF' : COR.tinta }}
                    onMouseMove={(e) => mostrar(e, conteudo)} onTouchStart={(e) => mostrar(e, conteudo)}>
                    {Math.round(c.ocupacao)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="g-calor__legenda" aria-hidden="true">
        <span>vazia</span>
        {RAMPA.map((c) => <i key={c} style={{ background: c }} />)}
        <span>lotada</span>
      </div>
      {el}
    </div>
  );
}

// Barra de ocupação (aula)
export function Ocupacao({ valor, total }) {
  const p = total ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <span className="g-ocup" role="img" aria-label={`${valor} de ${total}`}>
      <span className="g-ocup__barra" style={{ width: `${p}%` }} data-cheia={p >= 100 ? 'sim' : 'nao'} />
    </span>
  );
}
