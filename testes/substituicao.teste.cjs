// Substituição de profissional: aulas e serviços (agenda, comissão, comanda, pedidos)
const { criar } = require('./simulador.cjs');
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
const proxDiaUtil = (base, n) => { let d = ctx.somarDias(base, n); while (new Date(d + 'T12:00:00Z').getUTCDay() % 6 === 0) d = ctx.somarDias(d, 1); return d; };
const FICHA = { emergencia_nome: 'Mãe', emergencia_telefone: '85999998888', parq_1: 'nao', parq_2: 'nao', parq_3: 'nao', parq_4: 'nao', parq_5: 'nao', parq_6: 'nao', parq_7: 'nao', declaracao: true, consentimento: true, data_nascimento: '1990-05-12' };
const membro = (email, nome, papel, professorNome, senha) => {
  chamar('b_salvarMembro', { token: adm, membro: { email, nome, papel, professorNome } });
  chamar('novaSenha', { t: linkDe(emails.at(-1)), senha });
  return chamar('b_entrar', { email, senha }).dados.token;
};
ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
const rec = membro('bia@acasaambar.com.br', 'Bia Santos', 'recepcao', '', 'recep2026ok');
const lia = membro('lia@gmail.com', 'Lia Esteticista', 'professora', 'Lia Esteticista', 'liaestetica1');
const mara = membro('mara@gmail.com', 'Mara Facial', 'professora', 'Mara Facial', 'marafacial12');
const kal = membro('kalliny@gmail.com', 'Kalliny Rocha', 'professora', 'Kalliny', 'kalliny2026');
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Lia Esteticista', categorias: ['Estética corporal'], dias: [1, 2, 3, 4, 5, 6], inicio: '08:00', fim: '18:00', comissao: 40 } });
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Mara Facial', categorias: ['Estética corporal'], dias: [1, 2, 3, 4, 5, 6], inicio: '08:00', fim: '18:00', comissao: 30 } });
const dia = proxDiaUtil(hoje, 2);
let r;

console.log('— serviço: trocar a profissional de um atendimento');
{
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '10:00', cliente: { nome: 'Joana Lima', whatsapp: '85988887777' } });
  const at = r.dados.id;
  ok(r.ok && at, 'atendimento da Lia', r);
  const outro = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Mara Facial', data: dia, hora: '10:00', cliente: { nome: 'Outra Pessoa', whatsapp: '85977776666' } }).dados.id;
  r = chamar('b_opcoesSubstituicao', { token: rec, tipo: 'servico', ref: at });
  const mc = r.ok && r.dados.candidatos.find((c) => c.nome === 'Mara Facial');
  ok(mc && /atende Outra Pessoa/.test(mc.ocupada) && mc.comissao === null, 'Mara aparece ocupada; recepção não vê comissão', r.dados);
  ok(chamar('b_opcoesSubstituicao', { token: adm, tipo: 'servico', ref: at }).dados.comissaoTitular === '40%', 'administração vê a comissão da titular');
  r = chamar('b_substituir', { token: rec, tipo: 'servico', ref: at, substituto: 'Mara Facial' });
  ok(!r.ok && r.codigo === 'OCUPADA', 'não troca para quem está ocupada (sem confirmar)', r);
  chamar('b_atualizarAtendimento', { token: rec, id: outro, status: 'cancelado' });
  const nEmails = emails.length;
  r = chamar('b_substituir', { token: rec, tipo: 'servico', ref: at, substituto: 'Mara Facial', motivo: 'Lia com febre' });
  ok(r.ok && r.dados.profissional === 'Mara Facial' && r.dados.avisos.length === 1 && r.dados.avisos[0].whatsapp === '85988887777' && /vai ser com Mara Facial/.test(r.dados.avisos[0].texto),
    'troca feita, com a mensagem pronta para o WhatsApp da cliente', r);
  ok(emails.length === nEmails + 1 && emails.at(-1).to === 'mara@gmail.com' && /cobrir/.test(emails.at(-1).subject), 'quem cobre recebe e-mail (cliente não)');
  const linhaAt = () => ctx.lerAba('Atendimentos').find((a) => a.id === at);
  ok(linhaAt().profissional === 'Mara Facial' && linhaAt().titular === 'Lia Esteticista', 'agenda: atendimento na coluna da Mara');
  ok(!chamar('b_atendimentos', { token: lia, de: dia, dias: 1 }).dados.atendimentos.some((a) => a.id === at) && chamar('b_atendimentos', { token: mara, de: dia, dias: 1 }).dados.atendimentos.some((a) => a.id === at),
    'sai da agenda da Lia e entra na da Mara');
  ctx.lerAba('Atendimentos'); // atendimento “aconteceu”: data no passado para poder marcar
  ctx.atualizarLinha('Atendimentos', linhaAt()._linha, { data: ctx.somarDias(hoje, -1) });
  r = chamar('b_atualizarAtendimento', { token: rec, id: at, status: 'atendido', metodo: 'Pix', valor: 199 });
  const com = () => ctx.lerAba('Comissoes').find((c) => c.id === 'K' + at);
  ok(r.ok && com() && com().profissional === 'Mara Facial' && Number(com().pct) === 30 && /no lugar de Lia/.test(com().item), 'comissão para a Mara, pela regra dela (30%)', com());
  r = chamar('b_substituir', { token: adm, tipo: 'servico', ref: at, substituto: 'Mara Facial', regra: 'titular' });
  ok(r.ok && com().profissional === 'Mara Facial' && Number(com().pct) === 40, 'regra da titular: Mara recebe os 40% da Lia', com());
  r = chamar('b_substituir', { token: rec, tipo: 'servico', ref: at, substituto: 'Lia Esteticista' });
  ok(r.ok && r.dados.desfeita && linhaAt().profissional === 'Lia Esteticista' && !linhaAt().titular && com().profissional === 'Lia Esteticista' && !/no lugar/.test(com().item),
    'desfazer: volta tudo para a Lia', com());
  ok(ctx.lerAba('Substituicoes').find((s) => s.ref === at).status === 'desfeita', 'histórico guarda a troca desfeita');

  // comanda aberta acompanha a troca
  const at2 = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '15:00', cliente: { nome: 'Carla Dias', whatsapp: '85966665555' } }).dados.id;
  const cm = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: at2 }).dados;
  chamar('b_substituir', { token: rec, tipo: 'servico', ref: at2, substituto: 'Mara Facial' });
  const itens = JSON.parse(ctx.lerAba('Comandas').find((c) => c.id === cm.id).itens);
  ok(itens.find((i) => i.atendimentoId === at2).profissional === 'Mara Facial', 'comanda aberta passa para a Mara');
  r = chamar('b_opcoesSubstituicao', { token: rec, tipo: 'servico', ref: at2 });
  ok(r.ok && r.dados.candidatos[0].titular && r.dados.candidatos[0].nome === 'Lia Esteticista', 'a titular aparece primeiro, para desfazer');
}

console.log('— aula: substituta naquele dia');
{
  chamar('b_salvarPagamentoAulas', { token: adm, professoras: [{ nome: 'Kalliny', pilatesPct: 40, desde: ctx.somarDias(hoje, -10) }, { nome: 'Sara', pilatesPct: 30, desde: ctx.somarDias(hoje, -10) }] });
  chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Alice Pilates', whatsapp: '85991112222', email: 'alice@gmail.com', senha: 'aluna2026' });
  const tA = chamar('entrar', { cpf: '52998224725', senha: 'aluna2026' }).dados.token;
  chamar('salvarAnamnese', { token: tA, ficha: FICHA });
  chamar('b_vender', { token: adm, cpf: '52998224725', planoId: 'pilates-mensal-2x', metodo: 'Pix', inicio: ctx.somarDias(hoje, -6) });
  const futura = ctx.gerarAulas(hoje, 7).find((a) => a.modalidade === 'Pilates' && a.professor === 'Kalliny' && ctx.inicio(a) > new Date(Date.now() + 3 * 3600e3));
  r = chamar('b_agendar', { token: rec, cpf: '52998224725', aulaId: futura.id, forma: 'credito' });
  ok(r.ok, 'aluna na aula da Kalliny', r);

  // a profissional pede; a recepção vê
  r = chamar('b_pedirSubstituicao', { token: kal, data: futura.data, de: futura.hora, ate: futura.hora.replace(/^\d\d/, (h) => String(Number(h) + 1).padStart(2, '0')), motivo: '' });
  ok(!r.ok && /motivo/.test(r.erro), 'pedido precisa de motivo');
  r = chamar('b_pedirSubstituicao', { token: kal, data: futura.data, de: futura.hora, ate: futura.hora.replace(/^\d\d/, (h) => String(Number(h) + 1).padStart(2, '0')), motivo: 'Consulta médica' });
  ok(r.ok && r.dados.pedidos === 1, 'Kalliny pediu substituição', r);
  r = chamar('b_pedirSubstituicao', { token: kal, tipo: 'aula', ref: futura.id, motivo: 'De novo' });
  ok(!r.ok, 'não duplica o pedido');
  r = chamar('b_pedirSubstituicao', { token: lia, tipo: 'aula', ref: futura.id, motivo: 'x' });
  ok(!r.ok, 'ninguém pede pela aula dos outros');
  ok(chamar('b_resumo', { token: rec }).dados.pedidosTroca === 1, 'Hoje da recepção mostra o pedido');
  r = chamar('b_substituicoes', { token: rec });
  ok(r.ok && r.dados.pedidos.length === 1 && r.dados.pedidos[0].titular === 'Kalliny' && r.dados.pedidos[0].motivo === 'Consulta médica', 'pedido na lista da recepção', r.dados);

  r = chamar('b_opcoesSubstituicao', { token: adm, tipo: 'aula', ref: futura.id });
  const sara = r.ok && r.dados.candidatos.find((c) => c.nome === 'Sara');
  ok(sara && sara.comissao === '30% por aluno' && r.dados.pedido && r.dados.comissaoTitular === '40% por aluno', 'opções da aula: Sara, com os valores de cada uma', r.dados);
  r = chamar('b_substituir', { token: rec, tipo: 'aula', ref: futura.id, substituto: 'Sara' });
  ok(r.ok && r.dados.avisos.length === 1 && r.dados.avisos[0].nome === 'Alice Pilates' && /aula de Pilates/.test(r.dados.avisos[0].texto), 'aula trocada; lista para avisar a aluna', r);
  const aulaDepois = ctx.gerarAulas(futura.data, 1).find((a) => a.id === futura.id);
  ok(aulaDepois.professor === 'Sara' && aulaDepois.titular === 'Kalliny', 'a aula sai com a Sara (no lugar da Kalliny)');
  ok(ctx.lerAba('Reservas').filter((x) => x.aula_id === futura.id).every((x) => x.professor === 'Sara'), 'reservas da aula passam para a Sara');
  ok(ctx.lerAba('Substituicoes').filter((s) => s.ref === futura.id).length === 1 && ctx.lerAba('Substituicoes').find((s) => s.ref === futura.id).status === 'feita', 'o pedido virou a troca (sem linha duplicada)');
  ok(!chamar('b_agenda', { token: kal, de: futura.data, dias: 1 }).dados.some((a) => a.id === futura.id), 'sai da agenda da Kalliny');
  r = chamar('aulas', { token: tA });
  ok(r.ok && r.dados.find((a) => a.id === futura.id).professor === 'Sara', 'no site, a aula aparece com a Sara');
  ok(chamar('b_substituicoes', { token: kal }).dados.historico.some((s) => s.ref === futura.id && s.substituto === 'Sara'), 'Kalliny vê quem cobriu');

  // comissão de aula que já aconteceu
  const passada = ctx.gerarAulas(ctx.somarDias(hoje, -5), 5).find((a) => a.modalidade === 'Pilates' && a.professor === 'Kalliny' && ctx.inicio(a).getTime() + 3600e3 < Date.now());
  const rp = chamar('b_agendar', { token: adm, cpf: '52998224725', aulaId: passada.id, forma: 'credito' });
  chamar('b_substituir', { token: rec, tipo: 'aula', ref: passada.id, substituto: 'Sara', regra: 'titular' });
  const kc = () => chamar('b_comissoes', { token: adm, mes: passada.data.slice(0, 7) }).dados.lista.find((c) => c.id === 'Kaula:' + rp.dados.id);
  let k = kc();
  ok(k && k.profissional === 'Sara' && k.pct === 40 && /no lugar de Kalliny/.test(k.item), 'regra da titular: Sara recebe 40% (da Kalliny)', k);
  chamar('b_substituir', { token: rec, tipo: 'aula', ref: passada.id, substituto: 'Sara', regra: 'substituta' });
  k = kc();
  ok(k && k.profissional === 'Sara' && k.pct === 30, 'regra de quem substitui: 30% (da Sara)', k);
  chamar('b_substituir', { token: rec, tipo: 'aula', ref: passada.id, substituto: 'Kalliny' });
  k = kc();
  ok(k && k.profissional === 'Kalliny' && k.pct === 40 && !/no lugar/.test(k.item), 'desfez: comissão volta para a Kalliny', k);

  // pedido cancelado e recusado
  const outra = ctx.gerarAulas(hoje, 7).find((a) => a.modalidade === 'Pilates' && a.professor === 'Kalliny' && a.id !== futura.id && ctx.inicio(a) > new Date(Date.now() + 3 * 3600e3));
  chamar('b_pedirSubstituicao', { token: kal, tipo: 'aula', ref: outra.id, motivo: 'Viagem' });
  const ped = chamar('b_substituicoes', { token: kal }).dados.pedidos.find((p) => p.ref === outra.id);
  ok(chamar('b_cancelarPedido', { token: lia, id: ped.id }).ok === false, 'outra profissional não cancela o pedido');
  ok(chamar('b_cancelarPedido', { token: rec, id: ped.id, resposta: 'Sem ninguém livre; vamos remarcar.' }).ok
    && ctx.lerAba('Substituicoes').find((s) => s.id === ped.id).status === 'recusada', 'recepção recusa com resposta');
}

console.log('— "alguém não vem": tudo da pessoa no dia, com quem pode cobrir');
{
  chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '11:30', cliente: { nome: 'Rita Souza', whatsapp: '85955554444' } });
  r = chamar('b_ausencia', { token: rec, profissional: 'Lia Esteticista', data: dia });
  ok(r.ok && r.dados.servicos && r.dados.itens.length >= 1 && r.dados.itens.every((i) => i.tipo === 'servico' && i.candidatos.some((c) => c.nome === 'Mara Facial')), 'lista os atendimentos da Lia com a Mara como opção', r.dados);
  r = chamar('b_ausencia', { token: lia, profissional: 'Lia Esteticista', data: dia });
  ok(!r.ok, 'profissional não usa a tela de ausência');
}

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
