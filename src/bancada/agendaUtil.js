import { useEffect, useState } from 'react';

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

// Cor de cada área de cuidado (tons da marca); Servicos.jsx reexporta
export const COR_CATEGORIA = {
  'Estética facial': 'facial',
  'Estética corporal': 'corporal',
  'Estética capilar': 'capilar',
  Fisioterapia: 'fisio',
};

// celular (até 720 px): a agenda troca as colunas lado a lado por lista, semana compacta e calendário do mês
export function useCelular(largura = 720) {
  const consulta = `(max-width: ${largura}px)`;
  const [celular, setCelular] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const q = window.matchMedia(consulta);
    const f = () => setCelular(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, [consulta]);
  return celular;
}

// meses do calendário (Agenda → Mês): sempre no dia 1, para o "dia escolhido" cair dentro do mês certo
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const primeiroDoMes = (iso) => `${iso.slice(0, 7)}-01`;
export const mesMais = (iso, n) => {
  const [a, m] = iso.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
export const tituloMes = (iso) => `${MESES_NOME[Number(iso.slice(5, 7)) - 1].replace(/^./, (c) => c.toUpperCase())} de ${iso.slice(0, 4)}`;
