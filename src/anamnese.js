// ============================================================
//  FICHA DE SAÚDE (ANAMNESE) — perguntas usadas no cadastro
//  As chaves (id) precisam bater com as colunas da aba
//  "Anamneses" no Apps Script.
// ============================================================

// PAR-Q: questionário de prontidão para atividade física
export const PARQ = [
  { id: 'parq_1', texto: 'Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?' },
  { id: 'parq_2', texto: 'Você sente dores no peito quando pratica atividade física?' },
  { id: 'parq_3', texto: 'No último mês, você sentiu dores no peito quando praticou atividade física?' },
  { id: 'parq_4', texto: 'Você apresenta desequilíbrio devido a tontura e/ou perda da consciência?' },
  { id: 'parq_5', texto: 'Você possui algum problema ósseo ou articular que poderia piorar com atividade física?' },
  { id: 'parq_6', texto: 'Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?' },
  { id: 'parq_7', texto: 'Sabe de alguma outra razão pela qual você não deve praticar atividade física?' },
];

export const COMORBIDADES = [
  'Hipertensão',
  'Diabetes',
  'Problema cardíaco',
  'Asma ou problema respiratório',
  'Epilepsia ou convulsões',
  'Labirintite ou tontura frequente',
  'Hérnia de disco ou problema de coluna',
  'Osteoporose',
  'Problema de tireoide',
  'Varizes ou trombose',
  'Câncer (atual ou em tratamento)',
  'Fibromialgia',
];

export const PARENTESCO = ['Mãe', 'Pai', 'Cônjuge', 'Filho(a)', 'Irmão(ã)', 'Amigo(a)', 'Outro'];

export const FICHA_VAZIA = {
  data_nascimento: '',
  emergencia_nome: '',
  emergencia_parentesco: '',
  emergencia_telefone: '',
  plano_saude: '',
  parq_1: '', parq_2: '', parq_3: '', parq_4: '', parq_5: '', parq_6: '', parq_7: '',
  comorbidades: [],
  comorbidade_outra: '',
  gestante: '',
  gestante_semanas: '',
  cirurgias: '',
  lesoes: '',
  medicamentos: '',
  alergias: '',
  atividade_regular: '',
  observacoes: '',
  declaracao: false,
  consentimento: false,
};
