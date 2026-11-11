// Assinatura de quem fez o sistema: selo FR Dev (o mesmo da logo), "Feito por FR Dev · Fábio Ranyeri" e e-mail clicável.
// Pequena e discreta, no rodapé do site e no pé do menu da bancada. O quadrado do selo pega a cor de quem a usa
// (currentColor) com as letras FR vazadas; a barrinha é o verde-água da marca. Guia: assinatura.md.
export const ASSINATURA = { marca: 'FR Dev', nome: 'Fábio Ranyeri', email: 'frnr.mv@icloud.com' };

export function SeloFRDev({ className = 'assinatura__selo' }) {
  return (
    <svg className={className} viewBox="0 0 176 176" aria-hidden="true" focusable="false">
      <path fill="currentColor" fillRule="evenodd" d="M44 0H132A44 44 0 0 1 176 44V132A44 44 0 0 1 132 176H44A44 44 0 0 1 0 132V44A44 44 0 0 1 44 0ZM47.58 119.83L35.44 119.83L35.44 55.43L75.92 55.43L75.92 66.47L47.58 66.47L47.58 82.02L73.71 82.02L73.71 93.06L47.58 93.06L47.58 119.83ZM92.71 119.83L80.56 119.83L80.56 55.43L108.53 55.43Q114.60 55.43 119.11 57.55Q123.62 59.66 126.10 63.53Q128.59 67.39 128.59 72.64L128.59 72.64L128.59 73.74Q128.59 79.54 125.83 83.12Q123.07 86.71 119.02 88.37L119.02 88.37L119.02 90.02Q122.70 90.21 124.72 92.55Q126.75 94.90 126.75 98.76L126.75 98.76L126.75 119.83L114.60 119.83L114.60 100.51Q114.60 98.30 113.45 96.92Q112.30 95.54 109.64 95.54L109.64 95.54L92.71 95.54L92.71 119.83ZM92.71 66.47L92.71 84.50L107.24 84.50Q111.57 84.50 114.01 82.16Q116.44 79.81 116.44 75.95L116.44 75.95L116.44 75.03Q116.44 71.16 114.05 68.82Q111.66 66.47 107.24 66.47L107.24 66.47L92.71 66.47Z" />
      <rect x="134.64" y="56" width="12" height="70" rx="3" fill="#2BC4AC" />
    </svg>
  );
}

export default function Assinatura({ className = '' }) {
  return (
    <div className={`assinatura ${className}`.trim()}>
      <SeloFRDev />
      <span className="assinatura__txt">
        <span><span className="assinatura__por">Feito por </span><strong className="assinatura__marca">{ASSINATURA.marca}</strong> · {ASSINATURA.nome}</span>
        <a href={`mailto:${ASSINATURA.email}`}>{ASSINATURA.email}</a>
      </span>
    </div>
  );
}
