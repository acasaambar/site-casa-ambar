// Novidades do dia a dia: alertas da cliente, arrastar para remarcar, semana, lista de espera, série/retorno,
// confirmação por link, caixa por forma e taxas, pacote na comanda
const { criar } = require('./simulador.cjs');
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs']);
const { ctx, chamar, emails, cacheStore } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'lia@gmail.com', nome: 'Lia Esteticista', papel: 'professora', professorNome: 'Lia Esteticista' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'liamoura2026' });
const lia = chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liamoura2026' }).dados.token;
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Lia Esteticista', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 40 } });
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Mara Facial', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 30 } });
chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Maria Souza', whatsapp: '85999990000', email: 'maria@gmail.com', senha: 'abc12345' });
const MARIA = '52998224725';
let r;
// próximo dia de segunda a sexta (sábado a casa fecha ao meio-dia)
let dia = ctx.somarDias(hoje, 1); while ([0, 6].includes(new Date(dia + 'T12:00:00Z').getUTCDay())) dia = ctx.somarDias(dia, 1);

console.log('— alertas da cliente');
{
  r = chamar('b_salvarAluno', { token: rec, cpf: MARIA, dados: { alertaFixo: 'Alergia a látex  ' } });
  ok(r.ok && r.dados.alertaFixo === 'Alergia a látex' && r.dados.alertas.includes('Alergia a látex'), 'alerta fixo salvo no cadastro', r.dados && r.dados.alertas);
  const at = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '09:00', cpf: MARIA, pagamento: 'no_dia' }).dados;
  ok(at.alertas && at.alertas.includes('Alergia a látex'), 'aparece no atendimento da agenda', at);
  r = chamar('b_atendimentos', { token: lia, de: dia, dias: 1 });
  ok(r.ok && r.dados.atendimentos[0].alertas.includes('Alergia a látex') && !r.dados.atendimentos[0].cpf, 'a profissional vê o alerta (sem o CPF)', r.dados.atendimentos[0]);
  const cm = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: at.id }).dados;
  ok(cm.alertas.includes('Alergia a látex'), 'aparece na comanda', cm.alertas);
  chamar('b_salvarFichaEstetica', { token: rec, cpf: MARIA, ficha: { alergias: 'ácido glicólico', queixa: 'manchas' } });
  r = chamar('b_aluno', { token: rec, cpf: MARIA });
  ok(r.dados.alertas.some((t) => /glicólico/.test(t)), 'alergia da ficha de estética entra nos alertas (cache apagado ao gravar)', r.dados.alertas);
  chamar('b_salvarFichaEstetica', { token: rec, cpf: MARIA, ficha: { alergias: 'não', queixa: 'manchas' } });
  r = chamar('b_aluno', { token: rec, cpf: MARIA });
  ok(!r.dados.alertas.some((t) => /Alergia: n/.test(t)), '"não" não vira alerta', r.dados.alertas);
  chamar('b_cancelarComanda', { token: rec, id: cm.id });
  chamar('b_atualizarAtendimento', { token: rec, id: at.id, status: 'cancelado' });
}

// CPF válido a partir de 9 dígitos
const cpfDe = (n9) => {
  const d = String(n9).padStart(9, '0').split('').map(Number);
  const dv = (arr) => { const s = arr.reduce((t, x, i) => t + x * (arr.length + 1 - i), 0) % 11; return s < 2 ? 0 : 11 - s; };
  d.push(dv(d)); d.push(dv(d));
  return d.join('');
};
const novoCliente = (i, email) => {
  const cpf = cpfDe(123456000 + i * 7);
  const r = chamar('b_novoAluno', { token: rec, cpf, nome: 'Cliente Teste' + String.fromCharCode(65 + i) + ' Silva', whatsapp: '8598888' + String(1000 + i), email, enviarConvite: false });
  if (!r.ok) throw new Error(r.erro);
  return r.dados.cpf;
};

console.log('— lista de espera de aula lotada');
{
  // primeira aula de Pilates futura (capacidade 4)
  let aula = null;
  for (let i = 1; i < 8 && !aula; i++) aula = chamar('b_agenda', { token: rec, de: ctx.somarDias(hoje, i), dias: 1 }).dados.find((a) => a.modalidade === 'Pilates');
  ok(!!aula, 'achou uma aula de Pilates', aula);
  const cpfs = [0, 1, 2, 3].map((i) => novoCliente(i));
  const reservas = cpfs.slice(0, aula.capacidade).map((cpf) => chamar('b_agendar', { token: rec, aulaId: aula.id, cpf, forma: 'cortesia' }).dados.id);
  ok(reservas.every(Boolean), 'aula lotada com ' + aula.capacidade + ' cortesias');
  const FICHA = { emergencia_nome: 'Mãe', emergencia_telefone: '85999998888', parq_1: 'nao', parq_2: 'nao', parq_3: 'nao', parq_4: 'nao', parq_5: 'nao', parq_6: 'nao', parq_7: 'nao', declaracao: true, consentimento: true, data_nascimento: '1990-05-12' };
  const maria = chamar('entrar', { cpf: MARIA, senha: 'abc12345' }).dados.token;
  chamar('salvarAnamnese', { token: maria, ficha: FICHA });
  r = chamar('entrarEspera', { token: maria, aulaId: aula.id });
  ok(r.ok && r.dados.naEspera, 'a aluna entra na lista de espera pelo site', r);
  r = chamar('entrarEspera', { token: maria, aulaId: aula.id });
  ok(r.ok && ctx.lerAba('Espera').filter((x) => x.aula_id === aula.id && x.status === 'esperando').length === 1, 'entrar de novo não duplica');
  r = chamar('aulas', { token: maria });
  ok(r.ok && r.dados.find((a) => a.id === aula.id).naEspera === true, 'a lista de aulas mostra que ela está esperando');
  r = chamar('b_entrarEspera', { token: rec, tipo: 'aula', aulaId: aula.id, cliente: { nome: 'Sem Cadastro', whatsapp: '85987654321' } });
  ok(!r.ok && /cadastro/.test(r.erro), 'lista de aula pede cadastro');
  r = chamar('b_espera', { token: rec, aulaId: aula.id });
  ok(r.ok && r.dados.length === 1 && r.dados[0].nome === 'Maria Souza', 'a recepção vê quem espera', r.dados);
  ok(!chamar('b_espera', { token: lia }).ok, 'profissional não abre a lista de espera');
  const nEmails = emails.length;
  r = chamar('b_cancelarReserva', { token: rec, reservaId: reservas[0] });
  ok(r.ok && r.dados.avisados === 1 && emails.length === nEmails + 1 && emails.at(-1).to === 'maria@gmail.com' && /Abriu uma vaga/.test(emails.at(-1).subject),
    'cancelou uma reserva: e-mail "abriu uma vaga" para quem espera', [r, emails.at(-1) && emails.at(-1).subject]);
  ok(ctx.lerAba('Espera').find((x) => x.aula_id === aula.id).status === 'avisado', 'fica como avisada');
  const res = chamar('b_resumo', { token: rec }).dados;
  ok(res.espera && res.espera.aulasComVaga === 1, 'tela Hoje: 1 aula com vaga e gente esperando', res.espera);
  r = chamar('b_agendar', { token: rec, aulaId: aula.id, cpf: MARIA, forma: 'cortesia' });
  ok(r.ok && ctx.lerAba('Espera').find((x) => x.aula_id === aula.id).status === 'agendado', 'reservou: sai da lista sozinha');
  ok(chamar('b_espera', { token: rec, aulaId: aula.id }).dados.length === 0, 'lista da aula vazia');
  r = chamar('sairEspera', { token: maria, aulaId: aula.id });
  ok(r.ok, 'sair da lista pelo site');
}

console.log('— lista de espera de serviço');
{
  r = chamar('b_entrarEspera', { token: rec, tipo: 'servico', servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, periodo: 'tarde', cliente: { nome: 'Rosa Lima', whatsapp: '85991112222' }, obs: 'prefere depois das 15h' });
  ok(r.ok && r.dados.servico === 'Drenagem Linfática' && r.dados.periodo === 'tarde', 'serviço na lista (sem cadastro, com período)', r);
  const idEsp = r.dados.id;
  r = chamar('b_entrarEspera', { token: rec, tipo: 'servico', servicoId: 'drenagem', data: ctx.somarDias(hoje, -2), cpf: MARIA });
  ok(!r.ok && /hoje em diante/.test(r.erro), 'dia que já passou é recusado');
  r = chamar('b_entrarEspera', { token: rec, tipo: 'servico', servicoId: 'limpeza-pele', cpf: MARIA });
  ok(r.ok && !r.dados.data, 'qualquer dia (sem data)');
  ok(chamar('b_espera', { token: rec, tipo: 'servico' }).dados.length === 2, 'duas pessoas esperando serviço');
  r = chamar('b_agendarServico', { token: rec, servicoId: 'limpeza-pele', profissional: 'Mara Facial', data: dia, hora: '15:00', cpf: MARIA, pagamento: 'no_dia' });
  const idLimpeza = r.dados.id;
  ok(r.ok && chamar('b_espera', { token: rec, tipo: 'servico' }).dados.length === 1, 'Maria agendou a limpeza: sai da lista');
  r = chamar('b_atualizarEspera', { token: rec, id: idEsp, status: 'avisado' });
  ok(r.ok && r.dados.status === 'avisado' && r.dados.avisadoEm, 'marcar como avisada (WhatsApp)');
  r = chamar('b_atualizarEspera', { token: rec, id: idEsp, status: 'desistiu' });
  ok(r.ok && chamar('b_espera', { token: rec, tipo: 'servico' }).dados.length === 0, 'desistiu: sai da lista');
  chamar('b_atualizarAtendimento', { token: rec, id: idLimpeza, status: 'cancelado' });
}

console.log('— retornos sugeridos');
{
  const cat = chamar('b_catalogoServicos', { token: adm }).dados;
  const dren = cat.servicos.find((s) => s.id === 'drenagem');
  r = chamar('b_salvarServico', { token: adm, servico: { ...dren, retornoDias: 30 } });
  ok(r.ok && r.dados.servicos.find((s) => s.id === 'drenagem').retornoDias === 30, 'serviço com retorno em 30 dias');
  const cpf = novoCliente(9);
  let antes = ctx.somarDias(hoje, -31);
  if (new Date(antes + 'T12:00:00Z').getUTCDay() === 0) antes = ctx.somarDias(antes, -1);
  const at = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: antes, hora: '10:00', cpf, pagamento: 'cortesia' }).dados;
  chamar('b_atualizarAtendimento', { token: rec, id: at.id, status: 'atendido' });
  r = chamar('b_retornos', { token: rec });
  const meu = r.ok && r.dados.lista.find((x) => x.cpf === cpf);
  ok(meu && meu.servico === 'Drenagem Linfática' && meu.retornoEm === ctx.somarDias(antes, 30), 'passou do prazo: aparece nos retornos', r.dados);
  ok(chamar('b_resumo', { token: rec }).dados.retornos >= 1, 'a tela Hoje conta os retornos');
  r = chamar('b_marcarRetorno', { token: rec, atendimentoId: at.id, como: 'avisado' });
  ok(r.ok && !chamar('b_retornos', { token: rec }).dados.lista.some((x) => x.cpf === cpf), 'avisado: sai da lista', r);
  // quem já tem algo marcado não aparece
  const cpf2 = novoCliente(10);
  const r2 = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: antes, hora: '08:00', cpf: cpf2, pagamento: 'cortesia' });
  if (!r2.ok) console.log(r2.erro);
  const at2 = r2.dados;
  chamar('b_atualizarAtendimento', { token: rec, id: at2.id, status: 'atendido' });
  chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '17:00', cpf: cpf2, pagamento: 'no_dia' });
  ok(!chamar('b_retornos', { token: rec }).dados.lista.some((x) => x.cpf === cpf2), 'já tem horário marcado: não aparece');
}

console.log('— agendamento em série');
{
  const cpf = novoCliente(11);
  let ini = ctx.somarDias(hoje, 2);
  while (new Date(ini + 'T12:00:00Z').getUTCDay() !== 2) ini = ctx.somarDias(ini, 1); // terça
  // a terceira terça já está ocupada
  const ocupa = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Mara Facial', data: ctx.somarDias(ini, 14), hora: '16:00', cpf: MARIA, pagamento: 'no_dia' });
  ok(ocupa.ok, 'horário ocupado numa das semanas', ocupa);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Mara Facial', data: ini, hora: '16:00', cpf, pagamento: 'pago', metodo: 'Pix', repetir: { cadaDias: 7, vezes: 4 } });
  ok(r.ok && r.dados.serie && r.dados.serie.criados.length === 3 && r.dados.serie.pulados.length === 1 && r.dados.serie.pulados[0].data === ctx.somarDias(ini, 14),
    'série de 4 semanas: 3 marcadas, a ocupada pulada com o motivo', r.dados && r.dados.serie);
  ok(r.dados.serie.criados[0].pagamento === 'pago' && r.dados.serie.criados.slice(1).every((x) => x.pagamento === 'no_dia'), 'só a primeira paga; as outras para pagar no dia');
  ok(ctx.lerAba('Pagamentos').filter((p) => p.cpf === cpf).length === 1, 'um pagamento só');
  // pacote: usa as sessões enquanto houver
  const cpfP = novoCliente(12);
  chamar('b_vender', { token: rec, cpf: cpfP, planoId: 'drenagem-5', metodo: 'Pix' });
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: ini, hora: '18:00', cpf: cpfP, pagamento: 'pacote', repetir: { cadaDias: 7, vezes: 6 } });
  const pgs = r.ok ? r.dados.serie.criados.map((x) => x.pagamento) : [];
  ok(r.ok && pgs.length === 6 && pgs.filter((x) => x === 'pacote').length === 5 && pgs[5] === 'no_dia', 'pacote de 5: cinco pelo pacote e a sexta para pagar no dia', r.ok ? pgs : r);
}

console.log('— confirmação pelo link do lembrete');
{
  const amanha = dia; // um dia útil à frente
  const at = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Mara Facial', data: amanha, hora: '07:00', cpf: MARIA, pagamento: 'no_dia' }).dados;
  ok(/#\/confirmar\/A[A-Z0-9]+\.[a-f0-9]{24}$/.test(at.linkConfirmar), 'o atendimento traz o link de confirmação para a recepção', at.linkConfirmar);
  const t = at.linkConfirmar.split('/confirmar/')[1];
  ok(!chamar('b_atendimentos', { token: lia, de: amanha, dias: 1 }).dados.atendimentos.some((a) => a.linkConfirmar), 'a profissional não recebe o link');
  r = chamar('b_lembretes', { token: rec, data: amanha });
  const lb = r.dados.lista.find((x) => x.id === at.id);
  ok(lb && lb.texto.includes('/confirmar/' + t), 'o texto do lembrete pelo WhatsApp leva o link', lb && lb.texto);
  r = chamar('verConfirmacao', { t });
  ok(r.ok && r.dados.nome === 'Maria' && r.dados.servico === 'Drenagem Linfática' && !r.dados.cpf && !r.dados.whatsapp, 'o link mostra só o primeiro nome e o horário', r.dados);
  ok(!chamar('verConfirmacao', { t: t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a') }).ok, 'link adulterado é recusado');
  ok(!chamar('verConfirmacao', { t: 'A123.abc' }).ok, 'link inventado é recusado');
  r = chamar('responderConfirmacao', { t, resposta: 'confirmo' });
  ok(r.ok && r.dados.resposta === 'confirmou' && r.dados.status === 'confirmado', 'Confirmo: fica confirmado na agenda', r.dados);
  r = chamar('responderConfirmacao', { t, resposta: 'remarcar', recado: 'prefiro quinta à tarde' });
  const linha = ctx.lerAba('Atendimentos').find((a) => a.id === at.id);
  ok(r.ok && linha.resposta === 'remarcar' && /quinta à tarde/.test(linha.obs), 'Preciso remarcar: pedido e recado ficam no atendimento', linha);
  ok(chamar('b_resumo', { token: rec }).dados.remarcar.n === 1, 'tela Hoje mostra o pedido para remarcar');
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Mara Facial', data: amanha, hora: '08:00', reagendarId: at.id });
  ok(r.ok && !r.dados.resposta && chamar('b_resumo', { token: rec }).dados.remarcar.n === 0, 'reagendado: o pedido some');
  ok(!chamar('verConfirmacao', { t }).ok, 'remarcou: o link antigo deixa de valer');
  const t2 = r.dados.linkConfirmar.split('/confirmar/')[1];
  ok(t2 !== t && chamar('verConfirmacao', { t: t2 }).dados.hora === '08:00', 'o link novo mostra o horário novo');
  chamar('b_atualizarAtendimento', { token: rec, id: at.id, status: 'cancelado' });
  r = chamar('responderConfirmacao', { t: t2, resposta: 'confirmo' });
  ok(!r.ok && /cancelado/.test(r.erro), 'horário cancelado não aceita confirmação');
}

console.log('— caixa: conferir com o extrato e taxas da maquininha');
{
  r = chamar('b_abrirCaixa', { token: rec, valor: 100 });
  ok(r.ok || /já foi aberto/.test(r.erro), 'caixa de hoje aberto');
  const vender = (metodo, valor, extra = {}) => {
    const c = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Teste Caixa', whatsapp: '85990001111' }, itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor } }] } }).dados;
    return chamar('b_fecharComanda', { token: rec, id: c.id, pagamentos: [{ metodo, valor, ...extra }] });
  };
  ok(vender('Cartão de crédito', 300, { parcelas: 3, bandeira: 'Visa' }).ok, 'venda no crédito 3x Visa');
  ok(vender('Cartão de débito', 100, { bandeira: 'Elo' }).ok, 'venda no débito Elo');
  ok(vender('Pix', 50).ok, 'venda no Pix');
  r = chamar('b_caixa', { token: rec });
  const cred = r.dados.conferir.find((f) => f.forma === 'Cartão de crédito');
  ok(cred.valor >= 300 && cred.bandeiras.some((b) => b.nome === 'Visa'), 'o caixa mostra o crédito por bandeira para conferir', r.dados.conferir);
  const pix = r.dados.conferir.find((f) => f.forma === 'Pix').valor;
  r = chamar('b_fecharCaixa', { token: rec, contado: r.dados.esperado, conferencia: { 'Cartão de crédito': cred.valor, Pix: pix - 10 } });
  const conf = r.ok ? r.dados.conferencia : [];
  ok(r.ok && conf.length === 2 && conf.find((x) => x.forma === 'Pix').diferenca === -10 && conf.find((x) => x.forma === 'Cartão de crédito').diferenca === 0,
    'fechamento guarda a conferência: crédito bateu, Pix com R$ 10 a menos', conf);
  r = chamar('b_reabrirCaixa', { token: adm });
  ok(r.ok && r.dados.conferencia.length === 0, 'reabrir limpa a conferência');
  // taxas
  ok(!chamar('b_salvarAjustes', { token: adm, ajustes: { taxas: { pix: 25 } } }).ok, 'taxa acima de 20% é recusada');
  r = chamar('b_salvarAjustes', { token: adm, ajustes: { taxas: { pix: 0.5, debito: 1.5, credito1: 3, credito2a6: 4, credito7a12: 6, link: 5 } } });
  ok(r.ok && r.dados.taxas.credito2a6 === 4, 'taxas salvas em Ajustes');
  ok(!chamar('b_salvarAjustes', { token: rec, ajustes: { taxas: { pix: 1 } } }).ok, 'recepção não muda as taxas');
  r = chamar('b_financeiro', { token: adm, mes: hoje.slice(0, 7) });
  const esperado = Math.round((300 * 0.04 + 100 * 0.015 + 50 * 0.005) * 100) / 100;
  ok(r.ok && r.dados.taxasConfiguradas && r.dados.taxas >= esperado && r.dados.liquido === Math.round((r.dados.entradas - r.dados.taxas - r.dados.saidas) * 100) / 100,
    'Financeiro: taxas estimadas (crédito 3x a 4%, débito 1,5%, Pix 0,5%) e resultado líquido', [r.dados.taxas, esperado, r.dados.taxasPorForma]);
  chamar('b_salvarAjustes', { token: adm, ajustes: { regrasQualquer: 1, checkinAbreMinAntes: 30 } });
  ok(chamar('b_ajustes', { token: adm }).dados.taxas.credito2a6 === 4, 'salvar as regras não apaga as taxas');
}

console.log('— sessão do pacote direto na comanda');
{
  const cpf = novoCliente(13);
  chamar('b_vender', { token: rec, cpf, planoId: 'drenagem-5', metodo: 'Pix' });
  const sessoes = () => chamar('b_aluno', { token: rec, cpf }).dados.creditos.find((c) => /pacote/.test(c.descricao) || c.limite === 5);
  r = chamar('b_salvarComanda', { token: rec, comanda: { cpf, itens: [{ tipo: 'servico', id: 'drenagem', profissional: 'Lia Esteticista' }] } });
  let cm = r.dados;
  ok(r.ok && cm.itens[0].pacoteDisponivel && cm.itens[0].pacoteDisponivel.restantes === 5 && cm.total === 199, 'a comanda avisa que há pacote (5 sessões)', cm.itens[0]);
  r = chamar('b_salvarComanda', { token: rec, comanda: { id: cm.id, itens: cm.itens.map((i) => ({ ...i, usarPacote: true })) } });
  cm = r.dados;
  ok(r.ok && cm.itens[0].pacote && cm.total === 0 && cm.subtotal === 0, 'usar a sessão: o item fica sem cobrança', cm);
  r = chamar('b_salvarComanda', { token: rec, comanda: { id: cm.id, itens: [...cm.itens, { tipo: 'servico', id: 'drenagem', profissional: 'Mara Facial', usarPacote: true }] } });
  ok(r.ok && r.dados.itens.filter((i) => i.pacote).length === 2, 'duas sessões do mesmo pacote na mesma comanda');
  cm = r.dados;
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [] });
  ok(r.ok && r.dados.status === 'fechada', 'comanda fechada sem cobrança', r);
  const usadas = sessoes();
  ok(usadas && usadas.usadas === 2, 'o pacote passa a ter 2 sessões usadas', usadas);
  const ats = ctx.lerAba('Atendimentos').filter((a) => a.comanda === cm.id);
  ok(ats.length === 2 && ats.every((a) => a.pagamento === 'pacote' && a.status === 'atendido'), 'cada sessão vira um atendimento do pacote (histórico e contagem)', ats.map((a) => [a.pagamento, a.status]));
  const ks = ats.map((a) => ctx.lerAba('Comissoes').find((k) => k.id === 'K' + a.id));
  ok(ks.every((k) => k && Number(k.base) > 0), 'comissão pela regra do pacote (valor da sessão)', ks.map((k) => k && k.base));
  r = chamar('b_reabrirComanda', { token: adm, id: cm.id, motivo: 'teste do pacote' });
  ok(r.ok && sessoes().usadas === 0, 'reabrir devolve as sessões', [r.erro, sessoes()]);
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [] });
  ok(r.ok && sessoes().usadas === 2 && ctx.lerAba('Atendimentos').filter((a) => a.comanda === cm.id && a.status !== 'cancelado').length === 2, 'fechar de novo usa as sessões outra vez (sem duplicar)');
  // sem pacote: pedir para usar é recusado
  r = chamar('b_salvarComanda', { token: rec, comanda: { cpf: MARIA, itens: [{ tipo: 'servico', id: 'peeling-coreano', profissional: 'Lia Esteticista', usarPacote: true }] } });
  ok(!r.ok && /pacote/.test(r.erro), 'sem pacote: recusado', r);
}

console.log('— o login expira');
{
  const linhaDe = (nomeAba, tok) => ctx.valoresAba(nomeAba).findIndex((l) => l[0] === ctx.hashToken(tok)) + 1;
  const limparCacheSessao = (tok) => { const h = ctx.hashToken(tok); ['s_', 'e_', 'm_'].forEach((p) => delete cacheStore[p + h]); };
  // área do aluno: no máximo 7 dias (inclusive sessões antigas, criadas com prazo de 30 dias)
  let tok = chamar('entrar', { cpf: MARIA, senha: 'abc12345' }).dados.token;
  ok(chamar('minhasReservas', { token: tok }).ok, 'aluna logada usa o site');
  const s = ctx.aba('Sessoes');
  let l = linhaDe('Sessoes', tok);
  s.getRange(l, 3).setValue(ctx.somarDias(hoje, -8) + ' 10:00:00');
  s.getRange(l, 4).setValue(new Date(Date.now() + 20 * 86400e3).toISOString());
  limparCacheSessao(tok);
  r = chamar('minhasReservas', { token: tok });
  ok(!r.ok && /expirou/.test(r.erro), 'login de 8 dias atrás (mesmo com prazo antigo de 30 dias) expira', r);
  // bancada: vale só no dia e cai com 3 h sem uso
  const e = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados;
  ok(e.expira && new Date(e.expira) <= new Date(ctx.somarDias(hoje, 1) + 'T00:00:00-03:00') && new Date(e.expira) - Date.now() <= 14 * 3600e3 + 1000, 'login da bancada vale até a meia-noite (no máximo 14 h)', e.expira);
  ok(chamar('b_eu', { token: e.token }).ok, 'recepção logada usa a bancada');
  // o cache do Google pode falhar entre execuções: sem a marca no cache, logo depois de entrar, continua logada
  Object.keys(cacheStore).filter((k) => k.endsWith(ctx.hashToken(e.token))).forEach((k) => delete cacheStore[k]);
  ok(chamar('b_eu', { token: e.token }).ok, 'cache perdido logo depois de entrar: continua logada (confere na planilha)');
  // 4 h sem uso (gravado na planilha) e o cache vencido
  const lu = linhaDe('SessoesEquipe', e.token);
  ctx.aba('SessoesEquipe').getRange(lu, 3).setValue(ctx.Utilities.formatDate(new Date(Date.now() - 5 * 3600e3), 'America/Fortaleza', 'yyyy-MM-dd HH:mm:ss'));
  ctx.aba('SessoesEquipe').getRange(lu, 5).setValue(Date.now() - 4 * 3600e3);
  Object.keys(cacheStore).filter((k) => k.endsWith(ctx.hashToken(e.token))).forEach((k) => delete cacheStore[k]);
  r = chamar('b_eu', { token: e.token });
  ok(!r.ok && r.codigo === 'SESSAO_EQUIPE', '3 h sem uso: precisa entrar de novo', r);
  const e2 = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
  const se = ctx.aba('SessoesEquipe');
  l = linhaDe('SessoesEquipe', e2);
  // login de ontem: o prazo gravado (meia-noite de ontem) já passou
  se.getRange(l, 3).setValue(ctx.somarDias(hoje, -1) + ' 20:00:00');
  se.getRange(l, 4).setValue(new Date(hoje + 'T00:00:00-03:00').toISOString());
  limparCacheSessao(e2);
  r = chamar('b_eu', { token: e2 });
  ok(!r.ok && r.codigo === 'SESSAO_EQUIPE', 'login de ontem não vale hoje', r);
  const e3 = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
  chamar('b_sair', { token: e3 });
  ok(!chamar('b_eu', { token: e3 }).ok, 'sair encerra na hora');
}

console.log('— revisão de segurança');
{
  // 1. a profissional não vê código de vale-presente nem dados de quem recebe
  const cv = chamar('b_salvarComanda', { token: rec, comanda: { cpf: MARIA, itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor: 300, nome: 'Ana Recebe', whatsapp: '85988887777', email: 'ana@x.com' } }] } }).dados;
  chamar('b_fecharComanda', { token: rec, id: cv.id, pagamentos: [{ metodo: 'Pix', valor: 300 }] });
  const atL = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '11:00', cpf: MARIA, pagamento: 'no_dia' }).dados;
  r = chamar('b_comandasCliente', { token: lia, atendimentoId: atL.id });
  const txt = JSON.stringify(r.dados);
  ok(r.ok && !/AMBAR-/.test(txt) && !/88887777|ana@x\.com/.test(txt), 'a profissional não vê o código do vale nem o contato de quem recebe', txt.slice(0, 300));
  chamar('b_atualizarAtendimento', { token: rec, id: atL.id, status: 'cancelado' });
  // 2. o hash guardado na planilha não serve como login
  const tok = chamar('entrar', { cpf: MARIA, senha: 'abc12345' }).dados.token;
  ok(!chamar('minhaConta', { token: ctx.hashToken(tok) }).ok, 'o valor guardado na aba Sessoes não entra como a aluna');
  // 3. CPF de outra conta: só junta depois de confirmar
  const sem = chamar('b_novoAluno', { token: rec, nome: 'Clara Sem Cpf', whatsapp: '85977776666' }).dados.cpf;
  r = chamar('b_salvarAluno', { token: rec, cpf: sem, dados: { cpf: MARIA } });
  ok(!r.ok && r.codigo === 'CPF_DE_OUTRA', 'CPF que já tem cadastro: pede confirmação antes de juntar', r);
  ok(ctx.lerAba('Alunos').find((a) => a.cpf === sem && a.ativo !== 'NÃO'), 'nada foi juntado sem confirmar');
  // 5. trocar o e-mail anula links de senha pendentes
  chamar('b_enviarLinkSenha', { token: rec, cpf: MARIA });
  const link = (emails.at(-1).body.match(/t=([a-f0-9]+)/) || [])[1];
  chamar('trocarEmail', { token: tok, email: 'maria.nova@gmail.com', senha: 'abc12345' });
  ok(!chamar('novaSenha', { t: link, senha: 'outra12345' }).ok, 'trocou o e-mail: o link de senha antigo não vale mais');
  // 4. a profissional não muda atendimento de muitos dias atrás
  let diaVelho = ctx.somarDias(hoje, -3);
  while ([0, 6].includes(new Date(diaVelho + 'T12:00:00Z').getUTCDay())) diaVelho = ctx.somarDias(diaVelho, -1);
  const velho = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: diaVelho, hora: '09:00', cpf: MARIA, pagamento: 'no_dia' }).dados;
  chamar('b_atualizarAtendimento', { token: rec, id: velho.id, status: 'falta' });
  r = chamar('b_atualizarAtendimento', { token: lia, id: velho.id, status: 'atendido' });
  ok(!r.ok && /recepção/.test(r.erro), 'a profissional não transforma falta antiga em atendido (comissão)', r);
}

// --- próximas seções acrescentadas abaixo ---

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
