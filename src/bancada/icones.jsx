// Ícones de traço fino da bancada (24 × 24, herdam a cor do texto).
// Uso: <Icone nome="agenda" /> ou <Icone nome="busca" tamanho={18} />
const I = {
  // menu
  inicio: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  agenda: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  alunos: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.2c2.3.2 4 1.8 4.6 4.8" /></>,
  vendas: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  vales: <><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M12 9v11M3.5 13h17M12 9c-1.5-3.5-5-3.5-5-1.2C7 9 9.5 9 12 9zm0 0c1.5-3.5 5-3.5 5-1.2C17 9 14.5 9 12 9z" /></>,
  relatorios: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  grade: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="10" cy="18" r="1.6" /></>,
  equipe: <><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1-3.6 3.8-5.6 7-5.6s6 2 7 5.6" /></>,
  comandas: <><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  estoque: <><path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z" /><path d="M3.5 8 12 12l8.5-4M12 12v8" /></>,
  financeiro: <><ellipse cx="9" cy="7" rx="5.5" ry="2.5" /><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" /><path d="M9.5 16.2c.6.2 1.2.3 1.9.3 3 0 5.5-1.1 5.5-2.5v-4" /><ellipse cx="15" cy="17" rx="5.5" ry="2.5" /></>,
  marketing: <><path d="M4 10v4l3 .5L15 19V5L7 9.5z" /><path d="M7 14.5 8.5 20h2.5L10 15" /><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" /></>,
  ganhos: <><circle cx="12" cy="12" r="8.5" /><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2c1.6.3 2.8.9 2.8 2.1s-1.2 2.1-2.8 2.1c-1.3 0-2.4-.6-2.9-1.5M12 6.3v1.5M12 16.2v1.5" /></>,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  // gerais
  busca: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  sair: <><path d="M10 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h4" /><path d="M16 8l4 4-4 4M20 12H9.5" /></>,
  externo: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  seta: <path d="M9 5l7 7-7 7" />,
  enter: <><path d="M20 5v7a2 2 0 0 1-2 2H5" /><path d="m9 10-4 4 4 4" /></>,
  relogio: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  cadeado: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  // Hoje
  reservas: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="m9 15 2 2 4-4" /></>,
  atendimento: <path d="M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6L5.7 9.8l4.6-1.7zM18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />,
  moeda: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 9.5v.1M17.5 14.5v.1" /></>,
  mes: <><path d="M4 18 9.5 12l3.5 3.5L20 7" /><path d="M15 7h5v5" /></>,
  atencao: <><path d="M12 4 3 19.5h18z" /><path d="M12 10v4.5M12 17.2v.1" /></>,
  comanda: <><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" /><path d="M12 8v6M9 11h6" /></>,
  presente: <><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M12 9v11M3.5 13h17M12 9c-1.5-3.5-5-3.5-5-1.2C7 9 9.5 9 12 9zm0 0c1.5-3.5 5-3.5 5-1.2C17 9 14.5 9 12 9z" /></>,
  usuarioMais: <><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20c.9-3.6 3.4-5.6 6.5-5.6 1.2 0 2.3.3 3.2.8" /><path d="M18 14v6M15 17h6" /></>,
  agendaMais: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></>,
  folha: <><path d="M6 3h9l4 4v14H6z" /><path d="M14.5 3v4.5H19M9 12h7M9 16h5" /></>,
  velocidade: <><path d="M4.5 17a8.5 8.5 0 1 1 15 0" /><path d="m12 13 4-5" /><circle cx="12" cy="13.5" r="1.3" /></>,
  copiar: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  atualizar: <><path d="M20 12a8 8 0 1 1-2.5-5.8" /><path d="M20 4v5h-5" /></>,
};

export function Icone({ nome, tamanho = 20, tracado = 1.6, className }) {
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tracado} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {I[nome]}
    </svg>
  );
}
