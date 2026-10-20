/**
 * ============================================================
 *  CASA ÂMBAR — SUBSTITUIÇÕES (alguém faltou ou trocou com outra pessoa)
 * ============================================================
 *  Aula:    a troca vale só para aquela aula (aula_id). gerarAulas já devolve quem substitui e as
 *           reservas passam para o nome dela (presença, lembretes, agenda e comissão).
 *  Serviço: o atendimento passa para quem substitui (agenda, comanda aberta, pagamento e comissão).
 *  Comissão: pela regra de quem substitui (padrão) ou da titular, escolhida na hora da troca.
 *  A profissional só PEDE substituição; administração e recepção fazem a troca.
 *  Os clientes não recebem aviso automático: a recepção recebe a lista com o WhatsApp pronto.
 *  Aba Substituicoes: uma linha por aula/atendimento (status pedido → feita | recusada | cancelada | desfeita).
 */

// aulas trocadas: aula_id → { titular, substituto, regra }
function trocasDeAulas() {
  var mapa = {};
  lerAba('Substituicoes').forEach(function (s) {
    if (s.tipo === 'aula' && s.status === 'feita') mapa[String(s.ref)] = { id: String(s.id), titular: String(s.titular), substituto: String(s.substituto), regra: String(s.regra || 'substituta') };
  });
  return mapa;
}

// linha em aberto (pedido ou troca feita) de uma aula/atendimento
function trocaAtiva(tipo, ref) {
  return lerAba('Substituicoes').filter(function (s) {
    return s.tipo === tipo && String(s.ref) === String(ref) && (s.status === 'pedido' || s.status === 'feita');
  }).pop() || null;
}

function substituicaoPublica(s, m) {
  var prof = m && m.papel === 'professora';
  return { id: String(s.id), tipo: String(s.tipo), ref: String(s.ref), data: dataTexto(s.data), hora: horaTexto(s.hora),
    titulo: prof ? String(s.titulo).split(' · ')[0] : String(s.titulo), titular: String(s.titular), substituto: String(s.substituto || ''),
    regra: String(s.regra || 'substituta'), status: String(s.status), motivo: String(s.motivo || ''), resposta: String(s.resposta || ''),
    pedidoPor: String(s.pedido_por || '').split('@')[0], pedidoEm: String(s.pedido_em || ''), feitoPor: String(s.feito_por || '').split('@')[0], feitoEm: String(s.feito_em || '') };
}

function dataCurta(data) { return String(data).slice(8, 10) + '/' + String(data).slice(5, 7); }
function horaCurta(h) { h = horaTexto(h); return Number(h.slice(0, 2)) + 'h' + (h.slice(3) === '00' ? '' : h.slice(3)); }

// ---------------- o que está sendo trocado ----------------
function acharAulaPorId(id) {
  var data = String(id || '').split('_')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  return gerarAulas(data, 1).filter(function (a) { return a.id === id; })[0] || null;
}

// { tipo, ref, data, hora, duracao, titulo, atual, titular, regra, servico, cliente }
function itemDaTroca(tipo, ref) {
  var t = trocaAtiva(tipo, ref);
  var feita = t && t.status === 'feita' ? t : null;
  if (tipo === 'aula') {
    var aula = acharAulaPorId(ref);
    if (!aula) throw new Error('Aula não encontrada (ela precisa estar na grade).');
    return { tipo: 'aula', ref: aula.id, data: aula.data, hora: aula.hora, duracao: aula.duracao || AJUSTES.duracaoAulaMin, titulo: aula.modalidade,
      atual: String(aula.professor), titular: feita ? feita.titular : String(aula.professor), regra: feita ? String(feita.regra) : 'substituta', aula: aula, troca: t };
  }
  var a = lerAba('Atendimentos').filter(function (x) { return x.id && String(x.id) === String(ref); })[0];
  if (!a) throw new Error('Atendimento não encontrado.');
  if (a.status === 'cancelado') throw new Error('Este atendimento foi cancelado.');
  var serv = listarServicos(true).filter(function (s) { return s.id === String(a.servico_id); })[0] || { id: String(a.servico_id), nome: a.servico, categoria: a.categoria };
  return { tipo: 'servico', ref: String(a.id), data: dataTexto(a.data), hora: horaTexto(a.hora), duracao: numero(a.duracao_min) || 60,
    titulo: a.servico + ' · ' + a.nome, atual: String(a.profissional), titular: String(a.titular || '') || String(a.profissional),
    regra: a.comissao_de ? 'titular' : 'substituta', servico: serv, atendimento: a, troca: t };
}

// quem dá aula: profissionais de aula ativos + nomes da grade
function nomesDeAula() {
  var nomes = {};
  listarProfessoras().forEach(function (p) { if (p.ativo) nomes[semAcento(p.nome)] = p.nome; });
  lerAba('Grade').forEach(function (g) {
    var n = String(g.professor || '').trim();
    if (n && String(g.ativo).toUpperCase() !== 'NÃO' && !nomes[semAcento(n)]) nomes[semAcento(n)] = n;
  });
  return Object.keys(nomes).map(function (k) { return nomes[k]; }).sort();
}

// a pessoa está livre nesse horário? '' = livre; senão o motivo
function ocupacao(nome, it) {
  var a0 = minutos(it.hora), a1 = a0 + it.duracao;
  // outra aula no mesmo horário
  var aula = gerarAulas(it.data, 1).filter(function (x) {
    if (x.id === it.ref || semAcento(x.professor) !== semAcento(nome)) return false;
    var b0 = minutos(x.hora), b1 = b0 + (x.duracao || AJUSTES.duracaoAulaMin);
    return a0 < b1 && b0 < a1;
  })[0];
  if (aula) return 'dá ' + aula.modalidade + ' às ' + horaCurta(aula.hora);
  var c = conflito(it.data, it.hora, it.duracao, nome, it.tipo === 'servico' ? it.ref : '');
  if (c) return c.folga ? 'bloqueada (' + (c.motivo || 'folga') + ')' : 'atende ' + (c.nome || '') + ' às ' + horaCurta(c.hora);
  return '';
}

function valorDeAulaTexto(p, modalidade) {
  if (!p) return 'sem valor cadastrado';
  if (modalidade === 'Pilates') return p.pilatesPct != null ? p.pilatesPct + '% por aluno' : 'sem valor cadastrado';
  return p.yogaPorAula > 0 ? brl(p.yogaPorAula) + ' por aula' : 'sem valor cadastrado';
}

// candidatos com a situação de cada um (livre primeiro)
function candidatosDaTroca(it, m) {
  var admin = m && m.papel === 'admin';
  var lista = [];
  if (it.tipo === 'aula') {
    var profs = {};
    listarProfessoras().forEach(function (p) { profs[semAcento(p.nome)] = p; });
    nomesDeAula().forEach(function (n) {
      if (semAcento(n) === semAcento(it.atual)) return;
      var p = profs[semAcento(n)];
      var semValor = valorDeAulaTexto(p, it.titulo) === 'sem valor cadastrado';
      lista.push({ nome: n, ocupada: ocupacao(n, it), aviso: semValor ? 'sem valor de aula cadastrado (Catálogo → Profissionais de aula)' : '',
        comissao: admin ? valorDeAulaTexto(p, it.titulo) : null });
    });
  } else {
    listarProfissionais().forEach(function (p) {
      if (semAcento(p.nome) === semAcento(it.atual) || !fazServico(p, it.servico)) return;
      var a0 = minutos(it.hora), a1 = a0 + it.duracao;
      var noTurno = turnosDoProfissional(p, it.data).some(function (t) { return t[0] <= a0 && a1 <= t[1]; });
      lista.push({ nome: p.nome, ocupada: ocupacao(p.nome, it), aviso: noTurno ? '' : 'fora do horário dela',
        comissao: admin ? pctComissao(p.nome, it.servico.id) + '%' : null });
    });
  }
  // a titular aparece para desfazer a troca
  if (semAcento(it.titular) !== semAcento(it.atual)) lista.unshift({ nome: it.titular, ocupada: '', aviso: '', titular: true, comissao: null });
  return lista.sort(function (a, b) { return (b.titular ? 1 : 0) - (a.titular ? 1 : 0) || (a.ocupada ? 1 : 0) - (b.ocupada ? 1 : 0) || (a.aviso ? 1 : 0) - (b.aviso ? 1 : 0); });
}

function itemPublico(it) {
  return { tipo: it.tipo, ref: it.ref, data: it.data, hora: it.hora, duracao: it.duracao, titulo: it.titulo, atual: it.atual, titular: it.titular,
    regra: it.regra, trocaId: it.troca ? String(it.troca.id) : '', pedido: it.troca && it.troca.status === 'pedido' ? substituicaoPublica(it.troca) : null };
}

function bancada_opcoesSubstituicao(d, m) {
  var it = itemDaTroca(d.tipo === 'aula' ? 'aula' : 'servico', d.ref);
  var r = itemPublico(it);
  r.candidatos = candidatosDaTroca(it, m);
  if (m.papel === 'admin') {
    var profs = {};
    listarProfessoras().forEach(function (p) { profs[semAcento(p.nome)] = p; });
    r.comissaoTitular = it.tipo === 'aula' ? valorDeAulaTexto(profs[semAcento(it.titular)], it.titulo) : pctComissao(it.titular, it.servico.id) + '%';
  }
  return r;
}

// ---------------- aplicar a troca ----------------
// nome = quem fica com o horário (a titular, para desfazer)
function aplicarTroca(it, nome, regra) {
  var alertas = [];
  var voltou = semAcento(nome) === semAcento(it.titular);
  if (it.tipo === 'aula') {
    lerAba('Reservas').filter(function (r) { return r.aula_id === it.ref; }).forEach(function (r) {
      if (String(r.professor) !== nome) atualizarLinha('Reservas', r._linha, { professor: nome });
    });
    esquecerComissoesAulas();
    var ex = lerAba('Comissoes').filter(function (c) { return String(c.ref).indexOf('aula:') === 0 && c.status === 'pago' && String(c.data) && dataTexto(c.data) === it.data; });
    if (ex.some(function (c) { return String(c.item).indexOf(horaCurta(it.hora)) >= 0; })) alertas.push('Já havia comissão paga desta aula: confira em Financeiro → Comissões.');
    return alertas;
  }
  var a = it.atendimento;
  atualizarLinha('Atendimentos', a._linha, { profissional: nome, titular: voltou ? '' : it.titular, comissao_de: !voltou && regra === 'titular' ? it.titular : '', atualizado_em: agoraTexto() });
  // comanda aberta com este atendimento
  lerAba('Comandas').filter(function (c) { return c.status === 'aberta'; }).forEach(function (c) {
    var itens = parseJson(c.itens, []);
    var mudou = false;
    itens.forEach(function (i) { if (i.atendimentoId === a.id && i.profissional !== nome) { i.profissional = nome; mudou = true; } });
    if (mudou) atualizarLinha('Comandas', c._linha, { itens: JSON.stringify(itens) });
  });
  // pagamento já registrado
  if (a.order_nsu) {
    var pg = linhaPagamento(String(a.order_nsu));
    if (pg) atualizarLinha('Pagamentos', pg._linha, { profissional: nome });
  }
  if (a.status === 'atendido') {
    var c = lerAba('Comissoes').filter(function (x) { return String(x.id) === 'K' + a.id; })[0];
    if (c && c.status === 'pago') alertas.push('A comissão deste atendimento já foi paga para ' + c.profissional + '. Ajuste à mão, se precisar.');
    comissaoDoAtendimento(lerAba('Atendimentos').filter(function (x) { return x.id === a.id; })[0], true);
  }
  return alertas;
}

// mensagem pronta para a recepção avisar cada cliente (WhatsApp, sem envio automático)
function avisosDaTroca(it, nome) {
  var quando = DIAS_SEMANA[new Date(it.data + 'T12:00:00Z').getUTCDay()] + ', ' + dataCurta(it.data) + ', às ' + horaCurta(it.hora);
  var pessoas = [];
  if (it.tipo === 'aula') {
    lerAba('Reservas').forEach(function (r) {
      if (r.aula_id !== it.ref || r.status === 'cancelado') return;
      var al = buscarAluno(r.cpf);
      pessoas.push({ nome: String(r.nome), whatsapp: al ? soDigitos(al.whatsapp) : '',
        texto: 'Olá, ' + primeiroNome(r.nome) + '! A aula de ' + it.titulo + ' de ' + quando + ' vai ser com ' + nome + '. Até lá! · Casa Âmbar' });
    });
  } else {
    var a = it.atendimento;
    pessoas.push({ nome: String(a.nome), whatsapp: soDigitos(a.whatsapp),
      texto: 'Olá, ' + primeiroNome(a.nome) + '! Seu horário de ' + a.servico + ' de ' + quando + ' vai ser com ' + nome + '. Se preferir remarcar, é só responder esta mensagem. · Casa Âmbar' });
  }
  return pessoas;
}

// avisa por e-mail quem vai cobrir (se tiver acesso à bancada)
function avisarSubstituta(nome, it) {
  try {
    var mb = lerAba('Equipe').filter(function (x) {
      return String(x.ativo).toUpperCase() !== 'NÃO' && semAcento(x.professor_nome || x.nome) === semAcento(nome);
    })[0];
    if (!mb || !emailValido(mb.email)) return;
    var oque = it.tipo === 'aula' ? 'a aula de ' + it.titulo : String(it.atendimento.servico) + ' (' + primeiroNome(it.atendimento.nome) + ')';
    enviarEmail(mb.email, 'Você vai cobrir um horário · Casa Âmbar', 'Novo horário para você',
      ['Olá, ' + primeiroNome(mb.nome) + '.', 'Você vai cobrir ' + oque + ' em ' + dataCurta(it.data) + ', às ' + horaCurta(it.hora) + ', no lugar de ' + it.titular + '.',
        'O horário já está na sua agenda da bancada.'], { texto: 'Abrir a agenda', url: AJUSTES.siteUrl + '#/bancada/agenda' });
  } catch (e) { Logger.log('aviso substituta: ' + e.message); }
}

// d = { tipo, ref, substituto, regra: 'substituta' | 'titular', motivo, forcar }
function bancada_substituir(d, m) {
  var tipo = d.tipo === 'aula' ? 'aula' : 'servico';
  var regra = d.regra === 'titular' ? 'titular' : 'substituta';
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var it = itemDaTroca(tipo, d.ref);
    if (inicio({ data: it.data, hora: it.hora }).getTime() < Date.now() - 7 * 86400000) throw new Error('Este horário já passou há mais de uma semana. Ajuste em Financeiro → Comissões.');
    // a mesma pessoa de agora: só muda a regra da comissão (ou o motivo)
    var cand = semAcento(d.substituto) === semAcento(it.atual) && semAcento(it.atual) !== semAcento(it.titular)
      ? { nome: it.atual, ocupada: '', aviso: '' }
      : candidatosDaTroca(it, m).filter(function (c) { return semAcento(c.nome) === semAcento(d.substituto); })[0];
    if (!cand) throw new Error(tipo === 'servico' ? 'Escolha alguém que faça este serviço.' : 'Escolha quem vai dar a aula.');
    var nome = cand.nome;
    var voltou = semAcento(nome) === semAcento(it.titular);
    if (!voltou && cand.ocupada && !d.forcar) throw erroCod(nome + ' está ocupada nesse horário (' + cand.ocupada + ').', 'OCUPADA');
    if (!voltou && cand.aviso && tipo === 'servico' && !d.forcar) throw erroCod(nome + ' está fora do horário de trabalho dela.', 'FORA_DO_HORARIO');
    var alertas = aplicarTroca(it, nome, regra);
    var motivo = String(d.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    var t = it.troca;
    if (voltou) {
      if (t && t.status === 'feita') atualizarLinha('Substituicoes', t._linha, { status: 'desfeita', feito_por: m.email, feito_em: agoraTexto() });
    } else {
      var linha = { substituto: nome, regra: regra, status: 'feita', feito_por: m.email, feito_em: agoraTexto() };
      if (motivo) linha.motivo = motivo;
      if (t) atualizarLinha('Substituicoes', t._linha, linha);
      else adicionarLinha('Substituicoes', Object.assign({ id: novoId('T'), tipo: tipo, ref: it.ref, data: it.data, hora: it.hora, titulo: it.titulo, titular: it.titular,
        motivo: motivo }, linha));
      if (cand.aviso && tipo === 'aula' && regra === 'substituta') alertas.push(nome + ' não tem valor de aula cadastrado: a comissão desta aula fica zerada até cadastrar em Catálogo → Profissionais de aula.');
    }
    registrar(m, voltou ? 'desfez substituição' : 'substituição', it.titulo + ' · ' + it.data + ' ' + it.hora + ' · ' + it.titular + (voltou ? '' : ' → ' + nome + ' (regra ' + (regra === 'titular' ? 'da titular' : 'de quem substitui') + ')'));
  } finally {
    trava.releaseLock();
  }
  if (!voltou) avisarSubstituta(nome, it);
  return { profissional: nome, desfeita: voltou, alertas: alertas, avisos: avisosDaTroca(it, nome) };
}

// ---------------- pedidos da profissional ----------------
// d = { data, dias (1–14), de, ate (HH:MM, opcionais), motivo } ou { tipo, ref, motivo } para um horário só
function bancada_pedirSubstituicao(d, m) {
  var motivo = String(d.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!motivo) throw new Error('Conte o motivo (ex.: consulta médica, viagem).');
  var itens = [];
  if (d.ref) {
    var it = itemDaTroca(d.tipo === 'aula' ? 'aula' : 'servico', d.ref);
    if (!mesmaProfessora(it.atual, m)) throw new Error('Este horário não é seu.');
    itens.push(it);
  } else {
    var data0 = dataValida(d.data, '');
    if (!data0) throw new Error('Escolha o dia.');
    var dias = Math.min(Math.max(Number(d.dias) || 1, 1), 14);
    var de = /^\d{2}:\d{2}$/.test(String(d.de)) ? minutos(d.de) : 0;
    var ate = /^\d{2}:\d{2}$/.test(String(d.ate)) ? minutos(d.ate) : 24 * 60;
    if (ate <= de) throw new Error('O fim precisa ser depois do início.');
    var dentro = function (h, dur) { var x = minutos(h); return x < ate && de < x + dur; };
    for (var i = 0; i < dias; i++) {
      var dia = somarDias(data0, i);
      gerarAulas(dia, 1).forEach(function (a) {
        if (mesmaProfessora(a.professor, m) && dentro(a.hora, a.duracao || AJUSTES.duracaoAulaMin)) itens.push(itemDaTroca('aula', a.id));
      });
      atendimentosDoDia(dia).forEach(function (a) {
        if (mesmaProfessora(a.profissional, m) && dentro(horaTexto(a.hora), numero(a.duracao_min) || 60)) itens.push(itemDaTroca('servico', a.id));
      });
    }
  }
  itens = itens.filter(function (it) { return !it.troca && inicio({ data: it.data, hora: it.hora }).getTime() > Date.now(); });
  if (!itens.length) throw new Error('Não há aulas nem atendimentos seus (sem pedido ainda) nesse período.');
  adicionarLinhas('Substituicoes', itens.map(function (it, k) {
    return { id: novoId('T') + k, tipo: it.tipo, ref: it.ref, data: it.data, hora: it.hora, titulo: it.titulo, titular: it.atual, status: 'pedido',
      motivo: motivo, pedido_por: m.email, pedido_em: agoraTexto() };
  }));
  registrar(m, 'pediu substituição', itens.length + ' horário(s) · ' + motivo);
  return { pedidos: itens.length };
}

function acharSubstituicao(id) {
  var s = lerAba('Substituicoes').filter(function (x) { return String(x.id) === String(id); })[0];
  if (!s) throw new Error('Pedido não encontrado.');
  return s;
}

// a profissional desiste do pedido; a recepção recusa (com resposta)
function bancada_cancelarPedido(d, m) {
  var s = acharSubstituicao(d.id);
  if (s.status !== 'pedido') throw new Error('Este pedido já foi resolvido.');
  if (m.papel === 'professora' && !mesmaProfessora(s.titular, m)) throw new Error('Este pedido não é seu.');
  atualizarLinha('Substituicoes', s._linha, { status: m.papel === 'professora' ? 'cancelada' : 'recusada', resposta: String(d.resposta || '').trim().slice(0, 200),
    feito_por: m.email, feito_em: agoraTexto() });
  return true;
}

// lista: pedidos em aberto + trocas do período. A profissional vê só as dela (como titular ou quem cobre).
function bancada_substituicoes(d, m) {
  var de = dataValida(d.de, somarDias(hojeTexto(), -30));
  var ate = dataValida(d.ate, somarDias(hojeTexto(), 60));
  var minhas = function (s) { return m.papel !== 'professora' || mesmaProfessora(s.titular, m) || mesmaProfessora(s.substituto, m); };
  var todas = lerAba('Substituicoes').filter(function (s) { return s.id && minhas(s); });
  var hoje = hojeTexto();
  var pedidos = todas.filter(function (s) { return s.status === 'pedido' && dataTexto(s.data) >= hoje; });
  var historico = todas.filter(function (s) { var dt = dataTexto(s.data); return s.status !== 'pedido' && dt >= de && dt <= ate; });
  var resumo = {};
  historico.filter(function (s) { return s.status === 'feita'; }).forEach(function (s) {
    var a = resumo[s.titular] = resumo[s.titular] || { nome: String(s.titular), substituida: 0, cobriu: 0 };
    a.substituida++;
    var b = resumo[s.substituto] = resumo[s.substituto] || { nome: String(s.substituto), substituida: 0, cobriu: 0 };
    b.cobriu++;
  });
  var ordem = function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); };
  return { pedidos: pedidos.map(function (s) { return substituicaoPublica(s, m); }).sort(ordem),
    historico: historico.map(function (s) { return substituicaoPublica(s, m); }).sort(ordem).reverse(),
    resumo: Object.keys(resumo).map(function (k) { return resumo[k]; }).sort(function (a, b) { return b.substituida + b.cobriu - a.substituida - a.cobriu; }) };
}

// "Fulana não vem": tudo dela no período, com quem pode cobrir cada horário
function bancada_ausencia(d, m) {
  var nome = String(d.profissional || '').trim();
  if (!nome) throw new Error('Escolha quem não vem.');
  var data0 = dataValida(d.data, hojeTexto());
  var dias = Math.min(Math.max(Number(d.dias) || 1, 1), 7);
  var itens = [];
  for (var i = 0; i < dias; i++) {
    var dia = somarDias(data0, i);
    gerarAulas(dia, 1).forEach(function (a) { if (semAcento(a.professor) === semAcento(nome)) itens.push(itemDaTroca('aula', a.id)); });
    atendimentosDoDia(dia).forEach(function (a) { if (semAcento(a.profissional) === semAcento(nome)) itens.push(itemDaTroca('servico', a.id)); });
  }
  return {
    profissional: nome, servicos: !!profissionalPorNome(nome),
    itens: itens.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); }).map(function (it) {
      var r = itemPublico(it);
      r.candidatos = candidatosDaTroca(it, m);
      return r;
    }),
  };
}
