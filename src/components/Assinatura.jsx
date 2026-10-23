// Assinatura de quem fez o sistema: selo "FR", nome e e-mail (clicável). Pequena e discreta.
// Mesma peça no rodapé do site e no pé do menu da bancada. Cores vêm de quem a usa (currentColor).
export const ASSINATURA = { nome: 'Fábio Ranyeri', email: 'frnr.mv@icloud.com' };

export default function Assinatura({ className = '' }) {
  return (
    <div className={`assinatura ${className}`.trim()}>
      <span className="assinatura__selo" aria-hidden="true">FR</span>
      <span className="assinatura__txt">
        <span><span className="assinatura__por">Feito por </span>{ASSINATURA.nome}</span>
        <a href={`mailto:${ASSINATURA.email}`}>{ASSINATURA.email}</a>
      </span>
    </div>
  );
}
