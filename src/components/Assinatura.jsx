// Assinatura FR Dev (Fábio Ranyeri), com as peças da logo desenhadas em SVG (letras em contorno, sem fonte extra).
// Rodapé do site: uma pílula centralizada e clicável (selo + "Feito por FR Dev" + convite para contato por e-mail).
// Menu da bancada: selo + FR Dev + e-mail, compacto. Cores da marca: azul-noite #0E1A2B, verde-água #2BC4AC. Guia: assinatura.md.
export const ASSINATURA = { marca: 'FR Dev', nome: 'Fábio Ranyeri', email: 'frnr.mv@icloud.com' };

const assunto = (projeto) => encodeURIComponent('Quero um site como o da ' + projeto);

// selo da logo: quadrado claro, FR em azul-noite e a barrinha (cursor) em verde-petróleo
export function SeloFRDev({ className = 'frdev__selo' }) {
  return (
    <svg className={className} viewBox="0 0 176 176" aria-hidden="true" focusable="false">
      <path className="frdev__quadrado" d="M44 0H132A44 44 0 0 1 176 44V132A44 44 0 0 1 132 176H44A44 44 0 0 1 0 132V44A44 44 0 0 1 44 0Z" />
      <path className="frdev__letras" d="M47.58 119.83L35.44 119.83L35.44 55.43L75.92 55.43L75.92 66.47L47.58 66.47L47.58 82.02L73.71 82.02L73.71 93.06L47.58 93.06L47.58 119.83ZM92.71 119.83L80.56 119.83L80.56 55.43L108.53 55.43Q114.60 55.43 119.11 57.55Q123.62 59.66 126.10 63.53Q128.59 67.39 128.59 72.64L128.59 72.64L128.59 73.74Q128.59 79.54 125.83 83.12Q123.07 86.71 119.02 88.37L119.02 88.37L119.02 90.02Q122.70 90.21 124.72 92.55Q126.75 94.90 126.75 98.76L126.75 98.76L126.75 119.83L114.60 119.83L114.60 100.51Q114.60 98.30 113.45 96.92Q112.30 95.54 109.64 95.54L109.64 95.54L92.71 95.54L92.71 119.83ZM92.71 66.47L92.71 84.50L107.24 84.50Q111.57 84.50 114.01 82.16Q116.44 79.81 116.44 75.95L116.44 75.95L116.44 75.03Q116.44 71.16 114.05 68.82Q111.66 66.47 107.24 66.47L107.24 66.47L92.71 66.47Z" />
      <rect className="frdev__barra" x="134.64" y="56" width="12" height="70" rx="3" />
    </svg>
  );
}

// "FR Dev" na fonte da marca: FR na cor do texto, Dev em verde-água
export function PalavraFRDev({ className = 'frdev__palavra' }) {
  return (
    <svg className={className} viewBox="6.6 -70 293.9 71.4" role="img" aria-label="FR Dev" focusable="false">
      <path className="frdev__fr" d="M19.80 0L6.60 0L6.60-70L50.60-70L50.60-58L19.80-58L19.80-41.10L48.20-41.10L48.20-29.10L19.80-29.10L19.80 0ZM69.40 0L56.20 0L56.20-70L86.60-70Q93.20-70 98.10-67.70Q103-65.40 105.70-61.20Q108.40-57 108.40-51.30L108.40-51.30L108.40-50.10Q108.40-43.80 105.40-39.90Q102.40-36 98-34.20L98-34.20L98-32.40Q102-32.20 104.20-29.65Q106.40-27.10 106.40-22.90L106.40-22.90L106.40 0L93.20 0L93.20-21Q93.20-23.40 91.95-24.90Q90.70-26.40 87.80-26.40L87.80-26.40L69.40-26.40L69.40 0ZM69.40-58L69.40-38.40L85.20-38.40Q89.90-38.40 92.55-40.95Q95.20-43.50 95.20-47.70L95.20-47.70L95.20-48.70Q95.20-52.90 92.60-55.45Q90-58 85.20-58L85.20-58L69.40-58Z" />
      <path className="frdev__dev" d="M164 0L135.20 0L135.20-11.60L144.40-11.60L144.40-58.40L135.20-58.40L135.20-70L164-70Q178.10-70 185.45-62.85Q192.80-55.70 192.80-41.60L192.80-41.60L192.80-28.40Q192.80-14.30 185.45-7.15Q178.10 0 164 0L164 0ZM157.60-58L157.60-12L164.20-12Q172.20-12 175.90-16.20Q179.60-20.40 179.60-28L179.60-28L179.60-42Q179.60-49.70 175.90-53.85Q172.20-58 164.20-58L164.20-58L157.60-58ZM223.00 1.40L223.00 1.40Q215.60 1.40 209.95-1.75Q204.30-4.90 201.15-10.65Q198.00-16.40 198.00-24.20L198.00-24.20L198.00-25.40Q198.00-33.20 201.10-38.95Q204.20-44.70 209.80-47.85Q215.40-51 222.80-51L222.80-51Q230.10-51 235.50-47.75Q240.90-44.50 243.90-38.75Q246.90-33 246.90-25.40L246.90-25.40L246.90-21.10L210.80-21.10Q211.00-16 214.60-12.80Q218.20-9.60 223.40-9.60L223.40-9.60Q228.70-9.60 231.20-11.90Q233.70-14.20 235.00-17L235.00-17L245.30-11.60Q243.90-9 241.25-5.95Q238.60-2.90 234.20-0.75Q229.80 1.40 223.00 1.40ZM210.90-30.50L210.90-30.50L234.10-30.50Q233.70-34.80 230.65-37.40Q227.60-40 222.70-40L222.70-40Q217.60-40 214.60-37.40Q211.60-34.80 210.90-30.50ZM284.70 0L264.70 0L248.90-49.60L262.30-49.60L273.80-9.20L275.60-9.20L287.10-49.60L300.50-49.60L284.70 0Z" />
    </svg>
  );
}

export default function Assinatura({ variante = 'rodape', projeto = 'Casa Âmbar' }) {
  const mailto = `mailto:${ASSINATURA.email}?subject=${assunto(projeto)}`;
  if (variante === 'menu') {
    return (
      <div className="frdev frdev--menu">
        <SeloFRDev />
        <span className="frdev__txt">
          <span className="frdev__linha"><PalavraFRDev /><span className="frdev__nome">· {ASSINATURA.nome}</span></span>
          <a href={mailto}>{ASSINATURA.email}</a>
        </span>
      </div>
    );
  }
  return (
    <div className="frdev-rodape">
      <a className="frdev frdev--pilula" href={mailto} title={ASSINATURA.email}
        aria-label={`Feito por FR Dev, de ${ASSINATURA.nome}. Quer um site assim? Escreva para ${ASSINATURA.email}`}>
        <SeloFRDev />
        <span className="frdev__por" aria-hidden="true">Feito por</span>
        <PalavraFRDev />
        <span className="frdev__sep" aria-hidden="true" />
        <span className="frdev__cta" aria-hidden="true"><span className="frdev__pergunta">Quer um site assim? </span><strong>Fale com o Fábio</strong><span className="frdev__seta">→</span></span>
      </a>
    </div>
  );
}
