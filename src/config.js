// ============================================================
//  CONFIGURAÇÃO DO SITE — CASA ÂMBAR
//  Tudo o que muda com frequência fica aqui.
// ============================================================

export const CONFIG = {
  // Cole aqui a URL do Web App do Apps Script (termina em /exec).
  // Enquanto estiver vazio, o site roda em MODO DEMONSTRAÇÃO
  // (dados salvos só no navegador, para apresentar e testar).
  // Para testar sem mexer na planilha: VITE_DEMO=1 npm run dev
  API_URL: import.meta.env.VITE_DEMO
    ? ''
    : import.meta.env.VITE_API_URL || 'https://script.google.com/macros/s/AKfycbyifKgzuxAU0V-RR639J3vs1opngMDOPWpLXMEWg7LkgB4bpyoVy4yqRXuLu7_v_DWx/exec',

  nome: 'Casa Âmbar',
  endereco: 'Rua Eduardo Salgado, 448 · Aldeota · Fortaleza',
  mapa: 'https://maps.google.com/?q=Rua+Eduardo+Salgado,+448,+Aldeota,+Fortaleza',
  instagram: 'acasaambar',
  whatsapp: '5585991856528', // só números, com 55 + DDD
  telefone: '(85) 99185-6528',
  email: 'contato@acasaambar.com.br',
  horario: 'Seg a sex, 6h às 20h · Sáb, 7h às 12h · Dom, fechado', // vazio = não aparece

  // Regras das reservas
  checkinAbreMinAntes: 30, // check-in libera X minutos antes da aula
  cancelarAteHorasAntes: 2, // pode cancelar até X horas antes
  diasVisiveis: 7, // quantos dias aparecem na agenda
};

// Sala de yoga: 12 tapetes, 2 colunas × 6 fileiras, com corredor no meio.
// O tapete 1 é o mais perto da professora (à esquerda), o 2 ao lado (à direita).
export const SALA_YOGA = {
  colunas: 2,
  tapetes: 12,
};

// Aparelhos do estúdio de Pilates (um de cada, na ordem do número)
export const APARELHOS_PILATES = ['Reformer', 'Cadillac', 'Chair', 'Ladder Barrel'];

// Grade fixa de aulas (usada no modo demonstração e para
// preencher a aba "Grade" da planilha na primeira configuração).
// dia: 0 = domingo, 1 = segunda ... 6 = sábado
export const GRADE = [
  // YOGA
  { modalidade: 'Yoga', dia: 1, hora: '06:30', professor: 'Ana Paula', capacidade: 12 },
  { modalidade: 'Yoga', dia: 1, hora: '07:30', professor: 'Ana Paula', capacidade: 12 },
  { modalidade: 'Yoga', dia: 1, hora: '18:30', professor: 'Hanna', capacidade: 12 },
  { modalidade: 'Yoga', dia: 3, hora: '06:30', professor: 'Ana Paula', capacidade: 12 },
  { modalidade: 'Yoga', dia: 3, hora: '07:30', professor: 'Ana Paula', capacidade: 12 },
  { modalidade: 'Yoga', dia: 3, hora: '18:30', professor: 'Hanna', capacidade: 12 },
  { modalidade: 'Yoga', dia: 5, hora: '06:30', professor: 'Ana Paula', capacidade: 12 },
  { modalidade: 'Yoga', dia: 5, hora: '07:30', professor: 'Ana Paula', capacidade: 12 },
  { modalidade: 'Yoga', dia: 6, hora: '07:00', professor: 'Ana Paula', capacidade: 12 },
  // PILATES — segunda a sexta
  ...[1, 2, 3, 4, 5].flatMap((dia) =>
    ['06:00', '07:00', '08:00', '09:00', '16:00', '17:00', '18:00', '19:00'].map((hora) => ({
      modalidade: 'Pilates',
      dia,
      hora,
      // manhãs com Kalliny, tardes com Sara
      professor: Number(hora.slice(0, 2)) < 12 ? 'Kalliny' : 'Sara',
      capacidade: 4, // número de aparelhos de Pilates
    }))
  ),
];

// Endereço público do site (para onde a InfinitePay devolve a aluna)
export const SITE_URL = 'https://www.acasambar.com.br/';

// Catálogo de planos (no site oficial ele vem da aba "Planos" da planilha;
// esta lista é usada no modo demonstração)
export const PLANOS_DEMO = [
  ['yoga-avulsa', 'Yoga', 'avulsa', 'Yoga · aula avulsa', 0, 1, 30, 63, 'Uma aula, válida por 30 dias'],
  ['yoga-mensal-1x', 'Yoga', 'mensal', 'Yoga · 1x na semana', 1, 0, 30, 200, 'Plano mensal'],
  ['yoga-mensal-2x', 'Yoga', 'mensal', 'Yoga · 2x na semana', 2, 0, 30, 350, 'Plano mensal'],
  ['yoga-mensal-3x', 'Yoga', 'mensal', 'Yoga · 3x na semana', 3, 0, 30, 480, 'Plano mensal'],
  ['yoga-mensal-4x', 'Yoga', 'mensal', 'Yoga · 4x na semana', 4, 0, 30, 580, 'Plano mensal'],
  ['yoga-trimestral-1x', 'Yoga', 'trimestral', 'Yoga · 1x na semana · trimestral', 1, 0, 90, 561, '3 meses (R$ 187/mês)'],
  ['yoga-trimestral-2x', 'Yoga', 'trimestral', 'Yoga · 2x na semana · trimestral', 2, 0, 90, 978, '3 meses (R$ 326/mês)'],
  ['yoga-trimestral-3x', 'Yoga', 'trimestral', 'Yoga · 3x na semana · trimestral', 3, 0, 90, 1344, '3 meses (R$ 448/mês)'],
  ['yoga-trimestral-4x', 'Yoga', 'trimestral', 'Yoga · 4x na semana · trimestral', 4, 0, 90, 1626, '3 meses (R$ 542/mês)'],
  ['pilates-avulsa', 'Pilates', 'avulsa', 'Pilates · aula avulsa', 0, 1, 30, 75, 'Uma aula, válida por 30 dias'],
  ['pilates-mensal-2x', 'Pilates', 'mensal', 'Pilates · 2x na semana', 2, 0, 30, 380, 'Plano mensal'],
  ['pilates-mensal-3x', 'Pilates', 'mensal', 'Pilates · 3x na semana', 3, 0, 30, 480, 'Plano mensal'],
  ['pilates-trimestral-2x', 'Pilates', 'trimestral', 'Pilates · 2x na semana · trimestral', 2, 0, 90, 1065, '3 meses (R$ 355/mês)'],
  ['pilates-trimestral-3x', 'Pilates', 'trimestral', 'Pilates · 3x na semana · trimestral', 3, 0, 90, 1347, '3 meses (R$ 449/mês)'],
].map(([id, modalidade, tipo, nome, aulasSemana, aulasTotal, validadeDias, preco, descricao]) => ({
  id, modalidade, tipo, nome, aulasSemana, aulasTotal, validadeDias, preco, descricao,
  semJurosAte: tipo === 'trimestral' ? 3 : 1,
}));

// Regra de parcelamento: todos em até 12x no cartão.
// Sem juros: avulsa e mensal só em 1x; trimestral até 3x.
export const PARCELAS_MAX = 12;
export function semJuros(plano) {
  return Number(plano?.semJurosAte) || (plano?.tipo === 'trimestral' ? 3 : 1);
}
export function condicaoPagamento(plano) {
  const n = semJuros(plano);
  return n > 1
    ? `Pix, ou cartão em até ${n}x sem juros (até ${PARCELAS_MAX}x com juros)`
    : `Pix ou cartão 1x sem juros (2x a ${PARCELAS_MAX}x com juros)`;
}

// Avisar para renovar quando faltarem X dias para o plano vencer
export const AVISO_RENOVAR_DIAS = 7;

export const PRECOS_AULAS = {
  Yoga: [
    ['Aula avulsa', 'R$ 63'],
    ['1x na semana', 'R$ 200'],
    ['2x na semana', 'R$ 350'],
    ['3x na semana', 'R$ 480'],
    ['4x na semana', 'R$ 580'],
  ],
  Pilates: [
    ['Aula avulsa', 'R$ 75'],
    ['2x na semana', 'R$ 380'],
    ['3x na semana', 'R$ 480'],
  ],
};

export const CUIDADOS = [
  {
    titulo: 'Estética facial',
    itens: [
      ['Limpeza de Pele Premium', '1h30', 'R$ 199'],
      ['Limpeza de Pele Premium Clareadora', '1h30', 'R$ 229'],
      ['Peeling Coreano', '40 min', 'R$ 249'],
      ['Microagulhamento Facial', '40 min', 'R$ 299'],
    ],
  },
  {
    titulo: 'Estética corporal',
    itens: [
      ['Drenagem Linfática', '1h', 'R$ 199'],
      ['Protocolo Desinchar (Detox)', '1h30', 'R$ 229'],
      ['Ritual Acalmar · massagem relaxante', '1h30', 'R$ 199'],
      ['Escalda-pés', '20 min', 'R$ 49'],
      ['Clareamento de axila', '', 'R$ 229'],
      ['Clareamento de virilha', '', 'R$ 249'],
      ['Estrias com microagulhamento', '40 min', 'R$ 299'],
    ],
  },
  {
    titulo: 'Estética capilar',
    itens: [
      ['Microagulhamento capilar', '', 'R$ 229'],
      ['Ledterapia + alta frequência', '', 'R$ 169'],
    ],
  },
  {
    titulo: 'Fisioterapia',
    itens: [
      ['Consulta com procedimentos conforme avaliação', '', 'R$ 219'],
      ['Liberação miofascial · ventosas · dry needling · eletroterapia', '', ''],
      ['Pós-operatório · lesões musculares · tendinopatias', '', ''],
    ],
  },
];
