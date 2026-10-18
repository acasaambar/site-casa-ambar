import { useId } from 'react';

/**
 * Aparelho de Pilates (Reformer) visto de cima, desenhado em SVG.
 * ocupado: mostra o aparelho reservado por outra pessoa (com toalha).
 */
export default function Reformer({ numero, ocupado = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const madeira = ocupado ? ['#B9AE98', '#CEC4AF'] : ['#8A6440', '#B08458'];
  const estofado = ocupado ? ['#C9C2B2', '#DAD4C6'] : ['#2F3821', '#46533A'];
  const metal = ocupado ? '#B5AFA2' : '#C9CCC4';

  return (
    <figure className={`reformer ${ocupado ? 'reformer--ocupado' : ''}`} aria-label={`Aparelho ${numero}, ${ocupado ? 'ocupado' : 'livre'}`}>
      <svg viewBox="0 0 140 320" role="presentation">
        <defs>
          <linearGradient id={`m${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor={madeira[0]} />
            <stop offset="0.5" stopColor={madeira[1]} />
            <stop offset="1" stopColor={madeira[0]} />
          </linearGradient>
          <linearGradient id={`e${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor={estofado[0]} />
            <stop offset="0.5" stopColor={estofado[1]} />
            <stop offset="1" stopColor={estofado[0]} />
          </linearGradient>
          <filter id={`s${uid}`} x="-30%" y="-15%" width="160%" height="135%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#2B1A0C" floodOpacity="0.32" />
          </filter>
          <pattern id={`v${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="3" fill="#fff" fillOpacity="0.04" />
          </pattern>
        </defs>

        {/* estrutura de madeira */}
        <g filter={`url(#s${uid})`}>
          <rect x="14" y="10" width="112" height="300" rx="14" fill={`url(#m${uid})`} />
        </g>
        <rect x="14" y="10" width="112" height="300" rx="14" fill={`url(#v${uid})`} />
        {/* trilhos */}
        <rect x="26" y="34" width="6" height="250" rx="3" fill={metal} opacity="0.9" />
        <rect x="108" y="34" width="6" height="250" rx="3" fill={metal} opacity="0.9" />

        {/* polias e cordas no topo */}
        <circle cx="30" cy="22" r="5" fill={metal} />
        <circle cx="110" cy="22" r="5" fill={metal} />
        {!ocupado && (
          <g fill="none" stroke="#E9DDC5" strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
            <path d="M30 22 C 40 40, 46 60, 52 74" />
            <path d="M110 22 C 100 40, 94 60, 88 74" />
          </g>
        )}

        {/* carrinho estofado */}
        <rect x="34" y="44" width="72" height="150" rx="10" fill={`url(#e${uid})`} />
        <rect x="34" y="44" width="72" height="150" rx="10" fill="none" stroke="#fff" strokeOpacity="0.12" />
        {/* apoio de cabeça e ombreiras */}
        <rect x="52" y="52" width="36" height="22" rx="8" fill={estofado[1]} stroke="#fff" strokeOpacity="0.15" />
        <rect x="40" y="82" width="14" height="20" rx="6" fill={madeira[1]} />
        <rect x="86" y="82" width="14" height="20" rx="6" fill={madeira[1]} />

        {/* molas coloridas (cores da marca) */}
        <g strokeWidth="3" strokeLinecap="round">
          {['#7E3717', '#A6845E', '#6F784D', '#E9DDC5'].map((c, i) => (
            <line key={c} x1={46 + i * 16} y1="206" x2={46 + i * 16} y2="246" stroke={ocupado ? '#A39C88' : c} strokeDasharray="2 2.5" />
          ))}
        </g>

        {/* barra de pés */}
        <path d="M30 262 Q 70 244 110 262" fill="none" stroke={metal} strokeWidth="6" strokeLinecap="round" />
        <rect x="40" y="276" width="60" height="18" rx="6" fill={madeira[1]} opacity="0.9" />

        {/* número */}
        <circle cx="70" cy="150" r="20" fill={ocupado ? '#E3DBC9' : '#E9DDC5'} />
        <text x="70" y="157" textAnchor="middle" fontSize="20" style={{ fontFamily: 'var(--mono)', fontWeight: 500 }} fill={ocupado ? '#8C8470' : '#2F3821'}>
          {numero}
        </text>

        {/* toalha dobrada quando ocupado */}
        {ocupado && (
          <g transform="translate(40 100)">
            <rect width="60" height="34" rx="5" fill="#F3ECDD" stroke="#CFC4AB" />
            <line x1="0" y1="12" x2="60" y2="12" stroke="#DCD1B8" strokeWidth="2" />
            <line x1="0" y1="24" x2="60" y2="24" stroke="#DCD1B8" strokeWidth="2" />
          </g>
        )}
      </svg>
      <figcaption>{ocupado ? 'ocupado' : 'livre'}</figcaption>
    </figure>
  );
}
