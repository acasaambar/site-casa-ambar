import { useEffect } from 'react';

// "Dra. Paula Mendes" -> "PM"
export const iniciais = (n) => String(n || '').replace(/^(dra?\.?|prof\.?)\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

// Esc fecha a foto ampliada (e só ela: a folha que está embaixo continua aberta)
export function useEscFoto(ampliada, fechar) {
  useEffect(() => {
    if (!ampliada) return undefined;
    const tecla = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); fechar(); } };
    document.addEventListener('keydown', tecla, true);
    return () => document.removeEventListener('keydown', tecla, true);
  }, [ampliada]); // eslint-disable-line react-hooks/exhaustive-deps
}
