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

export function IconeInstagram({ tamanho = 18 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Ícone do WhatsApp (desenho do Simple Icons, domínio público)
export const PATH_WHATSAPP =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

export function IconeWhatsapp({ tamanho = 18 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATH_WHATSAPP} fill="currentColor" />
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
