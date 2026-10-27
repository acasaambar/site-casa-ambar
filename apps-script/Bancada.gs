/**
 * ============================================================
 *  CASA ÂMBAR — BANCADA INTERNA (equipe)
 * ============================================================
 *  Papéis:
 *   admin       tudo (inclui relatórios, equipe, planos, cupons e ajustes)
 *   recepcao    agenda, alunos, vendas no balcão, vales, bloqueios
 *   professora  só as próprias aulas: lista de presença e ficha de saúde
 */

var PERMISSOES = {
  b_eu: ['admin', 'recepcao', 'professora'],
  b_sair: ['admin', 'recepcao', 'professora'],
  b_resumo: ['admin', 'recepcao', 'professora'],
  b_agenda: ['admin', 'recepcao', 'professora'],
  b_presenca: ['admin', 'recepcao', 'professora'],
  b_ficha: ['admin', 'recepcao', 'professora'],
  b_agendar: ['admin', 'recepcao'],
  b_cancelarReserva: ['admin', 'recepcao'],
  b_alunos: ['admin', 'recepcao'],
  b_aluno: ['admin', 'recepcao'],
  b_salvarAluno: ['admin', 'recepcao'],
  b_novoAluno: ['admin', 'recepcao'],
  b_enviarLinkSenha: ['admin', 'recepcao'],
  b_vender: ['admin', 'recepcao'],
  b_simularPreco: ['admin', 'recepcao'],
  b_pagamentos: ['admin', 'recepcao'],
  b_estornar: ['admin', 'recepcao'],
  b_marcarDevolvido: ['admin', 'recepcao'],
  b_ajustarCredito: ['admin', 'recepcao'],
  b_vales: ['admin', 'recepcao'],
  b_cancelarVale: ['admin', 'recepcao'],
  b_enviarVale: ['admin', 'recepcao'],
  b_aplicarVale: ['admin', 'recepcao'],
  b_cupons: ['admin', 'recepcao'],
  b_salvarCupom: ['admin'],
  b_bloqueios: ['admin', 'recepcao'],
  b_bloquear: ['admin', 'recepcao'],
  b_desbloquear: ['admin', 'recepcao'],
  b_grade: ['admin'],
  b_salvarGrade: ['admin'],
  b_planos: ['admin', 'recepcao'],
  b_salvarPlano: ['admin'],
  b_equipe: ['admin'],
  b_salvarMembro: ['admin'],
  b_ajustes: ['admin'],
  b_salvarAjustes: ['admin'],
  b_lerPlanilhaDeNovo: ['admin'],
  b_registro: ['admin'],
  b_relatorio: ['admin'],
  // serviços
  b_catalogoServicos: ['admin', 'recepcao', 'professora'],
  b_atendimentos: ['admin', 'recepcao', 'professora'],
  b_agendaSemana: ['admin', 'recepcao', 'professora'],
  b_atualizarAtendimento: ['admin', 'recepcao', 'professora'],
  b_horarios: ['admin', 'recepcao'],
  b_agendarServico: ['admin', 'recepcao'],
  b_agendarServicos: ['admin', 'recepcao'],
  b_creditosServico: ['admin', 'recepcao'],
  b_salvarServico: ['admin'],
  b_salvarPacote: ['admin'],
  b_salvarProfissional: ['admin'],
  b_excluirProfissional: ['admin'],
  b_renomearProfessora: ['admin'],
  b_relatorioProfissional: ['admin', 'professora'],
  // clientes: histórico, ficha de estética, evolução e fotos, importação
  b_prontuario: ['admin', 'recepcao', 'professora'],
  b_salvarFichaEstetica: ['admin', 'recepcao', 'professora'],
  b_salvarEvolucao: ['admin', 'recepcao', 'professora'],
  b_excluirEvolucao: ['admin', 'recepcao', 'professora'],
  b_foto: ['admin', 'recepcao', 'professora'],
  b_minhasClientes: ['professora'],
  b_anamnesesProf: ['admin', 'recepcao', 'professora'],
  b_anamneseProf: ['admin', 'recepcao', 'professora'],
  b_salvarAnamneseProf: ['admin', 'recepcao', 'professora'],
  b_excluirAnamneseProf: ['admin', 'recepcao', 'professora'],
  b_comandasCliente: ['admin', 'recepcao', 'professora'],
  b_importarClientes: ['admin'],
  // comandas e caixa
  b_comandas: ['admin', 'recepcao'],
  b_comanda: ['admin', 'recepcao'],
  b_salvarComanda: ['admin', 'recepcao'],
  b_comandaDoAtendimento: ['admin', 'recepcao'],
  b_fecharComanda: ['admin', 'recepcao'],
  b_cancelarComanda: ['admin', 'recepcao'],
  b_reabrirComanda: ['admin'],
  b_excluirCliente: ['admin'],
  b_caixa: ['admin', 'recepcao'],
  b_abrirCaixa: ['admin', 'recepcao'],
  b_movimentoCaixa: ['admin', 'recepcao'],
  b_fecharCaixa: ['admin', 'recepcao'],
  b_reabrirCaixa: ['admin'],
  // estoque
  b_produtos: ['admin', 'recepcao'],
  b_salvarProduto: ['admin'],
  b_movimentarEstoque: ['admin', 'recepcao'],
  b_movimentos: ['admin', 'recepcao'],
  // financeiro e comissões
  b_financeiro: ['admin'],
  b_despesas: ['admin'],
  b_salvarDespesa: ['admin'],
  b_pagarDespesa: ['admin'],
  b_excluirDespesa: ['admin'],
  b_comissoes: ['admin'],
  b_pagamentoAulas: ['admin'],
  b_salvarPagamentoAulas: ['admin'],
  b_pagarComissoes: ['admin'],
  b_meusGanhos: ['professora'],
  // bloqueio de horário das profissionais
  b_folgas: ['admin', 'recepcao', 'professora'],
  b_salvarFolga: ['admin', 'recepcao'],
  b_excluirFolga: ['admin', 'recepcao'],
  // substituições: a profissional pede; administração e recepção trocam
  b_opcoesSubstituicao: ['admin', 'recepcao'],
  b_substituir: ['admin', 'recepcao'],
  b_ausencia: ['admin', 'recepcao'],
  b_substituicoes: ['admin', 'recepcao', 'professora'],
  b_pedirSubstituicao: ['professora'],
  b_cancelarPedido: ['admin', 'recepcao', 'professora'],
  // marketing
  b_promocoes: ['admin', 'recepcao'],
  b_salvarPromocao: ['admin'],
  b_excluirPromocao: ['admin'],
  b_publicoCampanha: ['admin', 'recepcao'],
  b_enviarCampanha: ['admin'],
  b_registrarCampanha: ['admin', 'recepcao'],
  b_campanhas: ['admin', 'recepcao'],
  b_lembretes: ['admin', 'recepcao'],
  b_enviarLembretes: ['admin', 'recepcao'],
  b_marcarLembrete: ['admin', 'recepcao'],
  b_lembretesAuto: ['admin', 'recepcao'],
  // lista de espera e retornos (Espera.gs)
  b_espera: ['admin', 'recepcao'],
  b_receberAula: ['admin', 'recepcao'],
  b_corrigirFormasComanda: ['admin', 'recepcao'],
  b_corrigirVenda: ['admin', 'recepcao'],
  b_excluirVenda: ['admin', 'recepcao'],
  b_entrarEspera: ['admin', 'recepcao'],
  b_atualizarEspera: ['admin', 'recepcao'],
  b_retornos: ['admin', 'recepcao'],
  b_marcarRetorno: ['admin', 'recepcao'],
};

function executarBancada(d) {
  var fn = globalThis[String(d.acao).replace(/^b_/, 'bancada_')];
  var papeis = PERMISSOES[d.acao];
  if (!papeis || typeof fn !== 'function') throw new Error('Ação desconhecida.');
  var membro = membroDaSessao(d.token);
  if (papeis.indexOf(membro.papel) < 0) throw new Error('Seu acesso não permite esta ação.');
  return fn(d, membro);
}

function registrar(membro, acao, detalhe) {
  try {
    adicionarLinha('Registro', { quando: agoraTexto(), quem: membro ? membro.email : 'sistema', acao: acao, detalhe: String(detalhe || '').slice(0, 500) });
  } catch (e) { Logger.log('registro: ' + e.message); }
}

// ============================================================
//  LOGIN DA EQUIPE (e-mail + senha)
// ============================================================
function buscarMembro(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return null;
  return lerAba('Equipe').filter(function (m) { return String(m.email).trim().toLowerCase() === email; })[0] || null;
}

function membroPublico(m) {
  return { email: String(m.email).toLowerCase(), nome: m.nome, papel: m.papel, professorNome: m.professor_nome || '' };
}

function bancadaEntrar(d) {
  var email = String(d.email || '').trim().toLowerCase();
  limitarTentativas('e_' + email);
  var m = buscarMembro(email);
  var v = m && String(m.ativo).toUpperCase() !== 'NÃO' ? verificarSenha(d.senha, m.senha_hash, m.sal) : { ok: false };
  if (!v.ok) {
    registrarFalha('e_' + email);
    Utilities.sleep(600);
    // mesma mensagem para tudo: não revela quem é da equipe
    throw new Error('E-mail ou senha incorretos. Se você nunca criou uma senha, use o link do convite ou "Esqueci minha senha".');
  }
  limparFalhas('e_' + email);
  if (v.atualizar) gravarSenha('Equipe', m._linha, d.senha);
  atualizarLinha('Equipe', m._linha, { ultimo_acesso: agoraTexto() });
  var token = 'E' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  // o login da bancada vale até a meia-noite de hoje (Fortaleza), no máximo 14 h, e cai depois de 3 h sem uso
  var meiaNoite = new Date(somarDias(hojeTexto(), 1) + 'T00:00:00-03:00').getTime();
  var expira = new Date(Math.min(Date.now() + SESSAO_EQUIPE_MAX_MS, meiaNoite));
  adicionarLinha('SessoesEquipe', { token: hashToken(token), email: email, criada_em: agoraTexto(), expira_em: expira.toISOString(), uso_em: Date.now() });
  try { CacheService.getScriptCache().put('u_' + hashToken(token), String(Date.now()), SESSAO_EQUIPE_PARADA_S); } catch (e) { /* sem cache: vale a planilha */ }
  limparSessoesVencidas('SessoesEquipe');
  return { token: token, membro: membroPublico(m), expira: expira.toISOString(), paradaMin: SESSAO_EQUIPE_PARADA_S / 60 };
}

function bancadaEsqueci(d) {
  var email = String(d.email || '').trim().toLowerCase();
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('esqE_' + email) || 0);
  if (n >= 3) throw new Error('Já enviamos o link algumas vezes. Confira a caixa de entrada e o spam.');
  var m = buscarMembro(email);
  if (m && String(m.ativo).toUpperCase() !== 'NÃO') {
    var link = criarLinkSenha('equipe', email, email, 1, 'recuperação');
    enviarEmail(email, 'Nova senha da bancada · Casa Âmbar', 'Nova senha',
      ['Olá, ' + primeiroNome(m.nome) + '.', 'Use o botão abaixo para criar uma nova senha da bancada da Casa Âmbar. O link vale por 1 hora.',
        'Se não foi você que pediu, ignore este e-mail.'], { texto: 'Criar nova senha', url: link });
  } else {
    Utilities.sleep(400);
  }
  cache.put('esqE_' + email, String(n + 1), 3600);
  // mesma resposta sempre (não revela quem tem acesso)
  return { ok: true };
}

var SESSAO_EQUIPE_MAX_MS = 14 * 3600000; // no máximo 14 h (e nunca passa da meia-noite)
var SESSAO_EQUIPE_PARADA_S = 3 * 3600;   // 3 h sem usar a bancada: entra de novo

// linha da sessão na planilha, se ainda vale: no prazo (até a meia-noite, no máximo 14 h) e criada hoje
function linhaDaSessaoEquipe(h) {
  var linhas = valoresAba('SessoesEquipe');
  for (var i = 1; i < linhas.length; i++) {
    if (linhas[i][0] !== h) continue;
    // vale até o prazo gravado no login (meia-noite, no máximo 14 h): a mesma conta de sempre, sem ler a hora de criação
    var exp = ehData(linhas[i][3]) ? linhas[i][3] : new Date(String(linhas[i][3]));
    if (isNaN(exp.getTime()) || exp <= new Date()) { recusaSessao('prazo vencido', linhas[i]); return null; }
    return { n: i + 1, v: linhas[i], email: String(linhas[i][1]).toLowerCase() };
  }
  return null;
}

// anota por que um login da bancada foi recusado (ajuda a achar problema; não guarda o token)
function recusaSessao(motivo, linha) {
  Logger.log('sessão da bancada recusada: ' + motivo + ' · ' + (linha ? linha[1] : ''));
  try { registrar(null, 'sessão da bancada recusada', motivo + (linha ? ' · ' + linha[1] + ' · criada ' + String(linha[2]) + ' · prazo ' + String(linha[3]) + ' · uso ' + String(linha[4] || '') : '')); } catch (e) { /* ignora */ }
}

function membroDaSessao(token) {
  if (!token || String(token).charAt(0) !== 'E' || String(token).length < 30) throw erroCod('Sua sessão da bancada expirou. Entre novamente.', 'SESSAO_EQUIPE');
  var cache = CacheService.getScriptCache();
  var h = hashToken(token);
  var c = cache.getAll(['m_' + h, 'u_' + h]);
  var agora = Date.now();
  var usoGravado = Number(c['u_' + h] || 0); // quando o uso foi gravado na planilha pela última vez
  var email = '';
  // sem a marca recente no cache (o cache do Google pode falhar entre execuções): confere na planilha
  // e grava o uso lá (número: milissegundos, sem conta de fuso; no máximo a cada 30 min por pessoa)
  if (!usoGravado || agora - usoGravado > 30 * 60000) {
    var linha = linhaDaSessaoEquipe(h);
    if (!linha) throw erroCod('Sua sessão da bancada expirou. Entre novamente.', 'SESSAO_EQUIPE');
    var ultimo = Number(linha.v[4]);
    if (ultimo > 0 && ultimo <= agora + 60000 && agora - ultimo > SESSAO_EQUIPE_PARADA_S * 1000) {
      recusaSessao('3 h sem uso', linha.v);
      try { cache.remove('m_' + h); cache.remove('e_' + h); cache.remove('u_' + h); } catch (e) { /* ignora */ }
      throw erroCod('Sua sessão da bancada expirou por falta de uso. Entre novamente.', 'SESSAO_EQUIPE');
    }
    atualizarLinha('SessoesEquipe', linha.n, { uso_em: agora });
    cache.put('u_' + h, String(agora), SESSAO_EQUIPE_PARADA_S);
    email = linha.email;
  }
  // sessão conferida há pouco: a pessoa vem do cache (sem ler a planilha). Sai do cache se ela for
  // desativada, mudar de papel, trocar a senha ou sair.
  var guardado = c['m_' + h];
  if (guardado && !email) {
    try { return JSON.parse(guardado); } catch (e) { /* refaz abaixo */ }
  }
  if (!email) email = cache.get('e_' + h) || '';
  if (!email) {
    var achada = linhaDaSessaoEquipe(h);
    if (!achada) throw erroCod('Sua sessão da bancada expirou. Entre novamente.', 'SESSAO_EQUIPE');
    email = achada.email;
  }
  cache.put('e_' + h, email, 600);
  var m = buscarMembro(email);
  if (!m || String(m.ativo).toUpperCase() === 'NÃO') throw erroCod('Seu acesso à bancada foi desativado.', 'SESSAO_EQUIPE');
  var pessoa = { email: String(m.email).toLowerCase(), nome: String(m.nome || ''), papel: String(m.papel), professor_nome: String(m.professor_nome || '') };
  cache.put('m_' + h, JSON.stringify(pessoa), 600);
  return pessoa;
}

// tira do cache as sessões de alguém (mudou de papel, nome de professora ou foi desativado)
function esquecerSessoesEmCache(email) {
  var cache = CacheService.getScriptCache();
  valoresAba('SessoesEquipe').slice(1).forEach(function (l) {
    if (String(l[1]).toLowerCase() !== email) return;
    try { cache.remove('m_' + l[0]); cache.remove('e_' + l[0]); } catch (e) { /* ignora */ }
  });
}

function bancada_eu(d, m) { return membroPublico(m); }

function bancada_sair(d) {
  encerrarSessaoToken(d.token);
  return true;
}

function encerrarSessaoToken(token) {
  var s = aba('SessoesEquipe');
  var h = hashToken(token);
  var linhas = s.getDataRange().getValues();
  for (var i = linhas.length - 1; i >= 1; i--) if (linhas[i][0] === h) s.deleteRow(i + 1);
  try { var cc = CacheService.getScriptCache(); cc.remove('e_' + h); cc.remove('m_' + h); cc.remove('u_' + h); } catch (e) { /* ignora */ }
}

function enviarConviteEquipe(m) {
  var link = criarLinkSenha('equipe', String(m.email).toLowerCase(), m.email, 72, 'convite');
  var papel = { admin: 'administração', recepcao: 'recepção', professora: 'profissional' }[m.papel] || m.papel;
  enviarEmail(m.email, 'Seu acesso à bancada · Casa Âmbar', 'Boas-vindas à bancada',
    ['Olá, ' + primeiroNome(m.nome) + '!', 'Você recebeu acesso à bancada interna da Casa Âmbar (' + papel + ').',
      'Crie sua senha pelo botão abaixo. O link vale por 3 dias. Depois, entre sempre por ' + AJUSTES.siteUrl + '#/bancada'],
    { texto: 'Criar minha senha', url: link });
}

// ============================================================
//  DADOS DE APOIO
// ============================================================
function mapaAlunos() {
  var m = {};
  lerAba('Alunos').forEach(function (a) { m[normCpf(a.cpf)] = a; });
  return m;
}

function mapaAnamneses() {
  var m = {};
  lerAba('Anamneses').forEach(function (a) { m[normCpf(a.cpf)] = a; });
  return m;
}

function mapaCreditos() {
  var m = Object.create(null);
  var linhas = valoresCreditos();
  var cab = linhas[0];
  for (var i = 1; i < linhas.length; i++) {
    var c = objeto(cab, linhas[i]);
    c._linha = i + 1;
    c.inicio = dataTexto(c.inicio);
    c.fim = dataTexto(c.fim);
    c.aulas_semana = numero(c.aulas_semana);
    c.aulas_total = numero(c.aulas_total);
    if (c.id) m[String(c.id)] = c;
  }
  return m;
}

function todasReservas() {
  return lerAba('Reservas').map(function (r) { return partesAula(r); });
}

// aulas de um período (grade + aulas antigas que só existem nas reservas)
function aulasDoPeriodo(de, dias, reservas) {
  var lista = gerarAulas(de, dias);
  var ate = somarDias(de, dias - 1);
  var ids = {};
  lista.forEach(function (a) { ids[a.id] = a; });
  (reservas || []).forEach(function (r) {
    if (ids[r.aula_id] || r.data < de || r.data > ate || r.status === 'cancelado') return;
    var a = { id: r.aula_id, data: r.data, hora: r.hora, modalidade: r.modalidade, professor: r.professor,
      capacidade: String(r.modalidade) === 'Yoga' ? 12 : 4, duracao: AJUSTES.duracaoAulaMin, foraDaGrade: true };
    ids[a.id] = a;
    lista.push(a);
  });
  return lista.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

// aula reservada pela recepção para pagar depois (na aula ou na comanda): não entra no caixa até receber
var A_PAGAR = 'A_PAGAR';

function formaDaReserva(r, creditos) {
  if (r.status === 'pendente') return 'Aguardando pagamento';
  if (String(r.credito_id) === A_PAGAR) return 'A pagar';
  if (String(r.credito_id) === 'WELLHUB') return 'Wellhub';
  if (String(r.credito_id) === 'CORTESIA') return 'Cortesia';
  var c = creditos[String(r.credito_id)];
  return c ? c.descricao : (r.credito_id ? String(r.credito_id) : '');
}

// ============================================================
//  RESUMO DO DIA (tela inicial)
// ============================================================
function bancada_resumo(d, m) {
  var hoje = hojeTexto();
  var reservas = todasReservas();
  var aulas = aulasDoPeriodo(hoje, 1, reservas).filter(function (a) { return m.papel !== 'professora' || mesmaProfessora(a.professor, m); });
  var ativas = reservas.filter(function (r) { return r.status !== 'cancelado' && !(r.status === 'pendente' && Number(r.expira_ms) < Date.now()); });
  var hojeR = ativas.filter(function (r) { return r.data === hoje && aulas.some(function (a) { return a.id === r.aula_id; }); });
  var r = {
    hoje: hoje,
    aulasHoje: aulas.length,
    reservasHoje: hojeR.length,
    presentesHoje: hojeR.filter(function (x) { return x.status === 'check-in'; }).length,
    linha: aulas.map(function (a) {
      return { id: a.id, hora: a.hora, duracao: a.duracao || AJUSTES.duracaoAulaMin, modalidade: a.modalidade, professor: a.professor,
        reservas: ativas.filter(function (x) { return x.aula_id === a.id; }).length, capacidade: a.capacidade };
    }),
    proximas: aulas.filter(function (a) { return inicio(a).getTime() + AJUSTES.duracaoAulaMin * 60000 > Date.now(); }).slice(0, 4).map(function (a) {
      var n = ativas.filter(function (x) { return x.aula_id === a.id; }).length;
      return { id: a.id, hora: a.hora, modalidade: a.modalidade, professor: a.professor, reservas: n, capacidade: a.capacidade };
    }),
  };
  var atend = lerAba('Atendimentos').filter(function (a) {
    return a.id && dataTexto(a.data) === hoje && a.status !== 'cancelado' && (m.papel !== 'professora' || mesmaProfessora(a.profissional, m));
  });
  r.servicosHoje = atend.length;
  r.servicos = atend.map(function (a) { return atendimentoPublico(a, m); }).sort(function (a, b) { return a.hora.localeCompare(b.hora); });
  if (m.papel !== 'professora') {
    var pagos = pagamentosPagos();
    var mes = hoje.slice(0, 7);
    r.vendasHoje = pagos.filter(function (p) { return String(p.pago_em).slice(0, 10) === hoje && numero(p.valor) > 0; }).reduce(function (s, p) { return s + numero(p.valor); }, 0);
    r.vendasMes = pagos.filter(function (p) { return String(p.pago_em).slice(0, 7) === mes; }).reduce(function (s, p) { return s + numero(p.valor); }, 0);
    r.wellhubPendentes = lerAba('Alunos').filter(function (a) { return statusWellhub(a) === 'pendente'; }).length;
    r.devolverJuros = lerAba('Pagamentos').filter(function (p) { return /^DEVOLVER/.test(String(p.observacao)); }).length;
    var mapaC = mapaCreditos();
    var em7 = somarDias(hoje, 7);
    var listaC = Object.keys(mapaC).map(function (k) { return mapaC[k]; }).filter(function (c) { return String(c.ativo).toUpperCase() !== 'NÃO'; });
    // quem já renovou (outro plano da mesma modalidade terminando depois) não conta
    r.vencendo = listaC.filter(function (c) {
      return c.tipo !== 'avulsa' && c.fim >= hoje && c.fim <= em7 && !listaC.some(function (o) {
        return o.id !== c.id && normCpf(o.cpf) === normCpf(c.cpf) && String(o.modalidade) === String(c.modalidade) && o.fim > c.fim;
      });
    }).length;
    r.comandasAbertas = lerAba('Comandas').filter(function (c) { return c.status === 'aberta'; }).length;
    r.pedidosTroca = lerAba('Substituicoes').filter(function (s) { return s.status === 'pedido' && dataTexto(s.data) >= hoje; }).length;
    r.estoqueBaixo = listarProdutos().filter(function (p) { return p.minimo > 0 && p.estoque <= p.minimo; }).length;
    var cx = caixaDoDia(hoje);
    r.caixa = cx ? String(cx.status) : 'nao_aberto';
    var amanha = somarDias(hoje, 1);
    r.lembretesWhats = lembretesDe(amanha).filter(function (x) { return !x.enviado && !x.email && soDigitos(x.whatsapp).length >= 10; }).length;
    r.espera = resumoEspera();
    // pediram para remarcar pelo link do lembrete (e ainda não foram remarcados)
    var pedidos = lerAba('Atendimentos').filter(function (a) {
      return a.id && a.resposta === 'remarcar' && dataTexto(a.data) >= hoje && (a.status === 'agendado' || a.status === 'confirmado');
    }).map(function (a) { return dataTexto(a.data); }).sort();
    r.remarcar = { n: pedidos.length, dia: pedidos[0] || '' };
    r.retornos = bancada_retornos({}).lista.length;
    if (m.papel === 'admin') {
      r.contasVencendo = lerAba('Despesas').filter(function (x) { return x.status === 'a_pagar' && dataTexto(x.data) <= somarDias(hoje, 3); }).length;
    }
  } else {
    var mg = bancada_meusGanhos({}, m);
    r.meusGanhosMes = mg.total;
  }
  r.folgasHoje = folgasDoDia(hoje).filter(function (f) { return m.papel !== 'professora' || mesmaProfessora(f.profissional, m); });
  return r;
}

function semAcento(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}
// a professora/profissional só vê o que está no nome dela (comparação exata, sem acento)
function mesmaProfessora(nomeAula, m) {
  var a = semAcento(nomeAula);
  var b = semAcento(m.professor_nome || m.nome);
  return !!a && !!b && a === b;
}

// ============================================================
//  AGENDA
// ============================================================
function bancada_agenda(d, m) {
  var de = /^\d{4}-\d{2}-\d{2}$/.test(String(d.de)) ? d.de : hojeTexto();
  var dias = Math.min(Math.max(Number(d.dias) || 1, 1), 31);
  var reservas = todasReservas();
  var alunos = mapaAlunos();
  var fichas = mapaAnamneses();
  var creditos = mapaCreditos();
  var primeiras = {};
  // primeira aula de cada aluno (para a professora dar boas-vindas)
  reservas.filter(function (r) { return r.status !== 'cancelado' && r.status !== 'pendente'; })
    .sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); })
    .forEach(function (r) { var c = normCpf(r.cpf); if (!primeiras[c]) primeiras[c] = r.id; });

  var aulas = aulasDoPeriodo(de, dias, reservas);
  if (m.papel === 'professora') aulas = aulas.filter(function (a) { return mesmaProfessora(a.professor, m); });
  // lista de espera de cada aula (só para a recepção e a administração)
  var espera = {};
  if (m.papel !== 'professora') {
    var hojeE = hojeTexto();
    lerAba('Espera').forEach(function (x) {
      if (x.tipo === 'aula' && esperaVigente(x, hojeE)) (espera[x.aula_id] = espera[x.aula_id] || []).push(esperaPublica(x));
    });
  }
  // reservas de cada aula (um índice só; filtrar a aba inteira para cada aula da semana custava caro)
  var porAula = {};
  reservas.forEach(function (r) { if (r.status !== 'cancelado') (porAula[r.aula_id] = porAula[r.aula_id] || []).push(r); });
  return aulas.map(function (a) {
    var lista = (porAula[a.id] || []).filter(function (r) {
      return !(r.status === 'pendente' && Number(r.expira_ms) && Number(r.expira_ms) < Date.now());
    }).map(function (r) {
      var cpf = normCpf(r.cpf);
      var al = alunos[cpf] || {};
      var f = fichas[cpf];
      return {
        id: r.id, nome: r.nome || al.nome, cpf: m.papel === 'professora' ? '' : cpf, whatsapp: m.papel === 'professora' ? '' : String(al.whatsapp || ''),
        tapete: r.tapete ? Number(r.tapete) : null, status: r.status, forma: formaDaReserva(r, creditos),
        ficha: !!f, alerta: f ? String(f.parq_algum_sim) === 'SIM' || !!String(f.lesoes || '').trim() || String(f.gestante) === 'sim' : false,
        primeiraAula: primeiras[cpf] === r.id, alertas: alertasDe(cpf),
        aPagar: String(r.credito_id) === A_PAGAR && m.papel !== 'professora',
      };
    }).sort(function (x, y) { return (x.tapete || 99) - (y.tapete || 99) || String(x.nome).localeCompare(String(y.nome)); });
    a.reservas = lista;
    a.ocupadosQtd = lista.length;
    a.espera = (espera[a.id] || []).filter(function (x) { return !lista.some(function (r) { return r.cpf && r.cpf === x.cpf; }); });
    a.passada = inicio(a).getTime() + AJUSTES.duracaoAulaMin * 60000 < Date.now();
    return a;
  });
}

function acharReservaPorId(id) {
  var r = lerAba('Reservas').filter(function (x) { return x.id === id; })[0];
  if (!r) throw new Error('Reserva não encontrada.');
  return partesAula(r);
}

function bancada_presenca(d, m) {
  var r = acharReservaPorId(d.reservaId);
  if (m.papel === 'professora' && !mesmaProfessora(r.professor, m)) throw new Error('Esta aula não é sua.');
  // a profissional marca presença de 1 h antes até 24 h depois da aula (depois disso, só a recepção corrige)
  if (m.papel === 'professora') {
    var ini = inicio(r).getTime();
    if (Date.now() < ini - 3600000 || Date.now() > ini + 24 * 3600000) throw new Error('A presença desta aula só pode ser mudada pela recepção agora.');
  }
  var st = { 'check-in': 'check-in', falta: 'falta', reservado: 'reservado' }[d.status];
  if (!st) throw new Error('Situação inválida.');
  if (r.status === 'cancelado' || r.status === 'pendente') throw new Error('Esta reserva não está confirmada.');
  atualizarLinha('Reservas', r._linha, { status: st, checkin_em: st === 'check-in' ? agoraTexto() : '' });
  esquecerComissoesAulas();
  registrar(m, 'presença', r.nome + ' · ' + r.aula_id + ' → ' + st);
  return { id: r.id, status: st };
}

// Agendar pela bancada. forma: credito | wellhub | cortesia | avulsa (venda no balcão)
function bancada_agendar(d, m) {
  var cpf = normCpf(d.cpf);
  var aluno = buscarAluno(cpf);
  if (!aluno) throw new Error('Aluno não encontrado.');
  var de = String(d.aulaId).slice(0, 10);
  var aula = aulasDoPeriodo(de, 1, []).filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada (confira a grade e os bloqueios).');
  if (inicio(aula).getTime() + AJUSTES.duracaoAulaMin * 60000 < Date.now() - 7 * 86400000) throw new Error('Esta aula é muito antiga.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var reservas = reservasAtivas();
    var montada = montarAula(JSON.parse(JSON.stringify(aula)), reservas, cpf);
    if (montada.minhaReserva) throw new Error(primeiroNome(aluno.nome) + ' já está nesta aula.');
    if (montada.ocupadosQtd >= aula.capacidade && !d.encaixe) throw erroCod('Aula lotada. Marque "encaixe" para passar da capacidade.', 'LOTADA');
    var tapete = '';
    if (aula.modalidade === 'Yoga') {
      tapete = Number(d.tapete);
      if (!tapete || tapete < 1) throw new Error('Escolha o tapete.');
      if (montada.ocupados.indexOf(tapete) >= 0) throw new Error('O tapete ' + tapete + ' está ocupado.');
    }
    var forma = String(d.forma || 'credito');
    var creditoId = '';
    var descricao = '';
    if (forma === 'credito') {
      var c = escolherCredito(cpf, aula, reservas);
      if (!c) throw erroCod(primeiroNome(aluno.nome) + ' não tem aulas de ' + aula.modalidade + ' disponíveis. Escolha aula avulsa (paga depois ou já paga), cortesia ou Wellhub.', 'SEM_CREDITO');
      creditoId = c.id; descricao = c.descricao;
    } else if (forma === 'wellhub') {
      creditoId = 'WELLHUB'; descricao = 'Wellhub';
    } else if (forma === 'cortesia') {
      creditoId = 'CORTESIA'; descricao = 'Cortesia';
    } else if (forma === 'pagar') {
      // reserva a vaga e recebe depois (na aula, pelo botão Receber, ou na comanda): nada entra no caixa agora
      if (!buscarPlano(aula.modalidade.toLowerCase() + '-avulsa')) throw new Error('Não há aula avulsa de ' + aula.modalidade + ' no catálogo.');
      creditoId = A_PAGAR; descricao = 'Aula avulsa · paga depois';
    } else if (forma === 'avulsa') {
      var avulsa = buscarPlano(aula.modalidade.toLowerCase() + '-avulsa');
      if (!avulsa) throw new Error('Não há aula avulsa de ' + aula.modalidade + ' no catálogo.');
      var venda = registrarVenda(aluno, avulsa, { metodo: d.metodo, bandeira: d.bandeira, formas: d.formas, valor: d.valor, codigo: d.codigo, resto: d.resto, inicio: aula.data, obs: 'aula ' + aula.id }, m);
      creditoId = venda.creditoId; descricao = avulsa.nome + ' · ' + venda.metodo;
    } else {
      throw new Error('Forma inválida.');
    }
    var id = novoId('R');
    aba('Reservas').appendRow(linhaSegura([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, cpf, aluno.nome, tapete, 'reservado', agoraTexto(), '', '',
      creditoId, '', '']));
    SpreadsheetApp.flush();
    registrar(m, 'agendou', aluno.nome + ' · ' + aula.id + ' · ' + descricao);
    esperaResolvida('aula', aula.id, cpf);
    return { id: id, forma: descricao };
  } finally {
    soltarTrava(trava);
  }
}

// Recebe a aula reservada para pagar depois: registra a venda da aula avulsa agora (entra no caixa de hoje)
function bancada_receberAula(d, m) {
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var r = acharReservaPorId(String(d.reservaId || ''));
    if (r.status === 'cancelado') throw new Error('Esta reserva foi cancelada.');
    if (String(r.credito_id) !== A_PAGAR) throw new Error('Esta aula já está paga.');
    var aluno = buscarAluno(normCpf(r.cpf));
    if (!aluno) throw new Error('Aluno não encontrado.');
    var avulsa = buscarPlano(String(r.modalidade).toLowerCase() + '-avulsa');
    if (!avulsa) throw new Error('Não há aula avulsa de ' + r.modalidade + ' no catálogo.');
    var venda = registrarVenda(aluno, avulsa, { metodo: d.metodo, bandeira: d.bandeira, formas: d.formas, valor: d.valor, codigo: d.codigo, resto: d.resto, inicio: r.data, obs: 'aula ' + r.aula_id }, m);
    atualizarLinha('Reservas', r._linha, { credito_id: venda.creditoId });
    esquecerComissoesAulas();
    registrar(m, 'recebeu aula', aluno.nome + ' · ' + r.aula_id + ' · ' + venda.metodo);
    return { forma: avulsa.nome + ' · ' + venda.metodo };
  } finally {
    soltarTrava(trava);
  }
}

// aula avulsa paga na comanda: liga à reserva "a pagar" mais próxima da mesma pessoa e modalidade
function ligarAulaAPagar(cpf, planoId, creditoId, jaLigadas) {
  var plano = buscarPlano(planoId);
  if (!plano || plano.tipo !== 'avulsa' || !creditoId) return false;
  var hoje = hojeTexto();
  var cand = lerAba('Reservas').filter(function (r) {
    return String(r.credito_id) === A_PAGAR && r.status !== 'cancelado' && normCpf(r.cpf) === normCpf(cpf) && String(r.modalidade) === String(plano.modalidade) && !jaLigadas[r.id];
  }).map(partesAula).sort(function (a, b) {
    // primeiro a de hoje ou a próxima; depois as que já passaram (da mais recente)
    var fa = a.data >= hoje, fb = b.data >= hoje;
    if (fa !== fb) return fa ? -1 : 1;
    return fa ? (a.data + a.hora).localeCompare(b.data + b.hora) : (b.data + b.hora).localeCompare(a.data + a.hora);
  })[0];
  if (!cand) return false;
  atualizarLinha('Reservas', cand._linha, { credito_id: creditoId });
  jaLigadas[cand.id] = 1;
  esquecerComissoesAulas();
  return true;
}

function bancada_cancelarReserva(d, m) {
  var r = acharReservaPorId(d.reservaId);
  if (r.status === 'cancelado') return true;
  atualizarLinha('Reservas', r._linha, { status: 'cancelado', cancelada_em: agoraTexto() });
  esquecerComissoesAulas();
  registrar(m, 'cancelou reserva', r.nome + ' · ' + r.aula_id + (d.motivo ? ' · ' + d.motivo : ''));
  // quem está na lista de espera recebe o aviso da vaga
  return { avisados: avisarVagaAula(r.aula_id) };
}

// ============================================================
//  ALUNOS
// ============================================================
// ---------------- lista de clientes ----------------
// Uma passada por aba sobre os valores crus (sem montar objeto de cada linha): com milhares de
// reservas isso é muitas vezes mais rápido. A lista pronta fica 5 min no cache do Google e é
// apagada quando se grava em Alunos, Creditos, Anamneses ou Atendimentos (adicionarLinha/atualizarLinha).
var ABAS_DA_LISTA_CLIENTES = { Alunos: 1, Creditos: 1, Anamneses: 1, Atendimentos: 1 };
var CHAVE_LISTA_CLIENTES = 'lista_clientes';

function indiceColunas(cab) {
  var k = {};
  cab.forEach(function (c, i) { k[c] = i; });
  return k;
}

// data da aula de uma reserva: o aula_id ("2026-10-19_06:00_pilates") é a fonte segura
function dataDaReservaCrua(l, k) {
  var p = String(l[k.aula_id] || '').split('_')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : dataTexto(l[k.data]);
}

function montarListaClientes() {
  var hoje = hojeTexto();
  var maior = function (o, cpf, v) { if (v && (!o[cpf] || v > o[cpf])) o[cpf] = v; };
  // planos vigentes
  var cr = valoresCreditos(), kc = indiceColunas(cr[0]), planos = {};
  for (var i = 1; i < cr.length; i++) {
    var c = cr[i];
    if (!c[kc.id] || String(c[kc.ativo]).toUpperCase() === 'NÃO') continue;
    var fim = dataTexto(c[kc.fim]);
    if (dataTexto(c[kc.inicio]) > hoje || fim < hoje) continue;
    var cc = normCpf(c[kc.cpf]);
    (planos[cc] = planos[cc] || []).push([String(c[kc.descricao]), fim]);
  }
  // fichas de saúde
  var an = valoresAba('Anamneses'), ka = indiceColunas(an[0]), fichas = {};
  for (i = 1; i < an.length; i++) fichas[normCpf(an[i][ka.cpf])] = String(an[i][ka.parq_algum_sim]) === 'SIM' ? 2 : 1;
  // aulas: presenças, última aula e última visita
  var rs = valoresAba('Reservas'), kr = indiceColunas(rs[0]), pres = {}, ultAula = {}, visita = {};
  for (i = 1; i < rs.length; i++) {
    var r = rs[i], st = String(r[kr.status]);
    if (st === 'cancelado' || st === 'pendente') continue;
    var rc = normCpf(r[kr.cpf]), data = dataDaReservaCrua(r, kr);
    if (st === 'check-in') pres[rc] = (pres[rc] || 0) + 1;
    if (data > hoje) continue;
    maior(ultAula, rc, data);
    if (st === 'check-in' || st === 'reservado') maior(visita, rc, data);
  }
  // serviços atendidos
  var at = valoresAba('Atendimentos'), kt = indiceColunas(at[0]), serv = {};
  for (i = 1; i < at.length; i++) {
    if (!at[i][kt.cpf] || at[i][kt.status] !== 'atendido') continue;
    var tc = normCpf(at[i][kt.cpf]);
    serv[tc] = (serv[tc] || 0) + 1;
    maior(visita, tc, dataTexto(at[i][kt.data]));
  }
  var al = valoresAba('Alunos'), k = indiceColunas(al[0]), lista = [];
  for (i = 1; i < al.length; i++) {
    var a = al[i];
    if (!a[k.cpf] || /^(unificado|exclu)/.test(String(a[k.origem_cadastro]))) continue;
    var cpf = normCpf(a[k.cpf]), pl = planos[cpf] || [];
    lista.push({
      cpf: cpf, nome: String(a[k.nome]), whatsapp: String(a[k.whatsapp] || ''), email: String(a[k.email] || ''), ativo: String(a[k.ativo]).toUpperCase() !== 'NÃO',
      criadoEm: (ehData(a[k.criado_em]) ? dataTexto(a[k.criado_em]) : String(a[k.criado_em] || '')).slice(0, 10), ficha: !!fichas[cpf], alerta: fichas[cpf] === 2,
      wellhub: statusWellhub({ wellhub: a[k.wellhub] }), plano: pl.map(function (x) { return x[0]; }).join(' + '),
      planoFim: pl.map(function (x) { return x[1]; }).sort().pop() || '', presencas: pres[cpf] || 0, ultimaAula: ultAula[cpf] || '',
      temSenha: !!a[k.senha_hash], semCpf: !temCpfReal(cpf), ultimaVisita: visita[cpf] || '', servicos: serv[cpf] || 0,
    });
  }
  return lista.sort(function (x, y) { return x.nome.localeCompare(y.nome); });
}

function listaClientes() {
  var cache = CacheService.getScriptCache();
  try {
    var n = Number(cache.get(CHAVE_LISTA_CLIENTES + '_n') || 0);
    if (n > 0) {
      var chaves = [];
      for (var i = 0; i < n; i++) chaves.push(CHAVE_LISTA_CLIENTES + '_' + i);
      var partes = cache.getAll(chaves);
      var texto = chaves.map(function (c) { return partes[c]; });
      if (texto.every(function (t) { return t != null; })) {
        return JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(texto.join('')), 'application/x-gzip')).getDataAsString());
      }
    }
  } catch (e) { Logger.log('cache de clientes: ' + e.message); }
  var lista = montarListaClientes();
  try {
    var z = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(lista), 'application/json')).getBytes());
    var mapa = {}, qtd = Math.ceil(z.length / 90000);
    if (qtd <= 20) {
      for (var j = 0; j < qtd; j++) mapa[CHAVE_LISTA_CLIENTES + '_' + j] = z.slice(j * 90000, (j + 1) * 90000);
      cache.putAll(mapa, 300);
      cache.put(CHAVE_LISTA_CLIENTES + '_n', String(qtd), 300);
    }
  } catch (e) { Logger.log('cache de clientes: ' + e.message); }
  return lista;
}

function esquecerListaClientes() {
  try { CacheService.getScriptCache().remove(CHAVE_LISTA_CLIENTES + '_n'); } catch (e) { /* ignora */ }
}

// busca (Agenda, Comandas, Vales…): só os primeiros resultados
function bancada_alunos(d) {
  var lista = listaClientes();
  var busca = String(d.busca || '').trim().toLowerCase();
  if (!busca) return lista;
  var dig = soDigitos(busca);
  return lista.filter(function (a) {
    return a.nome.toLowerCase().indexOf(busca) >= 0 || (dig.length >= 3 && (a.cpf.indexOf(dig) >= 0 || soDigitos(a.whatsapp).indexOf(dig) >= 0)) ||
      a.email.toLowerCase().indexOf(busca) >= 0;
  }).slice(0, 30);
}

// linhas de uma aba só de um CPF (filtra antes de montar os objetos)
function linhasDoCpf(nomeAba, cpf) {
  var v = nomeAba === 'Creditos' ? valoresCreditos() : valoresAba(nomeAba), cab = v[0], kc = cab.indexOf('cpf'), lista = [];
  for (var i = 1; i < v.length; i++) {
    if (!v[i][kc] || normCpf(v[i][kc]) !== cpf) continue;
    var o = objeto(cab, v[i]);
    o._linha = i + 1;
    lista.push(o);
  }
  return lista;
}

// ficha completa de uma cliente: cada aba lida uma vez, só as linhas dela
function bancada_aluno(d) {
  var a = buscarAluno(d.cpf);
  if (!a) throw new Error('Aluno não encontrado.');
  var cpf = normCpf(a.cpf);
  var hoje = hojeTexto();
  var resumo = listaClientes().filter(function (x) { return x.cpf === cpf; })[0];
  var r = resumo ? Object.assign({}, resumo) : { cpf: cpf, nome: a.nome, whatsapp: String(a.whatsapp || ''), email: String(a.email || ''),
    ativo: String(a.ativo).toUpperCase() !== 'NÃO', wellhub: statusWellhub(a), temSenha: !!a.senha_hash, semCpf: !temCpfReal(cpf) };
  var creditos = linhasDoCpf('Creditos', cpf).filter(function (c) { return c.id; }).map(function (c) {
    c.inicio = dataTexto(c.inicio); c.fim = dataTexto(c.fim); c.aulas_semana = numero(c.aulas_semana); c.aulas_total = numero(c.aulas_total);
    return c;
  });
  var porId = {};
  creditos.forEach(function (c) { porId[String(c.id)] = c; });
  var reservas = linhasDoCpf('Reservas', cpf).map(partesAula);
  var ativas = reservas.filter(function (x) { return x.status !== 'cancelado' && !(x.status === 'pendente' && Number(x.expira_ms) && Number(x.expira_ms) < Date.now()); });
  var pagamentos = linhasDoCpf('Pagamentos', cpf);
  var atend = linhasDoCpf('Atendimentos', cpf).filter(function (x) { return x.id; });
  var vales = linhasDoCpf('Vales', cpf);
  var ficha = linhasDoCpf('Anamneses', cpf).pop();
  r.obs = String(a.obs_internas || '');
  r.wellhubId = String(a.wellhub_id || '');
  r.ficha = fichaPublica(ficha);
  // sessões de pacote de serviço ficam em Atendimentos (não em Reservas), como em creditoDeServico
  var usosServico = {};
  atend.forEach(function (x) { if (x.credito_id && x.status !== 'cancelado') usosServico[x.credito_id] = (usosServico[x.credito_id] || 0) + 1; });
  r.creditos = creditos.map(function (c) {
    var limite = c.aulas_semana > 0 ? c.aulas_semana : c.aulas_total;
    var usadas = String(c.modalidade) === 'Serviço' ? (usosServico[c.id] || 0) : usoDoCredito(c, ativas, hoje);
    return { id: c.id, descricao: c.descricao, modalidade: c.modalidade, tipo: c.tipo, inicio: c.inicio, fim: c.fim, ativo: String(c.ativo).toUpperCase() !== 'NÃO',
      limite: limite, usadas: usadas, porSemana: c.aulas_semana > 0, origem: String(c.origem || ''),
      vigente: c.inicio <= hoje && c.fim >= hoje && String(c.ativo).toUpperCase() !== 'NÃO' };
  }).sort(function (x, y) { return String(y.fim).localeCompare(String(x.fim)); });
  r.reservas = reservas.map(function (x) {
    return { id: x.id, aulaId: x.aula_id, data: x.data, hora: x.hora, modalidade: x.modalidade, professor: x.professor, tapete: x.tapete ? Number(x.tapete) : null,
      status: x.status, forma: formaDaReserva(x, porId) };
  }).sort(function (x, y) { return (y.data + y.hora).localeCompare(x.data + x.hora); }).slice(0, 80);
  r.pagamentos = pagamentos.map(pagamentoPublico).reverse();
  var pagos = vales.length ? pagamentosQueContam() : [];
  r.vales = vales.map(function (v) { return valePublico(v, pagos); });
  r.atendimentos = atend.map(function (x) { return atendimentoPublico(x); }).sort(function (x, y) { return (y.data + y.hora).localeCompare(x.data + x.hora); });
  r.historico = historicoCliente(cpf, { atendimentos: atend, reservas: reservas, pagamentos: pagamentos, vales: vales });
  r.nascimento = String(a.nascimento || '').slice(0, 10);
  r.endereco = enderecoPublico(a);
  r.comoConheceu = String(a.como_conheceu || '');
  r.alertaFixo = String(a.alerta || '');
  r.alertas = alertasDe(cpf);
  r.contratos = contratosPublicos(cpf);
  r.marketing = String(a.marketing).toUpperCase() !== 'NÃO';
  r.fichaEstetica = !!linhaFichaEstetica(cpf);
  r.evolucoes = evolucoesDe(cpf).length;
  r.totalGasto = dinheiro(pagamentos.filter(function (p) { return p.status === 'pago'; }).reduce(function (s, p) { return s + numero(p.valor); }, 0));
  r.comandaAberta = (linhasDoCpf('Comandas', cpf).filter(function (c) { return c.status === 'aberta'; })[0] || {}).id || '';
  return r;
}

function fichaPublica(f) {
  if (!f) return null;
  var o = {};
  ABAS.Anamneses.forEach(function (c) { o[c] = ehData(f[c]) ? dataTexto(f[c]) : String(f[c] == null ? '' : f[c]); });
  return o;
}

// professora: ficha só de quem está nas aulas dela
function bancada_ficha(d, m) {
  var cpf = normCpf(d.cpf || '');
  if (m.papel === 'professora') {
    var r = acharReservaPorId(d.reservaId);
    if (!mesmaProfessora(r.professor, m)) throw new Error('Esta pessoa não está nas suas aulas.');
    cpf = normCpf(r.cpf);
  } else if (d.reservaId && !d.cpf) {
    cpf = normCpf(acharReservaPorId(d.reservaId).cpf);
  }
  var a = buscarAluno(cpf);
  var f = fichaPublica(mapaAnamneses()[cpf]);
  // professora: a ficha vem sem CPF e sem o link do PDF
  if (f && m.papel === 'professora') { delete f.cpf; delete f.pdf; }
  return { nome: a ? a.nome : '', ficha: f };
}

function bancada_salvarAluno(d, m) {
  var a = buscarAluno(d.cpf);
  if (!a) throw new Error('Aluno não encontrado.');
  var x = d.dados || {};
  var mud = {};
  // cliente importado pode ter só um nome ou estar sem WhatsApp: só valida o que mudou
  if (x.nome != null && String(x.nome).trim() !== String(a.nome || '').trim()) {
    if (String(x.nome).trim().split(/\s+/).length < 2) throw new Error('Informe nome e sobrenome.');
    mud.nome = String(x.nome).trim();
  }
  if (x.whatsapp != null && soDigitos(x.whatsapp) !== soDigitos(a.whatsapp)) {
    if (soDigitos(x.whatsapp).length < 10) throw new Error('WhatsApp com DDD.');
    mud.whatsapp = soDigitos(x.whatsapp);
  }
  if (x.email != null) { if (x.email && !emailValido(x.email)) throw new Error('E-mail inválido.'); mud.email = String(x.email).trim().toLowerCase(); }
  if (x.ativo != null) mud.ativo = x.ativo ? 'SIM' : 'NÃO';
  if (x.wellhub != null) mud.wellhub = { confirmado: 'SIM', bloqueado: 'NÃO', pendente: 'pendente', nao_informado: '' }[x.wellhub];
  if (x.wellhubId != null) mud.wellhub_id = soDigitos(x.wellhubId);
  if (x.obs != null) mud.obs_internas = String(x.obs).slice(0, 1000);
  if (x.nascimento != null) mud.nascimento = /^\d{4}-\d{2}-\d{2}$/.test(String(x.nascimento)) ? x.nascimento : '';
  if (x.marketing != null) mud.marketing = x.marketing ? '' : 'NÃO';
  if (x.endereco) Object.assign(mud, enderecoDe(x.endereco));
  if (x.comoConheceu != null) mud.como_conheceu = textoComoConheceu(x.comoConheceu);
  if (x.alertaFixo != null) mud.alerta = String(x.alertaFixo).trim().replace(/\s+/g, ' ').slice(0, 200);
  atualizarLinha('Alunos', a._linha, mud);
  registrar(m, 'editou aluno', a.nome + ' · ' + Object.keys(mud).join(', '));
  if (x.cpf && soDigitos(x.cpf) !== normCpf(a.cpf)) {
    var trava = LockService.getScriptLock();
    esperarTrava(trava, 20000);
    try { return bancada_aluno({ cpf: informarCpf(buscarAluno(a.cpf), x.cpf, m, !!x.juntarCpf) }); } finally { soltarTrava(trava); }
  }
  return bancada_aluno({ cpf: a.cpf });
}

function bancada_novoAluno(d, m) {
  var cpf = soDigitos(d.cpf);
  if (cpf && !cpfValido(cpf)) throw new Error('CPF inválido.');
  if (!d.nome || String(d.nome).trim().split(' ').length < 2) throw new Error('Informe nome e sobrenome.');
  if (soDigitos(d.whatsapp).length < 10) throw new Error('Informe o WhatsApp com DDD.');
  if (d.email && !emailValido(d.email)) throw new Error('E-mail inválido.');
  var nasc = /^\d{4}-\d{2}-\d{2}$/.test(String(d.nascimento || '')) ? d.nascimento : '';
  var extra = enderecoDe(d.endereco);
  if (d.comoConheceu) extra.como_conheceu = textoComoConheceu(d.comoConheceu);
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    if (cpf) {
      if (buscarAluno(cpf)) throw new Error('Este CPF já tem cadastro.');
      adicionarLinha('Alunos', Object.assign({ cpf: cpf, nome: String(d.nome).trim(), whatsapp: soDigitos(d.whatsapp), email: String(d.email || '').trim().toLowerCase(),
        senha_hash: '', sal: '', criado_em: agoraTexto(), ativo: 'SIM', origem_cadastro: 'bancada', nascimento: nasc }, extra));
    } else {
      var w = normWhats(d.whatsapp);
      var ja = lerAba('Alunos').filter(function (a) { return a.cpf && normWhats(a.whatsapp) === w && ativoSim(a.ativo); })[0];
      if (ja) throw erroCod('Já existe cadastro com este WhatsApp: ' + ja.nome + '.', 'DUPLICADO', { cpf: normCpf(ja.cpf) });
      var nova = clienteSemCpf(String(d.nome).trim(), w, d.email, 'bancada (sem CPF)');
      cpf = normCpf(nova.cpf);
      if (nasc) extra.nascimento = nasc;
      if (Object.keys(extra).length) atualizarLinha('Alunos', nova._linha, extra);
    }
  } finally {
    soltarTrava(trava);
  }
  registrar(m, 'cadastrou cliente', d.nome);
  var conviteEnviado = false;
  if (d.email && d.enviarConvite !== false && temCpfReal(cpf)) { enviarConviteAluno(buscarAluno(cpf)); conviteEnviado = true; }
  // a ficha completa já vai junto: a tela abre o cadastro na hora, sem outro pedido
  var ficha = null;
  try { ficha = bancada_aluno({ cpf: normCpf(cpf) }, m); } catch (e) { Logger.log('ficha nova: ' + e.message); }
  return { cpf: normCpf(cpf), conviteEnviado: conviteEnviado, ficha: ficha };
}

function enviarConviteAluno(a) {
  var link = criarLinkSenha('aluno', normCpf(a.cpf), a.email, 72, 'convite');
  enviarEmail(a.email, 'Sua área do aluno · Casa Âmbar', 'Boas-vindas à Casa Âmbar',
    ['Olá, ' + primeiroNome(a.nome) + '!', 'Seu cadastro na Casa Âmbar está pronto. Crie sua senha para reservar suas aulas, escolher o tapete e fazer o check-in pelo celular.',
      'O link vale por 3 dias. Depois, entre com seu CPF e a senha que criar.'], { texto: 'Criar minha senha', url: link });
}

function bancada_enviarLinkSenha(d, m) {
  var a = buscarAluno(d.cpf);
  if (!a) throw new Error('Aluno não encontrado.');
  if (!temCpfReal(a.cpf)) throw new Error('Cliente sem CPF não entra na área do aluno. Informe o CPF no cadastro primeiro.');
  if (!emailValido(a.email)) throw new Error('Este aluno não tem e-mail no cadastro. Cadastre o e-mail primeiro.');
  if (a.senha_hash) {
    var link = criarLinkSenha('aluno', normCpf(a.cpf), a.email, 24, 'recepção');
    enviarEmail(a.email, 'Crie uma nova senha · Casa Âmbar', 'Nova senha',
      ['Olá, ' + primeiroNome(a.nome) + '.', 'A recepção da Casa Âmbar enviou este link para você criar uma nova senha. Ele vale por 24 horas.'],
      { texto: 'Criar nova senha', url: link });
  } else {
    enviarConviteAluno(a);
  }
  registrar(m, 'enviou link de senha', a.nome);
  return { email: mascararEmail(a.email) };
}

// ============================================================
//  VENDAS NO BALCÃO E PAGAMENTOS
// ============================================================
function pagamentoPublico(p) {
  return { orderNsu: String(p.order_nsu), cpf: normCpf(p.cpf), nome: p.nome, planoId: p.plano_id, descricao: p.descricao, valor: numero(p.valor),
    valorOriginal: numero(p.valor_original) || numero(p.valor), desconto: numero(p.desconto), cupom: String(p.cupom || ''), vale: String(p.vale || ''),
    status: p.status, criadoEm: String(p.criado_em || ''), pagoEm: String(p.pago_em || ''), metodo: String(p.metodo || ''), parcelas: p.parcelas,
    valorPago: numero(p.valor_pago), origem: String(p.origem || 'site'), observacao: String(p.observacao || ''), recibo: String(p.recibo || ''),
    registradoPor: String(p.registrado_por || ''), bandeira: String(p.bandeira || ''), comanda: String(p.comanda || ''), valeUsado: numero(p.vale_usado),
    formas: partesDoPagamento(p) || [] };
}

// Data da venda escolhida no balcão (migração do Avec, venda esquecida): vazio ou hoje = agora.
// Dia passado (até 120 dias) entra no caixa daquele dia, ao meio-dia.
var DIAS_VENDA_PASSADA = 120;
function momentoDaVenda(data) {
  data = String(data || '');
  var hoje = hojeTexto();
  if (!data || data === hoje) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data da venda inválida.');
  if (data > hoje) throw new Error('A data da venda não pode ser depois de hoje.');
  if (data < somarDias(hoje, -DIAS_VENDA_PASSADA)) throw new Error('A data da venda pode voltar no máximo ' + DIAS_VENDA_PASSADA + ' dias.');
  return data + ' 12:00:00';
}

// Venda registrada pela recepção (já recebida: Pix, dinheiro, cartão na maquininha...)
function registrarVenda(aluno, plano, o, membro) {
  var metodos = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Cortesia', 'Vale-presente', 'Link InfinitePay'];
  var metodo = metodos.indexOf(o.metodo) >= 0 ? o.metodo : '';
  if (!metodo) throw new Error('Escolha como foi pago.');
  if (!plano) throw new Error('Item de venda não encontrado.');
  // pago com vale-presente: o código é obrigatório; se o vale não cobre tudo, o resto vai na forma escolhida em o.resto
  var comVale = metodo === 'Vale-presente';
  if (comVale && !acharVale(o.codigo)) throw new Error('Vale-presente não encontrado. Confira o código.');
  var cpf = soDigitos(aluno.cpf) ? normCpf(aluno.cpf) : '';
  var calc = calcularPreco(plano, cpf, o.codigo, { canal: 'bancada', data: /^\d{4}-\d{2}-\d{2}$/.test(String(o.inicio)) ? o.inicio : hojeTexto() });
  var valor = calc.valorFinal;
  var promocao = calc.promocao;
  var desconto = calc.desconto;
  if (comVale && valor > 0.009) {
    var resto = metodos.indexOf(o.resto) >= 0 && o.resto !== 'Cortesia' && o.resto !== 'Vale-presente' ? o.resto : '';
    if (!resto) throw new Error('O vale cobre ' + brl(calc.valeUsado) + '. Escolha como será pago o resto (' + brl(valor) + ').');
    metodo = resto;
  }
  var bandeira = bandeiraDe(metodo, o.bandeira, false);
  if (!comVale && o.valor != null && o.valor !== '' && !isNaN(numero(o.valor))) {
    // valor combinado no balcão
    valor = Math.max(0, numero(o.valor));
    desconto = Math.max(0, Math.round((plano.preco - valor) * 100) / 100);
    if (valor !== calc.valorFinal) promocao = '';
  }
  if (metodo === 'Cortesia') { desconto = plano.preco; valor = 0; }
  // pago de mais de um jeito (ex.: metade no débito, metade no dinheiro): uma venda só, com as partes
  var divisao = null, parcelasVenda = Number(o.parcelas) || 1;
  if (Array.isArray(o.formas) && o.formas.length > 1) {
    if (comVale) throw new Error('Com vale-presente, o resto vai em uma forma só.');
    if (metodo === 'Cortesia') throw new Error('Cortesia não se divide em formas de pagamento.');
    divisao = normalizarFormas(o.formas, valor, false);
    metodo = divisao.metodo; bandeira = divisao.bandeira; parcelasVenda = divisao.parcelas;
  }
  var pagoEm = momentoDaVenda(o.dataVenda);
  var nsu = novoNsu('B');
  adicionarLinha('Pagamentos', { order_nsu: nsu, cpf: cpf, nome: aluno.nome, plano_id: plano.id, descricao: plano.nome, valor: valor, status: 'pendente',
    criado_em: agoraTexto(), valor_original: plano.preco, desconto: desconto, cupom: calc.cupom, vale: calc.vale, vale_usado: calc.valeUsado,
    origem: 'balcão', registrado_por: membro.email, observacao: String(o.obs || '').slice(0, 300), promocao: promocao, tipo_item: plano.tipo === 'servico' || plano.tipo === 'pacote' ? plano.tipo : 'plano',
    bandeira: bandeira, formas: divisao && divisao.formas.length ? JSON.stringify(divisao.formas) : '' });
  SpreadsheetApp.flush();
  var inicioC = /^\d{4}-\d{2}-\d{2}$/.test(String(o.inicio)) ? o.inicio : hojeTexto();
  var creditoId = concluirPagamento(linhaPagamento(nsu), { metodo: metodo, parcelas: parcelasVenda, valor_pago: valor, inicio: inicioC,
    origemCredito: 'balcão', observacao: String(o.obs || '').slice(0, 300), pagoEm: pagoEm });
  // valeUsado: parte paga com vale-presente (conta na comissão do atendimento, como na comanda)
  return { orderNsu: nsu, creditoId: creditoId, valor: valor, metodo: metodo, valeUsado: numero(calc.valeUsado) };
}

function bancada_simularPreco(d) {
  var plano = buscarItemVenda(d.planoId);
  if (!plano) throw new Error('Plano não encontrado.');
  var r = calcularPreco(plano, d.cpf ? normCpf(d.cpf) : '', d.codigo, { canal: 'bancada', data: d.data });
  return { valorOriginal: r.valorOriginal, desconto: r.desconto, valorFinal: r.valorFinal, mensagem: r.mensagem, promocao: r.promocao, vale: r.vale, valeUsado: r.valeUsado };
}

// Venda no balcão com um ou vários itens (d.itens = [{ planoId, valor? }]; sem d.itens vale d.planoId/d.valor, como antes).
// Cada item vira uma venda própria (caixa, comissão e relatórios continuam por item), com a mesma forma de pagamento, data e início.
// Cupom ou vale-presente só com um item (com vários, a comanda faz essa conta). Se um item falhar no meio, os já lançados são desfeitos.
var MAX_ITENS_VENDA = 12;
function bancada_vender(d, m) {
  var aluno = buscarAluno(d.cpf);
  if (!aluno) throw new Error('Aluno não encontrado.');
  var pedidos = Array.isArray(d.itens) && d.itens.length ? d.itens : [{ planoId: d.planoId, valor: d.valor }];
  if (pedidos.length > MAX_ITENS_VENDA) throw new Error('Uma venda aceita até ' + MAX_ITENS_VENDA + ' itens. Faça em duas vendas.');
  if (pedidos.length > 1 && codigoLimpo(d.codigo)) throw new Error('Cupom ou vale-presente só em venda de um item. Para vários itens com cupom ou vale, use a comanda.');
  if (pedidos.length > 1 && d.metodo === 'Vale-presente') throw new Error('Pagar com vale-presente só em venda de um item. Para vários itens, use a comanda.');
  var itens = pedidos.map(function (x) {
    var plano = buscarItemVenda(x && x.planoId);
    if (!plano) throw new Error('Um dos itens da venda não foi encontrado. Escolha de novo.');
    return { plano: plano, valor: x.valor };
  });
  var resumo = itens.length > 1 ? 'Venda com ' + itens.length + ' itens: ' + itens.map(function (i) { return i.plano.nome; }).join(' + ') + '.' : '';
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  var feitas = [];
  try {
    itens.forEach(function (it) {
      var o = Object.assign({}, d, { valor: it.valor, obs: (resumo ? resumo + ' ' : '') + String(d.obs || '') });
      var v = registrarVenda(aluno, it.plano, o, m);
      feitas.push({ nome: it.plano.nome, v: v });
    });
  } catch (falha) {
    // desfaz o que já foi lançado nesta venda (não deixa metade da venda no caixa)
    feitas.forEach(function (f) {
      try {
        var pg = linhaPagamento(f.v.orderNsu);
        if (pg) atualizarLinha('Pagamentos', pg._linha, { status: 'excluido', observacao: ('EXCLUÍDA em ' + agoraTexto() + ' (venda com vários itens interrompida por erro). ' + (pg.observacao || '')).slice(0, 500) });
        var c = mapaCreditos()['C' + String(f.v.orderNsu).slice(1)];
        if (c) atualizarLinha('Creditos', c._linha, { ativo: 'NÃO' });
      } catch (e2) { Logger.log('desfazer venda em lote: ' + e2.message); }
    });
    soltarTrava(trava);
    throw falha;
  }
  soltarTrava(trava);
  registrar(m, 'venda no balcão', aluno.nome + ' · ' + feitas.map(function (f) { return f.nome + ' R$ ' + f.v.valor; }).join(' + ') + ' · ' + feitas[0].v.metodo);
  var primeira = feitas[0].v;
  return Object.assign({}, primeira, { valor: feitas.reduce(function (t, f) { return t + numero(f.v.valor); }, 0), vendas: feitas.map(function (f) { return { nome: f.nome, orderNsu: f.v.orderNsu, valor: f.v.valor }; }) });
}

function bancada_pagamentos(d, m) {
  var de = String(d.de || somarDias(hojeTexto(), -30));
  var ate = String(d.ate || hojeTexto());
  var limite = Date.now() - PENDENTE_VALE_HORAS * 3600000;
  var memoTaxas = {};
  return lerAba('Pagamentos').map(function (p) {
    // link de pagamento antigo e não pago: aparece como expirado
    if (p.status === 'pendente' && new Date(String(p.criado_em).replace(' ', 'T') + '-03:00').getTime() < limite) p.status = 'expirado';
    return p;
  }).filter(function (p) {
    var dia = String(p.pago_em || p.criado_em).slice(0, 10);
    if (dia < de || dia > ate) return false;
    if (d.status && p.status !== d.status) return false;
    return true;
  }).map(function (p) {
    var o = pagamentoPublico(p);
    // taxa estimada e líquido: só a administração (a recepção não vê o custo da maquininha)
    if (m && m.papel === 'admin' && p.status === 'pago') { var t = taxaDoPagamento(p, memoTaxas); o.taxa = t.taxa; o.liquido = t.liquido; o.taxaPct = t.taxaPct; }
    return o;
  }).reverse();
}

// O estorno em si é feito na InfinitePay; aqui ele é registrado e o crédito é desativado
function bancada_estornar(d, m) {
  // motivo obrigatório: fica na observação da venda (com quem e quando) e no Registro
  var motivo = String(d.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (motivo.length < 3) throw new Error('Diga o motivo do estorno.');
  var pg = linhaPagamento(String(d.orderNsu));
  if (!pg) throw new Error('Pagamento não encontrado.');
  if (pg.status !== 'pago') throw new Error('Só pagamentos aprovados podem ser estornados.');
  // venda da comanda: reabrir desfaz tudo junto (vale vendido, estoque, comissão, atendimento)
  if (pg.comanda) throw new Error('Esta venda é de uma comanda: para desfazer, a administração usa "Reabrir para corrigir" na comanda (Comandas → Fechadas).');
  atualizarLinha('Pagamentos', pg._linha, { status: 'estornado', observacao: ('ESTORNADO em ' + agoraTexto() + ' por ' + m.email + ': ' + motivo + '. ' + (pg.observacao || '')).slice(0, 500) });
  var mc = mapaCreditos();
  var c = mc['C' + String(pg.order_nsu).slice(1)];
  if (c) atualizarLinha('Creditos', c._linha, { ativo: 'NÃO' });
  devolverValeDoPagamento(pg);
  registrar(m, 'estorno', pg.nome + ' · ' + pg.descricao + ' · R$ ' + numero(pg.valor) + ' · ' + motivo);
  return pagamentoPublico(linhaPagamento(pg.order_nsu));
}

// vale em R$ usado neste pagamento volta a ter saldo
function devolverValeDoPagamento(pg) {
  if (!pg.vale) return;
  var v = acharVale(pg.vale);
  if (v && v.tipo !== 'plano' && v.status === 'usado') atualizarLinha('Vales', v._linha, { status: 'ativo', resgatado_em: '', resgatado_cpf: '' });
}

// ---------- corrigir / excluir venda do balcão (tela Vendas) ----------
// Só venda paga, do balcão e fora de comanda (comanda: "Reabrir para corrigir"; site: estorno).
// A recepção mexe só nas vendas de hoje com o caixa aberto; a administração, em qualquer dia.
function vendaQueDaParaMexer(d, m) {
  var pg = linhaPagamento(String(d.orderNsu || ''));
  if (!pg) throw new Error('Venda não encontrada.');
  if (pg.status !== 'pago') throw new Error('Só dá para corrigir ou excluir uma venda paga.');
  if (pg.comanda) throw new Error('Esta venda é de uma comanda: a administração corrige em Comandas → Fechadas → "Reabrir para corrigir".');
  if (String(pg.origem) !== 'balcão') throw new Error('Venda feita pelo site: se precisar desfazer, registre o estorno.');
  if (m.papel !== 'admin') {
    // vale o dia em que foi lançada (venda com data passada lançada hoje também pode ser corrigida hoje)
    if (String(pg.criado_em).slice(0, 10) !== hojeTexto()) throw new Error('A recepção corrige só as vendas lançadas hoje. Para as outras, peça à administração.');
    var cx = caixaDoDia(String(pg.pago_em || pg.criado_em).slice(0, 10));
    if (cx && String(cx.status) === 'fechado') throw new Error('O caixa do dia desta venda já foi fechado. Peça à administração para corrigir.');
  }
  return pg;
}

function textoDaVenda(pg) {
  if (partesDoPagamento(pg)) return textoDivisao(partesDoPagamento(pg));
  return String(pg.metodo || '') + (pg.bandeira ? ' ' + pg.bandeira : '') + (Number(pg.parcelas) > 1 ? ' ' + pg.parcelas + 'x' : '') + ' · ' + brl(numero(pg.valor));
}

function bancada_corrigirVenda(d, m) {
  var motivo = String(d.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (motivo.length < 3) throw new Error('Diga o motivo da correção.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  var pg, mud = {};
  try {
    pg = vendaQueDaParaMexer(d, m);
    var metodos = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay', 'Cortesia'];
    var metodo = metodos.indexOf(d.metodo) >= 0 ? d.metodo : '';
    if (!metodo) throw new Error('Escolha como foi pago.');
    var valor = metodo === 'Cortesia' ? 0 : numero(d.valor);
    if (isNaN(valor) || valor < 0) throw new Error('Valor inválido.');
    valor = dinheiro(valor);
    var parcelas = metodo === 'Cartão de crédito' || metodo === 'Link InfinitePay' ? Math.min(12, Math.max(1, Math.round(Number(d.parcelas) || 1))) : 1;
    var antes = textoDaVenda(pg);
    mud = { metodo: metodo, bandeira: bandeiraDe(metodo, d.bandeira, true), parcelas: parcelas, valor: valor, valor_pago: valor, formas: '' };
    // dividida em mais de uma forma: as partes têm que fechar com o valor da venda
    if (Array.isArray(d.formas) && d.formas.length > 1) {
      if (metodo === 'Cortesia') throw new Error('Cortesia não se divide em formas de pagamento.');
      var div = normalizarFormas(d.formas, valor, true);
      mud.metodo = div.metodo; mud.bandeira = div.bandeira; mud.parcelas = div.parcelas; mud.formas = JSON.stringify(div.formas);
    }
    var diaAntes = String(pg.pago_em).slice(0, 10);
    if (d.dataVenda && d.dataVenda !== diaAntes) {
      mud.pago_em = momentoDaVenda(d.dataVenda) || hojeTexto() + String(pg.pago_em).slice(10);
      antes += ' · ' + diaAntes.split('-').reverse().join('/');
    }
    if (valor !== dinheiro(numero(pg.valor))) {
      mud.desconto = Math.max(0, dinheiro(numero(pg.valor_original) - valor - numero(pg.vale_usado)));
      mud.promocao = '';
    }
    var obs = d.obs != null ? String(d.obs).replace(/\s+/g, ' ').trim() : String(pg.observacao || '');
    mud.observacao = (obs + (obs ? ' · ' : '') + 'Corrigida em ' + agoraTexto() + ' por ' + m.email + ' (antes: ' + antes + '): ' + motivo).slice(0, 500);
    atualizarLinha('Pagamentos', pg._linha, mud);
    // serviço pago direto na agenda: o atendimento guarda o valor (base da comissão)
    if (mud.valor !== dinheiro(numero(pg.valor))) {
      var at = lerAba('Atendimentos').filter(function (a) { return String(a.order_nsu) === String(pg.order_nsu); })[0];
      if (at) {
        atualizarLinha('Atendimentos', at._linha, { valor: dinheiro(valor + numero(pg.vale_usado)), atualizado_em: agoraTexto() });
        if (at.status === 'atendido') comissaoDoAtendimento(lerAba('Atendimentos').filter(function (a) { return a.id === at.id; })[0], true);
      }
      esquecerComissoesAulas();
    }
  } finally {
    soltarTrava(trava);
  }
  registrar(m, 'corrigiu venda', pg.nome + ' · ' + pg.descricao + ' · ' + textoDaVenda(pg) + ' → ' + textoDaVenda(mud) + ' · ' + motivo);
  return pagamentoPublico(linhaPagamento(pg.order_nsu));
}

// Venda lançada por engano: some do caixa e das vendas (fica em "Excluídas", com o motivo).
// O plano/pacote vendido é desativado. Aula avulsa já marcada volta a ficar "A pagar";
// serviço pago na agenda volta a "paga no dia". Plano ou pacote já usado: recusa (cancele antes ou registre o estorno).
function bancada_excluirVenda(d, m) {
  var motivo = String(d.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (motivo.length < 3) throw new Error('Diga o motivo da exclusão.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  var pg, aPagar = 0, atendimentos = 0;
  try {
    pg = vendaQueDaParaMexer(d, m);
    var cid = 'C' + String(pg.order_nsu).slice(1);
    var avulsa = /-avulsa$/.test(String(pg.plano_id));
    var reservas = lerAba('Reservas').filter(function (r) { return String(r.credito_id) === cid && r.status !== 'cancelado'; });
    if (reservas.length && !avulsa) {
      throw new Error('Este plano já tem ' + (reservas.length === 1 ? '1 aula marcada ou feita' : reservas.length + ' aulas marcadas ou feitas') + '. Cancele as reservas antes ou, se a pessoa desistiu, registre o estorno.');
    }
    var ats = lerAba('Atendimentos').filter(function (a) { return a.status !== 'cancelado' && (String(a.order_nsu) === String(pg.order_nsu) || String(a.credito_id) === cid); });
    var sessoes = ats.filter(function (a) { return String(a.order_nsu) !== String(pg.order_nsu); });
    if (sessoes.length) {
      throw new Error((sessoes.length === 1 ? '1 sessão deste pacote já foi usada ou agendada' : sessoes.length + ' sessões deste pacote já foram usadas ou agendadas') + '. Cancele os agendamentos antes ou, se a pessoa desistiu, registre o estorno.');
    }
    reservas.forEach(function (r) { atualizarLinha('Reservas', r._linha, { credito_id: A_PAGAR }); aPagar++; });
    ats.forEach(function (a) {
      atualizarLinha('Atendimentos', a._linha, { pagamento: 'no_dia', order_nsu: '', credito_id: '', atualizado_em: agoraTexto() });
      atendimentos++;
    });
    atualizarLinha('Pagamentos', pg._linha, { status: 'excluido',
      observacao: ('EXCLUÍDA em ' + agoraTexto() + ' por ' + m.email + ': ' + motivo + '. ' + (pg.observacao || '')).slice(0, 500) });
    var c = mapaCreditos()[cid];
    if (c) atualizarLinha('Creditos', c._linha, { ativo: 'NÃO' });
    devolverValeDoPagamento(pg);
    esquecerComissoesAulas();
  } finally {
    soltarTrava(trava);
  }
  registrar(m, 'excluiu venda', pg.nome + ' · ' + pg.descricao + ' · ' + textoDaVenda(pg) + ' · ' + motivo);
  return { venda: pagamentoPublico(linhaPagamento(pg.order_nsu)), aulasAPagar: aPagar, atendimentosAPagar: atendimentos };
}

function bancada_marcarDevolvido(d, m) {
  var pg = linhaPagamento(String(d.orderNsu));
  if (!pg) throw new Error('Pagamento não encontrado.');
  atualizarLinha('Pagamentos', pg._linha, { observacao: String(pg.observacao).replace(/^DEVOLVER/, 'DEVOLVIDO') + ' (registrado por ' + m.email + ' em ' + agoraTexto() + ')' });
  registrar(m, 'juros devolvidos', pg.nome + ' · ' + pg.order_nsu);
  return pagamentoPublico(linhaPagamento(pg.order_nsu));
}

function bancada_ajustarCredito(d, m) {
  var c = mapaCreditos()[String(d.creditoId)];
  if (!c) throw new Error('Crédito não encontrado.');
  var mud = {};
  if (d.fim && /^\d{4}-\d{2}-\d{2}$/.test(d.fim)) mud.fim = d.fim;
  if (d.ativo != null) mud.ativo = d.ativo ? 'SIM' : 'NÃO';
  atualizarLinha('Creditos', c._linha, mud);
  registrar(m, 'ajustou crédito', c.nome + ' · ' + c.descricao + ' · ' + JSON.stringify(mud));
  return true;
}

// ============================================================
//  VALES-PRESENTE (vendidos na comanda: Gestao.gs) E CUPONS
// ============================================================
// pagos: pagamentosQueContam() calculado uma vez por quem lista vários vales
function valePublico(v, pagos) {
  return { codigo: String(v.codigo), status: valeVencido(v) && v.status === 'ativo' ? 'vencido' : v.status, tipo: v.tipo, planoId: v.plano_id, descricao: descreverVale(v),
    valor: numero(v.valor), saldo: v.tipo === 'plano' ? null : saldoVale(v, pagos), cpf: v.cpf ? normCpf(v.cpf) : '', nome: v.nome, email: v.email,
    whatsapp: String(v.whatsapp || ''), motivo: v.motivo, campanha: v.campanha, mensagem: v.mensagem, criadoEm: String(v.criado_em || ''),
    criadoPor: v.criado_por, validade: dataTexto(v.validade || ''), resgatadoEm: String(v.resgatado_em || ''), enviado: String(v.enviado || ''),
    textoWhats: textoWhatsVale(v) };
}

function bancada_vales() {
  var pagos = pagamentosQueContam();
  return lerAba('Vales').filter(function (v) { return v.codigo; }).map(function (v) { return valePublico(v, pagos); }).reverse();
}

function bancada_enviarVale(d, m) {
  var v = acharVale(d.codigo);
  if (!v) throw new Error('Vale não encontrado.');
  var email = String(d.email || v.email || '').trim().toLowerCase();
  if (d.canal === 'email') {
    if (!emailValido(email)) throw new Error('Informe o e-mail.');
    if (email !== v.email) atualizarLinha('Vales', v._linha, { email: email });
    v.email = email;
    enviarEmailVale(v);
  }
  var marca = (d.canal === 'email' ? 'e-mail' : d.canal === 'whatsapp' ? 'WhatsApp' : 'balcão') + ' ' + agoraTexto();
  atualizarLinha('Vales', v._linha, { enviado: marca });
  registrar(m, 'entregou vale', v.codigo + ' · ' + marca);
  return valePublico(acharVale(v.codigo));
}

function bancada_cancelarVale(d, m) {
  var v = acharVale(d.codigo);
  if (!v) throw new Error('Vale não encontrado.');
  if (v.status === 'resgatado' || v.status === 'usado') throw new Error('Este vale já foi usado.');
  atualizarLinha('Vales', v._linha, { status: 'cancelado' });
  registrar(m, 'cancelou vale', v.codigo);
  return valePublico(acharVale(v.codigo));
}

// balcão: aplica o vale direto na conta do aluno
function bancada_aplicarVale(d, m) {
  var aluno = buscarAluno(d.cpf);
  if (!aluno) throw new Error('Aluno não encontrado.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    var r = aplicarVale(aluno, d.codigo, m.email);
    registrar(m, 'aplicou vale', d.codigo + ' · ' + aluno.nome);
    return r;
  } finally {
    soltarTrava(trava);
  }
}

function cupomPublico(c, pagos) {
  var u = usosCupom(c.codigo, '', pagos);
  return { codigo: codigoLimpo(c.codigo), ativo: String(c.ativo).toUpperCase() !== 'NÃO', tipo: c.tipo, valor: numero(c.valor), modalidade: c.modalidade || 'Todas',
    tipoPlano: c.tipo_plano || 'todos', inicio: c.inicio ? dataTexto(c.inicio) : '', fim: c.fim ? dataTexto(c.fim) : '', limiteTotal: numero(c.limite_total),
    limitePorAluno: numero(c.limite_por_aluno), primeiraCompra: String(c.primeira_compra).toUpperCase() === 'SIM', descricao: c.descricao || '',
    usos: u.total, descontoTotal: u.desconto, criadoPor: c.criado_por, vencido: !!(c.fim && dataTexto(c.fim) < hojeTexto()) };
}

function bancada_cupons() {
  var pagos = pagamentosPagos();
  return lerAba('Cupons').filter(function (c) { return c.codigo; }).map(function (c) { return cupomPublico(c, pagos); }).reverse();
}

function bancada_salvarCupom(d, m) {
  var c = d.cupom || {};
  var codigo = codigoLimpo(c.codigo);
  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) throw new Error('Código do cupom: 3 a 30 letras ou números, sem espaços.');
  if (/^AMBAR-/.test(codigo)) throw new Error('Códigos que começam com AMBAR- são dos vales-presente.');
  var tipo = c.tipo === 'valor' ? 'valor' : 'percentual';
  var valor = numero(c.valor);
  if (valor <= 0 || (tipo === 'percentual' && valor > 100)) throw new Error('Informe o desconto.');
  var linha = { codigo: codigo, ativo: c.ativo === false ? 'NÃO' : 'SIM', tipo: tipo, valor: valor, modalidade: c.modalidade || 'Todas', tipo_plano: c.tipoPlano || 'todos',
    inicio: c.inicio || '', fim: c.fim || '', limite_total: numero(c.limiteTotal) || '', limite_por_aluno: numero(c.limitePorAluno) || '',
    primeira_compra: c.primeiraCompra ? 'SIM' : 'NÃO', descricao: String(c.descricao || '').slice(0, 200) };
  var existente = acharCupom(codigo);
  if (existente) {
    atualizarLinha('Cupons', existente._linha, linha);
  } else {
    linha.criado_por = m.email;
    linha.criado_em = agoraTexto();
    adicionarLinha('Cupons', linha);
  }
  registrar(m, existente ? 'editou cupom' : 'criou cupom', codigo);
  return cupomPublico(acharCupom(codigo));
}

// ============================================================
//  GRADE, BLOQUEIOS E CATÁLOGO
// ============================================================
function bancada_bloqueios() {
  var hoje = hojeTexto();
  return lerAba('Bloqueios').map(function (b) {
    return { linha: b._linha, data: dataTexto(b.data), hora: horaTexto(b.hora), modalidade: String(b.modalidade || ''), motivo: String(b.motivo || '') };
  }).filter(function (b) { return b.data >= hoje; }).sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

// bloqueia um dia inteiro, uma modalidade no dia ou uma aula. Cancela as reservas e devolve quem avisar.
function bancada_bloquear(d, m) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.data))) throw new Error('Informe a data.');
  var hora = d.hora ? horaTexto(d.hora) : '';
  var mod = d.modalidade || '';
  adicionarLinha('Bloqueios', { data: d.data, hora: hora, modalidade: mod, motivo: String(d.motivo || '').slice(0, 200) });
  var alunos = mapaAlunos();
  var afetados = [];
  reservasAtivas().forEach(function (r) {
    partesAula(r);
    if (r.data !== d.data) return;
    if (hora && r.hora !== hora) return;
    if (mod && String(r.modalidade).toLowerCase() !== String(mod).toLowerCase()) return;
    atualizarLinha('Reservas', r._linha, { status: 'cancelado', cancelada_em: agoraTexto() });
    var a = alunos[normCpf(r.cpf)] || {};
    afetados.push({ nome: r.nome, whatsapp: String(a.whatsapp || ''), aula: r.modalidade + ' ' + r.hora });
  });
  registrar(m, 'bloqueou', d.data + ' ' + (hora || 'dia todo') + ' ' + (mod || 'todas') + ' · ' + (d.motivo || '') + ' · ' + afetados.length + ' reservas canceladas');
  return { afetados: afetados };
}

function bancada_desbloquear(d, m) {
  var s = aba('Bloqueios');
  var linha = Number(d.linha);
  if (linha < 2 || linha > s.getLastRow()) throw new Error('Bloqueio não encontrado.');
  // confere que a linha ainda é o mesmo bloqueio (outra pessoa pode ter liberado antes e as linhas andaram)
  var b = valoresComTexto(s.getRange(linha, 1, 1, 3))[0];
  if (d.data && (dataTexto(b[0]) !== d.data || horaTexto(b[1]) !== String(d.hora || '') || String(b[2] || '') !== String(d.modalidade || ''))) {
    throw new Error('A lista de bloqueios mudou. Atualize a página e tente de novo.');
  }
  s.deleteRow(linha);
  registrar(m, 'desbloqueou', 'linha ' + linha);
  return true;
}

function bancada_grade() {
  return lerAba('Grade').filter(function (g) { return String(g.modalidade || '').trim(); }).map(function (g) {
    return { ativo: String(g.ativo).toUpperCase() !== 'NÃO', modalidade: String(g.modalidade), dia: Number(g.dia_semana), hora: horaTexto(g.hora),
      professor: String(g.professor), capacidade: Number(g.capacidade) || 0 };
  });
}

function bancada_salvarGrade(d, m) {
  var linhas = (d.linhas || []).map(function (g) {
    if (['Yoga', 'Pilates'].indexOf(g.modalidade) < 0) throw new Error('Modalidade inválida.');
    var h = horaTexto(g.hora);
    if (!/^\d{2}:\d{2}$/.test(h)) throw new Error('Horário inválido: ' + g.hora);
    var dia = Number(g.dia);
    if (!(dia >= 0 && dia <= 6)) throw new Error('Dia inválido.');
    return [g.ativo === false ? 'NÃO' : 'SIM', g.modalidade, dia, h, String(g.professor || '').trim(), Math.max(1, Number(g.capacidade) || (g.modalidade === 'Yoga' ? 12 : 4))];
  });
  if (!linhas.length) throw new Error('A grade não pode ficar vazia.');
  var s = aba('Grade');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    // limpa as linhas antigas (o Sheets não deixa apagar todas) e grava a grade nova
    if (s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, 6).clearContent();
    s.getRange('D:D').setNumberFormat('@');
    s.getRange(2, 1, linhas.length, 6).setValues(linhas.map(linhaSegura));
  } finally {
    soltarTrava(trava);
  }
  // reservas futuras acompanham a professora nova (presença, comissão e lembrete usam o nome da reserva)
  var hoje = hojeTexto();
  var porAula = {};
  gerarAulas(hoje, 90).forEach(function (a) { porAula[a.id] = a.professor; });
  var mudaram = 0;
  lerAba('Reservas').forEach(function (r) {
    if (r.status === 'cancelado' || !porAula[r.aula_id]) return;
    if (dataTexto(r.data) < hoje || String(r.professor) === String(porAula[r.aula_id])) return;
    atualizarLinha('Reservas', r._linha, { professor: porAula[r.aula_id] });
    mudaram++;
  });
  registrar(m, 'editou a grade', linhas.length + ' horários' + (mudaram ? ' · ' + mudaram + ' reservas com a professora nova' : ''));
  return bancada_grade();
}

function bancada_planos() {
  var linhas = lerAba('Planos');
  if (!linhas.length) listarPlanos();
  return lerAba('Planos').filter(function (p) { return p.id; }).map(function (p) {
    return { id: String(p.id), ativo: String(p.ativo).toUpperCase() !== 'NÃO', modalidade: p.modalidade, tipo: p.tipo, nome: p.nome, aulasSemana: numero(p.aulas_semana),
      aulasTotal: numero(p.aulas_total), validadeDias: numero(p.validade_dias), preco: numero(p.preco), descricao: p.descricao, semJurosAte: semJurosAte(p) };
  });
}

function bancada_salvarPlano(d, m) {
  var p = d.plano || {};
  var id = String(p.id || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!id) throw new Error('Informe o código do plano.');
  if (['Yoga', 'Pilates'].indexOf(p.modalidade) < 0) throw new Error('Modalidade inválida.');
  if (['avulsa', 'mensal', 'trimestral'].indexOf(p.tipo) < 0) throw new Error('Tipo inválido.');
  if (!(numero(p.preco) > 0)) throw new Error('Informe o preço.');
  var linha = { id: id, ativo: p.ativo === false ? 'NÃO' : 'SIM', modalidade: p.modalidade, tipo: p.tipo, nome: String(p.nome || '').trim(),
    aulas_semana: p.tipo === 'avulsa' ? 0 : numero(p.aulasSemana), aulas_total: p.tipo === 'avulsa' ? Math.max(1, numero(p.aulasTotal) || 1) : 0,
    validade_dias: numero(p.validadeDias) || (p.tipo === 'trimestral' ? 90 : 30), preco: numero(p.preco), descricao: String(p.descricao || ''),
    sem_juros_ate: numero(p.semJurosAte) || '' };
  if (!linha.nome) throw new Error('Informe o nome do plano.');
  var existente = lerAba('Planos').filter(function (x) { return String(x.id) === id; })[0];
  if (existente) atualizarLinha('Planos', existente._linha, linha);
  else adicionarLinha('Planos', linha);
  registrar(m, existente ? 'editou plano' : 'criou plano', id + ' · R$ ' + linha.preco);
  return bancada_planos();
}

// ============================================================
//  EQUIPE, AJUSTES E REGISTRO
// ============================================================
function bancada_equipe() {
  return lerAba('Equipe').filter(function (x) { return x.email; }).map(function (x) {
    var p = membroPublico(x);
    p.ativo = String(x.ativo).toUpperCase() !== 'NÃO';
    p.ultimoAcesso = String(x.ultimo_acesso || '');
    p.temSenha = !!x.senha_hash;
    return p;
  });
}

function bancada_salvarMembro(d, m) {
  var x = d.membro || {};
  var email = String(x.email || '').trim().toLowerCase();
  if (!emailValido(email)) throw new Error('E-mail inválido.');
  if (['admin', 'recepcao', 'professora'].indexOf(x.papel) < 0) throw new Error('Escolha o tipo de acesso.');
  if (!String(x.nome || '').trim()) throw new Error('Informe o nome.');
  var existente = buscarMembro(email);
  var ativo = x.ativo === false ? 'NÃO' : 'SIM';
  if (existente && existente.papel === 'admin' && (x.papel !== 'admin' || ativo === 'NÃO')) {
    var outros = lerAba('Equipe').filter(function (y) { return y.papel === 'admin' && String(y.ativo).toUpperCase() !== 'NÃO' && String(y.email).toLowerCase() !== email; });
    if (!outros.length) throw new Error('A bancada precisa ter pelo menos um administrador ativo.');
  }
  var linha = { email: email, nome: String(x.nome).trim(), papel: x.papel, professor_nome: x.papel === 'professora' ? String(x.professorNome || x.nome).trim() : '', ativo: ativo };
  var convite = false;
  if (existente) {
    atualizarLinha('Equipe', existente._linha, linha);
    esquecerSessoesEmCache(email);
    if (ativo === 'NÃO') encerrarSessoes('SessoesEquipe', 'e_', email);
    if (x.reenviarConvite) { enviarConviteEquipe(buscarMembro(email)); convite = true; }
  } else {
    linha.criado_em = agoraTexto();
    adicionarLinha('Equipe', linha);
    enviarConviteEquipe(buscarMembro(email));
    convite = true;
  }
  registrar(m, existente ? 'editou acesso' : 'criou acesso', email + ' · ' + x.papel + ' · ' + ativo);
  return { equipe: bancada_equipe(), conviteEnviado: convite };
}

// depois de mexer na planilha à mão: as cópias guardadas no cache deixam de valer na hora
function bancada_lerPlanilhaDeNovo(d, m) {
  esquecerCacheDasAbas();
  registrar(m, 'leu a planilha de novo', '');
  return { ok: true };
}

function bancada_ajustes() {
  return { diasVisiveis: AJUSTES.diasVisiveis, checkinAbreMinAntes: AJUSTES.checkinAbreMinAntes, cancelarAteHorasAntes: AJUSTES.cancelarAteHorasAntes,
    reservaPendenteMin: AJUSTES.reservaPendenteMin, valeValidadeDias: AJUSTES.valeValidadeDias, wellhubAtivo: AJUSTES.wellhub.ativo,
    wellhubReservasPorDia: AJUSTES.wellhub.reservasPorDia, wellhubPendentePodeReservar: AJUSTES.wellhub.pendentePodeReservar !== false, pagamentoComChave: !!chaveInfinitePay(), versao: VERSAO,
    lembreteServicos: AJUSTES.lembreteServicos !== false, lembreteAulas: !!AJUSTES.lembreteAulas, comissaoLiquida: AJUSTES.comissaoLiquida !== false, taxas: AJUSTES.taxas,
    ultimosLembretes: PropertiesService.getScriptProperties().getProperty('LEMBRETES_ULTIMO') || '',
    emailsRestantes: (function () { try { return MailApp.getRemainingDailyQuota(); } catch (e) { return null; } })() };
}

function bancada_salvarAjustes(d, m) {
  var a = d.ajustes || {};
  var limites = { diasVisiveis: [1, 60], checkinAbreMinAntes: [5, 240], cancelarAteHorasAntes: [0, 72], reservaPendenteMin: [5, 120], valeValidadeDias: [7, 730],
    wellhubReservasPorDia: [1, 5] };
  var salvar = {};
  AJUSTES_EDITAVEIS.forEach(function (k) {
    if (a[k] == null) return;
    if (k === 'wellhubAtivo' || k === 'wellhubPendentePodeReservar' || k === 'lembreteServicos' || k === 'lembreteAulas' || k === 'comissaoLiquida') { salvar[k] = !!a[k]; return; }
    var n = Number(a[k]);
    if (isNaN(n) || n < limites[k][0] || n > limites[k][1]) throw new Error('Valor fora do limite em ' + k + ' (' + limites[k][0] + ' a ' + limites[k][1] + ').');
    salvar[k] = n;
  });
  // taxas da maquininha e do link: % de 0 a 30, com até 2 casas; cada coluna de crédito/link tem as parcelas 1x a 12x (vazio = ainda não informada)
  if (a.taxas && typeof a.taxas === 'object') {
    var conferirTaxa = function (v, vazioOk) {
      if (v === null || v === undefined || v === '') { if (vazioOk) return null; return 0; }
      var n = Number(String(v).replace(',', '.'));
      if (isNaN(n) || n < 0 || n > 30) throw new Error('Taxa fora do limite (0 a 30%).');
      return Math.round(n * 100) / 100;
    };
    var coluna = function (v) {
      if (!Array.isArray(v) || v.length > 12) throw new Error('A tabela de parcelas vai de 1x a 12x.');
      var c = []; for (var i = 0; i < 12; i++) c.push(conferirTaxa(v[i], true));
      return c;
    };
    var ta = a.taxas, nova = { versao: TABELA_VERSAO, pix: conferirTaxa(ta.pix, false), debito: {}, credito: {}, link: coluna(ta.link), prazos: {} };
    ['pix', 'debito', 'credito', 'link'].forEach(function (k) {
      var n = Number((ta.prazos || AJUSTES.taxas.prazos || {})[k]);
      if (isNaN(n) || n < 0 || n > 60) throw new Error('O prazo de recebimento vai de 0 a 60 dias.');
      nova.prazos[k] = Math.round(n);
    });
    GRUPOS_TAXA.forEach(function (g) {
      nova.debito[g] = conferirTaxa((ta.debito || {})[g], true);
      nova.credito[g] = coluna((ta.credito || {})[g]);
    });
    salvar.taxas = nova;
  }
  var props = PropertiesService.getScriptProperties();
  var atual = {};
  try { atual = JSON.parse(props.getProperty('AJUSTES_JSON') || '{}') || {}; } catch (e) { atual = {}; }
  Object.keys(salvar).forEach(function (k) { atual[k] = salvar[k]; });
  props.setProperty('AJUSTES_JSON', JSON.stringify(atual));
  _ajustesAplicados = false;
  aplicarAjustesSalvos();
  registrar(m, 'mudou ajustes', JSON.stringify(salvar));
  return bancada_ajustes();
}

function bancada_registro(d) {
  var lista = lerAba('Registro');
  return lista.slice(-300).reverse().map(function (r) { return { quando: String(r.quando), quem: String(r.quem), acao: String(r.acao), detalhe: String(r.detalhe) }; });
}
