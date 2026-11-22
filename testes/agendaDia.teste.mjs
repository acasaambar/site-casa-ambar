// Agenda do dia (computador): contas puras de agendaUtil.js
import { areasDaPessoa, faixasLadoALado, conferirDia, resumoDoDia } from '../src/bancada/agendaUtil.js';
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra) : ''); } else console.log('  ✓', msg); };

console.log('— áreas de cada pessoa');
ok(JSON.stringify(areasDaPessoa(['Fisioterapia'], ['Pilates'])) === JSON.stringify([['fisio', 'Fisioterapia'], ['pilates', 'Pilates']]), 'fisioterapeuta que dá Pilates mostra as duas áreas');
ok(areasDaPessoa(['Estética facial', 'Estética corporal', 'Estética capilar']).length === 1, 'várias estéticas viram uma só');
ok(JSON.stringify(areasDaPessoa([], ['Yoga', 'Pilates'])) === JSON.stringify([['pilates', 'Pilates'], ['yoga', 'Yoga']]), 'quem só dá aula');

console.log('— lado a lado');
let f = faixasLadoALado([{ id: 'a', ini: 360, fim: 420 }, { id: 'b', ini: 390, fim: 450 }, { id: 'c', ini: 480, fim: 540 }]);
ok(f.a.faixas === 2 && f.b.faixas === 2 && f.a.faixa !== f.b.faixa, 'dois que se cruzam dividem a coluna', f);
ok(f.c.faixas === 1 && f.c.faixa === 0, 'o que não cruza ocupa a coluna toda', f.c);
f = faixasLadoALado([{ id: 'a', ini: 360, fim: 480 }, { id: 'b', ini: 360, fim: 420 }, { id: 'c', ini: 420, fim: 480 }]);
ok(f.a.faixas === 2 && f.b.faixa === f.c.faixa, 'quem termina libera a faixa para o próximo', f);
ok(Object.keys(faixasLadoALado([])).length === 0, 'coluna vazia');

console.log('— conferir o dia');
const lista = [
  { id: 'A1', profissional: 'Wesley', hora: '08:30', duracao: 60, status: 'agendado', nome: 'Renata' },
  { id: 'A2', profissional: 'Lia', hora: '10:00', duracao: 60, status: 'confirmado', nome: 'Luana' },
  { id: 'A3', profissional: 'Lia', hora: '10:30', duracao: 30, status: 'cancelado', nome: 'Cancelada' },
  { id: 'A4', profissional: 'Lia', hora: '15:00', duracao: 60, status: 'agendado', nome: 'Bruna' },
];
const aulas = [
  { id: 'P8', professor: 'Wesley', modalidade: 'Pilates', hora: '08:00', duracao: 60, capacidade: 4, ocupadosQtd: 2 },
  { id: 'P9', professor: 'Wesley', modalidade: 'Pilates', hora: '09:30', duracao: 60, capacidade: 4, ocupadosQtd: 4 },
  { id: 'Y7', professor: '', modalidade: 'Yoga', hora: '07:00', duracao: 60, capacidade: 12, ocupadosQtd: 3 },
];
const folgas = [{ id: 'F1', profissional: 'Lia', diaTodo: false, inicio: '14:00', fim: '16:00', motivo: 'Curso' }];
const c = conferirDia({ lista, aulas, folgas });
ok(c.some((x) => x.tipo === 'choque' && x.pessoa === 'Wesley' && x.alvo.atendimento?.id === 'A1'), 'aula e atendimento da mesma pessoa no mesmo horário', c);
ok(!c.some((x) => x.texto.includes('Cancelada')), 'atendimento cancelado não conta');
ok(c.some((x) => x.tipo === 'semProfessor'), 'aula sem quem dá');
ok(c.some((x) => x.tipo === 'bloqueio' && x.alvo.atendimento?.id === 'A4'), 'atendimento em horário bloqueado');
ok(!c.some((x) => x.texto.includes('09h30') || (x.tipo === 'choque' && x.texto.includes('9h30'))), 'aula das 9h30 não bate com o atendimento das 8h30–9h30');
ok(c.map((x) => x.hora).join() === [...c.map((x) => x.hora)].sort((a, b) => a - b).join(), 'em ordem de horário');
ok(conferirDia({}).length === 0, 'dia vazio não quebra');

console.log('— resumo do dia');
const r = resumoDoDia({ lista, aulas }, 9 * 60);
ok(r.atendimentos === 3 && r.confirmados === 1 && r.lugares === 20 && r.ocupados === 9, 'contas do dia', r);
ok(r.proximo && r.proximo.hora === '09:30' && r.proximo.texto === 'Pilates', 'próximo horário depois de agora', r.proximo);
ok(resumoDoDia({ lista: [], aulas: [] }).proximo === null, 'sem agora, sem próximo');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
