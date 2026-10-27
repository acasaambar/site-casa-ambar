/**
 * ============================================================
 *  CASA ÂMBAR — GESTÃO DA CASA
 * ============================================================
 *  Produtos e estoque · Comandas (a conta da visita) · Comissões
 *  Despesas e financeiro · Caixa do dia · Bloqueio de horário por profissional
 *  Tudo grava na mesma planilha, em abas próprias (criadas sozinhas).
 */

var CATEGORIAS_PRODUTO = ['Revenda (home care)', 'Insumo de cabine', 'Descartáveis', 'Limpeza e copa', 'Outros'];
var CATEGORIAS_DESPESA = ['Aluguel e condomínio', 'Água, luz e internet', 'Salários e pró-labore', 'Comissões', 'Produtos e insumos', 'Marketing',
  'Manutenção', 'Impostos e taxas', 'Sistemas e assinaturas', 'Outros'];
var METODOS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay', 'Vale-presente'];
// bandeira do cartão (para conferir com o extrato da maquininha)
var BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Hiper', 'Diners', 'Cabal', 'Outra'];
function ehCartao(metodo) { return metodo === 'Cartão de crédito' || metodo === 'Cartão de débito'; }
// no Link InfinitePay a bandeira é opcional (o link também aceita Pix)
function bandeiraDe(metodo, bandeira, obrigatoria) {
  if (!ehCartao(metodo) && metodo !== 'Link InfinitePay') return '';
  var b = String(bandeira || '').trim();
  if (BANDEIRAS.indexOf(b) >= 0) return b;
  if ((obrigatoria && ehCartao(metodo)) || b) throw new Error('Escolha a bandeira do cartão (' + metodo.toLowerCase() + ').');
  return '';
}

// código único: data e hora + 5 letras sorteadas (dois cadastros no mesmo segundo não se repetem)
function novoId(prefixo) {
  return prefixo + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase();
}
function dinheiro(v) { return Math.round(numero(v) * 100) / 100; }
function ativoSim(v) { return String(v).toUpperCase() !== 'NÃO'; }
function parseJson(t, padrao) {
  try { var v = JSON.parse(String(t || '')); return v == null ? padrao : v; } catch (e) { return padrao; }
}
function diasNoMes(mes) {
  var p = String(mes).split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1], 0)).getUTCDate();
}
function mesValido(m) { return /^\d{4}-\d{2}$/.test(String(m || '')) ? String(m) : hojeTexto().slice(0, 7); }
function dataValida(d, padrao) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? String(d) : padrao; }
// R$ 1.240,00 (com separador de milhar)
function brl(v) {
  var p = Math.abs(dinheiro(v)).toFixed(2).split('.');
  return (v < 0 ? '−' : '') + 'R$ ' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1];
}
// "1 foto", "2 fotos" (nunca "foto(s)")
function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

// ============================================================
//  PRODUTOS E ESTOQUE
// ============================================================
function produtoPublico(p) {
  return { id: String(p.id), ativo: ativoSim(p.ativo), nome: String(p.nome), categoria: String(p.categoria || 'Outros'), marca: String(p.marca || ''),
    unidade: String(p.unidade || 'un'), preco: dinheiro(p.preco), custo: dinheiro(p.custo), estoque: numero(p.estoque), minimo: numero(p.minimo),
    vende: String(p.vende).toUpperCase() === 'SIM', obs: String(p.obs || '') };
}

function listarProdutos(todos) {
  return lerAba('Produtos').filter(function (p) { return p.id && (todos || ativoSim(p.ativo)); }).map(produtoPublico);
}

function acharProduto(id) {
  return lerAba('Produtos').filter(function (p) { return String(p.id) === String(id); })[0] || null;
}

function bancada_produtos(d, m) {
  var lista = listarProdutos(true);
  // custo de compra: só a administração (a recepção vende e dá entrada, mas não precisa saber a margem)
  if (m && m.papel !== 'admin') lista = lista.map(function (p) { return Object.assign({}, p, { custo: null }); });
  return { produtos: lista, categorias: CATEGORIAS_PRODUTO,
    baixo: lista.filter(function (p) { return p.ativo && p.minimo > 0 && p.estoque <= p.minimo; }).length };
}

function bancada_salvarProduto(d, m) {
  var x = d.produto || {};
  var nome = String(x.nome || '').trim();
  if (nome.length < 2) throw new Error('Informe o nome do produto.');
  var vende = !!x.vende;
  if (vende && !(numero(x.preco) > 0)) throw new Error('Informe o preço de venda.');
  var id = String(x.id || '');
  var ex = id ? acharProduto(id) : null;
  if (!ex) {
    id = 'p-' + slug(nome).slice(0, 34);
    var base = id; var n = 2;
    while (acharProduto(id)) id = base + '-' + n++;
  }
  var linha = { id: id, ativo: x.ativo === false ? 'NÃO' : 'SIM', nome: nome, categoria: CATEGORIAS_PRODUTO.indexOf(x.categoria) >= 0 ? x.categoria : 'Outros',
    marca: String(x.marca || '').slice(0, 60), unidade: String(x.unidade || 'un').slice(0, 12), preco: dinheiro(x.preco), custo: dinheiro(x.custo),
    minimo: Math.max(0, numero(x.minimo)), vende: vende ? 'SIM' : 'NÃO', obs: String(x.obs || '').slice(0, 300) };
  if (ex) {
    atualizarLinha('Produtos', ex._linha, linha);
  } else {
    linha.estoque = 0;
    adicionarLinha('Produtos', linha);
    if (numero(x.estoqueInicial) > 0) movimentarEstoque(id, numero(x.estoqueInicial), 'entrada', 'estoque inicial', '', m.email, dinheiro(x.custo));
  }
  _itensVenda = null;
  registrar(m, ex ? 'editou produto' : 'cadastrou produto', nome);
  return bancada_produtos();
}

// qtd com sinal (+ entra, − sai). Atualiza o saldo do produto e registra o movimento.
function movimentarEstoque(id, qtd, tipo, motivo, ref, quem, custoUnit) {
  var p = acharProduto(id);
  if (!p) throw new Error('Produto não encontrado.');
  var custo = custoUnit > 0 ? custoUnit : numero(p.custo);
  var novo = Math.round((numero(p.estoque) + qtd) * 1000) / 1000;
  var mud = { estoque: novo };
  if (tipo === 'entrada' && custoUnit > 0) mud.custo = custoUnit;
  atualizarLinha('Produtos', p._linha, mud);
  adicionarLinha('MovEstoque', { quando: agoraTexto(), produto_id: String(p.id), produto: p.nome, tipo: tipo, qtd: qtd, custo_unit: custo,
    valor: dinheiro(Math.abs(qtd) * custo), motivo: String(motivo || '').slice(0, 200), ref: ref || '', quem: quem || 'sistema' });
  return novo;
}

// tipo: entrada (compra) · perda · uso (consumo avulso) · ajuste (contagem)
function bancada_movimentarEstoque(d, m) {
  var p = acharProduto(d.produtoId);
  if (!p) throw new Error('Produto não encontrado.');
  var tipo = ['entrada', 'perda', 'uso', 'ajuste'].indexOf(d.tipo) >= 0 ? d.tipo : '';
  if (!tipo) throw new Error('Escolha o tipo de movimento.');
  var qtd = numero(d.qtd);
  if (tipo === 'ajuste') {
    if (qtd < 0 || String(d.qtd) === '') throw new Error('Informe quanto tem na prateleira.');
    qtd = Math.round((qtd - numero(p.estoque)) * 1000) / 1000;
    if (!qtd) return bancada_produtos();
  } else {
    if (!(qtd > 0)) throw new Error('Informe a quantidade.');
    if (tipo !== 'entrada') qtd = -qtd;
  }
  var custo = dinheiro(d.custo);
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    movimentarEstoque(p.id, qtd, tipo, d.motivo || '', '', m.email, tipo === 'entrada' ? custo : 0);
    if (tipo === 'entrada' && d.lancarDespesa && custo > 0 && m.papel === 'admin') {
      criarDespesa({ data: hojeTexto(), descricao: 'Compra · ' + p.nome + ' × ' + qtd, categoria: 'Produtos e insumos', valor: dinheiro(qtd * custo),
        forma: d.forma || 'Pix', status: d.pago === false ? 'a_pagar' : 'pago', fornecedor: d.fornecedor || '' }, m);
    }
  } finally {
    soltarTrava(trava);
  }
  registrar(m, 'estoque · ' + tipo, p.nome + ' · ' + qtd);
  return bancada_produtos();
}

function bancada_movimentos(d, m) {
  var lista = lerAba('MovEstoque').filter(function (x) { return x.produto_id && (!d.produtoId || String(x.produto_id) === String(d.produtoId)); });
  return lista.slice(-300).reverse().map(function (x) {
    return { quando: String(x.quando), produtoId: String(x.produto_id), produto: String(x.produto), tipo: String(x.tipo), qtd: numero(x.qtd),
      valor: m && m.papel !== 'admin' ? null : dinheiro(x.valor), motivo: String(x.motivo || ''), quem: String(x.quem || '').split('@')[0] };
  });
}

// Consumo de produtos de um serviço (Catálogo → serviço → "produtos usados").
// ativo=true baixa o estoque; ativo=false devolve. Pode ser chamado de novo sem duplicar.
function aplicarConsumo(servicoId, ref, cliente, ativo, quem) {
  try {
    var serv = listarServicos(true).filter(function (s) { return s.id === String(servicoId); })[0];
    var consumo = serv ? serv.consumo : [];
    var movs = lerAba('MovEstoque').filter(function (x) { return String(x.ref) === ref; });
    var ids = {};
    consumo.forEach(function (c) { ids[c.produtoId] = c.qtd; });
    movs.forEach(function (x) { if (!(String(x.produto_id) in ids)) ids[String(x.produto_id)] = 0; });
    Object.keys(ids).forEach(function (pid) {
      var net = movs.filter(function (x) { return String(x.produto_id) === pid; }).reduce(function (s, x) { return s + numero(x.qtd); }, 0);
      var alvo = ativo ? -ids[pid] : 0;
      var dif = Math.round((alvo - net) * 1000) / 1000;
      if (dif && acharProduto(pid)) movimentarEstoque(pid, dif, 'uso', (dif > 0 ? 'devolvido · ' : '') + (serv ? serv.nome : servicoId) + ' · ' + cliente, ref, quem);
    });
  } catch (e) {
    Logger.log('consumo: ' + e.message);
  }
}

// ============================================================
//  COMISSÕES
// ============================================================
function profissionalPorNome(nome) {
  return listarProfissionais(true).filter(function (p) { return semAcento(p.nome) === semAcento(nome); })[0] || null;
}

// comissão: a da profissional naquele serviço → a do serviço → a padrão da profissional
function pctComissao(profissional, servicoId) {
  var p = profissionalPorNome(profissional);
  var c = servicoId ? configServico(p, servicoId) : null;
  if (c && c.comissao != null) return c.comissao;
  var s = servicoId ? listarServicos(true).filter(function (x) { return x.id === String(servicoId); })[0] : null;
  if (s && s.comissao != null) return s.comissao;
  return p ? p.comissao : 0;
}

// c = { ref, data, profissional, origem, item, base, pct }
function gravarComissao(c) {
  var id = 'K' + c.ref;
  var valor = dinheiro(numero(c.base) * numero(c.pct) / 100);
  var ex = lerAba('Comissoes').filter(function (x) { return String(x.id) === id; })[0];
  if (ex && ex.status === 'pago') return;
  if (!(valor > 0)) {
    if (ex && ex.status === 'a_pagar') atualizarLinha('Comissoes', ex._linha, { status: 'cancelada' });
    return;
  }
  var linha = { id: id, data: c.data, profissional: c.profissional, origem: c.origem, ref: c.ref, item: String(c.item).slice(0, 200), base: dinheiro(c.base),
    pct: numero(c.pct), valor: valor, status: 'a_pagar' };
  if (ex) atualizarLinha('Comissoes', ex._linha, linha);
  else { linha.criado_em = agoraTexto(); adicionarLinha('Comissoes', linha); }
}

function cancelarComissao(ref) {
  var ex = lerAba('Comissoes').filter(function (x) { return String(x.id) === 'K' + ref; })[0];
  if (ex && ex.status === 'a_pagar') atualizarLinha('Comissoes', ex._linha, { status: 'cancelada' });
}

// valor que serve de base para a comissão de um atendimento (sem a taxa da maquininha: AJUSTES.comissaoLiquida)
function baseDoAtendimento(a) {
  if (a.pagamento === 'cortesia') return 0;
  if (a.pagamento === 'pacote' && a.credito_id) {
    var cred = mapaCreditos()[String(a.credito_id)];
    var pg = lerAba('Pagamentos').filter(function (p) { return 'C' + String(p.order_nsu).slice(1) === String(a.credito_id); })[0];
    var sessoes = cred ? numero(cred.aulas_total) : 0;
    if (pg && sessoes > 0) return dinheiro((numero(pg.valor) + numero(pg.vale_usado)) / sessoes * fatorDoPagamento(pg));
    var pac = cred ? listarPacotes(true).filter(function (p) { return p.id === String(cred.plano_id); })[0] : null;
    return pac && pac.sessoes ? dinheiro(pac.preco / pac.sessoes) : 0;
  }
  var pago = a.order_nsu ? lerAba('Pagamentos').filter(function (p) { return String(p.order_nsu) === String(a.order_nsu); })[0] : null;
  return dinheiro(numero(a.valor) * (pago ? fatorDoPagamento(pago) : 1));
}

// atendido → comissão a pagar; desfeito/falta → cancela
function comissaoDoAtendimento(a, ativo) {
  try {
    if (!ativo) { cancelarComissao(a.id); return; }
    // substituição: comissão de quem atendeu, pela regra dela ou da titular (comissao_de)
    gravarComissao({ ref: String(a.id), data: dataTexto(a.data), profissional: String(a.profissional), origem: 'atendimento',
      item: a.servico + ' · ' + a.nome + (a.titular ? ' · no lugar de ' + a.titular : ''), base: baseDoAtendimento(a),
      pct: pctComissao(String(a.comissao_de || '') || a.profissional, a.servico_id) });
  } catch (e) {
    Logger.log('comissão: ' + e.message);
  }
}

function comissaoPublica(c) {
  return { id: String(c.id), data: dataTexto(c.data), profissional: String(c.profissional), origem: String(c.origem), item: String(c.item),
    base: dinheiro(c.base), pct: numero(c.pct), valor: dinheiro(c.valor), status: String(c.status), pagoEm: String(c.pago_em || '') };
}

function comissoesDoPeriodo(de, ate, filtro) {
  return lerAba('Comissoes').filter(function (c) {
    var dt = dataTexto(c.data);
    return c.id && c.status !== 'cancelada' && ((dt >= de && dt <= ate) || (c.status === 'a_pagar' && dt < de)) && (!filtro || filtro(c));
  }).map(comissaoPublica).sort(function (a, b) { return b.data.localeCompare(a.data); });
}

function resumoComissoes(lista) {
  var m = {};
  lista.forEach(function (c) {
    var k = c.profissional;
    m[k] = m[k] || { nome: k, aPagar: 0, pago: 0, qtd: 0 };
    m[k].qtd++;
    if (c.status === 'pago') m[k].pago = dinheiro(m[k].pago + c.valor); else m[k].aPagar = dinheiro(m[k].aPagar + c.valor);
  });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.aPagar - a.aPagar || b.pago - a.pago; });
}

// ============================================================
//  PAGAMENTO DAS PROFESSORAS DE AULA
//  Pilates: % sobre o valor de cada aula da aluna (plano ÷ aulas do plano, avulsa ou Wellhub).
//  Yoga: valor fixo por aula dada (hora/aula).
//  Contam só aulas que já terminaram, a partir da data "desde" de cada professora;
//  reserva cancelada ou com falta não conta. Tudo entra na aba Comissoes (pagar, Meus ganhos).
// ============================================================
function listarProfessoras() {
  return lerAba('Professoras').filter(function (x) { return String(x.nome).trim(); }).map(function (x) {
    return { nome: String(x.nome).trim(), ativo: String(x.ativo).toUpperCase() !== 'NÃO',
      pilatesPct: String(x.pilates_pct) === '' ? null : numero(x.pilates_pct),
      wellhubPct: String(x.wellhub_pct) === '' ? null : numero(x.wellhub_pct),
      yogaPorAula: numero(x.yoga_por_aula), desde: x.desde ? dataTexto(x.desde) : '',
      modalidades: String(x.modalidades || '').split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t === 'Pilates' || t === 'Yoga'; }) };
  });
}

// quanto a Casa recebe do Wellhub por check-in (base da comissão de quem dá a aula)
function valorWellhubCheckin() {
  return numero(PropertiesService.getScriptProperties().getProperty('WELLHUB_VALOR_CHECKIN'));
}

// valor de uma aula para a aluna: o que pagou pelo plano dividido pelas aulas do plano
// (mensal 2x = 8 aulas; trimestral 2x = 26). Crédito lançado à mão vale o preço do plano.
function valorDaAula(r, creditos, pagos, wellhub) {
  var cid = String(r.credito_id || '');
  if (cid === 'WELLHUB') return wellhub;
  var c = creditos[cid];
  if (!c) return 0;
  var plano = buscarPlano(String(c.plano_id));
  var total = pagos[cid] != null ? pagos[cid] : plano ? plano.preco : 0;
  var aulas = c.aulas_total > 0 ? c.aulas_total : c.aulas_semana * Math.max(1, Math.round((diasEntre(c.inicio, c.fim) + 1) / 7));
  return aulas > 0 ? dinheiro(total / aulas) : 0;
}

function esquecerComissoesAulas() {
  try { CacheService.getScriptCache().remove('comissoes_aulas'); } catch (e) { /* ignora */ }
}

// Gera (ou corrige) as comissões das aulas do período. Refeito no máximo a cada 5 min,
// ou na hora quando muda presença, reserva ou o valor das professoras.
function sincronizarComissoesAulas(de, ate) {
  var cache = CacheService.getScriptCache();
  var chave = de + '_' + ate;
  if (cache.get('comissoes_aulas') === chave) return;
  var profs = {};
  listarProfessoras().forEach(function (p) { if (p.ativo && p.desde) profs[semAcento(p.nome)] = p; });
  var alvo = {};
  var trocas = trocasDeAulas();
  if (Object.keys(profs).length) {
    var agora = Date.now(), hoje = hojeTexto();
    var creditos = mapaCreditos();
    var pagos = {};
    var memoFatores = {};
    lerAba('Pagamentos').forEach(function (p) {
      if (p.status === 'pago') pagos['C' + String(p.order_nsu).slice(1)] = dinheiro((numero(p.valor) + numero(p.vale_usado)) * fatorDoPagamento(p, memoFatores));
    });
    var wellhub = valorWellhubCheckin();
    lerAba('Reservas').forEach(function (r) {
      var data = dataTexto(r.data);
      if (!r.id || data < de || data > ate || data > hoje) return;
      if (r.status !== 'reservado' && r.status !== 'check-in') return;
      // substituição com a regra da titular: valores dela, pagos a quem deu a aula
      var troca = trocas[r.aula_id];
      var p = profs[semAcento(troca && troca.regra === 'titular' ? troca.titular : String(r.professor).trim())];
      if (!p || data < p.desde) return;
      var lugar = troca ? ' · no lugar de ' + troca.titular : '';
      if (inicio(r).getTime() + AJUSTES.duracaoAulaMin * 60000 > agora) return;
      var hh = horaTexto(r.hora);
      var hora = Number(hh.slice(0, 2)) + 'h' + (hh.slice(3) === '00' ? '' : hh.slice(3));
      var quem = String(r.professor).trim();
      if (r.modalidade === 'Pilates') {
        var wh = String(r.credito_id) === 'WELLHUB';
        var pct = wh && p.wellhubPct != null ? p.wellhubPct : p.pilatesPct;
        if (!(pct > 0)) return;
        alvo['aula:' + r.id] = { data: data, profissional: quem, origem: 'aula', pct: pct, base: valorDaAula(r, creditos, pagos, wellhub),
          item: 'Pilates ' + hora + ' · ' + r.nome + (wh ? ' (Wellhub)' : '') + lugar };
      } else if (r.modalidade === 'Yoga' && p.yogaPorAula > 0) {
        var k = 'aula:' + r.aula_id;
        alvo[k] = alvo[k] || { data: data, profissional: quem, origem: 'aula_fixa', pct: 100, base: p.yogaPorAula, alunas: 0 };
        alvo[k].alunas++;
        alvo[k].item = 'Yoga ' + hora + ' · ' + alvo[k].alunas + (alvo[k].alunas === 1 ? ' participante' : ' participantes') + lugar;
      }
    });
  }
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var existentes = {};
    lerAba('Comissoes').forEach(function (c) { existentes[String(c.id)] = c; });
    var novas = [];
    Object.keys(alvo).forEach(function (ref) {
      var c = alvo[ref], ex = existentes['K' + ref];
      var valor = dinheiro(numero(c.base) * c.pct / 100);
      if (ex && ex.status === 'pago') return;
      if (!(valor > 0)) { if (ex && ex.status === 'a_pagar') atualizarLinha('Comissoes', ex._linha, { status: 'cancelada' }); return; }
      var linha = { id: 'K' + ref, data: c.data, profissional: c.profissional, origem: c.origem, ref: ref, item: c.item, base: dinheiro(c.base), pct: c.pct, valor: valor, status: 'a_pagar' };
      if (!ex) { linha.criado_em = agoraTexto(); novas.push(linha); }
      else if (ex.status !== 'a_pagar' || numero(ex.valor) !== valor || String(ex.item) !== c.item || String(ex.profissional) !== c.profissional) atualizarLinha('Comissoes', ex._linha, linha);
    });
    // aula que deixou de contar (falta, reserva cancelada, professora sem valor)
    Object.keys(existentes).forEach(function (id) {
      var ex = existentes[id], dt = dataTexto(ex.data);
      if ((ex.origem === 'aula' || ex.origem === 'aula_fixa') && ex.status === 'a_pagar' && dt >= de && dt <= ate && !alvo[String(ex.ref)]) {
        atualizarLinha('Comissoes', ex._linha, { status: 'cancelada' });
      }
    });
    adicionarLinhas('Comissoes', novas);
  } finally {
    soltarTrava(trava);
  }
  cache.put('comissoes_aulas', chave, 300);
}

// tela: professoras da grade com o valor de cada uma
function bancada_pagamentoAulas() {
  var mods = {};
  lerAba('Grade').forEach(function (g) {
    var n = String(g.professor || '').trim();
    if (!n || String(g.ativo).toUpperCase() === 'NÃO') return;
    mods[n] = mods[n] || {};
    mods[n][String(g.modalidade).trim()] = 1;
  });
  var cfg = {};
  var naGrade = Object.keys(mods).map(semAcento);
  var daGrade = {}; // modalidades que vêm da Grade (não dá para desmarcar no cadastro)
  Object.keys(mods).forEach(function (n) { daGrade[n] = Object.keys(mods[n]).sort(); });
  listarProfessoras().forEach(function (p) {
    cfg[semAcento(p.nome)] = p;
    var chave = Object.keys(mods).filter(function (n) { return semAcento(n) === semAcento(p.nome); })[0];
    if (!chave) { chave = p.nome; mods[chave] = {}; } // saiu da grade (ou ainda não entrou), mas tem cadastro salvo
    p.modalidades.forEach(function (t) { mods[chave][t] = 1; }); // marcadas no cadastro
  });
  return { wellhubValor: valorWellhubCheckin(), hoje: hojeTexto(),
    professoras: Object.keys(mods).sort().map(function (n) {
      var c = cfg[semAcento(n)] || {};
      return { nome: n, modalidades: Object.keys(mods[n]).sort(), daGrade: daGrade[n] || [], pilatesPct: c.pilatesPct == null ? null : c.pilatesPct, wellhubPct: c.wellhubPct == null ? null : c.wellhubPct,
        yogaPorAula: c.yogaPorAula || 0, desde: c.desde || '', ativo: c.ativo !== false };
    }) };
}

function bancada_salvarPagamentoAulas(d, m) {
  var limite = function (v, max, rotulo) {
    if (v === '' || v == null) return '';
    var n = numero(String(v).replace(',', '.'));
    if (isNaN(n) || n < 0 || n > max) throw new Error(rotulo + ': de 0 a ' + max + '.');
    return n;
  };
  var wv = limite(d.wellhubValor, 500, 'Valor do check-in Wellhub');
  var existentes = {};
  lerAba('Professoras').forEach(function (p) { existentes[semAcento(String(p.nome).trim())] = p; });
  var novas = [];
  (d.professoras || []).forEach(function (x) {
    var nome = String(x.nome || '').trim();
    if (!nome) return;
    var linha = { nome: nome, ativo: x.ativo === false ? 'NÃO' : 'SIM', pilates_pct: limite(x.pilatesPct, 100, 'Comissão de Pilates de ' + nome),
      wellhub_pct: limite(x.wellhubPct, 100, 'Comissão Wellhub de ' + nome), yoga_por_aula: limite(x.yogaPorAula, 2000, 'Valor da aula de Yoga de ' + nome) || '',
      desde: /^\d{4}-\d{2}-\d{2}$/.test(String(x.desde)) ? x.desde : hojeTexto(), atualizado_em: agoraTexto() };
    // modalidades marcadas no cadastro (só Pilates e Yoga); sem o campo, o que já estava salvo continua
    if (Array.isArray(x.modalidades)) linha.modalidades = ['Pilates', 'Yoga'].filter(function (t) { return x.modalidades.indexOf(t) >= 0; }).join(', ');
    var ex = existentes[semAcento(nome)];
    if (ex) atualizarLinha('Professoras', ex._linha, linha);
    else if (linha.pilates_pct !== '' || linha.wellhub_pct !== '' || linha.yoga_por_aula !== '' || linha.modalidades) novas.push(linha);
  });
  adicionarLinhas('Professoras', novas);
  PropertiesService.getScriptProperties().setProperty('WELLHUB_VALOR_CHECKIN', String(wv || 0));
  esquecerComissoesAulas();
  registrar(m, 'pagamento de quem dá aula', (d.professoras || []).length + ' profissionais · Wellhub R$ ' + (wv || 0));
  return bancada_pagamentoAulas();
}

function bancada_comissoes(d) {
  var mes = mesValido(d.mes);
  var de = mes + '-01', ate = mes + '-' + diasNoMes(mes);
  sincronizarComissoesAulas(de, ate);
  var lista = comissoesDoPeriodo(de, ate);
  return { mes: mes, lista: lista, liquida: AJUSTES.comissaoLiquida !== false, porProfissional: resumoComissoes(lista),
    profissionais: listarProfissionais(true).map(function (p) { return { nome: p.nome, comissao: p.comissao, comissaoProduto: p.comissaoProduto }; }) };
}

function bancada_pagarComissoes(d, m) {
  var ids = (d.ids || []).map(String);
  if (!ids.length) throw new Error('Escolha as comissões.');
  var forma = METODOS_PAGAMENTO.indexOf(d.forma) >= 0 ? d.forma : 'Pix';
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  var pagas = 0;
  try {
    var linhas = lerAba('Comissoes').filter(function (c) { return ids.indexOf(String(c.id)) >= 0 && c.status === 'a_pagar'; });
    var porProf = {};
    linhas.forEach(function (c) { (porProf[c.profissional] = porProf[c.profissional] || []).push(c); });
    Object.keys(porProf).forEach(function (prof) {
      var lista = porProf[prof];
      var total = dinheiro(lista.reduce(function (s, c) { return s + numero(c.valor); }, 0));
      var datas = lista.map(function (c) { return dataTexto(c.data); }).sort();
      var desp = criarDespesa({ data: hojeTexto(), descricao: 'Comissão · ' + prof + ' · ' + datas[0].split('-').reverse().join('/') + ' a ' + datas[datas.length - 1].split('-').reverse().join('/'),
        categoria: 'Comissões', valor: total, forma: forma, status: 'pago', fornecedor: prof, ref: 'comissao' }, m);
      lista.forEach(function (c) {
        atualizarLinha('Comissoes', c._linha, { status: 'pago', pago_em: agoraTexto(), pago_por: m.email, despesa_id: desp.id });
        pagas++;
      });
    });
  } finally {
    soltarTrava(trava);
  }
  registrar(m, 'pagou comissões', pagas + ' lançamentos');
  return bancada_comissoes({ mes: d.mes });
}

// a profissional vê só o que é dela
function bancada_meusGanhos(d, m) {
  var mes = mesValido(d.mes);
  var de = mes + '-01', ate = mes + '-' + diasNoMes(mes);
  sincronizarComissoesAulas(de, ate);
  var lista = comissoesDoPeriodo(de, ate, function (c) { return mesmaProfessora(c.profissional, m); });
  var atend = lerAba('Atendimentos').filter(function (a) {
    var dt = dataTexto(a.data);
    return a.id && dt >= de && dt <= ate && mesmaProfessora(a.profissional, m);
  });
  return { mes: mes, liquida: AJUSTES.comissaoLiquida !== false, lista: lista, total: dinheiro(lista.reduce(function (s, c) { return s + c.valor; }, 0)),
    aPagar: dinheiro(lista.filter(function (c) { return c.status === 'a_pagar'; }).reduce(function (s, c) { return s + c.valor; }, 0)),
    pago: dinheiro(lista.filter(function (c) { return c.status === 'pago'; }).reduce(function (s, c) { return s + c.valor; }, 0)),
    atendidos: atend.filter(function (a) { return a.status === 'atendido'; }).length,
    agendados: atend.filter(function (a) { return a.status !== 'cancelado'; }).length,
    faltas: atend.filter(function (a) { return a.status === 'falta'; }).length };
}

// Relatório do mês de uma pessoa da equipe, para conferir as contas com ela e imprimir.
// Administração: qualquer pessoa. Profissional: só o dela (o nome vem do acesso, não do pedido).
// Atendimentos e aulas do mês com o valor da comissão de cada um, faltas, o que já foi pago (e como) e o que ficou a pagar.
function bancada_relatorioProfissional(d, m) {
  var mes = mesValido(d.mes);
  var de = mes + '-01', ate = mes + '-' + diasNoMes(mes);
  var nome = m.papel === 'professora' ? String(m.professor_nome || m.nome).trim() : String(d.profissional || '').trim();
  if (!nome) throw new Error('Escolha a pessoa do relatório.');
  var chave = semAcento(nome);
  sincronizarComissoesAulas(de, ate);
  var todas = lerAba('Comissoes').filter(function (c) { return c.id && c.status !== 'cancelada' && semAcento(c.profissional) === chave; });
  var doMes = todas.filter(function (c) { var dt = dataTexto(c.data); return dt >= de && dt <= ate; });
  var anteriores = todas.filter(function (c) { return c.status === 'a_pagar' && dataTexto(c.data) < de; });
  var atend = {};
  lerAba('Atendimentos').forEach(function (a) {
    if (a.id && semAcento(a.profissional) === chave && dataTexto(a.data) >= de && dataTexto(a.data) <= ate) atend[String(a.id)] = a;
  });
  // atendimentos do mês que não geram comissão (cancelado, falta) também entram na contagem
  var atendLista = Object.keys(atend).map(function (k) { return atend[k]; });
  var linha = function (c) {
    var pago = c.status === 'pago';
    return { data: dataTexto(c.data), item: String(c.item), base: dinheiro(c.base), pct: numero(c.pct), valor: dinheiro(c.valor), pago: pago, pagoEm: pago ? String(c.pago_em || '').slice(0, 10) : '', origem: String(c.origem) };
  };
  var atendimentos = [], aulas = [], outras = [];
  doMes.forEach(function (c) {
    var l = linha(c);
    if (c.origem === 'atendimento') {
      var a = atend[String(c.ref)];
      l.hora = a ? horaTexto(a.hora) : '';
      l.cliente = a ? String(a.nome) : '';
      l.servico = a ? String(a.servico) : l.item;
      l.obs = a && a.titular ? 'no lugar de ' + a.titular : '';
      atendimentos.push(l);
    } else if (c.origem === 'aula' || c.origem === 'aula_fixa') aulas.push(l);
    else outras.push(l);
  });
  var porData = function (x, y) { return x.data.localeCompare(y.data) || String(x.hora || x.item).localeCompare(String(y.hora || y.item)); };
  atendimentos.sort(porData); aulas.sort(porData); outras.sort(porData);
  var soma = function (lista, campo) { return dinheiro(lista.reduce(function (t, x) { return t + numero(x[campo]); }, 0)); };
  // como foi pago: cada pagamento de comissões virou uma despesa (data, forma)
  var despesas = {};
  lerAba('Despesas').forEach(function (x) { despesas[String(x.id)] = x; });
  var grupos = {};
  doMes.filter(function (c) { return c.status === 'pago'; }).forEach(function (c) {
    var k = String(c.despesa_id || c.pago_em);
    var ds = despesas[String(c.despesa_id)];
    grupos[k] = grupos[k] || { data: String(c.pago_em || '').slice(0, 10), forma: ds ? String(ds.forma || '') : '', valor: 0, qtd: 0 };
    grupos[k].valor = dinheiro(grupos[k].valor + numero(c.valor));
    grupos[k].qtd++;
  });
  var todasLinhas = doMes.map(linha);
  return {
    mes: mes, liquida: AJUSTES.comissaoLiquida !== false, profissional: nome, geradoEm: agoraTexto(), geradoPor: String(m.nome || m.email || ''),
    resumo: {
      atendimentos: atendLista.filter(function (a) { return a.status === 'atendido'; }).length,
      agendados: atendLista.filter(function (a) { return a.status !== 'cancelado'; }).length,
      faltas: atendLista.filter(function (a) { return a.status === 'falta'; }).length,
      cancelados: atendLista.filter(function (a) { return a.status === 'cancelado'; }).length,
      aulasYoga: aulas.filter(function (x) { return x.origem === 'aula_fixa'; }).length,
      alunosPilates: aulas.filter(function (x) { return x.origem === 'aula'; }).length,
      baseAtendimentos: soma(atendimentos, 'base'),
      comissao: soma(todasLinhas, 'valor'),
      pago: soma(todasLinhas.filter(function (x) { return x.pago; }), 'valor'),
      aPagar: soma(todasLinhas.filter(function (x) { return !x.pago; }), 'valor'),
      anterioresAPagar: dinheiro(anteriores.reduce(function (t, c) { return t + numero(c.valor); }, 0)),
    },
    atendimentos: atendimentos, aulas: aulas, outras: outras,
    totais: { atendimentos: soma(atendimentos, 'valor'), aulas: soma(aulas, 'valor'), outras: soma(outras, 'valor') },
    pagamentos: Object.keys(grupos).map(function (k) { return grupos[k]; }).sort(function (x, y) { return x.data.localeCompare(y.data); }),
    anteriores: anteriores.map(linha).sort(porData),
  };
}

// ============================================================
//  DESPESAS E FINANCEIRO
// ============================================================
function despesaPublica(x) {
  return { id: String(x.id), data: dataTexto(x.data), descricao: String(x.descricao), categoria: String(x.categoria), valor: dinheiro(x.valor),
    forma: String(x.forma || ''), status: String(x.status), pagoEm: String(x.pago_em || '').slice(0, 10), recorrente: String(x.recorrente) === 'mensal',
    fornecedor: String(x.fornecedor || ''), obs: String(x.obs || ''), ref: String(x.ref || ''), automatica: /^rec:/.test(String(x.ref)) };
}

function criarDespesa(x, m) {
  var linha = { id: novoId('D'), data: dataValida(x.data, hojeTexto()), descricao: String(x.descricao || '').slice(0, 200),
    categoria: CATEGORIAS_DESPESA.indexOf(x.categoria) >= 0 ? x.categoria : 'Outros', valor: dinheiro(x.valor), forma: String(x.forma || ''),
    status: x.status === 'a_pagar' ? 'a_pagar' : 'pago', pago_em: x.status === 'a_pagar' ? '' : dataValida(x.pagoEm, dataValida(x.data, hojeTexto())),
    recorrente: x.recorrente ? 'mensal' : '', fornecedor: String(x.fornecedor || '').slice(0, 100), obs: String(x.obs || '').slice(0, 300),
    ref: x.ref || '', criado_por: m ? m.email : 'sistema', criado_em: agoraTexto() };
  adicionarLinha('Despesas', linha);
  return linha;
}

// despesas fixas (recorrentes) aparecem sozinhas em cada mês, como "a pagar"
function gerarRecorrentes(mes) {
  if (mes > somarDias(hojeTexto(), 40).slice(0, 7)) return;
  var todas = lerAba('Despesas');
  var novas = [];
  todas.filter(function (x) { return x.id && String(x.recorrente) === 'mensal' && x.status !== 'cancelada' && dataTexto(x.data).slice(0, 7) < mes; })
    .forEach(function (orig) {
      var tem = todas.some(function (y) { return (String(y.id) === String(orig.id) || String(y.ref) === 'rec:' + orig.id) && dataTexto(y.data).slice(0, 7) === mes; });
      if (tem) return;
      var dia = Math.min(Number(dataTexto(orig.data).slice(8, 10)), diasNoMes(mes));
      novas.push({ id: novoId('D') + novas.length, data: mes + '-' + ('0' + dia).slice(-2), descricao: orig.descricao, categoria: orig.categoria,
        valor: numero(orig.valor), forma: orig.forma, status: 'a_pagar', pago_em: '', recorrente: '', fornecedor: orig.fornecedor, obs: orig.obs,
        ref: 'rec:' + orig.id, criado_por: 'automático', criado_em: agoraTexto() });
    });
  if (novas.length) adicionarLinhas('Despesas', novas);
}

function bancada_despesas(d) {
  var mes = mesValido(d.mes);
  gerarRecorrentes(mes);
  var todas = lerAba('Despesas').filter(function (x) { return x.id && x.status !== 'cancelada'; }).map(despesaPublica);
  var doMes = todas.filter(function (x) { return x.data.slice(0, 7) === mes; }).sort(function (a, b) { return a.data.localeCompare(b.data); });
  var atrasadas = todas.filter(function (x) { return x.status === 'a_pagar' && x.data.slice(0, 7) < mes; });
  return { mes: mes, lista: doMes, atrasadas: atrasadas, categorias: CATEGORIAS_DESPESA, metodos: METODOS_PAGAMENTO.slice(0, 5),
    total: dinheiro(doMes.reduce(function (s, x) { return s + x.valor; }, 0)),
    pago: dinheiro(doMes.filter(function (x) { return x.status === 'pago'; }).reduce(function (s, x) { return s + x.valor; }, 0)) };
}

function bancada_salvarDespesa(d, m) {
  var x = d.despesa || {};
  if (String(x.descricao || '').trim().length < 2) throw new Error('Descreva a despesa.');
  if (!(numero(x.valor) > 0)) throw new Error('Informe o valor.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.data))) throw new Error('Informe a data (vencimento).');
  if (x.id) {
    var ex = lerAba('Despesas').filter(function (y) { return String(y.id) === String(x.id); })[0];
    if (!ex) throw new Error('Despesa não encontrada.');
    var pago = x.status === 'pago';
    atualizarLinha('Despesas', ex._linha, { data: x.data, descricao: String(x.descricao).trim().slice(0, 200),
      categoria: CATEGORIAS_DESPESA.indexOf(x.categoria) >= 0 ? x.categoria : 'Outros', valor: dinheiro(x.valor), forma: String(x.forma || ''),
      // mudou a data de uma despesa já paga: o dia do pagamento acompanha (senão segue somando no mês antigo do Financeiro)
      status: pago ? 'pago' : 'a_pagar', pago_em: pago ? (ex.pago_em && dataTexto(ex.data) === x.data ? dataTexto(ex.pago_em) : dataValida(x.pagoEm, x.data <= hojeTexto() ? x.data : hojeTexto())) : '',
      recorrente: x.recorrente ? 'mensal' : '', fornecedor: String(x.fornecedor || '').slice(0, 100), obs: String(x.obs || '').slice(0, 300) });
    registrar(m, 'editou despesa', x.descricao + ' · ' + brl(x.valor));
  } else {
    criarDespesa({ data: x.data, descricao: String(x.descricao).trim(), categoria: x.categoria, valor: x.valor, forma: x.forma, status: x.status,
      pagoEm: x.pagoEm, recorrente: x.recorrente, fornecedor: x.fornecedor, obs: x.obs }, m);
    registrar(m, 'lançou despesa', x.descricao + ' · ' + brl(x.valor));
  }
  return bancada_despesas({ mes: x.data.slice(0, 7) });
}

function bancada_pagarDespesa(d, m) {
  var ex = lerAba('Despesas').filter(function (y) { return String(y.id) === String(d.id); })[0];
  if (!ex) throw new Error('Despesa não encontrada.');
  atualizarLinha('Despesas', ex._linha, { status: 'pago', pago_em: dataValida(d.data, hojeTexto()), forma: d.forma || ex.forma || '' });
  registrar(m, 'pagou despesa', ex.descricao + ' · ' + brl(ex.valor));
  return bancada_despesas({ mes: d.mes || dataTexto(ex.data).slice(0, 7) });
}

function bancada_excluirDespesa(d, m) {
  var ex = lerAba('Despesas').filter(function (y) { return String(y.id) === String(d.id); })[0];
  if (!ex) throw new Error('Despesa não encontrada.');
  // saiu da gaveta: apagar aqui deixaria o caixa do dia desencontrado
  if (String(ex.ref) === 'caixa') throw new Error('Esta despesa saiu do caixa do dia ' + dataTexto(ex.data).split('-').reverse().join('/') + '. Para corrigir, lance um suprimento de ' + brl(ex.valor) + ' nesse caixa.');
  atualizarLinha('Despesas', ex._linha, { status: 'cancelada', recorrente: '' });
  // pagamento de comissão desfeito: as comissões voltam para "a pagar"
  if (String(ex.ref) === 'comissao') {
    lerAba('Comissoes').filter(function (c) { return String(c.despesa_id) === String(ex.id); }).forEach(function (c) {
      atualizarLinha('Comissoes', c._linha, { status: 'a_pagar', pago_em: '', pago_por: '', despesa_id: '' });
    });
  }
  registrar(m, 'excluiu despesa', ex.descricao + ' · ' + brl(ex.valor));
  return bancada_despesas({ mes: d.mes || dataTexto(ex.data).slice(0, 7) });
}

// ---------- pagamento dividido em mais de uma forma ----------
var FORMAS_DIVIDIDAS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay'];

// "1.200,50" e "99.90" (a tela manda como foi digitado)
function valorBR(v) {
  var t = String(v == null ? '' : v).trim();
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  return Number(t.replace(/[^\d.-]/g, '')) || 0;
}

// lista = [{ metodo, valor, parcelas, bandeira }]. Uma linha sem valor leva o que sobrar. A soma tem que fechar com o total.
// Devolve { formas (só se houver mais de uma), metodo ('Misto' se mais de uma), bandeira, parcelas }.
function normalizarFormas(lista, total, exigirBandeira) {
  var itens = (lista || []).map(function (x) {
    var metodo = FORMAS_DIVIDIDAS.indexOf(x && x.metodo) >= 0 ? x.metodo : '';
    if (!metodo) throw new Error('Escolha a forma de pagamento de cada parte (vale-presente e cortesia não entram na divisão).');
    var vazio = x.valor === '' || x.valor == null;
    var valor = vazio ? null : dinheiro(valorBR(x.valor));
    if (valor != null && (isNaN(valor) || valor <= 0)) throw new Error('Cada parte precisa ter um valor maior que zero.');
    var parcelas = metodo === 'Cartão de crédito' || metodo === 'Link InfinitePay' ? Math.min(Math.max(Math.round(Number(x.parcelas) || 1), 1), 12) : 1;
    return { metodo: metodo, valor: valor, parcelas: parcelas, bandeira: bandeiraDe(metodo, x.bandeira, !!exigirBandeira) };
  });
  if (!itens.length) throw new Error('Informe como foi pago.');
  var vazias = itens.filter(function (x) { return x.valor == null; });
  if (vazias.length > 1) throw new Error('Só uma parte pode ficar sem valor (ela leva o que sobrar).');
  var soma = dinheiro(itens.reduce(function (t, x) { return t + (x.valor || 0); }, 0));
  if (vazias.length) {
    var resto = dinheiro(total - soma);
    if (resto <= 0.009) throw new Error('As outras partes já cobrem o valor todo (' + brl(total) + ').');
    vazias[0].valor = resto;
    soma = dinheiro(total);
  }
  if (Math.abs(soma - dinheiro(total)) > 0.01) throw new Error('As formas somam ' + brl(soma) + ', mas o valor é ' + brl(total) + '.');
  var metodos = itens.map(function (x) { return x.metodo; }).filter(function (x, i, l) { return l.indexOf(x) === i; });
  var bandeiras = itens.map(function (x) { return x.bandeira; }).filter(function (x, i, l) { return x && l.indexOf(x) === i; }).join(' + ');
  var parcelas = Math.max.apply(null, itens.map(function (x) { return x.parcelas; }));
  var uma = itens.length === 1;
  return { formas: uma ? [] : itens, metodo: uma ? itens[0].metodo : 'Misto', bandeira: bandeiras, parcelas: parcelas };
}

// as partes de um pagamento dividido (null = uma forma só)
function partesDoPagamento(p) {
  var f = parseJson(p.formas, []);
  if (!Array.isArray(f) || f.length < 2) return null;
  return f.map(function (x) { return { metodo: String(x.metodo), bandeira: String(x.bandeira || ''), parcelas: Number(x.parcelas) || 1, valor: numero(x.valor) }; });
}

// "Pix R$ 100,00 + Dinheiro R$ 50,00"
function textoDivisao(partes) {
  return partes.map(function (x) { return x.metodo + (x.bandeira ? ' ' + x.bandeira : '') + (x.parcelas > 1 ? ' ' + x.parcelas + 'x' : '') + ' ' + brl(x.valor); }).join(' + ');
}

// formas de pagamento das vendas (comandas com pagamento dividido entram com cada forma)
function formasDasVendas(pags) {
  var r = {};
  var comandas = {};
  var soma = function (k, v) { r[k] = dinheiro((r[k] || 0) + v); };
  pags.forEach(function (p) {
    if (p.comanda) { comandas[String(p.comanda)] = 1; return; }
    var div = partesDoPagamento(p);
    if (div) { div.forEach(function (x) { soma(x.metodo, x.valor); }); return; }
    soma(String(p.metodo || 'não informado'), numero(p.valor));
  });
  if (Object.keys(comandas).length) {
    lerAba('Comandas').forEach(function (c) {
      if (!comandas[String(c.id)]) return;
      parseJson(c.pagamentos, []).forEach(function (x) { if (x.metodo !== 'Vale-presente') soma(x.metodo, numero(x.valor)); });
    });
  }
  return r;
}

// cada pedaço recebido: { metodo, bandeira, parcelas, valor } (comanda dividida conta cada forma)
function partesRecebidas(pags) {
  var partes = [];
  var comandas = {};
  pags.forEach(function (p) {
    if (p.comanda) { comandas[String(p.comanda)] = 1; return; }
    var div = partesDoPagamento(p);
    if (div) { div.forEach(function (x) { partes.push(x); }); return; }
    // pagamento pelo site (checkout da InfinitePay): cartão é cobrado como link
    var metodo = String(p.metodo || 'não informado');
    if (metodo === 'Cartão' && String(p.origem || 'site') !== 'balcão') metodo = 'Link InfinitePay';
    partes.push({ metodo: metodo, bandeira: String(p.bandeira || ''), parcelas: Number(p.parcelas) || 1, valor: numero(p.valor) });
  });
  if (Object.keys(comandas).length) {
    lerAba('Comandas').forEach(function (c) {
      if (!comandas[String(c.id)]) return;
      parseJson(c.pagamentos, []).forEach(function (x) {
        if (x.metodo !== 'Vale-presente') partes.push({ metodo: x.metodo, bandeira: String(x.bandeira || ''), parcelas: Number(x.parcelas) || 1, valor: numero(x.valor) });
      });
    });
  }
  return partes;
}

// grupo de bandeira da tabela de taxas: vm (Visa e Mastercard, também para as bandeiras sem linha própria), elo ou amex
function grupoDaBandeira(bandeira) {
  var b = semAcento(String(bandeira || ''));
  if (b.indexOf('elo') === 0) return 'elo';
  if (b.indexOf('american') === 0 || b.indexOf('amex') === 0) return 'amex';
  return 'vm';
}

// a taxa (%) de uma coluna de 12 parcelas; parcela sem taxa informada usa a última informada antes dela
function taxaDaColuna(col, parcelas) {
  var n = Math.max(1, Math.min(12, Number(parcelas) || 1));
  if (!col) return { pct: 0, falta: true };
  if (col[n - 1] != null) return { pct: numero(col[n - 1]), falta: false };
  for (var i = n - 2; i >= 0; i--) if (col[i] != null) return { pct: numero(col[i]), falta: n > 1 };
  return { pct: 0, falta: true };
}

// taxa (%) estimada da maquininha/link para um pedaço recebido (Ajustes → Taxas da maquininha); falta = a tabela não tem esse valor
function taxaPctDaParte(x) {
  var t = AJUSTES.taxas || {};
  var g = grupoDaBandeira(x.bandeira);
  if (x.metodo === 'Pix') return { pct: numero(t.pix), falta: false };
  if (x.metodo === 'Cartão de débito') {
    var d = t.debito && t.debito[g] != null ? t.debito[g] : (t.debito ? t.debito.vm : null);
    return d == null ? { pct: 0, falta: true } : { pct: numero(d), falta: false };
  }
  if (x.metodo === 'Link InfinitePay') return taxaDaColuna(t.link, x.parcelas);
  if (x.metodo === 'Cartão de crédito' || x.metodo === 'Cartão') {
    return taxaDaColuna(t.credito && t.credito[g], x.parcelas);
  }
  return { pct: 0, falta: false };
}

function taxaDaParte(x) { return dinheiro(numero(x.valor) * taxaPctDaParte(x).pct / 100); }

// ---- valor líquido (depois da taxa da maquininha) ----
// Fator (0 a 1) do que sobra de uma venda: 1 − taxas ÷ total pago (vale-presente e cortesia não têm taxa, mas contam no total).
function fatorDePartes(partes, totalPago) {
  if (AJUSTES.comissaoLiquida === false) return 1;
  var taxa = 0, bruto = 0;
  (partes || []).forEach(function (x) {
    bruto += numero(x.valor);
    if (x.metodo === 'Vale-presente' || x.metodo === 'Cortesia') return;
    taxa += numero(x.valor) * taxaPctDaParte(x).pct / 100;
  });
  var base = totalPago > 0 ? totalPago : bruto;
  return base > 0 ? Math.max(0, Math.min(1, 1 - taxa / base)) : 1;
}

// comanda sendo fechada agora (ainda não está gravada como fechada) → fator já calculado; `memo` evita reler a comanda para cada venda
var _fatoresComanda = {};
function fatorDaComanda(id, memo) {
  id = String(id);
  if (_fatoresComanda[id] != null) return _fatoresComanda[id];
  if (memo && memo[id] != null) return memo[id];
  var cm = lerAba('Comandas').filter(function (x) { return String(x.id) === id; })[0];
  var partes = cm ? parseJson(cm.pagamentos, []) : [];
  var f = fatorDePartes(partes, partes.reduce(function (s, x) { return s + numero(x.valor); }, 0));
  if (memo) memo[id] = f;
  return f;
}

// fator de uma linha de Pagamentos (venda do balcão, do site ou de comanda)
function fatorDoPagamento(p, memo) {
  if (!p || AJUSTES.comissaoLiquida === false) return 1;
  if (p.comanda) return fatorDaComanda(p.comanda, memo);
  return fatorDePartes(partesRecebidas([p]), numero(p.valor) + numero(p.vale_usado));
}

// taxa estimada e valor líquido de UMA venda (linha de Pagamentos): a taxa efetiva é a média das partes pagas no cartão/link/Pix da venda
// (venda de comanda: a média da comanda inteira; vale-presente e dinheiro não têm taxa). `memo` evita reler a comanda a cada linha.
function taxaDoPagamento(p, memo) {
  var valor = numero(p.valor);
  if (!p || p.status !== 'pago' || !(valor > 0)) return { taxa: 0, liquido: dinheiro(valor), taxaPct: 0 };
  var chave = p.comanda ? 'c' + p.comanda : '';
  var pct;
  if (chave && memo && memo[chave] != null) pct = memo[chave];
  else {
    var partes = partesRecebidas([p]);
    var bruto = 0, tx = 0;
    partes.forEach(function (x) { bruto += numero(x.valor); tx += numero(x.valor) * taxaPctDaParte(x).pct / 100; });
    pct = bruto > 0 ? tx / bruto * 100 : 0;
    if (chave && memo) memo[chave] = pct;
  }
  var taxa = dinheiro(valor * pct / 100);
  return { taxa: taxa, liquido: dinheiro(valor - taxa), taxaPct: Math.round(pct * 100) / 100 };
}

// ---- prazo de recebimento ----
// dias úteis (segunda a sexta; feriados não entram na conta) depois de uma data AAAA-MM-DD
function somarDiasUteis(dataISO, n) {
  var d = dataISO;
  for (var i = 0; i < n; i++) {
    d = somarDias(d, 1);
    var dow = new Date(d + 'T12:00:00Z').getUTCDay();
    while (dow === 0 || dow === 6) { d = somarDias(d, 1); dow = new Date(d + 'T12:00:00Z').getUTCDay(); }
  }
  return d;
}

// dia previsto para o dinheiro cair na conta (Pix e dinheiro: no dia)
function diaQueCai(x, dataVenda) {
  var t = AJUSTES.taxas || {};
  var k = x.metodo === 'Pix' ? 'pix' : x.metodo === 'Cartão de débito' ? 'debito' : x.metodo === 'Link InfinitePay' ? 'link' : x.metodo === 'Cartão de crédito' || x.metodo === 'Cartão' ? 'credito' : '';
  if (!k) return '';
  return somarDiasUteis(dataVenda, numero(t.prazos && t.prazos[k]));
}

var FORMAS_MAQUININHA = ['Pix', 'Cartão de débito', 'Cartão de crédito', 'Link InfinitePay'];

// o que ainda vai cair na conta (líquido, depois da taxa), por dia previsto: vendas dos últimos dias no Pix, cartão e link
function aCairNaConta(hoje) {
  var desde = somarDias(hoje, -15);
  var porDia = {};
  var comandas = {};
  lerAba('Pagamentos').forEach(function (p) {
    if (p.status !== 'pago') return;
    var dia = dataTexto(p.pago_em);
    if (!dia || dia < desde || dia > hoje) return;
    if (p.comanda) { if (comandas[String(p.comanda)]) return; comandas[String(p.comanda)] = 1; }
    partesRecebidas([p]).forEach(function (x) {
      var cai = diaQueCai(x, dia);
      if (!cai || cai < hoje) return;
      porDia[cai] = dinheiro((porDia[cai] || 0) + numero(x.valor) - taxaDaParte(x));
    });
  });
  return Object.keys(porDia).sort().map(function (d) { return { data: d, valor: porDia[d] }; });
}

// o que conferir com o extrato (maquininha, link e Pix): total por forma e por bandeira
function conferirPorForma(pags, data) {
  var r = {};
  FORMAS_MAQUININHA.forEach(function (f) { r[f] = { forma: f, valor: 0, taxa: 0, bandeiras: {} }; });
  partesRecebidas(pags).forEach(function (x) {
    var f = x.metodo === 'Cartão' ? 'Cartão de crédito' : x.metodo;
    if (!r[f]) return;
    r[f].valor = dinheiro(r[f].valor + x.valor);
    r[f].taxa = dinheiro(r[f].taxa + taxaDaParte({ metodo: f, bandeira: x.bandeira, parcelas: x.parcelas, valor: x.valor }));
    if (x.bandeira) r[f].bandeiras[x.bandeira] = dinheiro((r[f].bandeiras[x.bandeira] || 0) + x.valor);
  });
  return FORMAS_MAQUININHA.map(function (f) {
    var b = r[f].bandeiras;
    return { forma: f, valor: r[f].valor, taxa: r[f].taxa, liquido: dinheiro(r[f].valor - r[f].taxa), cai: data ? diaQueCai({ metodo: f }, data) : '', bandeiras: Object.keys(b).map(function (k) { return { nome: k, valor: b[k] }; }).sort(function (x, y) { return y.valor - x.valor; }) };
  });
}

function grupoDoPagamento(p, itens) {
  if (String(p.tipo_item) === 'produto') return 'Produtos';
  if (String(p.tipo_item) === 'vale') return 'Vales-presente';
  var it = itens[String(p.plano_id)];
  if (!it) return 'Outros';
  return String(it.modalidade) === 'Serviço' ? String(it.categoria || 'Serviços') : String(it.modalidade);
}

function mapaItensVenda() {
  var itens = {};
  listarPlanos().forEach(function (p) { itens[p.id] = p; });
  listarServicos(true).concat(listarPacotes(true)).forEach(function (x) { var it = buscarItemVenda(x.id); if (it) itens[x.id] = it; });
  listarProdutos(true).forEach(function (p) { itens[p.id] = { id: p.id, modalidade: 'Produtos', categoria: 'Produtos', tipo: 'produto' }; });
  return itens;
}

function bancada_financeiro(d) {
  var mes = mesValido(d.mes);
  gerarRecorrentes(mes);
  var de = mes + '-01', ate = mes + '-' + diasNoMes(mes);
  sincronizarComissoesAulas(de, ate);
  var pAnt = somarDias(de, -1).slice(0, 7);
  var deAnt = pAnt + '-01', ateAnt = pAnt + '-' + diasNoMes(pAnt);
  var pagos = lerAba('Pagamentos').filter(function (p) { return p.status === 'pago' && numero(p.valor) > 0; });
  var dia = function (p) { return String(p.pago_em || p.criado_em).slice(0, 10); };
  var vendas = pagos.filter(function (p) { var x = dia(p); return x >= de && x <= ate; });
  var vendasAnt = pagos.filter(function (p) { var x = dia(p); return x >= deAnt && x <= ateAnt; });
  var despesas = lerAba('Despesas').filter(function (x) { return x.id && x.status !== 'cancelada'; }).map(despesaPublica);
  var pagoNo = function (x) { return x.pagoEm || x.data; };
  var saidas = despesas.filter(function (x) { return x.status === 'pago' && pagoNo(x) >= de && pagoNo(x) <= ate; });
  var saidasAnt = despesas.filter(function (x) { return x.status === 'pago' && pagoNo(x) >= deAnt && pagoNo(x) <= ateAnt; });
  var aPagar = despesas.filter(function (x) { return x.status === 'a_pagar' && x.data <= ate; });
  var comissoes = lerAba('Comissoes').filter(function (c) { return c.status === 'a_pagar'; });
  var itens = mapaItensVenda();
  var soma = function (l, f) { return dinheiro(l.reduce(function (s, x) { return s + f(x); }, 0)); };
  var entradas = soma(vendas, function (p) { return numero(p.valor); });
  var totalSaidas = soma(saidas, function (x) { return x.valor; });
  var porGrupo = {};
  vendas.forEach(function (p) { var g = grupoDoPagamento(p, itens); porGrupo[g] = dinheiro((porGrupo[g] || 0) + numero(p.valor)); });
  var porCategoria = {};
  saidas.forEach(function (x) { porCategoria[x.categoria] = dinheiro((porCategoria[x.categoria] || 0) + x.valor); });
  var lista = function (o) { return Object.keys(o).map(function (k) { return { nome: k, valor: o[k] }; }).sort(function (a, b) { return b.valor - a.valor; }); };
  var serie = [];
  for (var i = 0; i < diasNoMes(mes); i++) {
    var k = somarDias(de, i);
    serie.push({ chave: k, entradas: soma(vendas.filter(function (p) { return dia(p) === k; }), function (p) { return numero(p.valor); }),
      saidas: soma(saidas.filter(function (x) { return pagoNo(x) === k; }), function (x) { return x.valor; }) });
  }
  // taxas estimadas da maquininha e do link (Ajustes → Taxas da maquininha), por forma e por bandeira
  var taxasPorForma = {};
  var taxasPorBandeira = {};
  var taxas = 0;
  var semTaxa = 0;
  partesRecebidas(vendas).forEach(function (x) {
    var r = taxaPctDaParte(x);
    if (r.falta && x.metodo !== 'Pix') semTaxa++;
    var t = dinheiro(numero(x.valor) * r.pct / 100);
    if (!t) return;
    taxas = dinheiro(taxas + t);
    taxasPorForma[x.metodo] = dinheiro((taxasPorForma[x.metodo] || 0) + t);
    var rotulo = (x.metodo === 'Link InfinitePay' ? 'Link' : x.metodo === 'Cartão de débito' ? 'Débito' : 'Crédito') + (x.bandeira ? ' ' + x.bandeira : '');
    taxasPorBandeira[rotulo] = dinheiro((taxasPorBandeira[rotulo] || 0) + t);
  });
  var taxasConfiguradas = true;
  return {
    taxas: taxas, taxasPorForma: lista(taxasPorForma), taxasPorBandeira: lista(taxasPorBandeira), semTaxa: semTaxa, aCair: aCairNaConta(hojeTexto()), taxasConfiguradas: taxasConfiguradas, liquido: dinheiro(entradas - taxas - totalSaidas),
    mes: mes, entradas: entradas, saidas: totalSaidas, resultado: dinheiro(entradas - totalSaidas),
    entradasAnterior: soma(vendasAnt, function (p) { return numero(p.valor); }), saidasAnterior: soma(saidasAnt, function (x) { return x.valor; }),
    aPagar: soma(aPagar, function (x) { return x.valor; }), aPagarQtd: aPagar.length,
    comissoesAPagar: soma(comissoes, function (c) { return numero(c.valor); }),
    porForma: lista(formasDasVendas(vendas)), porGrupo: lista(porGrupo), porCategoria: lista(porCategoria), serie: serie,
    vencendo: aPagar.filter(function (x) { return x.data <= somarDias(hojeTexto(), 7); }).sort(function (a, b) { return a.data.localeCompare(b.data); }),
  };
}

// ============================================================
//  CAIXA DO DIA (abrir, sangria/suprimento, fechar com contagem)
// ============================================================
function caixaDoDia(data) {
  return lerAba('Caixa').filter(function (c) { return dataTexto(c.data) === data; })[0] || null;
}

function resumoCaixa(data) {
  var memoTaxas = {};
  var c = caixaDoDia(data);
  var movs = c ? parseJson(c.movimentos, []) : [];
  var pags = lerAba('Pagamentos').filter(function (p) { return p.status === 'pago' && String(p.pago_em).slice(0, 10) === data && numero(p.valor) > 0; });
  var formas = formasDasVendas(pags);
  var abertura = c ? dinheiro(c.abertura) : 0;
  var tot = function (t) { return dinheiro(movs.filter(function (x) { return x.tipo === t; }).reduce(function (s, x) { return s + numero(x.valor); }, 0)); };
  var dinheiroVendas = formas['Dinheiro'] || 0;
  var esperado = dinheiro(abertura + dinheiroVendas + tot('suprimento') - tot('sangria') - tot('despesa'));
  // caixa já fechado: vale o esperado da hora do fechamento; o dinheiro que entrou depois aparece à parte
  var depois = 0;
  if (c && String(c.status) === 'fechado' && c.esperado !== '' && c.esperado != null) {
    depois = dinheiro(esperado - numero(c.esperado));
    esperado = dinheiro(c.esperado);
  }
  return {
    depoisDoFechamento: depois,
    data: data, status: c ? String(c.status) : 'nao_aberto', abertura: abertura, abertoPor: c ? String(c.aberto_por || '').split('@')[0] : '',
    abertoEm: c ? String(c.aberto_em || '') : '', movimentos: movs, porForma: Object.keys(formas).map(function (k) { return { nome: k, valor: formas[k] }; }),
    vendas: dinheiro(pags.reduce(function (s, p) { return s + numero(p.valor); }, 0)), qtdVendas: pags.length,
    dinheiroVendas: dinheiroVendas, suprimentos: tot('suprimento'), sangrias: tot('sangria'), despesas: tot('despesa'), esperado: esperado,
    contado: c && c.contado !== '' ? dinheiro(c.contado) : null, diferenca: c && c.diferenca !== '' ? dinheiro(c.diferenca) : null,
    fechadoPor: c ? String(c.fechado_por || '').split('@')[0] : '', fechadoEm: c ? String(c.fechado_em || '') : '', obs: c ? String(c.obs || '') : '',
    // conferir com o extrato da maquininha: o sistema por forma/bandeira e o que foi informado ao fechar
    conferir: conferirPorForma(pags, data), conferencia: c ? parseJson(c.conferencia, []) : [],
    // cada venda do dia: de quem, o quê, como pagou e quem registrou
    lancamentos: pags.slice().sort(function (a, b) { return String(a.pago_em).localeCompare(String(b.pago_em)); }).map(function (p) {
      var obs = String(p.observacao || '');
      var tl = taxaDoPagamento(p, memoTaxas);
      return { taxa: tl.taxa, liquido: tl.liquido, hora: String(p.pago_em).slice(11, 16), nome: String(p.nome || ''), item: String(p.descricao || ''), metodo: String(p.metodo || ''),
        bandeira: String(p.bandeira || ''), parcelas: Number(p.parcelas) || 1, valor: dinheiro(p.valor), origem: String(p.origem || ''),
        comanda: String(p.comanda || ''), por: String(p.registrado_por || '').split('@')[0],
        // comanda paga de mais de um jeito: "Pix R$ 100 + Dinheiro R$ 50"
        divisao: partesDoPagamento(p) ? textoDivisao(partesDoPagamento(p)).slice(0, 160) : p.metodo === 'Misto' && obs.indexOf(' · ') > 0 ? obs.split(' · ').slice(1).join(' · ').slice(0, 160) : '' };
    }),
  };
}

function bancada_caixa(d, m) {
  var data = dataValida(d.data, hojeTexto());
  var r = resumoCaixa(data);
  // taxa e líquido da maquininha são da administração
  if (m.papel !== 'admin') {
    r.conferir = (r.conferir || []).map(function (f) { return { forma: f.forma, valor: f.valor, bandeiras: f.bandeiras }; });
    r.lancamentos = (r.lancamentos || []).map(function (l) { var c = Object.assign({}, l); delete c.taxa; delete c.liquido; return c; });
  }
  if (m.papel === 'admin') {
    // os 10 dias mais recentes (um caixa aberto depois para uma data antiga não empurra os recentes)
    r.anteriores = lerAba('Caixa').filter(function (c) { return dataTexto(c.data) < data; })
      .sort(function (a, b) { return dataTexto(a.data).localeCompare(dataTexto(b.data)); }).slice(-10).reverse().map(function (c) {
      return { data: dataTexto(c.data), status: String(c.status), esperado: dinheiro(c.esperado), contado: c.contado === '' ? null : dinheiro(c.contado),
        diferenca: c.diferenca === '' ? null : dinheiro(c.diferenca), fechadoPor: String(c.fechado_por || '').split('@')[0] };
    });
  }
  r.categorias = CATEGORIAS_DESPESA;
  return r;
}

// dia do caixa: a recepção mexe só no de hoje; a administração (diretoria) também nos dias que passaram
function diaDoCaixa(d, m) {
  var hoje = hojeTexto();
  var data = dataValida(d.data, hoje);
  if (data > hoje) throw new Error('Não dá para mexer no caixa de um dia que ainda não chegou.');
  if (data < hoje && m.papel !== 'admin') throw new Error('Só a administração mexe no caixa de dias anteriores.');
  return data;
}

function bancada_abrirCaixa(d, m) {
  var data = diaDoCaixa(d, m);
  var retro = data < hojeTexto();
  if (caixaDoDia(data)) throw new Error('O caixa ' + (retro ? 'de ' + data.split('-').reverse().join('/') : 'de hoje') + ' já foi aberto.');
  var valor = dinheiro(d.valor);
  if (valor < 0) throw new Error('Valor inválido.');
  adicionarLinha('Caixa', { data: data, status: 'aberto', abertura: valor, aberto_por: m.email, aberto_em: agoraTexto(), movimentos: '[]',
    obs: retro ? 'Aberto depois, em ' + agoraTexto() + ', por ' + m.email.split('@')[0] : '' });
  registrar(m, retro ? 'abriu caixa retroativo' : 'abriu o caixa', (retro ? data + ' · ' : '') + brl(valor));
  return bancada_caixa({ data: data }, m);
}

// tipo: sangria (retirada) · suprimento (troco que entrou) · despesa (pago em dinheiro do caixa)
function bancada_movimentoCaixa(d, m) {
  var data = diaDoCaixa(d, m);
  var c = caixaDoDia(data);
  if (!c || c.status !== 'aberto') throw new Error('Abra o caixa primeiro.');
  var tipo = ['sangria', 'suprimento', 'despesa'].indexOf(d.tipo) >= 0 ? d.tipo : '';
  if (!tipo) throw new Error('Escolha o tipo.');
  var valor = dinheiro(d.valor);
  if (!(valor > 0)) throw new Error('Informe o valor.');
  var motivo = String(d.motivo || '').trim().slice(0, 150);
  if (!motivo) throw new Error('Diga o motivo.');
  var mov = { quando: agoraTexto(), tipo: tipo, valor: valor, motivo: motivo, quem: m.email.split('@')[0] };
  if (data < hojeTexto()) mov.retroativo = data;
  if (tipo === 'despesa') {
    var desp = criarDespesa({ data: data, descricao: motivo, categoria: d.categoria, valor: valor, forma: 'Dinheiro', status: 'pago', ref: 'caixa' }, m);
    mov.despesaId = desp.id;
  }
  var movs = parseJson(c.movimentos, []);
  movs.push(mov);
  atualizarLinha('Caixa', c._linha, { movimentos: JSON.stringify(movs) });
  registrar(m, 'caixa · ' + tipo, motivo + ' · ' + brl(valor));
  return bancada_caixa({ data: data }, m);
}

function bancada_fecharCaixa(d, m) {
  // a recepção pode fechar um caixa esquecido aberto; abrir e lançar em dia passado é só da administração
  var data = dataValida(d.data, hojeTexto());
  var c = caixaDoDia(data);
  if (!c || c.status !== 'aberto') throw new Error('O caixa deste dia não está aberto.');
  if (String(d.contado) === '' || numero(d.contado) < 0) throw new Error('Conte o dinheiro da gaveta e informe o valor.');
  var r = resumoCaixa(data);
  var contado = dinheiro(d.contado);
  // extrato da maquininha/link/Pix informado por forma (opcional): guarda o que bateu e o que não bateu
  var conf = [];
  var inf = d.conferencia || {};
  r.conferir.forEach(function (f) {
    if (inf[f.forma] == null || String(inf[f.forma]) === '' || isNaN(numero(inf[f.forma]))) return;
    var v = dinheiro(inf[f.forma]);
    conf.push({ forma: f.forma, sistema: f.valor, informado: v, diferenca: dinheiro(v - f.valor) });
  });
  atualizarLinha('Caixa', c._linha, { status: 'fechado', dinheiro_vendas: r.dinheiroVendas, esperado: r.esperado, contado: contado,
    diferenca: dinheiro(contado - r.esperado), fechado_por: m.email, fechado_em: agoraTexto(), obs: String(d.obs || '').slice(0, 300), conferencia: conf.length ? JSON.stringify(conf) : '' });
  var naoBateu = conf.filter(function (x) { return Math.abs(x.diferenca) > 0.009; });
  registrar(m, 'fechou o caixa', 'esperado ' + brl(r.esperado) + ' · contado ' + brl(contado) + (naoBateu.length ? ' · extrato diferente em ' + naoBateu.map(function (x) { return x.forma; }).join(', ') : ''));
  return bancada_caixa({ data: data }, m);
}

function bancada_reabrirCaixa(d, m) {
  var data = dataValida(d.data, hojeTexto());
  var c = caixaDoDia(data);
  if (!c) throw new Error('Caixa não encontrado.');
  atualizarLinha('Caixa', c._linha, { status: 'aberto', contado: '', diferenca: '', fechado_por: '', fechado_em: '', conferencia: '' });
  registrar(m, 'reabriu o caixa', data);
  return bancada_caixa({ data: data }, m);
}

// ============================================================
//  BLOQUEIO DE HORÁRIO POR PROFISSIONAL (folga, almoço, curso…)
// ============================================================
function folgaPublica(f) {
  return { id: String(f.id), profissional: String(f.profissional), data: dataTexto(f.data), inicio: horaTexto(f.inicio), fim: horaTexto(f.fim),
    motivo: String(f.motivo || ''), diaTodo: !horaTexto(f.inicio) || !horaTexto(f.fim) };
}

function folgasDoDia(data, profissional) {
  return lerAba('Folgas').filter(function (f) {
    return f.id && dataTexto(f.data) === data && (!profissional || semAcento(f.profissional) === semAcento(profissional));
  }).map(folgaPublica);
}

// intervalo [início, fim] em minutos (dia todo = 0 a 24h)
function intervaloFolga(f) {
  return f.diaTodo ? [0, 24 * 60] : [minutos(f.inicio), minutos(f.fim)];
}

function bancada_folgas(d, m) {
  var de = dataValida(d.de, hojeTexto());
  var ate = somarDias(de, Math.min(Math.max(Number(d.dias) || 1, 1), 62) - 1);
  return lerAba('Folgas').filter(function (f) {
    var dt = dataTexto(f.data);
    return f.id && dt >= de && dt <= ate && (m.papel !== 'professora' || mesmaProfessora(f.profissional, m));
  }).map(folgaPublica).sort(function (a, b) { return (a.data + a.inicio).localeCompare(b.data + b.inicio); });
}

function bancada_salvarFolga(d, m) {
  var prof = String(d.profissional || '').trim();
  if (!profissionalPorNome(prof)) throw new Error('Escolha a profissional.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.data))) throw new Error('Escolha o dia.');
  var ini = d.diaTodo ? '' : String(d.inicio || '');
  var fim = d.diaTodo ? '' : String(d.fim || '');
  if (!d.diaTodo) {
    if (!/^\d{2}:\d{2}$/.test(ini) || !/^\d{2}:\d{2}$/.test(fim)) throw new Error('Informe o horário de início e fim.');
    if (minutos(fim) <= minutos(ini)) throw new Error('O fim precisa ser depois do início.');
  }
  var semanas = Math.min(Math.max(Number(d.repetirSemanas) || 0, 0), 26);
  var motivo = String(d.motivo || '').trim().slice(0, 120) || 'Horário bloqueado';
  var novas = [];
  var conflitos = [];
  for (var s = 0; s <= semanas; s++) {
    var dia = somarDias(d.data, s * 7);
    novas.push({ id: novoId('F') + s, profissional: prof, data: dia, inicio: ini, fim: fim, motivo: motivo, criado_por: m.email, criado_em: agoraTexto() });
    var faixa = d.diaTodo ? [0, 24 * 60] : [minutos(ini), minutos(fim)];
    atendimentosDoDia(dia).forEach(function (a) {
      if (semAcento(a.profissional) !== semAcento(prof)) return;
      var a0 = minutos(horaTexto(a.hora)), a1 = a0 + (numero(a.duracao_min) || 60);
      if (a0 < faixa[1] && faixa[0] < a1) conflitos.push(dia.split('-').reverse().join('/') + ' ' + horaTexto(a.hora) + ' · ' + a.nome);
    });
  }
  adicionarLinhas('Folgas', novas);
  registrar(m, 'bloqueou horário', prof + ' · ' + d.data + (d.diaTodo ? ' (dia todo)' : ' ' + ini + '–' + fim) + (semanas ? ' · ' + (semanas + 1) + ' semanas' : '') + ' · ' + motivo);
  return { criadas: novas.length, conflitos: conflitos };
}

function bancada_excluirFolga(d, m) {
  var f = lerAba('Folgas').filter(function (x) { return String(x.id) === String(d.id); })[0];
  if (!f) throw new Error('Bloqueio não encontrado.');
  aba('Folgas').deleteRow(f._linha);
  registrar(m, 'desbloqueou horário', f.profissional + ' · ' + dataTexto(f.data));
  return true;
}

// ============================================================
//  COMANDAS (a conta da visita: serviços + produtos + planos)
// ============================================================
function comandaPublica(c) {
  return { id: String(c.id), status: String(c.status), abertaEm: String(c.aberta_em || ''), fechadaEm: String(c.fechada_em || ''),
    cpf: c.cpf ? normCpf(c.cpf) : '', nome: String(c.nome || ''), whatsapp: String(c.whatsapp || ''), itens: parseJson(c.itens, []),
    subtotal: dinheiro(c.subtotal), desconto: dinheiro(c.desconto), total: dinheiro(c.total), pagamentos: parseJson(c.pagamentos, []),
    codigo: String(c.codigo || ''), obs: String(c.obs || ''), abertaPor: String(c.aberta_por || '').split('@')[0], fechadaPor: String(c.fechada_por || '').split('@')[0],
    historico: parseJson(c.historico, []), alertas: alertasDe(c.cpf) };
}

function acharComanda(id) {
  return lerAba('Comandas').filter(function (c) { return String(c.id) === String(id); })[0] || null;
}

// item do catálogo (plano, serviço, pacote ou produto) no formato do calcularPreco
function itemDoCatalogo(tipo, id) {
  if (tipo === 'produto') {
    var p = acharProduto(id);
    if (!p) return null;
    var pp = produtoPublico(p);
    return { id: pp.id, nome: pp.nome, preco: pp.preco, modalidade: 'Produtos', categoria: 'Produtos', tipo: 'produto', estoque: pp.estoque };
  }
  return buscarItemVenda(id);
}

// calcula preço de cada item (promoção, cupom/vale-aula e preço combinado no balcão)
function calcularItensComanda(itens, cpf, codigo) {
  var usado = false;
  var erroCodigo = '';
  var valeAulaUsado = false;
  var usoPacote = {}; // sessões de pacote já usadas por outros itens desta comanda
  // combo/pacote vendido nesta comanda: cobre a sessão do mesmo serviço lançada nela (a cliente paga só o pacote)
  var pacotesNaComanda = {};
  itens.forEach(function (x) {
    var t = String(x.tipo || '');
    if (t === 'vale' || t === 'produto') return;
    var c = itemDoCatalogo(t, x.id);
    if (!c || c.tipo !== 'pacote' || !c.servico_id) return;
    if (!x.uid) x.uid = novoId('I');
    (pacotesNaComanda[c.servico_id] = pacotesNaComanda[c.servico_id] || []).push({ uid: String(x.uid), nome: c.nome, restam: Number(c.aulas_total) || 0 });
  });
  var lista = itens.map(function (x, i) {
    var tipo = String(x.tipo || '');
    if (tipo === 'vale') return itemValeVendido(x);
    var cat = itemDoCatalogo(tipo, x.id);
    if (!cat) throw new Error('Item não encontrado no catálogo: ' + (x.nome || x.id) + '.');
    if (tipo !== 'produto') tipo = cat.tipo === 'servico' ? 'servico' : cat.tipo === 'pacote' ? 'pacote' : 'plano';
    var qtd = tipo === 'produto' ? Math.min(Math.max(Math.round(numero(x.qtd)) || 1, 1), 99) : 1;
    var data = dataValida(x.data, hojeTexto());
    // item ligado à agenda: "já pago" é decidido pelo atendimento (pago pela agenda, pacote ou cortesia), nunca pela tela
    var atend = x.atendimentoId ? lerAba('Atendimentos').filter(function (y) { return y.id === String(x.atendimentoId); })[0] : null;
    var pagoAntes = atend ? atend.pagamento !== 'no_dia' : false;
    var it = { uid: String(x.uid || '') || novoId('I'), tipo: tipo, id: String(cat.id), nome: cat.nome, qtd: qtd, preco: dinheiro(cat.preco),
      profissional: String(x.profissional || '').slice(0, 60), atendimentoId: atend ? String(atend.id) : '', data: data, pago: pagoAntes, promocao: '', cupom: '', vale: '',
      valeUsado: 0, obs: String(x.obs || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
    if (it.pago) { it.valor = 0; it.total = 0; it.desconto = 0; return it; }
    // serviço de quem tem pacote: pode usar uma sessão em vez de cobrar
    if (tipo === 'servico' && cpf) {
      var cred = creditoDeServico(cpf, cat.id, data);
      var restam = cred ? cred.restantes - (usoPacote[cred.id] || 0) : 0;
      if (cred && restam > 0) it.pacoteDisponivel = { id: String(cred.id), descricao: String(cred.descricao), restantes: restam, fim: String(cred.fim) };
      if (x.usarPacote) {
        if (!it.pacoteDisponivel) throw new Error((x.nome || cat.nome) + ': não há pacote com sessão disponível para usar.');
        usoPacote[cred.id] = (usoPacote[cred.id] || 0) + 1;
        it.usarPacote = true;
        it.pacote = String(cred.id);
        it.pacoteDescricao = String(cred.descricao);
        it.valor = 0; it.total = 0; it.desconto = 0;
        return it;
      }
    }
    if (tipo === 'servico') {
      var pc = (pacotesNaComanda[cat.id] || []).filter(function (p) { return p.restam > 0; })[0];
      if (pc && !x.semPacoteDaComanda) {
        pc.restam--;
        // o crédito do pacote nasce ao fechar a comanda; até lá o item guarda de qual linha ele vem
        it.pacoteDaComanda = pc.uid;
        it.pacote = 'comanda:' + pc.uid;
        it.pacoteDescricao = pc.nome + ' (vendido nesta comanda)';
        it.valor = 0; it.total = 0; it.desconto = 0;
        return it;
      }
      if (pc) it.pacoteDisponivel = { daComanda: true, descricao: pc.nome + ' (vendido nesta comanda)', restantes: pc.restam };
    }
    var calc;
    var cod = codigoLimpo(codigo);
    // vale em R$ não vai no campo do código (abatia por unidade e passava do saldo): entra no Receber, forma Vale-presente
    var valeEmReais = cod ? acharVale(cod) : null;
    if (valeEmReais && valeEmReais.tipo !== 'plano') {
      erroCodigo = 'Este vale é de R$ ' + numero(valeEmReais.valor).toFixed(2).replace('.', ',') + ': use na hora de receber (forma "Vale-presente").';
      cod = '';
    }
    if (cod && !(valeAulaUsado && /^AMBAR-/.test(cod))) {
      try {
        calc = calcularPreco(cat, cpf, cod, { data: data, canal: 'bancada' });
        if (calc.cupom || calc.vale) { usado = true; if (calc.vale) valeAulaUsado = true; }
      } catch (e) {
        erroCodigo = e.message;
        calc = calcularPreco(cat, cpf, '', { data: data, canal: 'bancada' });
      }
    } else {
      calc = calcularPreco(cat, cpf, '', { data: data, canal: 'bancada' });
    }
    var unit = calc.valorFinal;
    it.promocao = calc.promocao || '';
    it.cupom = calc.cupom || '';
    it.vale = calc.vale || '';
    it.valeUsado = calc.valeUsado || 0;
    if (x.valorManual != null && String(x.valorManual) !== '' && !isNaN(numero(x.valorManual))) {
      unit = Math.max(0, dinheiro(x.valorManual));
      it.valorManual = unit;
      it.promocao = ''; it.cupom = ''; it.vale = ''; it.valeUsado = 0;
    } else if ((x.descontoTipo === 'pct' || x.descontoTipo === 'valor') && numero(x.descontoValor) > 0) {
      // desconto do balcão por item, em % ou R$, por cima da promoção/cupom
      var dv = numero(x.descontoValor);
      if (x.descontoTipo === 'pct') dv = Math.min(dv, 100);
      unit = Math.max(0, dinheiro(x.descontoTipo === 'pct' ? unit * (1 - dv / 100) : unit - dv));
      it.descontoTipo = x.descontoTipo;
      it.descontoValor = dv;
    }
    if (it.valorManual != null || it.descontoTipo) it.motivoDesconto = String(x.motivoDesconto || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    it.valor = dinheiro(unit);
    it.total = dinheiro(unit * qtd);
    it.desconto = dinheiro((it.preco - unit) * qtd);
    void i;
    return it;
  });
  if (codigoLimpo(codigo) && !usado) throw erroCod(erroCodigo || 'Este código não vale para nenhum item da comanda.', 'CODIGO_INVALIDO');
  return lista;
}

// vale-presente VENDIDO na comanda (quem compra paga; o código nasce ao fechar e vai para quem recebe)
// x.vale = { tipo: 'valor' | 'plano', valor, planoId, nome, whatsapp, email, mensagem, validadeDias, enviarEmail, enviarWhats }
function itemValeVendido(x) {
  var v = x.vale || x.dadosVale || {};
  var tipo = v.tipo === 'plano' ? 'plano' : 'valor';
  var plano = tipo === 'plano' ? buscarItemVenda(v.planoId) : null;
  if (tipo === 'plano' && !plano) throw new Error('Escolha o serviço, a aula ou o plano do vale-presente.');
  var valor = plano ? dinheiro(plano.preco) : dinheiro(v.valor);
  if (!(valor >= 1 && valor <= 5000)) throw new Error('Informe o valor do vale-presente (de R$ 1 a R$ 5.000).');
  var email = String(v.email || '').trim().toLowerCase();
  if (email && !emailValido(email)) throw new Error('Confira o e-mail de quem vai receber o vale.');
  var dados = { tipo: tipo, valor: valor, planoId: plano ? plano.id : '', nome: String(v.nome || '').replace(/\s+/g, ' ').trim().slice(0, 80), whatsapp: soDigitos(v.whatsapp).slice(0, 13),
    email: email, mensagem: String(v.mensagem || '').trim().slice(0, 500), validadeDias: Math.min(Math.max(Number(v.validadeDias) || AJUSTES.valeValidadeDias, 30), 730),
    enviarEmail: !!v.enviarEmail, enviarWhats: !!v.enviarWhats && soDigitos(v.whatsapp).length >= 10 };
  return { uid: String(x.uid || '') || novoId('I'), tipo: 'vale', id: 'vale', nome: 'Vale-presente · ' + (plano ? plano.nome : brl(valor)) + (dados.nome ? ' para ' + primeiroNome(dados.nome) : ''),
    qtd: 1, preco: valor, valor: valor, total: valor, desconto: 0, profissional: '', atendimentoId: '', data: hojeTexto(), pago: false, promocao: '', cupom: '', vale: '',
    valeUsado: 0, obs: String(x.obs || '').trim().slice(0, 200), dadosVale: dados };
}

// texto do que mudou entre duas versões da comanda (para o histórico)
function diferencasComanda(antes, depois, existia) {
  var t = [];
  if (!existia) return depois.length ? ['abriu com ' + depois.map(function (i) { return i.nome; }).join(', ')] : ['abriu a comanda'];
  var porUid = {};
  antes.forEach(function (i, k) { porUid[i.uid || 'pos' + k] = i; });
  var vistos = {};
  depois.forEach(function (i, k) {
    var a = porUid[i.uid] || (!i.uid ? porUid['pos' + k] : null);
    if (!a) { t.push('incluiu ' + i.nome + ' (' + brl(i.total) + ')'); return; }
    vistos[a.uid || 'pos' + k] = 1;
    if (a.id !== i.id) t.push('trocou ' + a.nome + ' por ' + i.nome);
    if (String(a.profissional || '') !== String(i.profissional || '')) t.push(i.nome + ': ' + (a.profissional || 'sem profissional') + ' → ' + (i.profissional || 'sem profissional'));
    if (numero(a.total) !== numero(i.total)) t.push(i.nome + ': ' + brl(a.total) + ' → ' + brl(i.total) + (i.motivoDesconto ? ' · ' + i.motivoDesconto : ''));
    if (numero(a.qtd) !== numero(i.qtd)) t.push(i.nome + ': quantidade ' + a.qtd + ' → ' + i.qtd);
  });
  Object.keys(porUid).forEach(function (k) { if (!vistos[k]) t.push('tirou ' + porUid[k].nome); });
  return t;
}

function anotarComanda(c, quem, texto) {
  var hist = parseJson(c.historico, []);
  hist.push({ q: agoraTexto(), p: String(quem || '').split('@')[0], t: String(texto).slice(0, 300) });
  return JSON.stringify(hist.slice(-100));
}

function clienteDaComanda(x) {
  if (x.cpf) {
    var al = buscarAluno(x.cpf);
    if (!al) throw new Error('Cliente não encontrada.');
    return { cpf: normCpf(al.cpf), nome: al.nome, whatsapp: String(al.whatsapp || '') };
  }
  var c = x.cliente || {};
  var nome = String(c.nome || '').trim();
  var whats = soDigitos(c.whatsapp);
  if (nome && whats.length >= 10) {
    var nova = clienteSemCpf(nome, whats, '', 'comanda');
    return { cpf: normCpf(nova.cpf), nome: nova.nome, whatsapp: whats };
  }
  return { cpf: '', nome: nome || 'Cliente do balcão', whatsapp: whats };
}

function bancada_comandas(d) {
  var status = d.status === 'fechada' ? 'fechada' : 'aberta';
  var de = dataValida(d.de, hojeTexto()), ate = dataValida(d.ate, hojeTexto());
  return lerAba('Comandas').filter(function (c) {
    if (!c.id || c.status !== status) return false;
    if (status === 'fechada') { var dt = String(c.fechada_em).slice(0, 10); return dt >= de && dt <= ate; }
    return true;
  }).map(comandaPublica).reverse();
}

function bancada_comanda(d) {
  var c = acharComanda(d.id);
  if (!c) throw new Error('Comanda não encontrada.');
  return comandaPublica(c);
}

// agendamento da agenda que corresponde a um serviço lançado na comanda sem ligação com ele: mesma cliente e
// serviço, ainda não feito, de hoje em diante (o mais próximo; prefere a mesma profissional). Assim a comanda usa o
// horário marcado em vez de criar outro atendimento no dia e na hora em que a comanda foi fechada.
function agendamentoDoItem(cpf, servicoId, profissional, cmId, usados, soHoje) {
  if (!cpf) return null;
  var hoje = hojeTexto();
  var emOutra = {};
  lerAba('Comandas').forEach(function (c) {
    if (c.status === 'aberta' && String(c.id) !== String(cmId)) parseJson(c.itens, []).forEach(function (i) { if (i.atendimentoId) emOutra[i.atendimentoId] = 1; });
  });
  var lista = lerAba('Atendimentos').filter(function (a) {
    var dt = dataTexto(a.data);
    return a.id && a.cpf && normCpf(a.cpf) === normCpf(cpf) && String(a.servico_id) === String(servicoId) && (a.status === 'agendado' || a.status === 'confirmado') &&
      (soHoje ? dt === hoje : dt >= hoje) && !emOutra[a.id] && !usados[a.id] && (!a.comanda || String(a.comanda) === String(cmId));
  });
  lista.sort(function (x, y) {
    return (dataTexto(x.data) + horaTexto(x.hora)).localeCompare(dataTexto(y.data) + horaTexto(y.hora)) ||
      Number(semAcento(y.profissional) === semAcento(profissional)) - Number(semAcento(x.profissional) === semAcento(profissional));
  });
  return lista[0] || null;
}

// atendimento criado só para contar uma sessão de pacote usada na comanda, sem horário marcado: não aparece na grade da agenda
function soDaComanda(a) { return /^Feito na comanda/.test(String(a.obs || '')); }

function bancada_salvarComanda(d, m) {
  var x = d.comanda || {};
  var itens = (x.itens || []).slice(0, 40).map(function (i) {
    return { uid: i.uid, tipo: String(i.tipo || ''), id: String(i.tipo === 'vale' ? 'vale' : i.id || ''), nome: String(i.nome || ''), qtd: i.qtd, profissional: i.profissional,
      atendimentoId: i.atendimentoId, valorManual: i.valorManual, pago: !!i.pago, data: i.data, descontoTipo: i.descontoTipo, descontoValor: i.descontoValor,
      motivoDesconto: i.motivoDesconto, obs: i.obs, vale: i.tipo === 'vale' ? i.vale || i.dadosVale : undefined, usarPacote: !!i.usarPacote,
      semPacoteDaComanda: !!i.semPacoteDaComanda };
  }).filter(function (i) { return i.id; });
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var ex = x.id ? acharComanda(x.id) : null;
    if (x.id && !ex) throw new Error('Comanda não encontrada.');
    if (ex && ex.status !== 'aberta') throw new Error('Esta comanda já foi ' + (ex.status === 'fechada' ? 'fechada' : 'cancelada') + '.');
    var cli = ex && !x.cpf && !x.cliente ? { cpf: ex.cpf ? normCpf(ex.cpf) : '', nome: ex.nome, whatsapp: String(ex.whatsapp || '') } : clienteDaComanda(x);
    // serviço lançado à mão para quem tem horário hoje na agenda: liga ao horário marcado (não cria outro)
    if (cli.cpf) {
      var ligados = {};
      itens.forEach(function (i) { if (i.atendimentoId) ligados[i.atendimentoId] = 1; });
      itens.forEach(function (i) {
        if (i.tipo !== 'servico' || i.atendimentoId) return;
        var ag = agendamentoDoItem(cli.cpf, i.id, i.profissional, x.id || '', ligados, true);
        if (!ag) return;
        i.atendimentoId = String(ag.id);
        if (!i.profissional) i.profissional = String(ag.profissional);
        ligados[ag.id] = 1;
      });
    }
    var precisaCadastro = itens.some(function (i) { if (i.tipo === 'vale') return false; var it = itemDoCatalogo(i.tipo, i.id); return it && (it.tipo === 'pacote' || (i.tipo !== 'produto' && it.modalidade !== 'Serviço')); });
    if (precisaCadastro && !cli.cpf) throw new Error('Plano e pacote ficam na conta de quem compra: escolha alguém com cadastro (ou informe nome e WhatsApp).');
    var calc = calcularItensComanda(itens, cli.cpf, x.codigo);
    var subtotal = dinheiro(calc.reduce(function (s, i) { return s + (i.pago || i.pacote ? 0 : i.preco * i.qtd); }, 0));
    var total = dinheiro(calc.reduce(function (s, i) { return s + i.total; }, 0));
    var linha = { status: 'aberta', cpf: cli.cpf, nome: cli.nome, whatsapp: cli.whatsapp, itens: JSON.stringify(calc), subtotal: subtotal,
      desconto: dinheiro(subtotal - total), total: total, codigo: codigoLimpo(x.codigo), obs: String(x.obs || '').slice(0, 300) };
    // o atendimento da agenda acompanha a troca de serviço ou de profissional feita na comanda
    var mudancasAgenda = [];
    calc.forEach(function (i) {
      if (!i.atendimentoId || i.tipo !== 'servico') return;
      var a = lerAba('Atendimentos').filter(function (y) { return y.id === i.atendimentoId; })[0];
      if (!a) return;
      var mud = {};
      if (String(a.servico_id) !== i.id) {
        if (i.pago) throw new Error('"' + a.servico + '" já foi pago (pacote ou antes). Para trocar o serviço, tire o item e inclua o novo.');
        var sv = listarServicos(true).filter(function (s) { return s.id === i.id; })[0];
        mud.servico_id = i.id; mud.servico = i.nome; if (sv) mud.categoria = sv.categoria;
      }
      if (i.profissional && semAcento(i.profissional) !== semAcento(a.profissional)) mud.profissional = i.profissional;
      if (Object.keys(mud).length) { mud.atualizado_em = agoraTexto(); mudancasAgenda.push([a._linha, mud]); }
    });
    mudancasAgenda.forEach(function (x) { atualizarLinha('Atendimentos', x[0], x[1]); });
    var hist = ex ? parseJson(ex.historico, []) : [];
    diferencasComanda(ex ? parseJson(ex.itens, []) : [], calc, !!ex).forEach(function (t) { hist.push({ q: agoraTexto(), p: m.email.split('@')[0], t: t + (x.motivo ? ' (' + String(x.motivo).slice(0, 120) + ')' : '') }); });
    linha.historico = JSON.stringify(hist.slice(-100));
    var id;
    if (ex) {
      id = String(ex.id);
      atualizarLinha('Comandas', ex._linha, linha);
    } else {
      id = novoId('Q');
      linha.id = id;
      linha.aberta_em = agoraTexto();
      linha.aberta_por = m.email;
      adicionarLinha('Comandas', linha);
    }
    // atendimentos ligados a esta comanda
    calc.forEach(function (i) {
      if (!i.atendimentoId) return;
      var a = lerAba('Atendimentos').filter(function (y) { return y.id === i.atendimentoId; })[0];
      if (a && String(a.comanda || '') !== id) atualizarLinha('Atendimentos', a._linha, { comanda: id });
    });
    SpreadsheetApp.flush();
    return comandaPublica(acharComanda(id));
  } finally {
    soltarTrava(trava);
  }
}

// Abre (ou retoma) a comanda de um atendimento da agenda
function bancada_comandaDoAtendimento(d, m) {
  var a = lerAba('Atendimentos').filter(function (y) { return y.id === d.atendimentoId; })[0];
  if (!a) throw new Error('Atendimento não encontrado.');
  if (a.status === 'cancelado') throw new Error('Este atendimento foi cancelado.');
  var aberta = lerAba('Comandas').filter(function (c) { return c.status === 'aberta' && parseJson(c.itens, []).some(function (i) { return i.atendimentoId === a.id; }); })[0];
  if (aberta) return comandaPublica(aberta);
  // outra comanda aberta da mesma cliente hoje: junta
  var mesma = a.cpf ? lerAba('Comandas').filter(function (c) {
    return c.status === 'aberta' && c.cpf && normCpf(c.cpf) === normCpf(a.cpf) && String(c.aberta_em || '').slice(0, 10) === hojeTexto();
  })[0] : null;
  // itens deste atendimento: o serviço e, se foi escolhido no agendamento, o combo (a sessão sai dele)
  var itensDe = function (y) {
    var lista = [{ tipo: 'servico', id: String(y.servico_id), nome: y.servico, profissional: y.profissional, atendimentoId: y.id, data: dataTexto(y.data), pago: y.pagamento !== 'no_dia' }];
    var combo = y.combo && y.pagamento === 'no_dia' && y.cpf ? buscarItemVenda(y.combo) : null;
    if (combo && combo.tipo === 'pacote') lista.push({ tipo: 'pacote', id: combo.id, nome: combo.nome, qtd: 1 });
    return lista;
  };
  var novos = itensDe(a);
  // serviços marcados juntos com este (mesma visita, ainda a pagar e fora de comanda): vêm juntos para fechar tudo de uma vez
  // (dá para tirar o que não for cobrar agora). Só os do mesmo `grupo`: outro horário do mesmo dia não vem sozinho.
  if (a.cpf && a.grupo) {
    var emAberta = {};
    lerAba('Comandas').forEach(function (c) { if (c.status === 'aberta') parseJson(c.itens, []).forEach(function (i) { if (i.atendimentoId) emAberta[i.atendimentoId] = 1; }); });
    lerAba('Atendimentos').filter(function (y) {
      return y.id !== a.id && y.cpf && normCpf(y.cpf) === normCpf(a.cpf) && String(y.grupo) === String(a.grupo) && y.pagamento === 'no_dia'
        && ['agendado', 'confirmado', 'atendido'].indexOf(String(y.status)) >= 0 && !y.comanda && !emAberta[y.id];
    }).sort(function (x, y) { return String(horaTexto(x.hora)).localeCompare(String(horaTexto(y.hora))); }).forEach(function (y) { novos = novos.concat(itensDe(y)); });
  }
  if (mesma) {
    var cm = comandaPublica(mesma);
    return bancada_salvarComanda({ comanda: { id: cm.id, itens: cm.itens.concat(novos), codigo: cm.codigo, obs: cm.obs } }, m);
  }
  var cli = a.cpf ? { cpf: normCpf(a.cpf) } : { cliente: { nome: a.nome, whatsapp: a.whatsapp } };
  return bancada_salvarComanda({ comanda: Object.assign(cli, { itens: novos }) }, m);
}

// Comanda já fechada: corrige COMO foi pago (ex.: era tudo no Pix e foi metade no débito, metade no dinheiro), sem reabrir.
// O valor total pago em dinheiro/cartão/Pix não muda: só a divisão. A parte paga com vale-presente continua como está.
// d = { id, pagamentos: [{ metodo, valor, parcelas, bandeira }], motivo }. Recepção: só comanda fechada hoje, com o caixa de hoje aberto; administração: qualquer dia.
function bancada_corrigirFormasComanda(d, m) {
  var motivo = String(d.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (motivo.length < 3) throw new Error('Diga o motivo da correção.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var c = acharComanda(d.id);
    if (!c) throw new Error('Comanda não encontrada.');
    if (c.status !== 'fechada') throw new Error('Só dá para corrigir a forma de pagamento de uma comanda fechada.');
    var atuais = parseJson(c.pagamentos, []);
    var vales = atuais.filter(function (x) { return x.metodo === 'Vale-presente'; });
    var reais = atuais.filter(function (x) { return x.metodo !== 'Vale-presente'; });
    var dia = String(c.fechada_em || '').slice(0, 10);
    if (m.papel !== 'admin') {
      if (dia !== hojeTexto()) throw new Error('A recepção corrige só comandas fechadas hoje. Para as outras, peça à administração.');
      var cx = caixaDoDia(dia);
      if (cx && String(cx.status) === 'fechado') throw new Error('O caixa de hoje já foi fechado. Peça à administração para corrigir.');
    }
    var totalReais = dinheiro(reais.reduce(function (t, x) { return t + numero(x.valor); }, 0));
    if (totalReais <= 0.009) throw new Error('Esta comanda não teve pagamento em dinheiro, cartão ou Pix para corrigir.');
    var novas = (d.pagamentos || []).map(function (p) {
      var metodo = FORMAS_DIVIDIDAS.indexOf(p.metodo) >= 0 ? p.metodo : '';
      if (!metodo) throw new Error('Forma de pagamento inválida (vale-presente não entra aqui).');
      return { metodo: metodo, valor: dinheiro(p.valor), parcelas: metodo === 'Cartão de crédito' || metodo === 'Link InfinitePay' ? Math.min(Math.max(Number(p.parcelas) || 1, 1), 12) : 1,
        codigo: '', bandeira: bandeiraDe(metodo, p.bandeira, true) };
    }).filter(function (p) { return p.valor > 0; });
    if (!novas.length) throw new Error('Informe como foi pago.');
    var soma = dinheiro(novas.reduce(function (t, x) { return t + x.valor; }, 0));
    if (Math.abs(soma - totalReais) > 0.01) throw new Error('As formas somam ' + brl(soma) + ', mas foram pagos ' + brl(totalReais) + ' (sem contar o vale-presente).');
    var metodos = novas.map(function (x) { return x.metodo; }).filter(function (x, i, l) { return l.indexOf(x) === i; });
    var metodo = metodos.length === 1 ? metodos[0] : 'Misto';
    var parcelas = Math.max.apply(null, [1].concat(novas.map(function (x) { return x.parcelas; })));
    var bandeiras = novas.map(function (x) { return x.bandeira; }).filter(function (x, i, l) { return x && l.indexOf(x) === i; }).join(' + ');
    var todas = vales.concat(novas);
    var antes = textoDivisao(reais.map(function (x) { return { metodo: x.metodo, bandeira: String(x.bandeira || ''), parcelas: Number(x.parcelas) || 1, valor: numero(x.valor) }; }));
    var obsPag = 'Comanda ' + c.id + (todas.length > 1 ? ' · ' + todas.map(function (p) { return p.metodo + (p.bandeira ? ' ' + p.bandeira : '') + ' ' + brl(p.valor); }).join(' + ') : '')
      + ' · Corrigido em ' + agoraTexto() + ' por ' + m.email + ' (antes: ' + antes + '): ' + motivo;
    lerAba('Pagamentos').filter(function (p) { return String(p.comanda) === String(c.id) && p.status === 'pago'; }).forEach(function (p) {
      atualizarLinha('Pagamentos', p._linha, { metodo: metodo, parcelas: parcelas, bandeira: bandeiras, observacao: obsPag.slice(0, 500) });
    });
    atualizarLinha('Comandas', c._linha, { pagamentos: JSON.stringify(todas),
      historico: anotarComanda(c, m.email, 'corrigiu a forma de pagamento: ' + antes + ' → ' + textoDivisao(novas) + ' (' + motivo + ')') });
    registrar(m, 'corrigiu forma de pagamento da comanda', c.nome + ' · ' + c.id + ' · ' + antes + ' → ' + textoDivisao(novas) + ' · ' + motivo);
  } finally {
    soltarTrava(trava);
  }
  return comandaPublica(acharComanda(d.id));
}

function bancada_cancelarComanda(d, m) {
  var c = acharComanda(d.id);
  if (!c) throw new Error('Comanda não encontrada.');
  if (c.status !== 'aberta') throw new Error('Só comandas abertas podem ser canceladas.');
  atualizarLinha('Comandas', c._linha, { status: 'cancelada', fechada_em: agoraTexto(), fechada_por: m.email,
    historico: anotarComanda(c, m.email, 'cancelou' + (d.motivo ? ': ' + String(d.motivo).slice(0, 120) : '')) });
  registrar(m, 'cancelou comanda', c.nome + ' · ' + c.id);
  return true;
}

// Desfaz o que o fechamento de uma comanda gravou (usado por "Reabrir para corrigir" e quando um fechamento é interrompido por falha):
// pagamentos estornados ou excluídos, créditos e vales vendidos desativados, vale usado volta a valer, estoque devolvido (só o que saiu),
// comissões canceladas. Recusa quando algo já foi usado ou pago depois. Devolve os itens da comanda prontos para voltar ao estado aberto.
// limpeza = true: sobra de um fechamento que não terminou (a comanda nunca chegou a ficar fechada).
function desfazerEfeitosDaComanda(cm, pags, obs, quem, limpeza) {
  // o que impede: plano/pacote já usado, vale vendido já usado, comissão já paga
  var creditos = pags.map(function (p) { return 'C' + String(p.order_nsu).slice(1); });
  var reservas = lerAba('Reservas').filter(function (r) { return r.status !== 'cancelado' && creditos.indexOf(String(r.credito_id)) >= 0; });
  // fechamento interrompido: a aula avulsa ligada ao crédito que vai sumir volta a ficar "a pagar"
  if (reservas.length && limpeza) reservas.forEach(function (r) { atualizarLinha('Reservas', r._linha, { credito_id: A_PAGAR }); });
  else if (reservas.length) throw new Error('Um plano desta comanda já foi usado em aula (' + reservas.length + '). Corrija com estorno em Vendas.');
  var usados = lerAba('Atendimentos').filter(function (a) { return a.status !== 'cancelado' && creditos.indexOf(String(a.credito_id)) >= 0 && String(a.comanda) !== cm.id; });
  if (usados.length) throw new Error('Um pacote desta comanda já foi usado em outro atendimento. Corrija com estorno em Vendas.');
  // (vale cancelado numa reabertura anterior não conta: um novo nasceu ao fechar de novo)
  var valesVendidos = lerAba('Vales').filter(function (v) { return String(v.comanda) === cm.id && String(v.origem) === 'vendido' && v.status !== 'cancelado'; });
  var pagosAgora = pagamentosPagos();
  valesVendidos.forEach(function (v) {
    if (v.status !== 'ativo' || (v.tipo !== 'plano' && saldoVale(v, pagosAgora) + 0.009 < numero(v.valor))) throw new Error('O vale ' + v.codigo + ' vendido nesta comanda já foi usado.');
  });
  var refs = cm.itens.map(function (it, idx) { return it.atendimentoId ? String(it.atendimentoId) : cm.id + '-' + idx; });
  var pagas = lerAba('Comissoes').filter(function (k) { return k.status === 'pago' && refs.indexOf(String(k.ref)) >= 0; });
  if (pagas.length) throw new Error('A comissão de ' + pagas[0].profissional + ' sobre esta comanda já foi paga. Ajuste no Financeiro antes de reabrir.');

  pags.forEach(function (p) {
    atualizarLinha('Pagamentos', p._linha, { status: p.status === 'pago' && !limpeza ? 'estornado' : 'excluido', observacao: (obs + (p.observacao || '')).slice(0, 500) });
    // vale usado para pagar volta a valer
    if (p.vale) {
      var v = acharVale(p.vale);
      if (v && (v.status === 'resgatado' || v.status === 'usado')) atualizarLinha('Vales', v._linha, { status: 'ativo', resgatado_em: '', resgatado_cpf: '' });
    }
  });
  var mc = mapaCreditos();
  creditos.forEach(function (id) { if (mc[id]) atualizarLinha('Creditos', mc[id]._linha, { ativo: 'NÃO' }); });
  valesVendidos.forEach(function (v) { atualizarLinha('Vales', v._linha, { status: 'cancelado' }); });
  // estoque e comissões
  var criadosNaComanda = {}; // atendimentos criados só para contar a sessão do pacote: saem junto
  if (limpeza) {
    // fechamento interrompido: atendimentos que ele já tinha ligado a esta comanda (o item guardado ainda não os conhecia)
    var nsus = {};
    pags.forEach(function (p) { nsus[String(p.order_nsu)] = 1; });
    lerAba('Atendimentos').forEach(function (a) {
      if (String(a.comanda) !== cm.id || a.status === 'cancelado') return;
      if (/^Feito na comanda/.test(String(a.obs || ''))) {
        criadosNaComanda[a.id] = 1;
        atualizarLinha('Atendimentos', a._linha, { status: 'cancelado', pagamento: 'no_dia', credito_id: '', atualizado_em: agoraTexto() });
        cancelarComissao(String(a.id));
      } else if (nsus[String(a.order_nsu)] || creditos.indexOf(String(a.credito_id)) >= 0) {
        atualizarLinha('Atendimentos', a._linha, { pagamento: 'no_dia', order_nsu: '', credito_id: '', atualizado_em: agoraTexto() });
        cancelarComissao(String(a.id));
      }
    });
  }
  cm.itens.forEach(function (it, idx) {
    if (it.tipo === 'produto') {
      // devolve só o que de fato saiu do estoque por esta comanda (um fechamento interrompido pode não ter chegado neste produto)
      var devolver = -lerAba('MovEstoque').filter(function (x) { return String(x.ref) === 'comanda:' + cm.id && String(x.produto_id) === String(it.id); }).reduce(function (t, x) { return t + numero(x.qtd); }, 0);
      if (devolver > 0) try { movimentarEstoque(it.id, devolver, 'devolução', 'Comanda ' + cm.id + ' desfeita', 'comanda:' + cm.id, quem); } catch (e) { Logger.log('estoque: ' + e.message); }
      cancelarComissao(cm.id + '-' + idx);
    } else if (it.tipo === 'servico') {
      if (it.atendimentoId) {
        var a = lerAba('Atendimentos').filter(function (y) { return y.id === it.atendimentoId; })[0];
        if (a) {
          if (it.pacote && /^Feito na comanda/.test(String(a.obs || ''))) {
            criadosNaComanda[a.id] = 1;
            atualizarLinha('Atendimentos', a._linha, { status: 'cancelado', pagamento: 'no_dia', credito_id: '', atualizado_em: agoraTexto() });
          } else if (!it.pago) atualizarLinha('Atendimentos', a._linha, { pagamento: 'no_dia', order_nsu: '', credito_id: '', atualizado_em: agoraTexto() });
          cancelarComissao(String(a.id));
          aplicarConsumo(a.servico_id, 'atend:' + a.id, a.nome, false, quem);
        }
      } else {
        cancelarComissao(cm.id + '-' + idx);
        aplicarConsumo(it.id, 'comanda:' + cm.id + '-' + idx, cm.nome, false, quem);
      }
    }
  });
  // itens de vale voltam sem código (um novo nasce ao fechar de novo)
  var itens = cm.itens.map(function (it) {
    var x = Object.assign({}, it);
    delete x.valeCodigo;
    if (criadosNaComanda[x.atendimentoId]) x.atendimentoId = '';
    return x;
  });
  return itens;
}

// Fechamento que parou no meio (erro do Google, tempo esgotado) deixa pagamentos, créditos, vales e estoque de uma comanda que continua aberta.
// Desfaz essas sobras antes de fechar de novo, para não cobrar nem creditar duas vezes. Devolve true se havia sobra.
function limparFechamentoInterrompido(cmId, quem, motivo) {
  var c = acharComanda(cmId);
  if (!c || c.status !== 'aberta') return false;
  var cm = comandaPublica(c);
  var sobras = lerAba('Pagamentos').filter(function (p) { return String(p.comanda) === cm.id && (p.status === 'pago' || p.status === 'pendente'); });
  var vales = lerAba('Vales').filter(function (v) { return String(v.comanda) === cm.id && String(v.origem) === 'vendido' && v.status !== 'cancelado'; });
  if (!sobras.length && !vales.length) return false;
  var obs = 'Fechamento interrompido (' + motivo + ') desfeito em ' + agoraTexto() + '. ';
  desfazerEfeitosDaComanda(cm, sobras, obs, quem, true);
  atualizarLinha('Comandas', c._linha, { historico: anotarComanda(c, quem, 'o fechamento anterior não terminou (' + motivo + '): pagamentos e créditos lançados nele foram desfeitos') });
  return true;
}

// Reabrir uma comanda fechada para corrigir (só administração). Desfaz o que o fechamento fez:
// pagamentos estornados, créditos e vales vendidos desativados, vale usado volta a valer,
// estoque devolvido, comissões canceladas. Recusa quando algo já foi usado ou pago depois.
function bancada_reabrirComanda(d, m) {
  var motivo = String(d.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!motivo) throw new Error('Conte o motivo da correção (fica no histórico da comanda).');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 30000);
  try {
    var c = acharComanda(d.id);
    if (!c) throw new Error('Comanda não encontrada.');
    if (c.status !== 'fechada') throw new Error('Só comandas fechadas podem ser reabertas.');
    var cm = comandaPublica(c);
    var pags = lerAba('Pagamentos').filter(function (p) { return String(p.comanda) === cm.id && p.status === 'pago'; });
    var itens = desfazerEfeitosDaComanda(cm, pags, 'Comanda reaberta em ' + agoraTexto() + ' por ' + m.email + ': ' + motivo + '. ', m.email, false);
    atualizarLinha('Comandas', c._linha, { status: 'aberta', fechada_em: '', fechada_por: '', pagamentos: '', itens: JSON.stringify(itens),
      historico: anotarComanda(c, m.email, 'reabriu para corrigir: ' + motivo) });
    SpreadsheetApp.flush();
    registrar(m, 'reabriu comanda', cm.nome + ' · ' + cm.id + ' · ' + motivo);
    return comandaPublica(acharComanda(cm.id));
  } finally {
    soltarTrava(trava);
  }
}

// pagamentos: [{ metodo, valor, parcelas, codigo (vale em R$) }]. Pode dividir em várias formas.
function bancada_fecharComanda(d, m) {
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 30000);
  try {
    var c = acharComanda(d.id);
    if (!c) throw new Error('Comanda não encontrada.');
    if (c.status !== 'aberta') throw new Error('Esta comanda já foi fechada.');
    // um fechamento anterior que parou no meio deixou pagamentos e créditos: desfaz antes de fechar de novo (nada é cobrado duas vezes)
    if (limparFechamentoInterrompido(c.id, m.email, 'falha no sistema')) c = acharComanda(d.id);
    var cm = comandaPublica(c);
    if (!cm.itens.length) throw new Error('A comanda está vazia.');
    var calc = calcularItensComanda(cm.itens, cm.cpf, cm.codigo);
    calc.forEach(function (it) {
      if (it.atendimentoId) {
        var at = lerAba('Atendimentos').filter(function (y) { return y.id === it.atendimentoId; })[0];
        if (at && (at.status === 'cancelado' || at.status === 'falta')) {
          throw new Error('O atendimento de ' + it.nome + ' (' + dataTexto(at.data).split('-').reverse().join('/') + ') está como ' + (at.status === 'falta' ? 'falta' : 'cancelado') + ': tire o item da comanda.');
        }
      } else if (it.tipo === 'servico' && !it.profissional) {
        throw new Error('Escolha quem fez ' + it.nome + ' (comissão e produtos usados dependem disso).');
      }
    });
    var total = dinheiro(calc.reduce(function (s, i) { return s + i.total; }, 0));
    var pags = (d.pagamentos || []).map(function (p) {
      var metodo = METODOS_PAGAMENTO.indexOf(p.metodo) >= 0 ? p.metodo : '';
      if (!metodo) throw new Error('Forma de pagamento inválida.');
      return { metodo: metodo, valor: dinheiro(p.valor), parcelas: metodo === 'Cartão de crédito' || metodo === 'Link InfinitePay' ? Math.min(Math.max(Number(p.parcelas) || 1, 1), 12) : 1,
        codigo: metodo === 'Vale-presente' ? codigoLimpo(p.codigo) : '', bandeira: bandeiraDe(metodo, p.bandeira, true) };
    }).filter(function (p) { return p.valor > 0; });
    var pago = dinheiro(pags.reduce(function (s, p) { return s + p.valor; }, 0));
    if (Math.abs(pago - total) > 0.01) throw new Error('Os pagamentos somam ' + brl(pago) + ', mas a comanda é de ' + brl(total) + '.');
    var vales = pags.filter(function (p) { return p.metodo === 'Vale-presente'; });
    if (vales.length > 1) throw new Error('Use um vale-presente por comanda.');
    if (vales.length && calc.some(function (i) { return i.tipo === 'vale'; })) throw new Error('Um vale-presente não pode ser pago com outro vale.');
    var vale = null;
    if (vales.length) {
      var v = acharVale(vales[0].codigo);
      if (!v) throw new Error('Vale-presente não encontrado.');
      if (v.tipo === 'plano') throw new Error('Este vale dá um serviço ou aula: coloque o código no campo "cupom ou vale" da comanda.');
      var mv = motivoValeInvalido(v, null, cm.cpf);
      if (mv) throw new Error(mv);
      if (saldoVale(v) + 0.009 < vales[0].valor) throw new Error('O vale tem só ' + brl(saldoVale(v)) + ' de saldo.');
      vale = { codigo: codigoLimpo(v.codigo), resta: vales[0].valor };
    }
    // venda igual hoje (mesmo item, mesmo valor, mesma pessoa), lançada em Vendas, na agenda ou em outra comanda? Pede confirmação antes de cobrar de novo
    var repetidaComanda = conferirVendaRepetida(cm.cpf, calc.filter(function (i) {
      return !i.pago && !i.pacote && (i.tipo === 'servico' || i.tipo === 'plano' || i.tipo === 'pacote');
    }).map(function (i) { return { id: i.id, nome: i.nome, total: dinheiro(i.total + (i.vale ? numero(i.valeUsado) * i.qtd : 0)) }; }), hojeTexto(), m, { nsus: {}, comanda: String(cm.id) });
    var reais = pags.filter(function (p) { return p.metodo !== 'Vale-presente'; });
    var metodosDistintos = reais.map(function (p) { return p.metodo; }).filter(function (x, i, l) { return l.indexOf(x) === i; });
    var metodo = metodosDistintos.length === 1 ? metodosDistintos[0] : metodosDistintos.length ? 'Misto' : vale ? 'Vale-presente' : 'Cortesia';
    var parcelas = Math.max.apply(null, [1].concat(reais.map(function (p) { return p.parcelas; })));
    var bandeiras = reais.map(function (p) { return p.bandeira; }).filter(function (x, i, l) { return x && l.indexOf(x) === i; }).join(' + ');
    var obsPag = 'Comanda ' + cm.id + (pags.length > 1 ? ' · ' + pags.map(function (p) { return p.metodo + (p.bandeira ? ' ' + p.bandeira : '') + ' ' + brl(p.valor); }).join(' + ') : '');
    if (repetidaComanda) obsPag += ' · venda repetida de propósito: ' + repetidaComanda;
    var hoje = hojeTexto();
    var valesCriados = [];
    var usadosNaComanda = {};
    calc.forEach(function (i) { if (i.atendimentoId) usadosNaComanda[i.atendimentoId] = 1; });
    // a comissão desta comanda é sobre o que sobra depois da taxa da maquininha de cada parte paga
    var fatorComanda = fatorDePartes(pags, pags.reduce(function (s, p) { return s + numero(p.valor); }, 0));
    _fatoresComanda[String(cm.id)] = fatorComanda;
    // pacotes primeiro: a sessão do mesmo serviço vendida junto usa o crédito que o pacote acabou de criar
    var creditosNaComanda = {};
    var aulasLigadas = {};
    var ordem = calc.map(function (x, i) { return i; }).sort(function (x, y) { return (calc[x].tipo === 'pacote' ? 0 : 1) - (calc[y].tipo === 'pacote' ? 0 : 1) || x - y; });
    try {
    ordem.forEach(function (idx) {
      var it = calc[idx];
      var a = it.atendimentoId ? lerAba('Atendimentos').filter(function (y) { return y.id === it.atendimentoId; })[0] : null;
      if (it.pacoteDaComanda) {
        it.pacote = creditosNaComanda[it.pacoteDaComanda] || '';
        if (!it.pacote) throw new Error('O pacote de ' + it.nome + ' não foi registrado nesta comanda.');
      }
      if (it.pago) {
        // atendimento já pago (pacote, pago antes ou cortesia): marca como atendido e (re)faz comissão e baixa,
        // que podem ter sido canceladas ao reabrir a comanda (as duas funções não duplicam)
        if (a) {
          if (a.status !== 'atendido') atualizarLinha('Atendimentos', a._linha, { status: 'atendido', comanda: cm.id, atualizado_em: agoraTexto() });
          var a2 = lerAba('Atendimentos').filter(function (y) { return y.id === a.id; })[0];
          comissaoDoAtendimento(a2, true);
          aplicarConsumo(a2.servico_id, 'atend:' + a2.id, a2.nome, true, m.email);
        }
        return;
      }
      if (it.pacote) {
        // sessão do pacote: o atendimento da agenda leva o crédito (se não estava ligado, procura o horário marcado da cliente);
        // só sem nenhum horário marcado cria um registro para contar a sessão (fica fora da grade da agenda)
        if (!a) {
          a = agendamentoDoItem(cm.cpf, it.id, it.profissional, cm.id, usadosNaComanda, false);
          if (a) it.atendimentoId = String(a.id);
        }
        if (!a) {
          var agora = Utilities.formatDate(new Date(), AJUSTES.fuso, 'HH:mm');
          var sv = listarServicos(true).filter(function (s) { return s.id === it.id; })[0] || {};
          var nova = { id: novoId('A'), data: hoje, hora: agora, duracao_min: sv.duracao ? duracaoServico(sv, it.profissional) : 60, servico_id: it.id, servico: it.nome,
            categoria: sv.categoria || '', profissional: it.profissional, cpf: cm.cpf, nome: cm.nome, whatsapp: cm.whatsapp, status: 'atendido', pagamento: 'pacote', valor: 0,
            credito_id: it.pacote, obs: 'Feito na comanda (sessão do pacote)', criado_por: m.email, criado_em: agoraTexto(), atualizado_em: agoraTexto(), comanda: cm.id };
          adicionarLinha('Atendimentos', nova);
          it.atendimentoId = nova.id;
        } else {
          // horário de outro dia: fica pago pelo pacote e continua marcado; vira "atendido" (com comissão) no dia, pela agenda
          var jaFoi = dataTexto(a.data) <= hoje;
          var mudP = { pagamento: 'pacote', credito_id: it.pacote, valor: 0, order_nsu: '', comanda: cm.id, atualizado_em: agoraTexto() };
          if (jaFoi) mudP.status = 'atendido';
          atualizarLinha('Atendimentos', a._linha, mudP);
          usadosNaComanda[a.id] = 1;
          if (!jaFoi) return;
        }
        var ap = lerAba('Atendimentos').filter(function (y) { return y.id === it.atendimentoId; })[0];
        comissaoDoAtendimento(ap, true);
        aplicarConsumo(ap.servico_id, 'atend:' + ap.id, ap.nome, true, m.email);
        return;
      }
      var valorLinha = it.total;
      var valeUsado = it.vale ? it.valeUsado * it.qtd : 0;
      var valeCod = it.vale || '';
      if (vale && vale.resta > 0.009 && valorLinha > 0.009 && !valeCod) {
        var usa = Math.min(vale.resta, valorLinha);
        valeCod = vale.codigo;
        valeUsado = dinheiro(usa);
        valorLinha = dinheiro(valorLinha - usa);
        vale.resta = dinheiro(vale.resta - usa);
      }
      var nsu = novoNsu('Q');
      adicionarLinha('Pagamentos', { order_nsu: nsu, cpf: cm.cpf, nome: cm.nome, plano_id: it.id,
        descricao: it.tipo === 'produto' ? 'Produto · ' + it.nome + (it.qtd > 1 ? ' × ' + it.qtd : '') : it.nome, valor: valorLinha, status: 'pendente',
        criado_em: agoraTexto(), valor_original: dinheiro(it.preco * it.qtd), desconto: dinheiro(it.desconto + (it.vale ? 0 : valeUsado)), cupom: it.cupom, vale: valeCod,
        vale_usado: valeUsado, origem: 'balcão', registrado_por: m.email, observacao: obsPag, promocao: it.promocao, comanda: cm.id, tipo_item: it.tipo,
        profissional: it.profissional, bandeira: bandeiras });
      SpreadsheetApp.flush();
      var creditoId = concluirPagamento(linhaPagamento(nsu), { metodo: metodo, parcelas: parcelas, valor_pago: valorLinha, inicio: it.data || hoje,
        origemCredito: 'comanda', observacao: obsPag, semCredito: it.tipo === 'produto' || it.tipo === 'vale' });
      if (it.tipo === 'pacote' && creditoId) creditosNaComanda[it.uid] = creditoId;
      // aula avulsa paga aqui: quita a aula reservada para pagar depois
      if (it.tipo === 'plano' && creditoId) ligarAulaAPagar(cm.cpf, it.id, creditoId, aulasLigadas);
      if (it.tipo === 'vale') {
        // vale vendido: o código nasce agora; vale para quem recebe (sem CPF: qualquer pessoa com o código)
        var dv = it.dadosVale || {};
        var novo = { codigo: gerarCodigoVale(), status: 'ativo', tipo: dv.tipo, plano_id: dv.planoId || '', valor: dv.valor, cpf: '', nome: dv.nome || '',
          email: dv.email || '', whatsapp: dv.whatsapp || '', motivo: 'Comprado por ' + cm.nome, campanha: '', mensagem: dv.mensagem || '', criado_em: agoraTexto(),
          criado_por: m.email, validade: somarDias(hoje, dv.validadeDias || AJUSTES.valeValidadeDias), enviado: '', origem: 'vendido', comanda: cm.id };
        adicionarLinha('Vales', novo);
        it.valeCodigo = novo.codigo;
        valesCriados.push({ vale: novo, enviarEmail: !!dv.enviarEmail, enviarWhats: !!dv.enviarWhats });
      } else if (it.tipo === 'produto') {
        try { movimentarEstoque(it.id, -it.qtd, 'venda', 'Comanda ' + cm.id + ' · ' + cm.nome, 'comanda:' + cm.id, m.email); } catch (e) { Logger.log('estoque: ' + e.message); }
        if (it.profissional) {
          var pr = profissionalPorNome(it.profissional);
          if (pr && pr.comissaoProduto > 0) gravarComissao({ ref: cm.id + '-' + idx, data: hoje, profissional: pr.nome, origem: 'produto', item: it.nome + ' · ' + cm.nome, base: dinheiro(it.total * fatorComanda), pct: pr.comissaoProduto });
        }
      } else if (it.tipo === 'servico') {
        if (a) {
          atualizarLinha('Atendimentos', a._linha, { status: 'atendido', pagamento: 'pago', order_nsu: nsu, credito_id: creditoId || '', valor: it.total, comanda: cm.id, atualizado_em: agoraTexto() });
          var a3 = lerAba('Atendimentos').filter(function (y) { return y.id === a.id; })[0];
          comissaoDoAtendimento(a3, true);
          aplicarConsumo(a3.servico_id, 'atend:' + a3.id, a3.nome, true, m.email);
        } else {
          // serviço feito na hora, sem agendamento (a profissional é obrigatória, conferida acima)
          gravarComissao({ ref: cm.id + '-' + idx, data: hoje, profissional: it.profissional, origem: 'comanda', item: it.nome + ' · ' + cm.nome, base: dinheiro(it.total * fatorComanda),
            pct: pctComissao(it.profissional, it.id) });
          aplicarConsumo(it.id, 'comanda:' + cm.id + '-' + idx, cm.nome, true, m.email);
        }
      }
    });
    atualizarLinha('Comandas', c._linha, { status: 'fechada', fechada_em: agoraTexto(), fechada_por: m.email, pagamentos: JSON.stringify(pags), itens: JSON.stringify(calc),
      total: total, subtotal: dinheiro(calc.reduce(function (s, i) { return s + (i.pago || i.pacote ? 0 : i.preco * i.qtd); }, 0)),
      desconto: dinheiro(calc.reduce(function (s, i) { return s + i.desconto; }, 0)),
      historico: anotarComanda(c, m.email, 'fechou · ' + brl(total) + ' · ' + pags.map(function (p) { return p.metodo; }).join(' + ')) });
    } catch (falha) {
      // parou no meio: desfaz o que já foi gravado (se nem isso der, a próxima tentativa de fechar desfaz sozinha)
      try { limparFechamentoInterrompido(c.id, m.email, 'erro ao fechar'); } catch (e2) { Logger.log('limpeza do fechamento: ' + e2.message); }
      throw falha;
    }
    SpreadsheetApp.flush();
    registrar(m, 'fechou comanda', cm.nome + ' · ' + brl(total) + ' · ' + pags.map(function (p) { return p.metodo; }).join(' + '));
  } finally {
    delete _fatoresComanda[String(c.id)];
    soltarTrava(trava);
  }
  // vales vendidos: e-mail para quem recebe (se pedido) e o texto pronto do WhatsApp
  var saida = comandaPublica(acharComanda(d.id));
  saida.valesCriados = valesCriados.map(function (x) {
    var enviado = false;
    if (x.enviarEmail && emailValido(x.vale.email)) {
      try {
        enviarEmailVale(x.vale);
        var achado = acharVale(x.vale.codigo);
        if (achado) atualizarLinha('Vales', achado._linha, { enviado: 'e-mail ' + agoraTexto() });
        enviado = true;
      } catch (e) { Logger.log('e-mail do vale: ' + e.message); }
    }
    return { codigo: x.vale.codigo, descricao: descreverVale(x.vale), nome: x.vale.nome, whatsapp: x.vale.whatsapp, email: x.vale.email, emailEnviado: enviado,
      enviarWhats: !!x.enviarWhats, validade: x.vale.validade, textoWhats: textoWhatsVale(x.vale) };
  });
  return saida;
}
