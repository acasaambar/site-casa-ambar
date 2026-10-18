// ============================================================
//  CONFIGURAÇÃO DO SITE — CASA ÂMBAR
//  Tudo o que muda com frequência fica aqui.
// ============================================================

export const CONFIG = {
  // Cole aqui a URL do Web App do Apps Script (termina em /exec).
  // Enquanto estiver vazio, o site roda em MODO DEMONSTRAÇÃO
  // (dados salvos só no navegador, para apresentar e testar).
  API_URL: 'https://script.google.com/macros/s/AKfycbyifKgzuxAU0V-RR639J3vs1opngMDOPWpLXMEWg7LkgB4bpyoVy4yqRXuLu7_v_DWx/exec',

  nome: 'Casa Âmbar',
  endereco: 'Rua Eduardo Salgado, 448 · Aldeota · Fortaleza',
  mapa: 'https://maps.google.com/?q=Rua+Eduardo+Salgado,+448,+Aldeota,+Fortaleza',
  instagram: 'acasaambar',
  whatsapp: '5585991856528', // só números, com 55 + DDD
  telefone: '(85) 99185-6528',
  horario: 'Seg a sex, 6h às 20h · Sáb, 7h às 12h · Dom, fechado', // vazio = não aparece

  // Regras das reservas
  checkinAbreMinAntes: 30, // check-in libera X minutos antes da aula
  cancelarAteHorasAntes: 2, // pode cancelar até X horas antes
  diasVisiveis: 7, // quantos dias aparecem na agenda
};

// Sala de yoga: 12 tapetes, 3 colunas × 4 fileiras.
// A fileira 1 é a mais perto da professora.
export const SALA_YOGA = {
  colunas: 3,
  tapetes: 12,
};

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
