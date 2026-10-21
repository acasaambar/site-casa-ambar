// Horários livres na tela (src/bancada/horariosLivres.js) × no servidor (b_horarios):
// para cada dia da semana, profissional e serviço, a tela tem de mostrar exatamente o que o servidor mostra.
import { createRequire } from 'module';
import { horariosLivres, segundosAgoraFortaleza } from '../src/bancada/horariosLivres.js';

const require = createRequire(import.meta.url);
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0, conferidos = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 700) : ''); } else console.log('  ✓', msg); };
const seg = (d) => ctx.somarDias(d, -((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7));

// situações a mais: uma profissional que também dá aula, casa fechada num dia, folga de meio período e um atendimento falta
const cat0 = chamar('b_catalogoServicos', { token: adm }).dados;
const prof0 = cat0.profissionais[0];
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Kalliny', categorias: ['Estética corporal'], dias: [1, 2, 3, 4, 5], inicio: '06:00', fim: '20:00', comissao: 20 } });
const semanaQueVem = seg(ctx.somarDias(hojeS, 7));
const quarta = ctx.somarDias(semanaQueVem, 2);
const sexta = ctx.somarDias(semanaQueVem, 4);
chamar('b_bloquear', { token: adm, data: sexta, motivo: 'feriado' });
chamar('b_salvarFolga', { token: adm, profissional: prof0.nome, data: quarta, inicio: '13:00', fim: '15:30', motivo: 'médico' });
const h = chamar('b_horarios', { token: adm, servicoId: 'drenagem', profissional: prof0.nome, data: quarta }).dados;
const at = chamar('b_agendarServico', { token: adm, servicoId: 'drenagem', profissional: prof0.nome, data: quarta, hora: h.horarios[2], cliente: { nome: 'Faltou Teste', whatsapp: '85900001111' }, pagamento: 'no_dia' }).dados;
const at2 = chamar('b_agendarServico', { token: adm, servicoId: 'drenagem', profissional: prof0.nome, data: quarta, hora: h.horarios[8], cliente: { nome: 'Veio Teste', whatsapp: '85900002222' }, pagamento: 'no_dia' }).dados;

function comparar(de, rotulo, extra = {}) {
  const semana = chamar('b_agendaSemana', { token: adm, de }).dados;
  const cat = chamar('b_catalogoServicos', { token: adm }).dados;
  let iguais = 0;
  const erros = [];
  for (let i = 0; i < 7; i++) {
    const data = ctx.somarDias(de, i);
    for (const p of cat.profissionais.filter((x) => x.ativo)) {
      for (const s of cat.servicos.filter((x) => x.ativo)) {
        const srv = chamar('b_horarios', { token: adm, servicoId: s.id, profissional: p.nome, data, ...extra }).dados;
        const loc = horariosLivres({ semana, catalogo: cat, servicoId: s.id, profissional: p.nome, data, ignorarId: extra.ignorarId, hoje: hojeS, segundosAgora: segundosAgoraFortaleza() });
        conferidos++;
        if (!loc) { erros.push({ data, p: p.nome, s: s.id, motivo: 'a tela não calculou' }); continue; }
        if (JSON.stringify(loc.horarios) === JSON.stringify(srv.horarios) && (loc.motivo || '') === (srv.motivo || '') && (!srv.horarios.length || loc.duracao === srv.duracao)) iguais++;
        else erros.push({ data, p: p.nome, s: s.id, tela: [loc.horarios.slice(0, 6), loc.motivo], servidor: [srv.horarios.slice(0, 6), srv.motivo] });
      }
    }
  }
  ok(erros.length === 0, `${rotulo}: tela = servidor em ${iguais} combinações`, erros.slice(0, 3));
}

console.log('— as situações difíceis existem mesmo nesta semana');
{
  const semana = chamar('b_agendaSemana', { token: adm, de: semanaQueVem }).dados;
  const cat = chamar('b_catalogoServicos', { token: adm }).dados;
  const conta = (prof, data) => horariosLivres({ semana, catalogo: cat, servicoId: 'drenagem', profissional: prof, data, hoje: hojeS, segundosAgora: 0 });
  ok(/casa fechada/.test(conta(prof0.nome, sexta).motivo || ''), 'casa fechada na sexta', conta(prof0.nome, sexta));
  const qa = conta(prof0.nome, quarta).horarios;
  ok(!qa.includes('13:00') && !qa.includes('14:00') && !qa.includes(h.horarios[8]), 'folga de meio período e atendimento ocupam o horário', qa);
  const aulasK = semana.aulas.filter((x) => x.professor === 'Kalliny' && x.data === quarta);
  const k = conta('Kalliny', quarta);
  ok(aulasK.length > 0 && k && aulasK.every((x) => !k.horarios.includes(x.hora)), 'aula da Kalliny ocupa o horário de serviço dela', { aulas: aulasK.map((x) => x.hora), livres: k && k.horarios.slice(0, 12) });
}

console.log('— a tela calcula igual ao servidor');
comparar(seg(hojeS), 'semana de hoje (horários que já passaram somem)');
comparar(semanaQueVem, 'semana que vem (folga, aula, casa fechada, atendimentos)');

console.log('— falta libera o horário; remarcar ignora o próprio horário');
chamar('b_atualizarAtendimento', { token: adm, id: at.id, status: 'falta' });
comparar(semanaQueVem, 'depois da falta');
comparar(semanaQueVem, 'remarcando (ignora o próprio)', { ignorarId: at2.id });

console.log('— fora da semana carregada: deixa para o servidor');
{
  const semana = chamar('b_agendaSemana', { token: adm, de: semanaQueVem }).dados;
  const r = horariosLivres({ semana, catalogo: cat0, servicoId: 'drenagem', profissional: prof0.nome, data: ctx.somarDias(semanaQueVem, 9), hoje: hojeS, segundosAgora: 0 });
  ok(r === null, 'dia de outra semana: a tela não inventa (o servidor responde)');
}

console.log(`\n${conferidos} combinações conferidas`);
console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo.');
process.exit(falhas ? 1 : 0);
