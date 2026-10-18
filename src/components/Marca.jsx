import { useId } from 'react';

const BASE = import.meta.env.BASE_URL;
export const img = (nome) => `${BASE}img/${nome}`;

// O sol da Casa Âmbar: raios finos, longos e curtos alternados.
export function Sol({ tamanho = 28, raios = 28, className = '', style }) {
  const pts = [];
  for (let i = 0; i < raios * 2; i++) {
    const ang = (Math.PI * i) / raios - Math.PI / 2;
    const r = i % 2 === 0 ? (i % 4 === 0 ? 50 : 42) : 17;
    pts.push(`${50 + r * Math.cos(ang)},${50 + r * Math.sin(ang)}`);
  }
  return (
    <svg className={className} style={style} width={tamanho} height={tamanho} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={pts.join(' ')} fill="currentColor" />
      <circle cx="50" cy="50" r="18" fill="currentColor" />
    </svg>
  );
}

// Formas orgânicas do manual: presença, equilíbrio, sutileza.
export function Forma({ nome, tamanho = 64, cor = 'currentColor', className = '' }) {
  return (
    <span
      className={`forma ${className}`}
      aria-hidden="true"
      style={{
        width: tamanho,
        height: tamanho,
        backgroundColor: cor,
        WebkitMaskImage: `url(${img(`forma-${nome}.png`)})`,
        maskImage: `url(${img(`forma-${nome}.png`)})`,
      }}
    />
  );
}

export function Monograma({ tamanho = 120, cor = 'currentColor', className = '' }) {
  return (
    <span
      className={`forma ${className}`}
      aria-hidden="true"
      style={{
        width: tamanho,
        height: tamanho * 0.82,
        backgroundColor: cor,
        WebkitMaskImage: `url(${img('monograma-a.png')})`,
        maskImage: `url(${img('monograma-a.png')})`,
      }}
    />
  );
}

export function Logo({ variante = 'verde', largura = 64, className = '' }) {
  return <img className={className} src={img(`logo-${variante}.png`)} alt="Casa Âmbar" width={largura} style={{ height: 'auto' }} />;
}

// Selo circular "CASA ÂMBAR" com o sol no centro.
export function Selo({ tamanho = 160, className = '' }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={`c${id}`} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
      </defs>
      <text fill="currentColor" style={{ fontFamily: "var(--mono)" }} fontSize="15" letterSpacing="9.6">
        <textPath href={`#c${id}`}>CASA ÂMBAR CASA ÂMBAR </textPath>
      </text>
      <g transform="translate(62 62) scale(0.76)">
        <Sol tamanho={100} raios={22} />
      </g>
    </svg>
  );
}

export function Seta({ className = '' }) {
  return (
    <svg className={className} width="18" height="22" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M2 2l7 7 7-7M2 12l7 7 7-7" />
    </svg>
  );
}
