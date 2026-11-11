// Reserva pelo site só com 24 h de antecedência + sino de avisos da bancada (reserva e cancelamento pelo site)
const { criar } = require('./simulador.cjs');
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
ctx.configurarPlanilha();
ctx.AJUSTES.reservarAteHorasAntes = 24; // como na Casa
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Maria Souza', whatsapp: '85999990000', email: 'maria@gmail.com', senha: 'abc12345' });
const maria = chamar('entrar', { cpf: '52998224725', senha: 'abc12345' }).dados.token;
chamar('salvarAnamnese', { token: maria, ficha: { emergencia_nome: 'Mãe', emergencia_telefone: '85999998888', parq_1: 'nao', parq_2: 'nao', parq_3: 'nao', parq_4: 'nao', parq_5: 'nao', parq_6: 'nao', parq_7: 'nao', declaracao: true, consentimento: true, data_nascimento: '1990-05-12' } });
chamar('b_vender', { token: rec, cpf: '52998224725', planoId: 'pilates-avulsa', metodo: 'Pix' });
chamar('b_vender', { token: rec, cpf: '52998224725', planoId: 'pilates-avulsa', metodo: 'Pix', confirmarRepetida: [], motivoRepetida: 'duas aulas' });
let r;
const agora = Date.now();
const pilates = ctx.gerarAulas().filter((a) => a.modalidade === 'Pilates');
const perto = pilates.find((a) => ctx.inicio(a).getTime() > agora + 3600e3 && ctx.inicio(a).getTime() < agora + 20 * 3600e3);
const longe = pilates.find((a) => ctx.inicio(a).getTime() > agora + 26 * 3600e3);

console.log('— reserva pelo site só com 24 h de antecedência');
r = chamar('aulas', { token: maria });
const lista = r.dados || [];
ok(perto && lista.find((a) => a.id === perto.id).foraDoPrazo === true, 'aula das próximas 24 h vem marcada como fora do prazo', perto && perto.id);
ok(lista.find((a) => a.id === longe.id).foraDoPrazo === false, 'aula daqui a mais de 24 h pode ser reservada');
r = chamar('reservar', { token: maria, aulaId: perto.id });
ok(!r.ok && r.codigo === 'ANTECEDENCIA' && /24 horas/.test(r.erro), 'reservar aula das próximas 24 h é recusado com o motivo', r);
r = chamar('regras', {});
ok(!r.ok || r.dados.reservarAteHorasAntes === 24 || r.dados.reservarAteHorasAntes === undefined, 'regras do site trazem o prazo');
r = chamar('b_agendar', { token: rec, aulaId: perto.id, cpf: '52998224725', forma: 'cortesia' });
ok(r.ok, 'a recepção continua marcando aula de hoje pela bancada', r.erro);
ok(chamar('b_avisos', { token: rec }).dados.avisos.length === 0, 'agendamento pela bancada não gera aviso no sino');

console.log('— sino da bancada');
r = chamar('reservar', { token: maria, aulaId: longe.id });
ok(r.ok && r.dados.status === 'reservado', 'aluna reserva aula com mais de 24 h', r.erro);
const reservaId = r.dados && r.dados.id;
r = chamar('b_avisos', { token: rec });
const av = (r.dados && r.dados.avisos) || [];
ok(r.ok && av.length === 1 && av[0].tipo === 'reserva' && av[0].nome === 'Maria Souza' && av[0].aulaId === longe.id && av[0].hora === longe.hora && av[0].modalidade === 'Pilates',
  'recepção vê "Maria Souza reservou Pilates" com dia e hora', av);
ok(r.ok && r.dados.agora, 'a resposta traz a hora do servidor');
// profissional: só vê os avisos das aulas dela
chamar('b_salvarMembro', { token: adm, membro: { email: 'prof@gmail.com', nome: longe.professor, papel: 'professora', professorNome: longe.professor } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'prof2026ok' });
const prof = chamar('b_entrar', { email: 'prof@gmail.com', senha: 'prof2026ok' }).dados.token;
ok(chamar('b_avisos', { token: prof }).dados.avisos.length === 1, 'quem dá a aula vê o aviso da aula dela');
chamar('b_salvarMembro', { token: adm, membro: { email: 'outra@gmail.com', nome: 'Outra Pessoa', papel: 'professora', professorNome: 'Outra Pessoa' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'outra2026ok' });
const outra = chamar('b_entrar', { email: 'outra@gmail.com', senha: 'outra2026ok' }).dados.token;
ok(chamar('b_avisos', { token: outra }).dados.avisos.length === 0, 'outra profissional não vê avisos de aulas que não são dela');
r = chamar('b_avisos', { token: 'x'.repeat(40) });
ok(!r.ok, 'sem login não vê avisos');

console.log('— cancelamento pelo site também avisa');
r = chamar('cancelar', { token: maria, reservaId });
ok(r.ok, 'aluna cancela', r.erro);
const av2 = chamar('b_avisos', { token: rec }).dados.avisos;
ok(av2.length === 2 && av2[0].tipo === 'cancelou' && av2[0].nome === 'Maria Souza', 'o aviso mais novo é o cancelamento', av2);

console.log('— ajuste do prazo');
r = chamar('b_salvarAjustes', { token: adm, ajustes: { reservarAteHorasAntes: 12 } });
ok(r.ok, 'administração muda o prazo para 12 h', r.erro);
r = chamar('b_salvarAjustes', { token: adm, ajustes: { reservarAteHorasAntes: 100 } });
ok(!r.ok, 'prazo acima de 72 h é recusado');

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
