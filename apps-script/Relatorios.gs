/**
 * ============================================================
 *  CASA ÂMBAR — RELATÓRIOS (financeiro, aulas e marketing)
 * ============================================================
 *  Faturamento = pagamentos aprovados (valor efetivamente cobrado).
 *  Vales-presente vendidos e aulas cortesia aparecem à parte.
 */

function bancada_relatorio(d) {
  var hoje = hojeTexto();
  var de = /^\d{4}-\d{2}-\d{2}$/.test(String(d.de)) ? d.de : hoje.slice(0, 8) + '01';
  var ate = /^\d{4}-\d{2}-\d{2}$/.test(String(d.ate)) ? d.ate : hoje;
  if (ate < de) { var t = de; de = ate; ate = t; }
  var dias = diasEntre(de, ate) + 1;
  if (dias > 400) throw new Error('Escolha um período de até 13 meses.');
  var planos = {};
  lerAba('Planos').forEach(function (p) { planos[String(p.id)] = p; });
  listarServicos(true).concat(listarPacotes(true)).forEach(function (x) { var it = buscarItemVenda(x.id); if (it) planos[x.id] = it; });
  listarProdutos(true).forEach(function (p) { planos[p.id] = { id: p.id, modalidade: 'Produtos', categoria: 'Produtos', tipo: 'produto' }; });
  var pagamentos = lerAba('Pagamentos');
  var reservas = todasReservas();
  var alunos = lerAba('Alunos').filter(function (a) { return a.cpf; });
  var creditos = mapaCreditos();
  var fichas = mapaAnamneses();
  return {
    periodo: { de: de, ate: ate, dias: dias },
    financeiro: relFinanceiro(pagamentos, planos, de, ate, dias),
    aulas: relAulas(reservas, creditos, de, ate),
    alunos: relAlunos(alunos, reservas, creditos, pagamentos, fichas, de, ate),
    vales: relVales(pagamentos, de, ate),
    servicos: relServicos(pagamentos, planos, de, ate),
    geradoEm: agoraTexto(),
  };
}

function diasEntre(a, b) {
  return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
}

function soma(lista, f) { return Math.round(lista.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0) * 100) / 100; }

function agrupar(lista, chave, valor) {
  var m = {};
  lista.forEach(function (x) {
    var k = chave(x) || '—';
    m[k] = m[k] || { nome: k, qtd: 0, valor: 0 };
    m[k].qtd++;
    m[k].valor = Math.round((m[k].valor + (valor ? valor(x) : 0)) * 100) / 100;
  });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.valor - a.valor || b.qtd - a.qtd; });
}

function diaPg(p) { return String(p.pago_em || p.criado_em).slice(0, 10); }

function relFinanceiro(pagamentos, planos, de, ate, dias) {
  var noPeriodo = function (p) { var x = diaPg(p); return x >= de && x <= ate; };
  var pagos = pagamentos.filter(function (p) { return p.status === 'pago' && noPeriodo(p); });
  var vendas = pagos.filter(function (p) { return numero(p.valor) > 0; });
  var receita = soma(vendas, function (p) { return numero(p.valor); });
  // período anterior de mesmo tamanho (para comparar)
  var antAte = somarDias(de, -1), antDe = somarDias(de, -dias);
  var receitaAnt = soma(pagamentos.filter(function (p) { var x = diaPg(p); return p.status === 'pago' && x >= antDe && x <= antAte; }), function (p) { return numero(p.valor); });
  var modalidade = function (p) { var pl = planos[String(p.plano_id)]; return pl ? (String(pl.modalidade) === 'Serviço' ? String(pl.categoria || 'Serviços') : String(pl.modalidade)) : 'Outros'; };
  var tipo = function (p) { var pl = planos[String(p.plano_id)]; return pl ? String(pl.tipo) : 'outro'; };

  // série: por dia (até 62 dias) ou por mês
  var porMes = dias > 62;
  var serie = {};
  for (var i = 0; i < dias; i++) {
    var k = somarDias(de, i);
    k = porMes ? k.slice(0, 7) : k;
    serie[k] = serie[k] || { chave: k, valor: 0, qtd: 0 };
  }
  vendas.forEach(function (p) {
    var k = porMes ? diaPg(p).slice(0, 7) : diaPg(p);
    if (serie[k]) { serie[k].valor = Math.round((serie[k].valor + numero(p.valor)) * 100) / 100; serie[k].qtd++; }
  });

  var linksSite = pagamentos.filter(function (p) { return String(p.origem || 'site') === 'site' && numero(p.valor) > 0 && String(p.criado_em).slice(0, 10) >= de && String(p.criado_em).slice(0, 10) <= ate; });
  var estornos = pagamentos.filter(function (p) { return p.status === 'estornado' && noPeriodo(p); });
  var comCupom = pagos.filter(function (p) { return p.cupom; });
  return {
    receita: receita,
    receitaAnterior: receitaAnt,
    variacao: receitaAnt > 0 ? Math.round((receita - receitaAnt) / receitaAnt * 1000) / 10 : null,
    vendas: vendas.length,
    ticketMedio: vendas.length ? Math.round(receita / vendas.length * 100) / 100 : 0,
    porForma: agrupar(vendas, function (p) { return String(p.metodo || 'não informado'); }, function (p) { return numero(p.valor); }),
    porBandeira: agrupar(vendas.filter(function (p) { return String(p.bandeira || '').trim(); }), function (p) { return String(p.bandeira); }, function (p) { return numero(p.valor); }),
    porModalidade: agrupar(vendas, modalidade, function (p) { return numero(p.valor); }),
    porTipo: agrupar(vendas, tipo, function (p) { return numero(p.valor); }),
    porPlano: agrupar(vendas, function (p) { return String(p.descricao); }, function (p) { return numero(p.valor); }).slice(0, 15),
    porOrigem: agrupar(vendas, function (p) { return String(p.origem || 'site'); }, function (p) { return numero(p.valor); }),
    porParcelas: agrupar(vendas.filter(function (p) { return /Cart/.test(String(p.metodo)); }), function (p) { return (Number(p.parcelas) || 1) + 'x'; }, function (p) { return numero(p.valor); }),
    serie: Object.keys(serie).sort().map(function (k) { return serie[k]; }),
    seriePorMes: porMes,
    descontosCupom: soma(comCupom, function (p) { return numero(p.desconto); }),
    cupons: agrupar(comCupom, function (p) { return String(p.cupom); }, function (p) { return numero(p.desconto); }),
    conversaoSite: linksSite.length ? Math.round(linksSite.filter(function (p) { return p.status === 'pago'; }).length / linksSite.length * 1000) / 10 : null,
    linksSite: linksSite.length,
    abandonados: linksSite.filter(function (p) { return p.status === 'pendente' || p.status === 'expirado' || p.status === 'descartado'; }).length,
    estornos: estornos.length,
    valorEstornado: soma(estornos, function (p) { return numero(p.valor); }),
    jurosDevolver: pagamentos.filter(function (p) { return /^DEVOLVER/.test(String(p.observacao)); }).map(pagamentoPublico),
    lista: vendas.map(pagamentoPublico).reverse(),
  };
}

function relAulas(reservas, creditos, de, ate) {
  var agora = Date.now();
  var dias = diasEntre(de, ate) + 1;
  // só aulas que já aconteceram, e a partir da primeira reserva feita no sistema
  var comeco = reservas.map(function (r) { return r.data; }).filter(Boolean).sort()[0] || ate;
  var aulas = aulasDoPeriodo(de, dias, reservas).filter(function (a) { return inicio(a).getTime() < agora && a.data >= comeco; });
  var validas = reservas.filter(function (r) { return r.data >= de && r.data <= ate && r.status !== 'pendente'; });
  var ativas = validas.filter(function (r) { return r.status !== 'cancelado'; });
  var porAula = {};
  ativas.forEach(function (r) { porAula[r.aula_id] = (porAula[r.aula_id] || 0) + 1; });

  var estat = function (lista) {
    var cap = soma(lista, function (a) { return Number(a.capacidade) || 0; });
    var res = soma(lista, function (a) { return porAula[a.id] || 0; });
    return { aulas: lista.length, reservas: res, capacidade: cap, ocupacao: cap ? Math.round(res / cap * 1000) / 10 : 0 };
  };
  var grupos = function (chave) {
    var m = {};
    aulas.forEach(function (a) { var k = chave(a); (m[k] = m[k] || []).push(a); });
    return Object.keys(m).map(function (k) { var e = estat(m[k]); e.nome = k; return e; });
  };
  var nomesDia = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var diaSemana = function (data) { return new Date(data + 'T12:00:00Z').getUTCDay(); };
  // mapa de calor: dia da semana × horário (ocupação %)
  var calor = {};
  aulas.forEach(function (a) {
    var k = a.modalidade + '|' + a.hora + '|' + diaSemana(a.data);
    calor[k] = calor[k] || [];
    calor[k].push(a);
  });
  var mapaCalor = Object.keys(calor).map(function (k) {
    var p = k.split('|'); var e = estat(calor[k]);
    return { modalidade: p[0], hora: p[1], dia: Number(p[2]), diaNome: nomesDia[Number(p[2])], ocupacao: e.ocupacao, aulas: e.aulas, reservas: e.reservas };
  });
  var passadas = ativas.filter(function (r) { return inicio(r).getTime() < agora; });
  var forma = function (r) {
    if (String(r.credito_id) === 'WELLHUB') return 'Wellhub';
    if (String(r.credito_id) === 'CORTESIA') return 'Cortesia';
    var c = creditos[String(r.credito_id)];
    if (!c) return 'Outro';
    if (/vale/.test(String(c.origem))) return 'Vale-presente';
    return c.tipo === 'avulsa' ? 'Aula avulsa' : c.tipo === 'trimestral' ? 'Plano trimestral' : 'Plano mensal';
  };
  return {
    geral: estat(aulas),
    porModalidade: grupos(function (a) { return a.modalidade; }),
    porProfessora: grupos(function (a) { return a.professor || '—'; }).sort(function (a, b) { return b.reservas - a.reservas; }),
    porHorario: grupos(function (a) { return a.modalidade + ' ' + a.hora; }).sort(function (a, b) { return b.ocupacao - a.ocupacao; }),
    porDiaSemana: grupos(function (a) { return String(diaSemana(a.data)); }).map(function (g) { g.dia = Number(g.nome); g.nome = nomesDia[g.dia]; return g; })
      .sort(function (a, b) { return ((a.dia + 6) % 7) - ((b.dia + 6) % 7); }),
    mapaCalor: mapaCalor,
    presencas: passadas.filter(function (r) { return r.status === 'check-in'; }).length,
    faltas: passadas.filter(function (r) { return r.status === 'falta'; }).length,
    semRegistro: passadas.filter(function (r) { return r.status === 'reservado'; }).length,
    cancelamentos: validas.filter(function (r) { return r.status === 'cancelado'; }).length,
    porForma: agrupar(ativas, forma),
    wellhub: ativas.filter(function (r) { return String(r.credito_id) === 'WELLHUB'; }).length,
  };
}

function relAlunos(alunos, reservas, creditos, pagamentos, fichas, de, ate) {
  var hoje = hojeTexto();
  var listaC = Object.keys(creditos).map(function (k) { return creditos[k]; }).filter(function (c) { return String(c.ativo).toUpperCase() !== 'NÃO'; });
  var vigentes = {};
  listaC.forEach(function (c) { if (c.inicio <= hoje && c.fim >= hoje) vigentes[normCpf(c.cpf)] = (vigentes[normCpf(c.cpf)] || []).concat([c]); });
  var porCpf = {};
  alunos.forEach(function (a) { porCpf[normCpf(a.cpf)] = a; });
  var contato = function (cpf) { var a = porCpf[cpf] || {}; return { cpf: cpf, nome: a.nome || '', whatsapp: String(a.whatsapp || ''), email: String(a.email || '') }; };

  // novos cadastros por mês (últimos 12 meses)
  var meses = {};
  for (var i = 11; i >= 0; i--) {
    var dt = new Date(hoje + 'T12:00:00Z');
    dt.setUTCMonth(dt.getUTCMonth() - i, 1);
    meses[dt.toISOString().slice(0, 7)] = 0;
  }
  alunos.forEach(function (a) { var k = String(a.criado_em).slice(0, 7); if (meses[k] != null) meses[k]++; });

  // frequência no período
  var presencas = {};
  reservas.forEach(function (r) { if (r.status === 'check-in' && r.data >= de && r.data <= ate) presencas[normCpf(r.cpf)] = (presencas[normCpf(r.cpf)] || 0) + 1; });
  var frequentes = Object.keys(presencas).map(function (c) { var o = contato(c); o.presencas = presencas[c]; return o; })
    .sort(function (a, b) { return b.presencas - a.presencas; }).slice(0, 15);

  // última aula de cada um
  var ultima = {};
  reservas.forEach(function (r) {
    if (r.status === 'cancelado' || r.status === 'pendente' || r.data > hoje) return;
    var c = normCpf(r.cpf);
    if (!ultima[c] || r.data > ultima[c]) ultima[c] = r.data;
  });
  var limiteSumido = somarDias(hoje, -21), limiteAntigo = somarDias(hoje, -120);
  var sumidos = Object.keys(ultima).filter(function (c) { return ultima[c] < limiteSumido && ultima[c] >= limiteAntigo && !vigentes[c]; })
    .map(function (c) { var o = contato(c); o.ultimaAula = ultima[c]; return o; }).sort(function (a, b) { return b.ultimaAula.localeCompare(a.ultimaAula); });

  var em10 = somarDias(hoje, 10);
  var vencendo = listaC.filter(function (c) { return c.tipo !== 'avulsa' && c.fim >= hoje && c.fim <= em10; })
    .map(function (c) { var o = contato(normCpf(c.cpf)); o.plano = c.descricao; o.fim = c.fim; return o; }).sort(function (a, b) { return a.fim.localeCompare(b.fim); });

  // renovação: planos que terminaram no período e a pessoa comprou outro até 15 dias depois
  var terminaram = listaC.filter(function (c) { return c.tipo !== 'avulsa' && c.fim >= de && c.fim <= ate && c.fim < hoje; });
  var renovaram = terminaram.filter(function (c) {
    var lim = somarDias(c.fim, 15);
    return listaC.some(function (o) { return o.id !== c.id && normCpf(o.cpf) === normCpf(c.cpf) && o.tipo !== 'avulsa' && o.inicio >= somarDias(c.fim, -10) && o.inicio <= lim; });
  });

  // quem fez só aula avulsa e não voltou a comprar (oportunidade de plano)
  var soAvulsa = {};
  listaC.forEach(function (c) { var k = normCpf(c.cpf); soAvulsa[k] = soAvulsa[k] == null ? c.tipo === 'avulsa' : soAvulsa[k] && c.tipo === 'avulsa'; });

  var mesAtual = hoje.slice(5, 7);
  var aniversariantes = Object.keys(fichas).map(function (c) {
    var dn = String(ehData(fichas[c].data_nascimento) ? dataTexto(fichas[c].data_nascimento) : fichas[c].data_nascimento || '');
    var m = dn.match(/^(\d{4})-(\d{2})-(\d{2})/) || dn.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    var mes = m[1].length === 4 ? m[2] : m[2], dia = m[1].length === 4 ? m[3] : m[1];
    if (mes !== mesAtual) return null;
    var o = contato(c); o.dia = Number(dia); return o;
  }).filter(Boolean).sort(function (a, b) { return a.dia - b.dia; });

  return {
    total: alunos.length,
    novosNoPeriodo: alunos.filter(function (a) { var k = String(a.criado_em).slice(0, 10); return k >= de && k <= ate; }).length,
    ativos: Object.keys(vigentes).length,
    comPlano: Object.keys(vigentes).filter(function (c) { return vigentes[c].some(function (x) { return x.tipo !== 'avulsa'; }); }).length,
    semFicha: alunos.filter(function (a) { return !fichas[normCpf(a.cpf)]; }).length,
    wellhub: alunos.filter(function (a) { var s = statusWellhub(a); return s === 'confirmado' || s === 'pendente'; }).length,
    novosPorMes: Object.keys(meses).map(function (k) { return { chave: k, qtd: meses[k] }; }),
    frequentes: frequentes,
    sumidos: sumidos.slice(0, 60),
    vencendo: vencendo,
    renovacao: { terminaram: terminaram.length, renovaram: renovaram.length, taxa: terminaram.length ? Math.round(renovaram.length / terminaram.length * 1000) / 10 : null },
    soAvulsa: Object.keys(soAvulsa).filter(function (c) { return soAvulsa[c] && !vigentes[c]; }).map(contato).slice(0, 60),
    aniversariantes: aniversariantes,
    // "Como nos conheceu?": novos no período, todos e quanto cada canal trouxe em vendas
    comoConheceram: agrupar(alunos.filter(function (a) { var k = String(a.criado_em).slice(0, 10); return k >= de && k <= ate; }), canal),
    comoConheceramTodos: agrupar(alunos, canal),
    vendasPorCanal: agrupar(pagamentos.filter(function (p) {
      var k = String(p.pago_em || p.criado_em).slice(0, 10);
      return p.status === 'pago' && numero(p.valor) > 0 && p.cpf && k >= de && k <= ate;
    }), function (p) { return canal(porCpf[normCpf(p.cpf)] || {}); }, function (p) { return numero(p.valor); }),
    bairros: agrupar(alunos.filter(function (a) { return String(a.bairro || '').trim(); }), function (a) {
      var b = String(a.bairro).trim();
      return b.charAt(0).toUpperCase() + b.slice(1) + (a.cidade && semAcento(a.cidade) !== 'fortaleza' ? ' (' + a.cidade + ')' : '');
    }).slice(0, 15),
    comEndereco: alunos.filter(function (a) { return String(a.endereco || '').trim() && String(a.cep || '').trim(); }).length,
  };
}

function canal(a) { return String(a.como_conheceu || '').trim() || 'Não informado'; }

function relVales(pagamentos, de, ate) {
  var vales = lerAba('Vales').filter(function (v) { return v.codigo; });
  var noPer = function (t) { var x = String(t || '').slice(0, 10); return x >= de && x <= ate; };
  var gerados = vales.filter(function (v) { return noPer(v.criado_em); });
  var usos = pagamentos.filter(function (p) { return p.status === 'pago' && p.vale && noPer(p.pago_em); });
  var cortesias = lerAba('Reservas').filter(function (r) { return String(r.credito_id) === 'CORTESIA' && r.status !== 'cancelado'; }).map(partesAula)
    .filter(function (r) { return r.data >= de && r.data <= ate; }).length;
  return {
    gerados: gerados.length,
    valorGerado: soma(gerados, function (v) { return numero(v.valor); }),
    resgatados: usos.length,
    valorResgatado: soma(usos, function (p) { return numero(p.vale_usado); }),
    abertos: vales.filter(function (v) { return v.status === 'ativo' && !valeVencido(v); }).length,
    porTipo: agrupar(gerados, function (v) { return descreverVale(v); }, function (v) { return numero(v.valor); }),
    porCampanha: agrupar(gerados.filter(function (v) { return v.campanha; }), function (v) { return String(v.campanha); }, function (v) { return numero(v.valor); }).map(function (g) {
      g.resgatados = usos.filter(function (p) { var v = vales.filter(function (x) { return codigoLimpo(x.codigo) === codigoLimpo(p.vale); })[0]; return v && v.campanha === g.nome; }).length;
      return g;
    }),
    aulasCortesia: cortesias,
  };
}

function relServicos(pagamentos, planos, de, ate) {
  var lista = lerAba('Atendimentos').filter(function (a) { var d = dataTexto(a.data); return a.id && d >= de && d <= ate; });
  var hoje = hojeTexto();
  var feitos = lista.filter(function (a) { return a.status === 'atendido'; });
  var passados = lista.filter(function (a) { return a.status !== 'cancelado' && dataTexto(a.data) < hoje; });
  var vendas = pagamentos.filter(function (p) {
    var x = diaPg(p); var it = planos[String(p.plano_id)];
    return p.status === 'pago' && numero(p.valor) > 0 && x >= de && x <= ate && it && String(it.modalidade) === 'Serviço';
  });
  return {
    agendados: lista.filter(function (a) { return a.status !== 'cancelado'; }).length,
    atendidos: feitos.length,
    faltas: lista.filter(function (a) { return a.status === 'falta'; }).length,
    cancelados: lista.filter(function (a) { return a.status === 'cancelado'; }).length,
    taxaFalta: passados.length ? Math.round(lista.filter(function (a) { return a.status === 'falta'; }).length / passados.length * 1000) / 10 : null,
    receita: soma(vendas, function (p) { return numero(p.valor); }),
    pacotesVendidos: vendas.filter(function (p) { var it = planos[String(p.plano_id)]; return it && it.tipo === 'pacote'; }).length,
    porServico: agrupar(lista.filter(function (a) { return a.status !== 'cancelado'; }), function (a) { return String(a.servico); }, function (a) { return numero(a.valor); }),
    porCategoria: agrupar(lista.filter(function (a) { return a.status !== 'cancelado'; }), function (a) { return String(a.categoria); }, function (a) { return numero(a.valor); }),
    porProfissional: agrupar(lista.filter(function (a) { return a.status !== 'cancelado'; }), function (a) { return String(a.profissional); }, function (a) { return numero(a.valor); }),
    receitaPorCategoria: agrupar(vendas, function (p) { return String(planos[String(p.plano_id)].categoria || 'Serviços'); }, function (p) { return numero(p.valor); }),
  };
}
