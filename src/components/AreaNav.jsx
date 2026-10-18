import { NavLink } from 'react-router-dom';

// Navegação da área do aluno: abas no computador, barra fixa embaixo no celular
const ITENS = [
  {
    to: '/aulas',
    texto: 'Aulas',
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    to: '/minhas-reservas',
    texto: 'Minhas reservas',
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5z" />
        <path d="M14 5v14" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    to: '/ficha-saude',
    texto: 'Ficha de saúde',
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        <path d="M9 11h2l1-2 1.5 4 1-2H16" />
      </svg>
    ),
  },
];

export default function AreaNav() {
  return (
    <nav className="area-nav" aria-label="Área do aluno">
      <div className="area-nav__in">
        {ITENS.map((i) => (
          <NavLink key={i.to} to={i.to} state={i.to === '/ficha-saude' ? { de: '/minhas-reservas' } : undefined} className="area-nav__item">
            {i.icone}
            <span>{i.texto}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
