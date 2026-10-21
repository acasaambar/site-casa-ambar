// Catálogo → Serviços → "Quem faz este serviço": serviço novo aparece para agendar com quem foi marcado
// (bug de out/2026: combo criado no catálogo não mostrava ninguém, porque as profissionais têm lista própria de serviços)
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const fazServico = (p, s) => (p.servicos.length ? p.servicos.some((c) => c.id === s.id) : !p.categorias.length || p.categorias.includes(s.categoria));
const cat0 = chamar('b_catalogoServicos', { token: adm }).dados;
const [A, B] = cat0.profissionais.filter((p) => p.ativo).map((p) => p.nome);
let dia = ctx.somarDias(hojeS, 2); while ([0, 6].includes(new Date(dia + 'T12:00:00Z').getUTCDay())) dia = ctx.somarDias(dia, 1);
// A com lista própria e comissão especial num serviço (não pode se perder)
chamar('b_salvarProfissional', { token: adm, profissional: { ...cat0.profissionais.find((p) => p.nome === A), horarios: undefined, nomeOriginal: A,
  servicos: [{ id: 'drenagem', comissao: 35, duracao: 50 }, { id: 'limpeza-pele', comissao: '', duracao: '' }] } });

console.log('— serviço novo com quem faz marcado');
let r = chamar('b_salvarServico', { token: adm, servico: { nome: 'Combo Alívio Promocional', categoria: 'Estética corporal', duracao: 60, preco: 199, profissionais: [A] } });
ok(r.ok, 'salvou o combo', r.erro);
let cat = r.dados;
const combo = cat.servicos.find((s) => s.nome === 'Combo Alívio Promocional');
const pa = () => cat.profissionais.find((p) => p.nome === A), pb = () => cat.profissionais.find((p) => p.nome === B);
ok(fazServico(pa(), combo), `${A} passa a fazer o combo`);
ok(pa().servicos.find((c) => c.id === 'drenagem')?.comissao === 35 && pa().servicos.find((c) => c.id === 'drenagem')?.duracao === 50, 'a comissão e o tempo dela na drenagem continuam');
ok(!fazServico(pb(), combo), `${B} (não marcada) não faz`);
const h = chamar('b_horarios', { token: adm, servicoId: combo.id, profissional: A, data: dia }).dados;
ok(!/não faz/.test(h.motivo || ''), 'o combo aparece para agendar com ela', h.motivo);

console.log('— trocar quem faz');
r = chamar('b_salvarServico', { token: adm, servico: { ...combo, profissionais: [B] } });
cat = r.dados;
ok(!fazServico(pa(), cat.servicos.find((s) => s.id === combo.id)) && fazServico(pb(), cat.servicos.find((s) => s.id === combo.id)), `sai ${A}, entra ${B}`);
ok(pa().servicos.some((c) => c.id === 'drenagem' && c.comissao === 35), `${A} continua com os outros serviços dela`);
ok(cat.servicos.filter((s) => s.id !== combo.id).every((s) => fazServico(pb(), s) === fazServico(cat0.profissionais.find((p) => p.nome === B), s)), `${B} continua fazendo o que já fazia`);

console.log('— editar sem mexer em quem faz não muda nada');
const antes = JSON.stringify(cat.profissionais.map((p) => [p.nome, p.servicos, p.categorias]));
r = chamar('b_salvarServico', { token: adm, servico: { ...cat.servicos.find((s) => s.id === combo.id), preco: 189 } });
ok(r.ok && JSON.stringify(r.dados.profissionais.map((p) => [p.nome, p.servicos, p.categorias])) === antes, 'sem a lista, as profissionais ficam como estavam');

console.log('— combo vendido como pacote: cada agendamento gasta uma sessão');
{
  r = chamar('b_salvarPacote', { token: adm, pacote: { servicoId: combo.id, sessoes: 4, preco: 599, validadeDias: 120, semJurosAte: 3, ativo: true } });
  const pac = r.dados.pacotes.find((p) => p.servicoId === combo.id);
  const cli = chamar('b_novoAluno', { token: adm, nome: 'Cliente Combo Teste', whatsapp: '85966667777' }).dados.cpf;
  const cm = chamar('b_salvarComanda', { token: adm, comanda: { cpf: cli, itens: [{ tipo: 'pacote', id: pac.id, nome: 'pacote', qtd: 1 }] } }).dados;
  r = chamar('b_fecharComanda', { token: adm, id: cm.id, pagamentos: [{ metodo: 'Pix', valor: cm.total }] });
  ok(r.ok, 'vendeu o pacote do combo na comanda', r.erro);
  const saldo = () => (chamar('b_creditosServico', { token: adm, cpf: cli, servicoId: combo.id, data: dia }).dados || {}).restantes;
  ok(saldo() === 4, 'o cliente tem 4 sessões');
  const hs = chamar('b_horarios', { token: adm, servicoId: combo.id, profissional: B, data: dia }).dados.horarios;
  r = chamar('b_agendarServico', { token: adm, servicoId: combo.id, profissional: B, data: dia, hora: hs[0], cpf: cli, pagamento: 'pacote' });
  ok(r.ok && r.dados.pagamento === 'pacote' && saldo() === 3, 'agendou: sobram 3', r.erro || saldo());
  chamar('b_atualizarAtendimento', { token: adm, id: r.dados.id, status: 'cancelado' });
  ok(saldo() === 4, 'cancelou: a sessão volta');
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
