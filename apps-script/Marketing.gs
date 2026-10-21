/**
 * ============================================================
 *  CASA ÂMBAR — MARKETING
 * ============================================================
 *  Promoções: desconto automático (sem código) em itens, dias da semana e período.
 *  Campanhas: e-mail (grátis, pela conta Google) ou WhatsApp um a um, para públicos
 *  como "sumidas", "aniversariantes do mês", "quem fez tal serviço".
 *  Lembretes: e-mail automático na véspera do horário.
 *  Quando há promoção e cupom ao mesmo tempo, vale o maior desconto (não somam).
 */

var DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

// ============================================================
//  PROMOÇÕES
// ============================================================
function promocaoPublica(p) {
  var lista = function (v) { return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(String); };
  return { id: String(p.id), ativo: ativoSim(p.ativo), nome: String(p.nome), descricao: String(p.descricao || ''), tipo: String(p.tipo || 'percentual'),
    valor: numero(p.valor), itens: lista(p.itens), grupos: lista(p.categorias), dias: lista(p.dias).map(Number).filter(function (n) { return n >= 0 && n <= 6; }),
    de: p.de ? dataTexto(p.de) : '', ate: p.ate ? dataTexto(p.ate) : '', onde: String(p.onde || 'ambos'), criadoEm: String(p.criado_em || '') };
}

var _promocoes = null;
function listarPromocoes() {
  if (!_promocoes) _promocoes = lerAba('Promocoes').filter(function (p) { return p.id; }).map(promocaoPublica);
  return _promocoes;
}

function grupoDoItem(it) {
  if (String(it.modalidade) === 'Serviço') return String(it.categoria || '');
  if (String(it.modalidade) === 'Produtos' || it.tipo === 'produto') return 'Produtos';
  return String(it.modalidade || '');
}

function textoPromocao(p, preco) {
  if (p.tipo === 'percentual') return p.valor + '% de desconto';
  if (p.tipo === 'preco_fixo') return 'por ' + brl(p.valor);
  return brl(p.valor) + ' de desconto';
}

// melhor promoção para o item nesta data e canal ('site' ou 'bancada')
function melhorPromocao(it, data, canal) {
  if (!it || !(numero(it.preco) > 0)) return null;
  var dia = new Date(data + 'T12:00:00Z').getUTCDay();
  var g = grupoDoItem(it);
  var melhor = null;
  listarPromocoes().forEach(function (p) {
    if (!p.ativo || (p.de && data < p.de) || (p.ate && data > p.ate)) return;
    if (p.onde !== 'ambos' && p.onde !== canal) return;
    if (p.dias.length && p.dias.indexOf(dia) < 0) return;
    if ((p.itens.length || p.grupos.length) && p.itens.indexOf(String(it.id)) < 0 && p.grupos.indexOf(g) < 0) return;
    var preco = numero(it.preco);
    var desc = p.tipo === 'percentual' ? preco * p.valor / 100 : p.tipo === 'preco_fixo' ? preco - p.valor : p.valor;
    desc = Math.max(0, Math.min(preco, dinheiro(desc)));
    if (desc > 0 && (!melhor || desc > melhor.desconto)) melhor = { id: p.id, nome: p.nome, desconto: desc, texto: textoPromocao(p, preco) };
  });
  return melhor;
}

function bancada_promocoes() {
  _promocoes = null;
  var hoje = hojeTexto();
  var pagos = lerAba('Pagamentos').filter(function (p) { return p.status === 'pago' && p.promocao; });
  return listarPromocoes().map(function (p) {
    var usos = pagos.filter(function (x) { return String(x.promocao) === p.nome; });
    p.usos = usos.length;
    p.descontoTotal = dinheiro(usos.reduce(function (s, x) { return s + numero(x.desconto); }, 0));
    p.situacao = !p.ativo ? 'pausada' : p.ate && p.ate < hoje ? 'encerrada' : p.de && p.de > hoje ? 'agendada' : 'no ar';
    return p;
  }).reverse();
}

function bancada_salvarPromocao(d, m) {
  var x = d.promocao || {};
  var nome = String(x.nome || '').trim();
  if (nome.length < 3) throw new Error('Dê um nome à promoção.');
  var tipo = ['percentual', 'valor', 'preco_fixo'].indexOf(x.tipo) >= 0 ? x.tipo : 'percentual';
  var valor = numero(x.valor);
  if (!(valor > 0) || (tipo === 'percentual' && valor > 100)) throw new Error('Informe o desconto.');
  if (tipo === 'preco_fixo' && (x.itens || []).length !== 1) throw new Error('Preço fixo vale para um item só. Escolha o item.');
  if (x.de && x.ate && x.ate < x.de) throw new Error('A data final é antes da inicial.');
  var outras = listarPromocoes().filter(function (p) { return p.nome.toLowerCase() === nome.toLowerCase() && p.id !== String(x.id || ''); });
  if (outras.length) throw new Error('Já existe uma promoção com este nome.');
  var linha = { ativo: x.ativo === false ? 'NÃO' : 'SIM', nome: nome, descricao: String(x.descricao || '').slice(0, 200), tipo: tipo, valor: valor,
    itens: (x.itens || []).map(String).join(','), categorias: (x.grupos || []).map(String).join(','),
    dias: (x.dias || []).map(Number).filter(function (n) { return n >= 0 && n <= 6; }).join(','),
    de: /^\d{4}-\d{2}-\d{2}$/.test(String(x.de)) ? x.de : '', ate: /^\d{4}-\d{2}-\d{2}$/.test(String(x.ate)) ? x.ate : '',
    onde: ['bancada', 'site', 'ambos'].indexOf(x.onde) >= 0 ? x.onde : 'ambos' };
  var ex = x.id ? lerAba('Promocoes').filter(function (p) { return String(p.id) === String(x.id); })[0] : null;
  if (ex) atualizarLinha('Promocoes', ex._linha, linha);
  else { linha.id = novoId('PR'); linha.criado_por = m.email; linha.criado_em = agoraTexto(); adicionarLinha('Promocoes', linha); }
  _promocoes = null;
  registrar(m, ex ? 'editou promoção' : 'criou promoção', nome);
  return bancada_promocoes();
}

function bancada_excluirPromocao(d, m) {
  var ex = lerAba('Promocoes').filter(function (p) { return String(p.id) === String(d.id); })[0];
  if (!ex) throw new Error('Promoção não encontrada.');
  aba('Promocoes').deleteRow(ex._linha);
  _promocoes = null;
  registrar(m, 'apagou promoção', ex.nome);
  return bancada_promocoes();
}

// ============================================================
//  PÚBLICO DAS CAMPANHAS
// ============================================================
function nascimentoDe(a, fichas) {
  var n = String(a.nascimento || '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(n)) {
    var f = fichas[normCpf(a.cpf)];
    n = f ? (ehData(f.data_nascimento) ? dataTexto(f.data_nascimento) : String(f.data_nascimento || '')) : '';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(n)) n = n.slice(6, 10) + '-' + n.slice(3, 5) + '-' + n.slice(0, 2);
  }
  return /^\d{4}-\d{2}-\d{2}/.test(n) ? n.slice(0, 10) : '';
}

// filtro: { tipo, dias, mes, servicoId, categoria, modalidade }
function publicoCampanha(f) {
  var hoje = hojeTexto();
  var alunos = lerAba('Alunos').filter(function (a) { return a.cpf && ativoSim(a.ativo) && !/^(unificado|exclu)/.test(String(a.origem_cadastro)); });
  var fichas = mapaAnamneses();
  var ultima = ultimasVisitas();
  var futuro = {};
  todasReservas().forEach(function (r) { if (r.data > hoje && r.status === 'reservado') futuro[normCpf(r.cpf)] = 1; });
  var atend = lerAba('Atendimentos').filter(function (a) { return a.id && a.cpf; });
  atend.forEach(function (a) { if (dataTexto(a.data) >= hoje && (a.status === 'agendado' || a.status === 'confirmado')) futuro[normCpf(a.cpf)] = 1; });
  var tipo = String(f.tipo || 'todos');
  var visitas = {};
  if (tipo === 'semRetorno') {
    todasReservas().forEach(function (r) { if (r.status === 'check-in') visitas[normCpf(r.cpf)] = (visitas[normCpf(r.cpf)] || 0) + 1; });
    atend.forEach(function (a) { if (a.status === 'atendido') visitas[normCpf(a.cpf)] = (visitas[normCpf(a.cpf)] || 0) + 1; });
  }
  var fez = {};
  if (tipo === 'servico' || tipo === 'categoria') {
    atend.forEach(function (a) {
      if (a.status !== 'atendido') return;
      if ((tipo === 'servico' && String(a.servico_id) === String(f.servicoId)) || (tipo === 'categoria' && String(a.categoria) === String(f.categoria))) fez[normCpf(a.cpf)] = dataTexto(a.data);
    });
  }
  if (tipo === 'modalidade') {
    todasReservas().forEach(function (r) { if (r.status === 'check-in' && String(r.modalidade) === String(f.modalidade)) fez[normCpf(r.cpf)] = r.data; });
  }
  var acabando = {};
  if (tipo === 'pacoteAcabando') {
    var usos = {};
    atend.forEach(function (a) { if (a.credito_id && a.status !== 'cancelado') usos[a.credito_id] = (usos[a.credito_id] || 0) + 1; });
    var mc = mapaCreditos();
    Object.keys(mc).forEach(function (k) {
      var c = mc[k];
      if (String(c.modalidade) !== 'Serviço' || !ativoSim(c.ativo) || c.fim < hoje || c.aulas_total < 2) return;
      var resta = c.aulas_total - (usos[c.id] || 0);
      if (resta <= 1 || c.fim <= somarDias(hoje, 15)) acabando[normCpf(c.cpf)] = c.descricao + ' · ' + resta + ' sessão(ões), até ' + c.fim.split('-').reverse().join('/');
    });
  }
  var dias = Math.min(Math.max(Number(f.dias) || 45, 7), 365);
  var mes = /^\d{2}$/.test(String(f.mes)) ? String(f.mes) : hoje.slice(5, 7);
  return alunos.map(function (a) {
    var cpf = normCpf(a.cpf);
    var u = ultima[cpf] || '';
    var o = { cpf: cpf, nome: String(a.nome), whatsapp: String(a.whatsapp || ''), email: emailValido(a.email) ? String(a.email).toLowerCase() : '',
      ultimaVisita: u, aceitaEmail: String(a.marketing).toUpperCase() !== 'NÃO', motivo: '' };
    if (tipo === 'todos') return o;
    if (tipo === 'sumidos') {
      if (!u || u > somarDias(hoje, -dias) || u < somarDias(hoje, -365) || futuro[cpf]) return null;
      o.motivo = 'última visita ' + u.split('-').reverse().join('/');
      return o;
    }
    if (tipo === 'aniversariantes') {
      var n = nascimentoDe(a, fichas);
      if (!n || n.slice(5, 7) !== mes) return null;
      o.motivo = 'faz aniversário dia ' + Number(n.slice(8, 10));
      o.dia = Number(n.slice(8, 10));
      return o;
    }
    if (tipo === 'semRetorno') {
      if (visitas[cpf] !== 1 || !u || u > somarDias(hoje, -21) || futuro[cpf]) return null;
      o.motivo = 'veio uma vez, em ' + u.split('-').reverse().join('/');
      return o;
    }
    if (tipo === 'servico' || tipo === 'categoria' || tipo === 'modalidade') {
      if (!fez[cpf]) return null;
      o.motivo = 'última vez em ' + fez[cpf].split('-').reverse().join('/');
      return o;
    }
    if (tipo === 'pacoteAcabando') {
      if (!acabando[cpf]) return null;
      o.motivo = acabando[cpf];
      return o;
    }
    return null;
  }).filter(Boolean).sort(function (x, y) { return (x.dia || 0) - (y.dia || 0) || x.nome.localeCompare(y.nome); });
}

function bancada_publicoCampanha(d) {
  var lista = publicoCampanha(d.filtro || {});
  return { pessoas: lista, total: lista.length, comEmail: lista.filter(function (p) { return p.email && p.aceitaEmail; }).length,
    // quem desmarcou "receber novidades" fica fora também do WhatsApp
    comWhats: lista.filter(function (p) { return p.aceitaEmail && soDigitos(p.whatsapp).length >= 10; }).length, cotaEmail: MailApp.getRemainingDailyQuota() };
}

// ============================================================
//  DESCADASTRO (link no rodapé de todo e-mail de campanha)
// ============================================================
function tokenLista(cpf) {
  return Utilities.computeHmacSha256Signature('lista:' + normCpf(cpf), pimenta())
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('').slice(0, 32);
}

// acha a cliente pelo link de descadastro. O índice (começo do código → CPF) fica 6 h no cache e
// é refeito no máximo a cada 10 min: link falso não trava o descadastro de ninguém nem pesa o sistema.
function alunoDoLinkLista(t) {
  var cache = CacheService.getScriptCache();
  var indice = parseJson(cache.get('lista_indice'), null);
  var acha = function (ind) {
    var cpf = ind && ind[t.slice(0, 12)];
    var a = cpf ? buscarAluno(cpf) : null;
    return a && iguais(tokenLista(a.cpf), t) ? a : null;
  };
  var a = acha(indice);
  if (a || cache.get('lista_indice_novo')) return a;
  indice = {};
  lerAba('Alunos').forEach(function (x) { if (x.cpf) indice[tokenLista(x.cpf).slice(0, 12)] = normCpf(x.cpf); });
  try { cache.put('lista_indice', JSON.stringify(indice), 21600); cache.put('lista_indice_novo', '1', 600); } catch (e) { /* lista grande: segue sem cache */ }
  return acha(indice);
}

function linkDescadastro(cpf) {
  return AJUSTES.siteUrl + '#/descadastrar?t=' + tokenLista(cpf);
}

// público: o token identifica a pessoa sem expor o CPF no link
function sairLista(d) {
  var t = String(d.t || '');
  if (!/^[a-f0-9]{32}$/.test(t)) throw new Error('Link inválido.');
  var chave = 'lista_' + t;
  var cache = CacheService.getScriptCache();
  if (cache.get(chave)) return { ok: true, nome: cache.get(chave) };
  var a = alunoDoLinkLista(t);
  if (!a) throw new Error('Link inválido.');
  atualizarLinha('Alunos', a._linha, { marketing: 'NÃO' });
  cache.put(chave, primeiroNome(a.nome), 3600);
  return { ok: true, nome: primeiroNome(a.nome) };
}

// ============================================================
//  ENVIO DA CAMPANHA
// ============================================================
function personalizar(texto, p) {
  return String(texto || '').replace(/\{nome\}/gi, primeiroNome(p.nome) || '').replace(/\{nome completo\}/gi, p.nome || '');
}

function bancada_enviarCampanha(d, m) {
  var assunto = String(d.assunto || '').trim().slice(0, 120);
  var mensagem = String(d.mensagem || '').trim().slice(0, 4000);
  if (assunto.length < 3) throw new Error('Escreva o assunto do e-mail.');
  if (mensagem.length < 10) throw new Error('Escreva a mensagem.');
  var nome = String(d.nome || assunto).slice(0, 80);
  var lista = publicoCampanha(d.filtro || {}).filter(function (p) { return p.email && p.aceitaEmail; });
  if (d.cpfs && d.cpfs.length) { var sel = {}; d.cpfs.forEach(function (c) { sel[normCpf(c)] = 1; }); lista = lista.filter(function (p) { return sel[p.cpf]; }); }
  var cota = MailApp.getRemainingDailyQuota() - 10;
  if (cota <= 0) throw new Error('A cota de e-mails de hoje acabou. Tente amanhã.');
  var envia = lista.slice(0, Math.min(cota, 400));
  var botao = d.botaoTexto && /^https:\/\//.test(String(d.botaoUrl || '')) ? { texto: String(d.botaoTexto).slice(0, 40), url: String(d.botaoUrl) } : null;
  var enviados = 0;
  envia.forEach(function (p) {
    try {
      var pars = personalizar(mensagem, p).split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(String);
      enviarEmail(p.email, personalizar(assunto, p), personalizar(d.titulo || assunto, p), pars, botao, '',
        'Você recebe este e-mail por ser cliente da Casa Âmbar. <a href="' + escHtml(linkDescadastro(p.cpf)) + '" style="color:#8A8670">Não quero mais receber</a>');
      enviados++;
    } catch (e) {
      Logger.log('campanha ' + p.email + ': ' + e.message);
    }
  });
  adicionarLinha('Campanhas', { id: novoId('CP'), criada_em: agoraTexto(), nome: nome, publico: descreverFiltro(d.filtro || {}), canal: 'e-mail', assunto: assunto,
    mensagem: mensagem.slice(0, 1500), total: lista.length, enviados: enviados, criado_por: m.email });
  registrar(m, 'enviou campanha', nome + ' · ' + enviados + ' e-mails');
  return { enviados: enviados, faltaram: lista.length - enviados, cotaRestante: MailApp.getRemainingDailyQuota() };
}

// campanha por WhatsApp é enviada uma a uma pela recepção; aqui só fica o registro
function bancada_registrarCampanha(d, m) {
  adicionarLinha('Campanhas', { id: novoId('CP'), criada_em: agoraTexto(), nome: String(d.nome || 'Campanha WhatsApp').slice(0, 80), publico: descreverFiltro(d.filtro || {}),
    canal: 'WhatsApp', assunto: '', mensagem: String(d.mensagem || '').slice(0, 1500), total: Number(d.total) || 0, enviados: Number(d.enviados) || 0, criado_por: m.email });
  registrar(m, 'campanha por WhatsApp', String(d.nome || '') + ' · ' + (Number(d.enviados) || 0) + ' mensagens');
  return bancada_campanhas();
}

function descreverFiltro(f) {
  var t = String(f.tipo || 'todos');
  if (t === 'sumidos') return 'Sem vir há mais de ' + (Number(f.dias) || 45) + ' dias';
  if (t === 'aniversariantes') return 'Aniversariantes do mês ' + (f.mes || '');
  if (t === 'semRetorno') return 'Vieram uma vez e não voltaram';
  if (t === 'servico') { var s = listarServicos(true).filter(function (x) { return x.id === f.servicoId; })[0]; return 'Fizeram ' + (s ? s.nome : f.servicoId); }
  if (t === 'categoria') return 'Fizeram ' + f.categoria;
  if (t === 'modalidade') return 'Fizeram aula de ' + f.modalidade;
  if (t === 'pacoteAcabando') return 'Pacote acabando';
  return 'Todas as clientes';
}

function bancada_campanhas() {
  return lerAba('Campanhas').filter(function (c) { return c.id; }).map(function (c) {
    return { id: String(c.id), criadaEm: String(c.criada_em), nome: String(c.nome), publico: String(c.publico), canal: String(c.canal), assunto: String(c.assunto || ''),
      total: numero(c.total), enviados: numero(c.enviados), criadoPor: String(c.criado_por || '').split('@')[0] };
  }).reverse().slice(0, 60);
}

// ============================================================
//  LEMBRETES DA VÉSPERA
// ============================================================
function lembretesDe(data) {
  var alunos = mapaAlunos();
  var lista = [];
  if (AJUSTES.lembreteServicos !== false) {
    lerAba('Atendimentos').forEach(function (a) {
      if (!a.id || dataTexto(a.data) !== data || ['cancelado', 'atendido', 'falta'].indexOf(String(a.status)) >= 0) return;
      var al = a.cpf ? alunos[normCpf(a.cpf)] : null;
      lista.push({ tipo: 'servico', id: String(a.id), aba: 'Atendimentos', linha: a._linha, nome: String(a.nome), email: al && emailValido(al.email) ? String(al.email) : '',
        whatsapp: String(a.whatsapp || (al && al.whatsapp) || ''), hora: horaTexto(a.hora), titulo: String(a.servico), com: String(a.profissional), extra: '',
        enviado: String(a.lembrete || ''), status: String(a.status) });
    });
  }
  if (AJUSTES.lembreteAulas) {
    lerAba('Reservas').forEach(function (r) {
      var x = partesAula(r);
      if (x.data !== data || x.status !== 'reservado') return;
      var al = alunos[normCpf(x.cpf)];
      lista.push({ tipo: 'aula', id: String(x.id), aba: 'Reservas', linha: r._linha, nome: String(x.nome), email: al && emailValido(al.email) ? String(al.email) : '',
        whatsapp: al ? String(al.whatsapp || '') : '', hora: x.hora, titulo: 'Aula de ' + x.modalidade, com: x.professor, extra: x.tapete ? 'tapete ' + x.tapete : '',
        enviado: String(r.lembrete || ''), status: x.status });
    });
  }
  return lista.sort(function (a, b) { return a.hora.localeCompare(b.hora) || a.nome.localeCompare(b.nome); });
}

// "amanhã (terça, 21/10)" se for amanhã; senão "na terça, 23/10"
function quandoLembrete(data) {
  var dia = DIAS_SEMANA[new Date(data + 'T12:00:00Z').getUTCDay()];
  var dm = data.slice(8, 10) + '/' + data.slice(5, 7);
  if (data === somarDias(hojeTexto(), 1)) return { texto: 'amanhã (' + dia + ', ' + dm + ')', titulo: 'Amanhã, ' + dia + ' · ' + dm, assunto: 'amanhã', ate: 'Até amanhã' };
  if (data === hojeTexto()) return { texto: 'hoje (' + dia + ', ' + dm + ')', titulo: 'Hoje, ' + dia + ' · ' + dm, assunto: 'hoje', ate: 'Até já' };
  var art = /^(sábado|domingo)/.test(dia) ? 'no ' : 'na ';
  return { texto: art + dia + ', ' + dm, titulo: dia.charAt(0).toUpperCase() + dia.slice(1) + ' · ' + dm, assunto: art + dia + ', ' + dm, ate: 'Até ' + dia };
}

function textoLembrete(x, data) {
  var q = quandoLembrete(data);
  var h = x.hora.replace(':00', 'h').replace(':', 'h');
  return 'Olá, ' + primeiroNome(x.nome) + '! Passando para lembrar do seu horário na Casa Âmbar ' + q.texto + ' às ' + h + ': ' + x.titulo + (x.com ? ' com ' + x.com : '') + (x.extra ? ', ' + x.extra : '') + '. Podemos confirmar?';
}

function enviarEmailLembrete(x, data) {
  var q = quandoLembrete(data);
  var h = x.hora.replace(':00', 'h').replace(':', 'h');
  var cartao = '<div style="margin:18px 0;padding:18px 20px;border-radius:14px;background:#F4EFDF;border:1px solid #E9DDC5">' +
    '<div style="font-family:Arial,sans-serif;font-size:12px;color:#7E3717;letter-spacing:1px">' + escHtml(q.titulo) + '</div>' +
    '<div style="font-size:26px;color:#2F3821;margin:6px 0 2px">' + escHtml(h) + '</div>' +
    '<div style="font-size:16px;color:#2F3821">' + escHtml(x.titulo) + '</div>' +
    '<div style="font-family:Arial,sans-serif;font-size:13px;color:#6F784D;margin-top:4px">' + escHtml((x.com ? 'com ' + x.com : '') + (x.extra ? ' · ' + x.extra : '')) + '</div></div>';
  enviarEmail(x.email, 'Seu horário ' + q.assunto + ' · Casa Âmbar', q.ate, ['Olá, ' + primeiroNome(x.nome) + '!',
    'Este é um lembrete do seu horário na Casa Âmbar. Chegue com 10 minutos de antecedência.',
    'Se precisar remarcar, fale com a gente pelo WhatsApp.'], { texto: 'Falar no WhatsApp', url: 'https://wa.me/5585991856528' }, cartao);
}

function enviarLembretes(data) {
  var lista = lembretesDe(data);
  var cota = MailApp.getRemainingDailyQuota() - 20;
  var n = 0;
  lista.forEach(function (x) {
    if (x.enviado || !x.email || n >= cota) return;
    try {
      enviarEmailLembrete(x, data);
      atualizarLinha(x.aba, x.linha, { lembrete: 'e-mail ' + agoraTexto() });
      n++;
    } catch (e) {
      Logger.log('lembrete: ' + e.message);
    }
  });
  return n;
}

function bancada_lembretes(d) {
  var data = dataValida(d.data, somarDias(hojeTexto(), 1));
  return { data: data, automatico: AJUSTES.lembreteServicos !== false || !!AJUSTES.lembreteAulas,
    ultimoEnvio: PropertiesService.getScriptProperties().getProperty('LEMBRETES_ULTIMO') || '',
    lista: lembretesDe(data).map(function (x) {
      return { tipo: x.tipo, id: x.id, nome: x.nome, hora: x.hora, titulo: x.titulo, com: x.com, temEmail: !!x.email, whatsapp: x.whatsapp,
        enviado: x.enviado, texto: textoLembrete(x, data) };
    }) };
}

function bancada_enviarLembretes(d, m) {
  var data = dataValida(d.data, somarDias(hojeTexto(), 1));
  var n = enviarLembretes(data);
  PropertiesService.getScriptProperties().setProperty('LEMBRETES_ULTIMO', agoraTexto());
  registrar(m, 'enviou lembretes', n + ' e-mails para ' + data);
  var r = bancada_lembretes({ data: data });
  r.enviados = n;
  return r;
}

function bancada_marcarLembrete(d, m) {
  var nomeAba = d.tipo === 'aula' ? 'Reservas' : 'Atendimentos';
  var x = lerAba(nomeAba).filter(function (y) { return String(y.id) === String(d.id); })[0];
  if (!x) throw new Error('Não encontrado.');
  atualizarLinha(nomeAba, x._linha, { lembrete: 'WhatsApp ' + agoraTexto() });
  return true;
}

// a bancada chama ao abrir (no máximo a cada 2 horas): envia os lembretes de amanhã que faltam
function bancada_lembretesAuto(d, m) {
  if (AJUSTES.lembreteServicos === false && !AJUSTES.lembreteAulas) return { pulado: true };
  var cache = CacheService.getScriptCache();
  if (cache.get('lembretes_auto')) return { pulado: true };
  cache.put('lembretes_auto', '1', 7200);
  var n = enviarLembretes(somarDias(hojeTexto(), 1));
  PropertiesService.getScriptProperties().setProperty('LEMBRETES_ULTIMO', agoraTexto());
  if (n) registrar(m, 'lembretes automáticos', n + ' e-mails');
  return { enviados: n };
}
