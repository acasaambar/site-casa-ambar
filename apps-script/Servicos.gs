/**
 * ============================================================
 *  CASA ÂMBAR — SERVIÇOS (estética, fisioterapia...) NA BANCADA
 * ============================================================
 *  Só a equipe agenda serviços (a área do aluno continua só com Yoga e Pilates).
 *  Abas: Servicos (catálogo), Pacotes (combos de sessões), Profissionais e Atendimentos.
 */

// (as abas Servicos, Pacotes, Profissionais e Atendimentos estão declaradas em ABAS, no Codigo.gs)

// Horário da casa (0 = domingo). Profissionais podem ter horário próprio.
var HORARIO_CASA = { 1: ['06:00', '20:00'], 2: ['06:00', '20:00'], 3: ['06:00', '20:00'], 4: ['06:00', '20:00'], 5: ['06:00', '20:00'], 6: ['07:00', '12:00'] };
var CATEGORIAS_SERVICO = ['Estética facial', 'Estética corporal', 'Estética capilar', 'Fisioterapia'];

// Catálogo inicial (do material "Rituais Casa Âmbar")
var SERVICOS_INICIAIS = [
  ['limpeza-pele', 'SIM', 'Estética facial', 'Limpeza de Pele Premium', 90, 199, 'Vapor de ozônio, alta frequência e led vermelho', 1],
  ['limpeza-pele-clareadora', 'SIM', 'Estética facial', 'Limpeza de Pele Premium Clareadora', 90, 229, 'Com máscara de ativos clareadores', 1],
  ['peeling-coreano', 'SIM', 'Estética facial', 'Peeling Coreano', 40, 249, 'Tecnologia LHA · 1 retorno com 7 dias', 1],
  ['microagulhamento-facial', 'SIM', 'Estética facial', 'Microagulhamento Facial', 40, 299, 'Estímulo de colágeno', 1],
  ['drenagem', 'SIM', 'Estética corporal', 'Drenagem Linfática', 60, 199, 'Terapia manual em todo o corpo', 1],
  ['detox', 'SIM', 'Estética corporal', 'Protocolo Desinchar (Detox)', 90, 229, 'Manta térmica e ativos termogênicos', 1],
  ['ritual-acalmar', 'SIM', 'Estética corporal', 'Ritual Acalmar · massagem relaxante', 90, 199, 'Inclui escalda-pés', 1],
  ['escalda-pes', 'SIM', 'Estética corporal', 'Escalda-pés', 20, 49, '', 1],
  ['clareamento-axila', 'SIM', 'Estética corporal', 'Clareamento de axila', 40, 229, 'Ativos Cosmobeauty', 1],
  ['clareamento-virilha', 'SIM', 'Estética corporal', 'Clareamento de virilha', 40, 249, 'Ativos Cosmobeauty', 1],
  ['estrias', 'SIM', 'Estética corporal', 'Estrias com microagulhamento', 40, 299, 'Colágeno e elastina', 1],
  ['microagulhamento-capilar', 'SIM', 'Estética capilar', 'Microagulhamento capilar', 40, 229, 'Estímulo ao crescimento dos fios', 1],
  ['ledterapia-capilar', 'SIM', 'Estética capilar', 'Ledterapia + alta frequência', 40, 169, 'Circulação e fortalecimento dos fios', 1],
  ['fisioterapia', 'SIM', 'Fisioterapia', 'Consulta de fisioterapia', 60, 219, 'Procedimentos conforme avaliação', 1],
];
var PACOTES_INICIAIS = [
  ['peeling-coreano-3', 'SIM', 'peeling-coreano', 3, 699, 120, 3],
  ['microagulhamento-facial-3', 'SIM', 'microagulhamento-facial', 3, 869, 120, 3],
  ['drenagem-5', 'SIM', 'drenagem', 5, 945, 90, 3],
  ['drenagem-10', 'SIM', 'drenagem', 10, 1840, 150, 5],
  ['detox-5', 'SIM', 'detox', 5, 1095, 90, 5],
  ['detox-10', 'SIM', 'detox', 10, 2090, 150, 5],
  ['ritual-acalmar-3', 'SIM', 'ritual-acalmar', 3, 567, 90, 3],
  ['ritual-acalmar-5', 'SIM', 'ritual-acalmar', 5, 895, 120, 3],
  ['clareamento-axila-5', 'SIM', 'clareamento-axila', 5, 1145, 150, 5],
  ['clareamento-virilha-5', 'SIM', 'clareamento-virilha', 5, 1195, 150, 5],
  ['estrias-3', 'SIM', 'estrias', 3, 867, 120, 3],
  ['estrias-5', 'SIM', 'estrias', 5, 1395, 150, 5],
  ['microagulhamento-capilar-3', 'SIM', 'microagulhamento-capilar', 3, 657, 120, 3],
  ['ledterapia-capilar-3', 'SIM', 'ledterapia-capilar', 3, 477, 120, 3],
];

// ---------------- catálogo ----------------
function semearServicos() {
  // confere uma vez (se a aba está na memória ou no cache, já tem catálogo)
  doCacheOuPreparar('Servicos', function () {});
  doCacheOuPreparar('Pacotes', function () {});
  if (_memo.Servicos && _memo.Pacotes) return;
  if (abaSemDescartar('Servicos').getLastRow() < 2) aba('Servicos').getRange(2, 1, SERVICOS_INICIAIS.length, SERVICOS_INICIAIS[0].length).setValues(SERVICOS_INICIAIS);
  if (abaSemDescartar('Pacotes').getLastRow() < 2) aba('Pacotes').getRange(2, 1, PACOTES_INICIAIS.length, PACOTES_INICIAIS[0].length).setValues(PACOTES_INICIAIS);
}

function listarServicos(todos) {
  semearServicos();
  return lerAba('Servicos').filter(function (x) { return x.id && (todos || String(x.ativo).toUpperCase() !== 'NÃO'); }).map(function (x) {
    return { id: String(x.id), ativo: String(x.ativo).toUpperCase() !== 'NÃO', categoria: String(x.categoria), nome: String(x.nome),
      duracao: numero(x.duracao_min) || 60, preco: numero(x.preco), descricao: String(x.descricao || ''), semJurosAte: numero(x.sem_juros_ate) || 1,
      comissao: String(x.comissao) === '' ? null : numero(x.comissao),
      // produtos usados em cada sessão: "p-acido:0.5;p-luva:2"
      retornoDias: numero(x.retorno_dias) || 0,
      consumo: String(x.consumo || '').split(';').map(function (c) { var q = c.split(':'); return { produtoId: String(q[0] || '').trim(), qtd: numero(q[1]) }; })
        .filter(function (c) { return c.produtoId && c.qtd > 0; }) };
  });
}

function listarPacotes(todos) {
  semearServicos();
  var serv = {};
  listarServicos(true).forEach(function (x) { serv[x.id] = x; });
  return lerAba('Pacotes').filter(function (x) { return x.id && (todos || String(x.ativo).toUpperCase() !== 'NÃO'); }).map(function (x) {
    var sv = serv[String(x.servico_id)] || {};
    return { id: String(x.id), ativo: String(x.ativo).toUpperCase() !== 'NÃO', servicoId: String(x.servico_id), servico: sv.nome || String(x.servico_id),
      categoria: sv.categoria || '', sessoes: numero(x.sessoes), preco: numero(x.preco), validadeDias: numero(x.validade_dias) || 120,
      semJurosAte: numero(x.sem_juros_ate) || 1, avulso: sv.preco ? Math.round(sv.preco * numero(x.sessoes) * 100) / 100 : 0 };
  });
}

function listarProfissionais(todos) {
  return lerAba('Profissionais').filter(function (x) { return String(x.nome).trim() && (todos || String(x.ativo).toUpperCase() !== 'NÃO'); }).map(function (x) {
    return { nome: String(x.nome).trim(), ativo: String(x.ativo).toUpperCase() !== 'NÃO', categorias: String(x.categorias || '').split(',').map(function (c) { return c.trim(); }).filter(String),
      dias: String(x.dias || '1,2,3,4,5,6').split(',').map(function (d) { return Number(d); }).filter(function (d) { return d >= 0 && d <= 6; }),
      inicio: horaTexto(x.inicio) || '', fim: horaTexto(x.fim) || '', comissao: numero(x.comissao), comissaoProduto: numero(x.comissao_produto),
      servicos: servicosDaProfissional(x.servicos), horarios: lerTurnos(x.horarios), especiais: lerTurnos(x.especiais) };
  });
}

// Horários da profissional (JSON na planilha):
//   horarios  = { "1": [["08:00","12:00"],["14:00","18:00"]], "6": [["08:00","12:00"]] }  (0 = domingo)
//   especiais = { "2026-10-24": [["09:00","13:00"]], "2026-10-31": [] }  ([] = não atende nesse dia)
function lerTurnos(texto) {
  var o = {};
  try { o = JSON.parse(String(texto || '') || '{}') || {}; } catch (e) { return {}; }
  var limpo = {};
  Object.keys(o).forEach(function (k) {
    if (!Array.isArray(o[k])) return;
    limpo[k] = o[k].filter(function (t) { return Array.isArray(t) && /^\d{2}:\d{2}$/.test(t[0]) && /^\d{2}:\d{2}$/.test(t[1]) && t[0] < t[1]; })
      .map(function (t) { return [t[0], t[1]]; });
  });
  return limpo;
}

// turnos de trabalho num dia, em minutos: [[ini, fim], ...]
function turnosDoProfissional(p, data) {
  var dia = new Date(data + 'T12:00:00Z').getUTCDay();
  var casa = HORARIO_CASA[dia];
  var mins = function (l) { return l.map(function (t) { return [minutos(t[0]), minutos(t[1])]; }); };
  if (!p) return casa ? [[minutos(casa[0]), minutos(casa[1])]] : [];
  if (p.especiais[data]) return mins(p.especiais[data]);
  if (Object.keys(p.horarios).length) return mins(p.horarios[String(dia)] || []);
  // cadastro antigo: dias + início/fim dentro do horário da casa
  if (!casa || (p.dias.length && p.dias.indexOf(dia) < 0)) return [];
  var ini = Math.max(minutos(casa[0]), p.inicio ? minutos(p.inicio) : 0);
  var fim = Math.min(minutos(casa[1]), p.fim ? minutos(p.fim) : 24 * 60);
  return fim > ini ? [[ini, fim]] : [];
}

// valida os turnos vindos da tela (no máximo 3 por dia, sem sobrepor)
function turnosValidos(lista, rotulo) {
  var t = (Array.isArray(lista) ? lista : []).map(function (x) { return [horaTexto(x && x[0]), horaTexto(x && x[1])]; })
    .filter(function (x) { return /^\d{2}:\d{2}$/.test(x[0]) && /^\d{2}:\d{2}$/.test(x[1]); })
    .sort(function (a, b) { return a[0].localeCompare(b[0]); });
  if (t.length > 3) throw new Error(rotulo + ': no máximo 3 turnos.');
  t.forEach(function (x, i) {
    if (x[0] >= x[1]) throw new Error(rotulo + ': o fim (' + x[1] + ') precisa ser depois do início (' + x[0] + ').');
    if (i && x[0] < t[i - 1][1]) throw new Error(rotulo + ': os turnos se sobrepõem.');
  });
  return t;
}

// Serviços que a profissional faz, com comissão e tempo dela (como no Avec).
// Na planilha: "limpeza-pele:20:90;peeling-coreano::40" (id:comissão:minutos; vazio = vale o padrão).
function servicosDaProfissional(texto) {
  return String(texto || '').split(';').map(function (t) {
    var q = t.split(':');
    var id = String(q[0] || '').trim();
    return { id: id, comissao: String(q[1] || '').trim() === '' ? null : numero(q[1]), duracao: numero(q[2]) || null };
  }).filter(function (c) { return c.id; });
}

function configServico(p, servicoId) {
  return p ? p.servicos.filter(function (c) { return c.id === String(servicoId); })[0] || null : null;
}

// sem lista de serviços (cadastro antigo), vale a área de atendimento
function fazServico(p, serv) {
  if (!p) return true;
  if (p.servicos.length) return !!configServico(p, serv.id);
  return !p.categorias.length || p.categorias.indexOf(serv.categoria) >= 0;
}

function duracaoServico(serv, profissional) {
  var c = configServico(profissionalPorNome(profissional), serv.id);
  return c && c.duracao ? c.duracao : serv.duracao;
}

// Item que pode ser vendido: plano de aula, serviço avulso ou pacote de serviço
var _itensVenda = null;
function buscarItemVenda(id) {
  id = String(id || '');
  var plano = buscarPlano(id);
  if (plano) return plano;
  if (!_itensVenda) {
    _itensVenda = Object.create(null);
    listarServicos(true).forEach(function (s) {
      _itensVenda[s.id] = { id: s.id, nome: s.nome, modalidade: 'Serviço', categoria: s.categoria, tipo: 'servico', aulas_semana: 0, aulas_total: 1,
        validade_dias: 90, preco: s.preco, sem_juros_ate: s.semJurosAte, servico_id: s.id };
    });
    listarPacotes(true).forEach(function (p) {
      _itensVenda[p.id] = { id: p.id, nome: p.servico + ' · pacote ' + p.sessoes + ' sessões', modalidade: 'Serviço', categoria: p.categoria, tipo: 'pacote',
        aulas_semana: 0, aulas_total: p.sessoes, validade_dias: p.validadeDias, preco: p.preco, sem_juros_ate: p.semJurosAte, servico_id: p.servicoId };
    });
  }
  return _itensVenda[id] || null;
}

// ---------------- horários livres ----------------
function minutos(h) { var p = String(h).split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); }
function hhmm(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }

function atendimentosDoDia(data, ignorarId) {
  return lerAba('Atendimentos').filter(function (a) {
    // falta libera o horário para encaixe (o bloco tracejado continua na agenda)
    return dataTexto(a.data) === data && a.status !== 'cancelado' && a.status !== 'falta' && a.id !== ignorarId;
  });
}

function turnosDe(prof, data) {
  var p = listarProfissionais().filter(function (x) { return semAcento(x.nome) === semAcento(prof); })[0];
  return turnosDoProfissional(p, data);
}

// além das folgas: casa fechada (bloqueio do dia todo, sem modalidade) e as aulas que a profissional dá no dia
function ocupacoesDoDia(data, profissional) {
  var extra = [];
  valoresAba('Bloqueios').slice(1).forEach(function (b) {
    if (dataTexto(b[0]) === data && !horaTexto(b[1]) && !String(b[2] || '').trim()) {
      extra.push({ diaTodo: true, inicio: '00:00', fim: '23:59', motivo: 'casa fechada' + (b[3] ? ': ' + b[3] : '') });
    }
  });
  gerarAulas(data, 1).forEach(function (a) {
    if (a.data !== data || semAcento(a.professor) !== semAcento(profissional)) return;
    var fim = minutos(a.hora) + (Number(a.duracao) || AJUSTES.duracaoAulaMin);
    extra.push({ diaTodo: false, inicio: a.hora, fim: hhmm(fim), motivo: 'aula de ' + a.modalidade });
  });
  return folgasDoDia(data, profissional).concat(extra);
}

function conflito(data, hora, duracao, profissional, ignorarId, folgas, atendimentos) {
  var a0 = minutos(hora), a1 = a0 + duracao;
  var c = (atendimentos || atendimentosDoDia(data, ignorarId)).filter(function (x) {
    if (semAcento(x.profissional) !== semAcento(profissional)) return false;
    var b0 = minutos(horaTexto(x.hora)), b1 = b0 + (numero(x.duracao_min) || 60);
    return a0 < b1 && b0 < a1;
  })[0];
  if (c) return c;
  // horário bloqueado (folga, almoço, curso…)
  var f = (folgas || ocupacoesDoDia(data, profissional)).filter(function (x) {
    var iv = intervaloFolga(x);
    return a0 < iv[1] && iv[0] < a1;
  })[0];
  return f ? { folga: true, nome: f.motivo, hora: f.inicio, motivo: f.motivo } : null;
}

function bancada_horarios(d) {
  var serv = listarServicos(true).filter(function (s) { return s.id === d.servicoId; })[0];
  if (!serv) throw new Error('Escolha o serviço.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.data))) throw new Error('Escolha a data.');
  if (!fazServico(profissionalPorNome(d.profissional), serv)) return { horarios: [], motivo: d.profissional + ' não faz ' + serv.nome + '. Confira em Catálogo → Profissionais.' };
  var dur = Number(d.duracao) || duracaoServico(serv, d.profissional);
  var turnos = turnosDe(d.profissional, d.data);
  if (!turnos.length) return { horarios: [], motivo: d.profissional + ' não atende neste dia.' };
  var folgas = ocupacoesDoDia(d.data, d.profissional);
  var diaTodo = folgas.filter(function (f) { return f.diaTodo; })[0];
  if (diaTodo) return { horarios: [], motivo: d.profissional + ' não atende neste dia (' + diaTodo.motivo + ').' };
  var agora = new Date();
  var hoje = hojeTexto();
  var atend = atendimentosDoDia(d.data, d.ignorarId);
  var livres = [];
  turnos.forEach(function (t) {
    for (var m = t[0]; m + dur <= t[1]; m += 15) {
      var h = hhmm(m);
      if (d.data === hoje && inicio({ data: d.data, hora: h }) < agora) continue;
      if (!conflito(d.data, h, dur, d.profissional, d.ignorarId, folgas, atend)) livres.push(h);
    }
  });
  return { horarios: livres, duracao: dur, bloqueios: folgas.filter(function (f) { return f.id; }),
    turnos: turnos.map(function (t) { return [hhmm(t[0]), hhmm(t[1])]; }) };
}

// ---------------- agenda de serviços ----------------
function atendimentoPublico(a, m) {
  var esconder = m && m.papel === 'professora';
  return { id: String(a.id), data: dataTexto(a.data), hora: horaTexto(a.hora), duracao: numero(a.duracao_min) || 60, servicoId: String(a.servico_id), servico: String(a.servico),
    categoria: String(a.categoria), profissional: String(a.profissional), cpf: esconder ? '' : (a.cpf ? normCpf(a.cpf) : ''), nome: String(a.nome),
    whatsapp: esconder ? '' : String(a.whatsapp || ''), status: String(a.status), pagamento: String(a.pagamento), valor: numero(a.valor), obs: String(a.obs || ''),
    creditoId: String(a.credito_id || ''), orderNsu: String(a.order_nsu || ''), titular: String(a.titular || ''), alertas: alertasDe(a.cpf),
    resposta: String(a.resposta || ''), respostaEm: String(a.resposta_em || ''),
    // link "confirmo / preciso remarcar" para o lembrete pelo WhatsApp (só para o balcão)
    linkConfirmar: m && m.papel !== 'professora' ? linkConfirmacao(a.id, dataTexto(a.data), horaTexto(a.hora)) : '' };
}

function bancada_atendimentos(d, m) {
  var de = /^\d{4}-\d{2}-\d{2}$/.test(String(d.de)) ? d.de : hojeTexto();
  var ate = somarDias(de, Math.min(Math.max(Number(d.dias) || 1, 1), 31) - 1);
  var lista = lerAba('Atendimentos').filter(function (a) {
    var dt = dataTexto(a.data);
    if (!a.id || dt < de || dt > ate) return false;
    if (!d.incluirCancelados && a.status === 'cancelado') return false;
    if (m.papel === 'professora' && !mesmaProfessora(a.profissional, m)) return false;
    return true;
  }).map(function (a) { return atendimentoPublico(a, m); })
    .sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
  var folgas = bancada_folgas({ de: de, dias: Math.min(Math.max(Number(d.dias) || 1, 1), 31) }, m);
  var profs = listarProfissionais();
  return { atendimentos: lista, profissionais: profs.map(function (p) { return p.nome; }), folgas: folgas,
    // quem atende e em que turnos no primeiro dia (a agenda marca o resto como "fora do horário")
    equipe: profs.map(function (p) {
      var e = { nome: p.nome, categorias: p.categorias, turnos: turnosDoProfissional(p, de).map(function (t) { return [hhmm(t[0]), hhmm(t[1])]; }) };
      // visão da semana: os turnos de cada dia do período
      if (d.porDia) {
        e.dias = {};
        for (var dt = de; dt <= ate; dt = somarDias(dt, 1)) e.dias[dt] = turnosDoProfissional(p, dt).map(function (t) { return [hhmm(t[0]), hhmm(t[1])]; });
      }
      return e;
    }).filter(function (e) { return m.papel !== 'professora' || mesmaProfessora(e.nome, m) || !d.porDia; }) };
}

function bancada_catalogoServicos(d, m) {
  var profs = listarProfissionais(true);
  var servicos = listarServicos(true);
  // profissional não vê a comissão das colegas nem a dos serviços
  if (m && m.papel === 'professora') {
    profs = profs.map(function (p) { return Object.assign({}, p, { comissao: null, comissaoProduto: null, servicos: p.servicos.map(function (c) { return { id: c.id, duracao: c.duracao }; }) }); });
    servicos = servicos.map(function (s) { return Object.assign({}, s, { comissao: null }); });
  }
  return { servicos: servicos, pacotes: listarPacotes(true), profissionais: profs, categorias: CATEGORIAS_SERVICO, horarioCasa: HORARIO_CASA,
    produtos: listarProdutos().map(function (p) { return { id: p.id, nome: p.nome, unidade: p.unidade, preco: p.preco, vende: p.vende, estoque: p.estoque }; }) };
}

// créditos de pacote de um serviço ainda com sessões
function creditoDeServico(cpf, servicoId, data) {
  var pacotes = {};
  listarPacotes(true).forEach(function (p) { if (p.servicoId === servicoId) pacotes[p.id] = 1; });
  var usos = {};
  lerAba('Atendimentos').forEach(function (a) { if (a.credito_id && a.status !== 'cancelado') usos[a.credito_id] = (usos[a.credito_id] || 0) + 1; });
  var mc = mapaCreditos();
  return Object.keys(mc).map(function (k) { return mc[k]; }).filter(function (c) {
    return normCpf(c.cpf) === normCpf(cpf) && String(c.modalidade) === 'Serviço' && (pacotes[c.plano_id] || c.plano_id === servicoId) &&
      String(c.ativo).toUpperCase() !== 'NÃO' && c.inicio <= data && data <= c.fim && (usos[c.id] || 0) < c.aulas_total;
  }).sort(function (a, b) { return String(a.fim).localeCompare(String(b.fim)); })
    .map(function (c) { c.restantes = c.aulas_total - (usos[c.id] || 0); return c; })[0] || null;
}

function bancada_creditosServico(d) {
  var c = creditoDeServico(d.cpf, d.servicoId, d.data || hojeTexto());
  return c ? { id: c.id, descricao: c.descricao, restantes: c.restantes, fim: c.fim } : null;
}

// pagamento: no_dia | pacote | pago | cortesia
function bancada_agendarServico(d, m) {
  var serv = listarServicos(true).filter(function (s) { return s.id === d.servicoId; })[0];
  if (!serv) throw new Error('Escolha o serviço.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.data)) || !/^\d{2}:\d{2}$/.test(String(d.hora))) throw new Error('Escolha data e horário.');
  var prof = String(d.profissional || '').trim();
  if (!prof) throw new Error('Escolha o profissional.');
  if (!fazServico(profissionalPorNome(prof), serv)) throw new Error(prof + ' não faz ' + serv.nome + '. Confira em Catálogo → Profissionais.');
  var dur = Math.min(Math.max(Number(d.duracao) || duracaoServico(serv, prof), 10), 480);
  if (d.reagendarId) return reagendarServico(d, m, serv, prof, dur);
  var cliente;
  if (d.cpf) {
    var al = buscarAluno(d.cpf);
    if (!al) throw new Error('Cliente não encontrado.');
    cliente = { cpf: normCpf(al.cpf), nome: al.nome, whatsapp: String(al.whatsapp || ''), email: al.email };
  } else {
    var nome = String((d.cliente || {}).nome || '').trim();
    var whats = soDigitos((d.cliente || {}).whatsapp);
    if (nome.split(' ').length < 2) throw new Error('Informe nome e sobrenome do cliente.');
    if (whats.length < 10) throw new Error('Informe o WhatsApp do cliente com DDD.');
    cliente = { cpf: '', nome: nome, whatsapp: whats, novo: true };
  }
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    if (cliente.novo) {
      // confere o horário antes de criar o cadastro (não deixa cadastro solto se o horário falhar)
      conferirHorarioLivre(d.data, d.hora, dur, prof);
      // mesmo WhatsApp de outra pessoa: pergunta antes (mãe e filha) em vez de juntar sem aviso
      var outro = d.outraPessoa ? null : outroComMesmoWhats(cliente.nome, cliente.whatsapp);
      if (outro) throw erroCod('Este WhatsApp já é de ' + outro.nome + '.', 'WHATSAPP_DE_OUTRA');
      // cliente sem CPF ganha cadastro (fica com histórico, pacotes e comandas)
      var cad = clienteSemCpf(cliente.nome, cliente.whatsapp, '', 'agenda de serviços', !!d.outraPessoa);
      cliente = { cpf: normCpf(cad.cpf), nome: cad.nome, whatsapp: String(cad.whatsapp || cliente.whatsapp), email: cad.email };
    }
    var forma = String(d.pagamento || 'no_dia');
    var linha = criarAtendimento(d, m, serv, prof, dur, cliente, d.data, forma);
    // série (fisioterapia 2x por semana, drenagem semanal…): as próximas datas no mesmo horário.
    // Só a primeira é cobrada no "já pagou"; o pacote vale para todas enquanto houver sessão.
    var serie = null;
    var rep = d.repetir || {};
    var vezes = Math.min(Math.max(Math.round(numero(rep.vezes)) || 0, 0), 24);
    var cada = [7, 14, 21, 28].indexOf(Number(rep.cadaDias)) >= 0 ? Number(rep.cadaDias) : 0;
    if (vezes > 1 && cada) {
      serie = { criados: [{ id: linha.id, data: d.data, pagamento: linha.pagamento }], pulados: [] };
      for (var k = 1; k < vezes; k++) {
        var dt = somarDias(d.data, k * cada);
        var fk = forma === 'pacote' ? (creditoDeServico(cliente.cpf, serv.id, dt) ? 'pacote' : 'no_dia') : forma === 'cortesia' ? 'cortesia' : 'no_dia';
        try {
          var lk = criarAtendimento(d, m, serv, prof, duracaoServico(serv, prof), cliente, dt, fk);
          serie.criados.push({ id: lk.id, data: dt, pagamento: lk.pagamento });
        } catch (e) {
          serie.pulados.push({ data: dt, motivo: e.message });
        }
      }
    }
    SpreadsheetApp.flush();
    esperaResolvida('servico', serv.id, cliente.cpf);
    registrar(m, 'agendou serviço', cliente.nome + ' · ' + serv.nome + ' · ' + d.data + ' ' + d.hora + ' · ' + prof + (serie ? ' · série de ' + serie.criados.length : ''));
    var saida = atendimentoPublico(lerAba('Atendimentos').filter(function (x) { return x.id === linha.id; })[0], m);
    if (serie) saida.serie = serie;
    return saida;
  } finally {
    trava.releaseLock();
  }
}

// horário dentro do turno e sem choque (atendimento, folga, aula da profissional, casa fechada)
function conferirHorarioLivre(data, hora, dur, prof, ignorarId) {
  var ini = minutos(hora);
  var cabe = turnosDe(prof, data).some(function (t) { return ini >= t[0] && ini + dur <= t[1]; });
  if (!cabe) throw new Error('Fora do horário de atendimento de ' + prof + ' neste dia.');
  var c = conflito(data, hora, dur, prof, ignorarId);
  if (c && c.folga) throw new Error('Horário bloqueado para ' + prof + ' (' + c.motivo + '). Escolha outro horário.');
  if (c) throw new Error(prof + ' já atende ' + c.nome + ' às ' + horaTexto(c.hora) + '. Escolha outro horário.');
}

// cria um atendimento (dentro da trava): confere o horário e registra o pagamento escolhido
function criarAtendimento(d, m, serv, prof, dur, cliente, data, forma) {
  conferirHorarioLivre(data, d.hora, dur, prof);
  var linha = { id: novoId('A'),
    data: data, hora: d.hora, duracao_min: dur, servico_id: serv.id, servico: serv.nome, categoria: serv.categoria, profissional: prof,
    cpf: cliente.cpf, nome: cliente.nome, whatsapp: cliente.whatsapp, status: 'agendado', pagamento: forma, valor: serv.preco,
    obs: String(d.obs || '').slice(0, 500), criado_por: m.email, criado_em: agoraTexto(), atualizado_em: agoraTexto() };
  if (forma === 'pacote') {
    if (!cliente.cpf) throw new Error('Pacote só para cliente com cadastro.');
    var cred = creditoDeServico(cliente.cpf, serv.id, data);
    if (!cred) throw erroCod(primeiroNome(cliente.nome) + ' não tem pacote de ' + serv.nome + ' com sessões disponíveis.', 'SEM_PACOTE');
    linha.credito_id = cred.id;
    linha.valor = 0;
  } else if (forma === 'pago') {
    var venda = registrarVenda(cliente, buscarItemVenda(serv.id), { metodo: d.metodo, bandeira: d.bandeira, valor: d.valor, codigo: d.codigo, resto: d.resto, inicio: data, obs: 'serviço ' + serv.nome }, m);
    linha.order_nsu = venda.orderNsu;
    linha.credito_id = venda.creditoId || '';
    linha.valor = dinheiro(venda.valor + venda.valeUsado);
  } else if (forma === 'cortesia') {
    linha.valor = 0;
  } else {
    linha.pagamento = 'no_dia';
  }
  adicionarLinha('Atendimentos', linha);
  return linha;
}

// Reagendar MOVE o mesmo atendimento (mesmo id): pagamento, pacote, comanda aberta e comissão continuam valendo.
// Trocar o serviço só quando ainda não foi pago (pago, pacote ou cortesia mantêm o serviço).
function reagendarServico(d, m, serv, prof, dur) {
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var a = lerAba('Atendimentos').filter(function (x) { return x.id === d.reagendarId; })[0];
    if (!a) throw new Error('Atendimento não encontrado.');
    if (a.status === 'cancelado') throw new Error('Este atendimento foi cancelado. Agende um novo.');
    if (a.status === 'atendido') throw new Error('Este atendimento já foi feito.');
    var trocaServico = String(a.servico_id) !== serv.id;
    if (trocaServico && a.pagamento !== 'no_dia') throw new Error('Este horário já está pago (' + (a.pagamento === 'pacote' ? 'pacote' : a.pagamento) + '): dá para mudar dia, hora e profissional, mas não o serviço.');
    var ini = minutos(d.hora);
    var cabe = turnosDe(prof, d.data).some(function (t) { return ini >= t[0] && ini + dur <= t[1]; });
    if (!cabe) throw new Error('Fora do horário de atendimento de ' + prof + ' neste dia.');
    var c = conflito(d.data, d.hora, dur, prof, a.id);
    if (c && c.folga) throw new Error('Horário bloqueado para ' + prof + ' (' + c.motivo + '). Escolha outro horário.');
    if (c) throw new Error(prof + ' já atende ' + c.nome + ' às ' + horaTexto(c.hora) + '. Escolha outro horário.');
    var de = dataTexto(a.data) + ' ' + horaTexto(a.hora) + (a.profissional !== prof ? ' com ' + a.profissional : '');
    var mud = { data: d.data, hora: d.hora, duracao_min: dur, profissional: prof, status: 'agendado', lembrete: '', resposta: '', resposta_em: '', atualizado_em: agoraTexto(),
      obs: ('Reagendado de ' + de + '. ' + String(d.obs != null ? d.obs : a.obs || '').replace(/^(Reagendado de [^.]*\.\s*)+/, '')).slice(0, 500) };
    // outra profissional por reagendamento não é substituição
    if (a.profissional !== prof) { mud.titular = ''; mud.comissao_de = ''; }
    if (trocaServico) { mud.servico_id = serv.id; mud.servico = serv.nome; mud.categoria = serv.categoria; mud.valor = serv.preco; }
    atualizarLinha('Atendimentos', a._linha, mud);
    // comanda aberta e pagamento acompanham a profissional e o serviço
    lerAba('Comandas').filter(function (cm) { return cm.status === 'aberta'; }).forEach(function (cm) {
      var itens = parseJson(cm.itens, []);
      var mudou = false;
      itens.forEach(function (i) {
        if (i.atendimentoId !== a.id) return;
        if (i.profissional !== prof) { i.profissional = prof; mudou = true; }
        if (trocaServico && i.id !== serv.id) { i.id = serv.id; i.nome = serv.nome; mudou = true; }
        if (i.data !== d.data) { i.data = d.data; mudou = true; }
      });
      if (mudou) atualizarLinha('Comandas', cm._linha, { itens: JSON.stringify(itens) });
    });
    if (a.order_nsu && a.profissional !== prof) {
      var pg = linhaPagamento(String(a.order_nsu));
      if (pg) atualizarLinha('Pagamentos', pg._linha, { profissional: prof });
    }
    if (dataTexto(a.data) !== d.data || horaTexto(a.hora) !== d.hora || a.profissional !== prof) encerrarPedidosDeTroca('servico', a.id, 'Horário reagendado.');
    SpreadsheetApp.flush();
    registrar(m, 'reagendou serviço', a.nome + ' · ' + serv.nome + ' · ' + de + ' → ' + d.data + ' ' + d.hora + ' · ' + prof);
    return atendimentoPublico(lerAba('Atendimentos').filter(function (x) { return x.id === a.id; })[0], m);
  } finally {
    trava.releaseLock();
  }
}

// pedidos de troca ainda em aberto deixam de valer quando o horário muda, é cancelado ou bloqueado
function encerrarPedidosDeTroca(tipo, ref, motivo) {
  lerAba('Substituicoes').forEach(function (x) {
    if (x.tipo === tipo && String(x.ref) === String(ref) && x.status === 'pedido') {
      atualizarLinha('Substituicoes', x._linha, { status: 'cancelada', resposta: motivo, feito_em: agoraTexto() });
    }
  });
}

// status: confirmado | atendido | falta | cancelado | agendado. Ao marcar atendido com pagamento no dia, registra o recebimento.
function bancada_atualizarAtendimento(d, m) {
  var a = lerAba('Atendimentos').filter(function (x) { return x.id === d.id; })[0];
  if (!a) throw new Error('Atendimento não encontrado.');
  var prof = m.papel === 'professora';
  if (prof && !mesmaProfessora(a.profissional, m)) throw new Error('Este atendimento não é seu.');
  var st = ['agendado', 'confirmado', 'atendido', 'falta', 'cancelado'].indexOf(d.status) >= 0 ? d.status : '';
  if (!st) throw new Error('Situação inválida.');
  if (prof && ['atendido', 'falta', 'agendado'].indexOf(st) < 0) throw new Error('Seu acesso permite só marcar atendido ou falta.');
  if (prof && a.status === 'cancelado') throw new Error('Este atendimento foi cancelado. Fale com a recepção.');
  if (prof && st !== 'agendado' && inicio({ data: dataTexto(a.data), hora: horaTexto(a.hora) }) > new Date()) throw new Error('Só dá para marcar depois do horário do atendimento.');
  // a profissional corrige só até 24 h depois do horário (depois disso, mexe na comissão: só a recepção)
  if (prof && Date.now() - inicio({ data: dataTexto(a.data), hora: horaTexto(a.hora) }).getTime() > 24 * 3600000) throw new Error('Já passou mais de um dia deste atendimento. Peça à recepção para corrigir.');
  var mud = { status: st, atualizado_em: agoraTexto() };
  if (st === 'cancelado' || st === 'falta') {
    // não deixa item "órfão" na comanda aberta (ao fechar, viraria atendido e cobrado)
    var comAberta = lerAba('Comandas').filter(function (cm) {
      return cm.status === 'aberta' && parseJson(cm.itens, []).some(function (i) { return i.atendimentoId === a.id; });
    })[0];
    if (comAberta) throw new Error('Este atendimento está na comanda aberta de ' + comAberta.nome + '. Tire o item da comanda antes de marcar ' + (st === 'falta' ? 'falta' : 'cancelado') + '.');
    if (st === 'cancelado') encerrarPedidosDeTroca('servico', a.id, 'Atendimento cancelado.');
  }
  if (st === 'atendido' && a.pagamento === 'no_dia' && d.metodo && !prof) {
    var trava = LockService.getScriptLock();
    esperarTrava(trava, 20000);
    try {
      // relê dentro da trava: dois toques ou dois aparelhos não cobram duas vezes
      a = lerAba('Atendimentos').filter(function (x) { return x.id === d.id; })[0];
      if (a.pagamento !== 'no_dia') throw new Error('Este atendimento já foi pago. Atualize a agenda.');
      var naComanda = lerAba('Comandas').filter(function (cm) {
        return cm.status === 'aberta' && parseJson(cm.itens, []).some(function (i) { return i.atendimentoId === a.id; });
      })[0];
      if (naComanda) throw new Error('Este atendimento está na comanda aberta de ' + naComanda.nome + ': receba por lá (Comandas).');
      var cliente = { cpf: a.cpf ? normCpf(a.cpf) : '', nome: a.nome, whatsapp: a.whatsapp };
      var venda = registrarVenda(cliente, buscarItemVenda(a.servico_id) || { id: a.servico_id, nome: a.servico, modalidade: 'Serviço', tipo: 'servico', aulas_total: 1, aulas_semana: 0, validade_dias: 90, preco: numero(a.valor) },
        { metodo: d.metodo, bandeira: d.bandeira, valor: d.valor, codigo: d.codigo, resto: d.resto, inicio: dataTexto(a.data), obs: 'serviço ' + a.servico }, m);
      mud.pagamento = 'pago';
      mud.order_nsu = venda.orderNsu;
      mud.credito_id = venda.creditoId || '';
      mud.valor = dinheiro(venda.valor + venda.valeUsado);
    } finally {
      trava.releaseLock();
    }
  }
  if (d.obs != null && !prof) mud.obs = String(d.obs).slice(0, 500);
  atualizarLinha('Atendimentos', a._linha, mud);
  var novo = lerAba('Atendimentos').filter(function (x) { return x.id === d.id; })[0];
  // comissão e baixa dos produtos usados acompanham o "atendido"
  if (st === 'atendido' || a.status === 'atendido') {
    comissaoDoAtendimento(novo, st === 'atendido');
    aplicarConsumo(novo.servico_id, 'atend:' + novo.id, novo.nome, st === 'atendido', m.email);
  }
  registrar(m, 'atendimento ' + st, a.nome + ' · ' + a.servico + ' · ' + dataTexto(a.data) + ' ' + horaTexto(a.hora));
  return atendimentoPublico(novo, m);
}

// ---------------- cadastro (administração) ----------------
function slug(t) {
  return semAcento(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function bancada_salvarServico(d, m) {
  var x = d.servico || {};
  var nome = String(x.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do serviço.');
  if (CATEGORIAS_SERVICO.indexOf(x.categoria) < 0) throw new Error('Escolha a categoria.');
  if (!(numero(x.preco) > 0)) throw new Error('Informe o preço.');
  var id = String(x.id || slug(nome));
  var linha = { id: id, ativo: x.ativo === false ? 'NÃO' : 'SIM', categoria: x.categoria, nome: nome, duracao_min: Math.min(Math.max(numero(x.duracao) || 60, 10), 480),
    preco: numero(x.preco), descricao: String(x.descricao || '').slice(0, 200), sem_juros_ate: Math.min(Math.max(numero(x.semJurosAte) || 1, 1), 12),
    comissao: x.comissao === '' || x.comissao == null ? '' : Math.min(Math.max(numero(x.comissao), 0), 100),
    retorno_dias: numero(x.retornoDias) > 0 ? Math.min(Math.round(numero(x.retornoDias)), 365) : '',
    consumo: (x.consumo || []).filter(function (c) { return c.produtoId && numero(c.qtd) > 0; }).slice(0, 12)
      .map(function (c) { return String(c.produtoId).replace(/[:;]/g, '') + ':' + numero(c.qtd); }).join(';') };
  var ex = lerAba('Servicos').filter(function (s) { return String(s.id) === id; })[0];
  if (ex) atualizarLinha('Servicos', ex._linha, linha); else adicionarLinha('Servicos', linha);
  _itensVenda = null;
  registrar(m, ex ? 'editou serviço' : 'criou serviço', nome + ' · R$ ' + linha.preco);
  return bancada_catalogoServicos();
}

function bancada_salvarPacote(d, m) {
  var x = d.pacote || {};
  var serv = listarServicos(true).filter(function (s) { return s.id === x.servicoId; })[0];
  if (!serv) throw new Error('Escolha o serviço do pacote.');
  var sessoes = Math.round(numero(x.sessoes));
  if (sessoes < 2 || sessoes > 50) throw new Error('Pacote de 2 a 50 sessões.');
  if (!(numero(x.preco) > 0)) throw new Error('Informe o preço do pacote.');
  var id = String(x.id || serv.id + '-' + sessoes);
  var linha = { id: id, ativo: x.ativo === false ? 'NÃO' : 'SIM', servico_id: serv.id, sessoes: sessoes, preco: numero(x.preco),
    validade_dias: Math.min(Math.max(numero(x.validadeDias) || 120, 7), 730), sem_juros_ate: Math.min(Math.max(numero(x.semJurosAte) || 1, 1), 12) };
  var ex = lerAba('Pacotes').filter(function (p) { return String(p.id) === id; })[0];
  if (ex) atualizarLinha('Pacotes', ex._linha, linha); else adicionarLinha('Pacotes', linha);
  _itensVenda = null;
  registrar(m, ex ? 'editou pacote' : 'criou pacote', serv.nome + ' · ' + sessoes + ' sessões · R$ ' + linha.preco);
  return bancada_catalogoServicos();
}

function bancada_salvarProfissional(d, m) {
  var x = d.profissional || {};
  var nome = String(x.nome || '').trim();
  if (nome.length < 2) throw new Error('Informe o nome.');
  var cats = (x.categorias || []).filter(function (c) { return CATEGORIAS_SERVICO.indexOf(c) >= 0; });
  var dias = (x.dias || []).map(Number).filter(function (n) { return n >= 0 && n <= 6; });
  // horário por dia da semana (até 3 turnos) e datas especiais
  var NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var horarios = null, especiais = {};
  if (x.horarios) {
    horarios = {};
    Object.keys(x.horarios).forEach(function (k) {
      var n = Number(k);
      if (!(n >= 0 && n <= 6)) return;
      var t = turnosValidos(x.horarios[k], NOMES_DIA[n]);
      if (t.length) horarios[String(n)] = t;
    });
    if (!Object.keys(horarios).length) throw new Error('Marque pelo menos um dia de atendimento.');
    dias = Object.keys(horarios).map(Number).sort();
  }
  var limiteEsp = somarDias(hojeTexto(), -7);
  Object.keys(x.especiais || {}).forEach(function (data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data < limiteEsp) return; // datas antigas saem sozinhas
    especiais[data] = turnosValidos(x.especiais[data], 'Dia ' + data.split('-').reverse().join('/'));
  });
  // serviços que ela faz, com comissão e tempo próprios (vazio = vale o padrão)
  var catalogo = {};
  listarServicos(true).forEach(function (s) { catalogo[s.id] = s; });
  var servs = [];
  (x.servicos || []).forEach(function (c) {
    var s = catalogo[String(c && c.id)];
    if (!s || servs.some(function (y) { return y.id === s.id; })) return;
    var pct = c.comissao === '' || c.comissao == null ? '' : Math.min(Math.max(numero(c.comissao), 0), 100);
    var min = numero(c.duracao) > 0 ? Math.min(Math.max(Math.round(numero(c.duracao)), 10), 480) : '';
    servs.push({ id: s.id, categoria: s.categoria, txt: s.id + ':' + pct + ':' + min });
  });
  if (x.servicos && !servs.length) throw new Error('Marque pelo menos um serviço que ' + nome.split(' ')[0] + ' faz.');
  if (servs.length) cats = CATEGORIAS_SERVICO.filter(function (c) { return servs.some(function (y) { return y.categoria === c; }); });
  var linha = { nome: nome, ativo: x.ativo === false ? 'NÃO' : 'SIM', categorias: cats.join(', '), dias: dias.join(','),
    inicio: /^\d{2}:\d{2}$/.test(String(x.inicio)) ? x.inicio : '', fim: /^\d{2}:\d{2}$/.test(String(x.fim)) ? x.fim : '',
    comissao: Math.min(Math.max(numero(x.comissao), 0), 100), comissao_produto: Math.min(Math.max(numero(x.comissaoProduto), 0), 100),
    servicos: servs.map(function (y) { return y.txt; }).join(';') };
  if (x.especiais) linha.especiais = Object.keys(especiais).length ? JSON.stringify(especiais) : '';
  if (horarios) {
    var todos = [];
    Object.keys(horarios).forEach(function (k) { todos = todos.concat(horarios[k]); });
    linha.horarios = JSON.stringify(horarios);
    linha.inicio = todos.map(function (t) { return t[0]; }).sort()[0];
    linha.fim = todos.map(function (t) { return t[1]; }).sort().pop();
  }
  var ex = lerAba('Profissionais').filter(function (p) { return semAcento(p.nome) === semAcento(x.nomeOriginal || nome); })[0];
  if (ex) atualizarLinha('Profissionais', ex._linha, linha); else adicionarLinha('Profissionais', linha);
  // nome mudou: atendimentos e bloqueios de hoje em diante acompanham (senão viram uma coluna "fantasma" e marcam por cima)
  var movidos = 0;
  if (ex && String(ex.nome) !== nome) {
    var antigo = semAcento(ex.nome);
    var hoje = hojeTexto();
    lerAba('Atendimentos').forEach(function (a) {
      if (!a.id || dataTexto(a.data) < hoje) return;
      var mud = {};
      if (semAcento(a.profissional) === antigo) mud.profissional = nome;
      if (a.titular && semAcento(a.titular) === antigo) mud.titular = nome;
      if (a.comissao_de && semAcento(a.comissao_de) === antigo) mud.comissao_de = nome;
      if (Object.keys(mud).length) { atualizarLinha('Atendimentos', a._linha, mud); movidos++; }
    });
    lerAba('Folgas').forEach(function (f) {
      if (f.id && dataTexto(f.data) >= hoje && semAcento(f.profissional) === antigo) atualizarLinha('Folgas', f._linha, { profissional: nome });
    });
  }
  registrar(m, ex ? 'editou profissional' : 'cadastrou profissional', nome + (movidos ? ' · ' + movidos + ' horários com o nome novo' : ''));
  return bancada_catalogoServicos();
}
