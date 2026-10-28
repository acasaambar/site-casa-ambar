// Quem pediu menos movimento no aparelho não recebe rolagem animada.
export const rolagemSuave = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
