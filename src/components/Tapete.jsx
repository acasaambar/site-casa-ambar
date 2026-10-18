import { useId } from 'react';

// Paleta de cada estado do tapete
const CORES = {
  livre: { base: '#5F6B40', claro: '#7C8857', escuro: '#47522E', numero: '#E9DDC5' },
  meu: { base: '#7E3717', claro: '#A04E28', escuro: '#5E2710', numero: '#F6E9CF' },
  ocupado: { base: '#B7AE99', claro: '#C8C0AC', escuro: '#9C937E', numero: '#7C7462' },
};

/**
 * Tapete de yoga visto de cima, desenhado em SVG.
 * estado: 'livre' | 'meu' | 'ocupado'
 */
export default function Tapete({ numero, estado = 'livre', onClick, desabilitado }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = CORES[estado];
  const ocupado = estado === 'ocupado';
  const rotulo = `Tapete ${numero}, ${ocupado ? 'ocupado' : estado === 'meu' ? 'escolhido por você' : 'livre'}`;

  return (
    <button
      type="button"
      className={`tapete tapete--${estado}`}
      onClick={onClick}
      disabled={desabilitado || ocupado}
      aria-pressed={estado === 'meu'}
      aria-label={rotulo}
    >
      <svg viewBox="0 0 120 240" role="presentation">
        <defs>
          <linearGradient id={`g${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={c.escuro} />
            <stop offset="0.18" stopColor={c.base} />
            <stop offset="0.5" stopColor={c.claro} />
            <stop offset="0.82" stopColor={c.base} />
            <stop offset="1" stopColor={c.escuro} />
          </linearGradient>
          <linearGradient id={`l${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.14" />
          </linearGradient>
          {/* textura emborrachada do tapete */}
          <pattern id={`t${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="#000" fillOpacity="0.16" />
            <circle cx="4.5" cy="4.5" r="0.75" fill="#fff" fillOpacity="0.08" />
          </pattern>
          <filter id={`s${uid}`} x="-30%" y="-15%" width="160%" height="135%">
            <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#2B1A0C" floodOpacity="0.32" />
          </filter>
          {/* textura de cortiça do bloco */}
          <pattern id={`k${uid}`} width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.9" fill="#7A5226" fillOpacity="0.35" />
            <circle cx="5.5" cy="4.5" r="0.6" fill="#7A5226" fillOpacity="0.28" />
            <circle cx="4" cy="6.2" r="0.45" fill="#fff" fillOpacity="0.25" />
          </pattern>
        </defs>

        {/* corpo do tapete */}
        <g filter={`url(#s${uid})`}>
          <rect x="10" y="10" width="100" height="220" rx="9" fill={`url(#g${uid})`} />
        </g>
        <rect x="10" y="10" width="100" height="220" rx="9" fill={`url(#t${uid})`} />
        <rect x="10" y="10" width="100" height="220" rx="9" fill={`url(#l${uid})`} />
        {/* borda costurada */}
        <rect x="15" y="15" width="90" height="210" rx="6" fill="none" stroke={c.numero} strokeOpacity="0.22" strokeWidth="1" strokeDasharray="3 3" />
        {/* linha de alinhamento central */}
        <line x1="60" y1="70" x2="60" y2="170" stroke={c.numero} strokeOpacity="0.14" strokeWidth="1.2" />

        {/* número impresso */}
        <text x="60" y="206" textAnchor="middle" fill={c.numero} fontSize="40" style={{ fontFamily: "var(--mono)", fontWeight: 300 }}>
          {numero}
        </text>

        {/* sol bordado no topo */}
        {!ocupado && (
          <g transform="translate(50 26)" fill={c.numero} opacity="0.75">
            <SolMini />
          </g>
        )}

        {/* bloco de cortiça (livre e meu) ou toalha dobrada (ocupado) */}
        {ocupado ? (
          <g transform="translate(26 84)">
            <rect x="0" y="0" width="68" height="44" rx="5" fill="#EFE6D3" />
            <rect x="0" y="0" width="68" height="44" rx="5" fill="none" stroke="#C9BDA2" strokeWidth="1" />
            <line x1="0" y1="14" x2="68" y2="14" stroke="#D8CDB4" strokeWidth="2" />
            <line x1="0" y1="30" x2="68" y2="30" stroke="#D8CDB4" strokeWidth="2" />
            <rect x="0" y="40" width="68" height="4" rx="2" fill="#000" fillOpacity="0.08" />
          </g>
        ) : (
          <g transform="translate(34 50)">
            <rect x="0" y="0" width="52" height="30" rx="4" fill="#C9A36B" />
            <rect x="0" y="0" width="52" height="30" rx="4" fill={`url(#k${uid})`} />
            <rect x="0" y="0" width="52" height="8" rx="4" fill="#fff" fillOpacity="0.18" />
            <rect x="0" y="26" width="52" height="4" rx="2" fill="#000" fillOpacity="0.15" />
          </g>
        )}
      </svg>
      {ocupado && <span className="tapete__selo">ocupado</span>}
    </button>
  );
}

function SolMini() {
  const pts = [];
  for (let i = 0; i < 32; i++) {
    const a = (Math.PI * i) / 16 - Math.PI / 2;
    const r = i % 2 === 0 ? 10 : 3.5;
    pts.push(`${10 + r * Math.cos(a)},${10 + r * Math.sin(a)}`);
  }
  return <polygon points={pts.join(' ')} />;
}
