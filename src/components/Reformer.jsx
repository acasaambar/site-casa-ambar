import { useId } from 'react';

/**
 * Aparelhos de Pilates vistos de cima, desenhados em SVG.
 * tipo: 'Reformer' | 'Cadillac' | 'Chair' | 'Ladder Barrel'
 * ocupado: aparelho reservado por outra pessoa (fica claro, com toalha).
 */
export default function Aparelho({ numero, tipo = 'Reformer', ocupado = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cores = {
    madeira: ocupado ? ['#B9AE98', '#CEC4AF'] : ['#8A6440', '#B08458'],
    estofado: ocupado ? ['#C9C2B2', '#DAD4C6'] : ['#2F3821', '#46533A'],
    metal: ocupado ? '#B5AFA2' : '#C9CCC4',
    molas: ocupado ? ['#A39C88', '#A39C88', '#A39C88', '#A39C88'] : ['#7E3717', '#A6845E', '#6F784D', '#E9DDC5'],
    numeroFundo: ocupado ? '#E3DBC9' : '#E9DDC5',
    numeroTexto: ocupado ? '#8C8470' : '#2F3821',
  };
  const g = { m: `m${uid}`, e: `e${uid}`, s: `s${uid}`, v: `v${uid}` };
  const Desenho = DESENHOS[tipo] || DESENHOS.Reformer;

  return (
    <figure className={`reformer ${ocupado ? 'reformer--ocupado' : ''}`} aria-label={`${tipo} ${numero}, ${ocupado ? 'ocupado' : 'livre'}`}>
      <svg viewBox="0 0 140 320" role="presentation">
        <defs>
          <linearGradient id={g.m} x1="0" x2="1">
            <stop offset="0" stopColor={cores.madeira[0]} />
            <stop offset="0.5" stopColor={cores.madeira[1]} />
            <stop offset="1" stopColor={cores.madeira[0]} />
          </linearGradient>
          <linearGradient id={g.e} x1="0" x2="1">
            <stop offset="0" stopColor={cores.estofado[0]} />
            <stop offset="0.5" stopColor={cores.estofado[1]} />
            <stop offset="1" stopColor={cores.estofado[0]} />
          </linearGradient>
          <filter id={g.s} x="-30%" y="-15%" width="160%" height="135%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#2B1A0C" floodOpacity="0.32" />
          </filter>
          <pattern id={g.v} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="3" fill="#fff" fillOpacity="0.04" />
          </pattern>
        </defs>
        <Desenho c={cores} g={g} ocupado={ocupado} numero={numero} />
      </svg>
      <figcaption>
        <strong>{tipo}</strong>
        <span>{ocupado ? 'ocupado' : 'livre'}</span>
      </figcaption>
    </figure>
  );
}

function Numero({ x, y, c, numero }) {
  return (
    <g>
      <circle cx={x} cy={y} r="18" fill={c.numeroFundo} />
      <text x={x} y={y + 7} textAnchor="middle" fontSize="19" style={{ fontFamily: 'var(--mono)', fontWeight: 500 }} fill={c.numeroTexto}>
        {numero}
      </text>
    </g>
  );
}

function Toalha({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="60" height="34" rx="5" fill="#F3ECDD" stroke="#CFC4AB" />
      <line x1="0" y1="12" x2="60" y2="12" stroke="#DCD1B8" strokeWidth="2" />
      <line x1="0" y1="24" x2="60" y2="24" stroke="#DCD1B8" strokeWidth="2" />
    </g>
  );
}

const DESENHOS = {
  // Reformer: carrinho estofado sobre trilhos, molas e barra de pés
  Reformer: ({ c, g, ocupado, numero }) => (
    <>
      <g filter={`url(#${g.s})`}>
        <rect x="14" y="10" width="112" height="300" rx="14" fill={`url(#${g.m})`} />
      </g>
      <rect x="14" y="10" width="112" height="300" rx="14" fill={`url(#${g.v})`} />
      <rect x="26" y="34" width="6" height="250" rx="3" fill={c.metal} opacity="0.9" />
      <rect x="108" y="34" width="6" height="250" rx="3" fill={c.metal} opacity="0.9" />
      <circle cx="30" cy="22" r="5" fill={c.metal} />
      <circle cx="110" cy="22" r="5" fill={c.metal} />
      {!ocupado && (
        <g fill="none" stroke="#E9DDC5" strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
          <path d="M30 22 C 40 40, 46 60, 52 74" />
          <path d="M110 22 C 100 40, 94 60, 88 74" />
        </g>
      )}
      <rect x="34" y="44" width="72" height="150" rx="10" fill={`url(#${g.e})`} />
      <rect x="52" y="52" width="36" height="22" rx="8" fill={c.estofado[1]} stroke="#fff" strokeOpacity="0.15" />
      <rect x="40" y="82" width="14" height="20" rx="6" fill={c.madeira[1]} />
      <rect x="86" y="82" width="14" height="20" rx="6" fill={c.madeira[1]} />
      <g strokeWidth="3" strokeLinecap="round">
        {c.molas.map((cor, i) => (
          <line key={i} x1={46 + i * 16} y1="206" x2={46 + i * 16} y2="246" stroke={cor} strokeDasharray="2 2.5" />
        ))}
      </g>
      <path d="M30 262 Q 70 244 110 262" fill="none" stroke={c.metal} strokeWidth="6" strokeLinecap="round" />
      <rect x="40" y="276" width="60" height="18" rx="6" fill={c.madeira[1]} opacity="0.9" />
      <Numero x={70} y={150} c={c} numero={numero} />
      {ocupado && <Toalha x={40} y={100} />}
    </>
  ),

  // Cadillac (trapézio): mesa estofada dentro de uma estrutura com 4 colunas
  Cadillac: ({ c, g, ocupado, numero }) => (
    <>
      <g filter={`url(#${g.s})`}>
        <rect x="18" y="22" width="104" height="276" rx="12" fill={`url(#${g.m})`} />
      </g>
      <rect x="28" y="34" width="84" height="252" rx="10" fill={`url(#${g.e})`} />
      <rect x="28" y="34" width="84" height="252" rx="10" fill={`url(#${g.v})`} />
      {/* estrutura de metal no alto */}
      <rect x="10" y="12" width="120" height="296" rx="6" fill="none" stroke={c.metal} strokeWidth="5" />
      {[[10, 12], [130, 12], [10, 308], [130, 308]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="8" fill={c.metal} stroke="#8F9188" strokeWidth="1.5" />
      ))}
      {/* barras transversais */}
      <line x1="10" y1="96" x2="130" y2="96" stroke={c.metal} strokeWidth="3" opacity="0.8" />
      {/* trapézio suspenso */}
      <line x1="40" y1="150" x2="100" y2="150" stroke={c.metal} strokeWidth="5" strokeLinecap="round" />
      {!ocupado && (
        <g stroke="#E9DDC5" strokeWidth="1.4" opacity="0.7">
          <line x1="40" y1="150" x2="22" y2="96" />
          <line x1="100" y1="150" x2="118" y2="96" />
        </g>
      )}
      {/* molas presas na cabeceira */}
      <g strokeWidth="3" strokeLinecap="round">
        {c.molas.map((cor, i) => (
          <line key={i} x1={40 + i * 20} y1="14" x2={40 + i * 20} y2="54" stroke={cor} strokeDasharray="2 2.5" />
        ))}
      </g>
      {/* barra de empurrar nos pés */}
      <path d="M22 262 Q 70 248 118 262" fill="none" stroke={c.metal} strokeWidth="5" strokeLinecap="round" />
      <Numero x={70} y={212} c={c} numero={numero} />
      {ocupado && <Toalha x={40} y={168} />}
    </>
  ),

  // Chair (Wunda Chair): caixa de madeira com assento e pedal
  Chair: ({ c, g, ocupado, numero }) => (
    <>
      <rect x="16" y="56" width="108" height="208" rx="14" fill="#3B3326" opacity="0.18" />
      <g filter={`url(#${g.s})`}>
        <rect x="30" y="84" width="80" height="118" rx="10" fill={`url(#${g.m})`} />
      </g>
      <rect x="30" y="84" width="80" height="118" rx="10" fill={`url(#${g.v})`} />
      <rect x="37" y="92" width="66" height="68" rx="10" fill={`url(#${g.e})`} />
      {/* alças laterais */}
      <rect x="20" y="96" width="6" height="66" rx="3" fill={c.metal} />
      <rect x="114" y="96" width="6" height="66" rx="3" fill={c.metal} />
      {/* molas até o pedal */}
      <g strokeWidth="3" strokeLinecap="round">
        {c.molas.map((cor, i) => (
          <line key={i} x1={46 + i * 16} y1="202" x2={46 + i * 16} y2="216" stroke={cor} strokeDasharray="2 2" />
        ))}
      </g>
      {/* pedal */}
      <rect x="34" y="216" width="72" height="16" rx="5" fill={c.metal} />
      <rect x="40" y="219" width="60" height="10" rx="4" fill="#3B3F35" opacity={ocupado ? 0.2 : 0.55} />
      <Numero x={70} y={126} c={c} numero={numero} />
      {ocupado && <Toalha x={40} y={160} />}
    </>
  ),

  // Ladder Barrel: escada de madeira + barril estofado sobre a base
  'Ladder Barrel': ({ c, g, ocupado, numero }) => (
    <>
      <g filter={`url(#${g.s})`}>
        <rect x="22" y="30" width="96" height="262" rx="12" fill={`url(#${g.m})`} />
      </g>
      <rect x="22" y="30" width="96" height="262" rx="12" fill={`url(#${g.v})`} />
      {/* escada */}
      <rect x="30" y="38" width="7" height="96" rx="3" fill={c.madeira[0]} />
      <rect x="103" y="38" width="7" height="96" rx="3" fill={c.madeira[0]} />
      {[52, 72, 92, 112].map((y) => (
        <rect key={y} x="30" y={y} width="80" height="7" rx="3.5" fill={c.metal} />
      ))}
      {/* trilho de ajuste */}
      <line x1="70" y1="140" x2="70" y2="160" stroke={c.metal} strokeWidth="4" strokeLinecap="round" />
      {/* barril */}
      <rect x="30" y="160" width="80" height="116" rx="38" fill={`url(#${g.e})`} />
      <g fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="2">
        <path d="M36 186 Q 70 176 104 186" />
        <path d="M33 214 Q 70 206 107 214" />
        <path d="M36 246 Q 70 238 104 246" />
      </g>
      <Numero x={70} y={226} c={c} numero={numero} />
      {ocupado && <Toalha x={40} y={176} />}
    </>
  ),
};
