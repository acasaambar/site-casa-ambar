// "Dra. Paula Mendes" -> "PM"
export const iniciais = (n) => String(n || '').replace(/^(dra?\.?|prof\.?)\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
