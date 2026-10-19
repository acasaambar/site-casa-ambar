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

function novoId(prefixo) {
  return prefixo + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + Math.floor(Math.random() * 900 + 100);
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
function brl(v) { return 'R$ ' + dinheiro(v).toFixed(2).replace('.', ','); }

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

function bancada_produtos() {
  var lista = listarProdutos(true);
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
  trava.waitLock(20000);
  try {
    movimentarEstoque(p.id, qtd, tipo, d.motivo || '', '', m.email, tipo === 'entrada' ? custo : 0);
    if (tipo === 'entrada' && d.lancarDespesa && custo > 0 && m.papel === 'admin') {
      criarDespesa({ data: hojeTexto(), descricao: 'Compra · ' + p.nome + ' × ' + qtd, categoria: 'Produtos e insumos', valor: dinheiro(qtd * custo),
        forma: d.forma || 'Pix', status: d.pago === false ? 'a_pagar' : 'pago', fornecedor: d.fornecedor || '' }, m);
    }
  } finally {
    trava.releaseLock();
  }
  registrar(m, 'estoque · ' + tipo, p.nome + ' · ' + qtd);
  return bancada_produtos();
}

function bancada_movimentos(d) {
  var lista = lerAba('MovEstoque').filter(function (x) { return x.produto_id && (!d.produtoId || String(x.produto_id) === String(d.produtoId)); });
  return lista.slice(-300).reverse().map(function (x) {
    return { quando: String(x.quando), produtoId: String(x.produto_id), produto: String(x.produto), tipo: String(x.tipo), qtd: numero(x.qtd),
      valor: dinheiro(x.valor), motivo: String(x.motivo || ''), quem: String(x.quem || '').split('@')[0] };
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

function pctComissao(profissional, servicoId) {
  var s = servicoId ? listarServicos(true).filter(function (x) { return x.id === String(servicoId); })[0] : null;
  if (s && s.comissao != null) return s.comissao;
  var p = profissionalPorNome(profissional);
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

// valor que serve de base para a comissão de um atendimento
function baseDoAtendimento(a) {
  if (a.pagamento === 'cortesia') return 0;
  if (a.pagamento === 'pacote' && a.credito_id) {
    var cred = mapaCreditos()[String(a.credito_id)];
    var pg = lerAba('Pagamentos').filter(function (p) { return 'C' + String(p.order_nsu).slice(1) === String(a.credito_id); })[0];
    var sessoes = cred ? numero(cred.aulas_total) : 0;
    if (pg && sessoes > 0) return dinheiro((numero(pg.valor) + numero(pg.vale_usado)) / sessoes);
    var pac = cred ? listarPacotes(true).filter(function (p) { return p.id === String(cred.plano_id); })[0] : null;
    return pac && pac.sessoes ? dinheiro(pac.preco / pac.sessoes) : 0;
  }
  return numero(a.valor);
}

// atendido → comissão a pagar; desfeito/falta → cancela
function comissaoDoAtendimento(a, ativo) {
  try {
    if (!ativo) { cancelarComissao(a.id); return; }
    gravarComissao({ ref: String(a.id), data: dataTexto(a.data), profissional: String(a.profissional), origem: 'atendimento',
      item: a.servico + ' · ' + a.nome, base: baseDoAtendimento(a), pct: pctComissao(a.profissional, a.servico_id) });
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

function bancada_comissoes(d) {
  var mes = mesValido(d.mes);
  var de = mes + '-01', ate = mes + '-' + diasNoMes(mes);
  var lista = comissoesDoPeriodo(de, ate);
  return { mes: mes, lista: lista, porProfissional: resumoComissoes(lista),
    profissionais: listarProfissionais(true).map(function (p) { return { nome: p.nome, comissao: p.comissao, comissaoProduto: p.comissaoProduto }; }) };
}

function bancada_pagarComissoes(d, m) {
  var ids = (d.ids || []).map(String);
  if (!ids.length) throw new Error('Escolha as comissões.');
  var forma = METODOS_PAGAMENTO.indexOf(d.forma) >= 0 ? d.forma : 'Pix';
  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
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
    trava.releaseLock();
  }
  registrar(m, 'pagou comissões', pagas + ' lançamentos');
  return bancada_comissoes({ mes: d.mes });
}

// a profissional vê só o que é dela
function bancada_meusGanhos(d, m) {
  var mes = mesValido(d.mes);
  var de = mes + '-01', ate = mes + '-' + diasNoMes(mes);
  var lista = comissoesDoPeriodo(de, ate, function (c) { return mesmaProfessora(c.profissional, m); });
  var atend = lerAba('Atendimentos').filter(function (a) {
    var dt = dataTexto(a.data);
    return a.id && dt >= de && dt <= ate && mesmaProfessora(a.profissional, m);
  });
  return { mes: mes, lista: lista, total: dinheiro(lista.reduce(function (s, c) { return s + c.valor; }, 0)),
    aPagar: dinheiro(lista.filter(function (c) { return c.status === 'a_pagar'; }).reduce(function (s, c) { return s + c.valor; }, 0)),
    pago: dinheiro(lista.filter(function (c) { return c.status === 'pago'; }).reduce(function (s, c) { return s + c.valor; }, 0)),
    atendidos: atend.filter(function (a) { return a.status === 'atendido'; }).length,
    agendados: atend.filter(function (a) { return a.status !== 'cancelado'; }).length,
    faltas: atend.filter(function (a) { return a.status === 'falta'; }).length };
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
      status: pago ? 'pago' : 'a_pagar', pago_em: pago ? (ex.pago_em ? dataTexto(ex.pago_em) : dataValida(x.pagoEm, x.data <= hojeTexto() ? x.data : hojeTexto())) : '',
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

// formas de pagamento das vendas (comandas com pagamento dividido entram com cada forma)
function formasDasVendas(pags) {
  var r = {};
  var comandas = {};
  var soma = function (k, v) { r[k] = dinheiro((r[k] || 0) + v); };
  pags.forEach(function (p) {
    if (p.comanda) { comandas[String(p.comanda)] = 1; return; }
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

function grupoDoPagamento(p, itens) {
  if (String(p.tipo_item) === 'produto') return 'Produtos';
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
  return {
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
  var c = caixaDoDia(data);
  var movs = c ? parseJson(c.movimentos, []) : [];
  var pags = lerAba('Pagamentos').filter(function (p) { return p.status === 'pago' && String(p.pago_em).slice(0, 10) === data && numero(p.valor) > 0; });
  var formas = formasDasVendas(pags);
  var abertura = c ? dinheiro(c.abertura) : 0;
  var tot = function (t) { return dinheiro(movs.filter(function (x) { return x.tipo === t; }).reduce(function (s, x) { return s + numero(x.valor); }, 0)); };
  var dinheiroVendas = formas['Dinheiro'] || 0;
  var esperado = dinheiro(abertura + dinheiroVendas + tot('suprimento') - tot('sangria') - tot('despesa'));
  return {
    data: data, status: c ? String(c.status) : 'nao_aberto', abertura: abertura, abertoPor: c ? String(c.aberto_por || '').split('@')[0] : '',
    abertoEm: c ? String(c.aberto_em || '') : '', movimentos: movs, porForma: Object.keys(formas).map(function (k) { return { nome: k, valor: formas[k] }; }),
    vendas: dinheiro(pags.reduce(function (s, p) { return s + numero(p.valor); }, 0)), qtdVendas: pags.length,
    dinheiroVendas: dinheiroVendas, suprimentos: tot('suprimento'), sangrias: tot('sangria'), despesas: tot('despesa'), esperado: esperado,
    contado: c && c.contado !== '' ? dinheiro(c.contado) : null, diferenca: c && c.diferenca !== '' ? dinheiro(c.diferenca) : null,
    fechadoPor: c ? String(c.fechado_por || '').split('@')[0] : '', fechadoEm: c ? String(c.fechado_em || '') : '', obs: c ? String(c.obs || '') : '',
  };
}

function bancada_caixa(d, m) {
  var data = dataValida(d.data, hojeTexto());
  var r = resumoCaixa(data);
  if (m.papel === 'admin') {
    r.anteriores = lerAba('Caixa').filter(function (c) { return dataTexto(c.data) < data; }).slice(-10).reverse().map(function (c) {
      return { data: dataTexto(c.data), status: String(c.status), esperado: dinheiro(c.esperado), contado: c.contado === '' ? null : dinheiro(c.contado),
        diferenca: c.diferenca === '' ? null : dinheiro(c.diferenca), fechadoPor: String(c.fechado_por || '').split('@')[0] };
    });
  }
  r.categorias = CATEGORIAS_DESPESA;
  return r;
}

function bancada_abrirCaixa(d, m) {
  var data = hojeTexto();
  if (caixaDoDia(data)) throw new Error('O caixa de hoje já foi aberto.');
  var valor = dinheiro(d.valor);
  if (valor < 0) throw new Error('Valor inválido.');
  adicionarLinha('Caixa', { data: data, status: 'aberto', abertura: valor, aberto_por: m.email, aberto_em: agoraTexto(), movimentos: '[]' });
  registrar(m, 'abriu o caixa', brl(valor));
  return bancada_caixa({ data: data }, m);
}

// tipo: sangria (retirada) · suprimento (troco que entrou) · despesa (pago em dinheiro do caixa)
function bancada_movimentoCaixa(d, m) {
  var data = hojeTexto();
  var c = caixaDoDia(data);
  if (!c || c.status !== 'aberto') throw new Error('Abra o caixa primeiro.');
  var tipo = ['sangria', 'suprimento', 'despesa'].indexOf(d.tipo) >= 0 ? d.tipo : '';
  if (!tipo) throw new Error('Escolha o tipo.');
  var valor = dinheiro(d.valor);
  if (!(valor > 0)) throw new Error('Informe o valor.');
  var motivo = String(d.motivo || '').trim().slice(0, 150);
  if (!motivo) throw new Error('Diga o motivo.');
  var mov = { quando: agoraTexto(), tipo: tipo, valor: valor, motivo: motivo, quem: m.email.split('@')[0] };
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
  var data = dataValida(d.data, hojeTexto());
  var c = caixaDoDia(data);
  if (!c || c.status !== 'aberto') throw new Error('O caixa deste dia não está aberto.');
  if (String(d.contado) === '' || numero(d.contado) < 0) throw new Error('Conte o dinheiro da gaveta e informe o valor.');
  var r = resumoCaixa(data);
  var contado = dinheiro(d.contado);
  atualizarLinha('Caixa', c._linha, { status: 'fechado', dinheiro_vendas: r.dinheiroVendas, esperado: r.esperado, contado: contado,
    diferenca: dinheiro(contado - r.esperado), fechado_por: m.email, fechado_em: agoraTexto(), obs: String(d.obs || '').slice(0, 300) });
  registrar(m, 'fechou o caixa', 'esperado ' + brl(r.esperado) + ' · contado ' + brl(contado));
  return bancada_caixa({ data: data }, m);
}

function bancada_reabrirCaixa(d, m) {
  var data = dataValida(d.data, hojeTexto());
  var c = caixaDoDia(data);
  if (!c) throw new Error('Caixa não encontrado.');
  atualizarLinha('Caixa', c._linha, { status: 'aberto', contado: '', diferenca: '', fechado_por: '', fechado_em: '' });
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
    codigo: String(c.codigo || ''), obs: String(c.obs || ''), abertaPor: String(c.aberta_por || '').split('@')[0], fechadaPor: String(c.fechada_por || '').split('@')[0] };
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
  var lista = itens.map(function (x, i) {
    var tipo = String(x.tipo || '');
    var cat = itemDoCatalogo(tipo, x.id);
    if (!cat) throw new Error('Item não encontrado no catálogo: ' + (x.nome || x.id) + '.');
    if (tipo !== 'produto') tipo = cat.tipo === 'servico' ? 'servico' : cat.tipo === 'pacote' ? 'pacote' : 'plano';
    var qtd = tipo === 'produto' ? Math.min(Math.max(Math.round(numero(x.qtd)) || 1, 1), 99) : 1;
    var data = dataValida(x.data, hojeTexto());
    var it = { tipo: tipo, id: String(cat.id), nome: cat.nome, qtd: qtd, preco: dinheiro(cat.preco), profissional: String(x.profissional || '').slice(0, 60),
      atendimentoId: String(x.atendimentoId || ''), data: data, pago: !!x.pago, promocao: '', cupom: '', vale: '', valeUsado: 0 };
    if (it.pago) { it.valor = 0; it.total = 0; it.desconto = 0; return it; }
    var calc;
    var cod = codigoLimpo(codigo);
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
    }
    it.valor = dinheiro(unit);
    it.total = dinheiro(unit * qtd);
    it.desconto = dinheiro((it.preco - unit) * qtd);
    void i;
    return it;
  });
  if (codigoLimpo(codigo) && !usado) throw erroCod(erroCodigo || 'Este código não vale para nenhum item da comanda.', 'CODIGO_INVALIDO');
  return lista;
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

function bancada_salvarComanda(d, m) {
  var x = d.comanda || {};
  var itens = (x.itens || []).slice(0, 40).map(function (i) {
    return { tipo: String(i.tipo || ''), id: String(i.id || ''), nome: String(i.nome || ''), qtd: i.qtd, profissional: i.profissional, atendimentoId: i.atendimentoId,
      valorManual: i.valorManual, pago: !!i.pago, data: i.data };
  }).filter(function (i) { return i.id; });
  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    var ex = x.id ? acharComanda(x.id) : null;
    if (x.id && !ex) throw new Error('Comanda não encontrada.');
    if (ex && ex.status !== 'aberta') throw new Error('Esta comanda já foi ' + (ex.status === 'fechada' ? 'fechada' : 'cancelada') + '.');
    var cli = ex && !x.cpf && !x.cliente ? { cpf: ex.cpf ? normCpf(ex.cpf) : '', nome: ex.nome, whatsapp: String(ex.whatsapp || '') } : clienteDaComanda(x);
    var precisaCadastro = itens.some(function (i) { var it = itemDoCatalogo(i.tipo, i.id); return it && (it.tipo === 'pacote' || (i.tipo !== 'produto' && it.modalidade !== 'Serviço')); });
    if (precisaCadastro && !cli.cpf) throw new Error('Plano e pacote ficam na conta da cliente: escolha uma cliente cadastrada (ou informe nome e WhatsApp).');
    var calc = calcularItensComanda(itens, cli.cpf, x.codigo);
    var subtotal = dinheiro(calc.reduce(function (s, i) { return s + (i.pago ? 0 : i.preco * i.qtd); }, 0));
    var total = dinheiro(calc.reduce(function (s, i) { return s + i.total; }, 0));
    var linha = { status: 'aberta', cpf: cli.cpf, nome: cli.nome, whatsapp: cli.whatsapp, itens: JSON.stringify(calc), subtotal: subtotal,
      desconto: dinheiro(subtotal - total), total: total, codigo: codigoLimpo(x.codigo), obs: String(x.obs || '').slice(0, 300) };
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
    trava.releaseLock();
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
  var mesma = a.cpf ? lerAba('Comandas').filter(function (c) { return c.status === 'aberta' && c.cpf && normCpf(c.cpf) === normCpf(a.cpf); })[0] : null;
  var item = { tipo: 'servico', id: String(a.servico_id), nome: a.servico, profissional: a.profissional, atendimentoId: a.id, data: dataTexto(a.data),
    pago: a.pagamento !== 'no_dia' };
  if (mesma) {
    var cm = comandaPublica(mesma);
    return bancada_salvarComanda({ comanda: { id: cm.id, itens: cm.itens.concat([item]), codigo: cm.codigo, obs: cm.obs } }, m);
  }
  var cli = a.cpf ? { cpf: normCpf(a.cpf) } : { cliente: { nome: a.nome, whatsapp: a.whatsapp } };
  return bancada_salvarComanda({ comanda: Object.assign(cli, { itens: [item] }) }, m);
}

function bancada_cancelarComanda(d, m) {
  var c = acharComanda(d.id);
  if (!c) throw new Error('Comanda não encontrada.');
  if (c.status !== 'aberta') throw new Error('Só comandas abertas podem ser canceladas.');
  atualizarLinha('Comandas', c._linha, { status: 'cancelada', fechada_em: agoraTexto(), fechada_por: m.email });
  registrar(m, 'cancelou comanda', c.nome + ' · ' + c.id);
  return true;
}

// pagamentos: [{ metodo, valor, parcelas, codigo (vale em R$) }]. Pode dividir em várias formas.
function bancada_fecharComanda(d, m) {
  var trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    var c = acharComanda(d.id);
    if (!c) throw new Error('Comanda não encontrada.');
    if (c.status !== 'aberta') throw new Error('Esta comanda já foi fechada.');
    var cm = comandaPublica(c);
    if (!cm.itens.length) throw new Error('A comanda está vazia.');
    var calc = calcularItensComanda(cm.itens, cm.cpf, cm.codigo);
    var total = dinheiro(calc.reduce(function (s, i) { return s + i.total; }, 0));
    var pags = (d.pagamentos || []).map(function (p) {
      var metodo = METODOS_PAGAMENTO.indexOf(p.metodo) >= 0 ? p.metodo : '';
      if (!metodo) throw new Error('Forma de pagamento inválida.');
      return { metodo: metodo, valor: dinheiro(p.valor), parcelas: metodo === 'Cartão de crédito' || metodo === 'Link InfinitePay' ? Math.min(Math.max(Number(p.parcelas) || 1, 1), 12) : 1,
        codigo: metodo === 'Vale-presente' ? codigoLimpo(p.codigo) : '' };
    }).filter(function (p) { return p.valor > 0; });
    var pago = dinheiro(pags.reduce(function (s, p) { return s + p.valor; }, 0));
    if (Math.abs(pago - total) > 0.01) throw new Error('Os pagamentos somam ' + brl(pago) + ', mas a comanda é de ' + brl(total) + '.');
    var vales = pags.filter(function (p) { return p.metodo === 'Vale-presente'; });
    if (vales.length > 1) throw new Error('Use um vale-presente por comanda.');
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
    var reais = pags.filter(function (p) { return p.metodo !== 'Vale-presente'; });
    var metodosDistintos = reais.map(function (p) { return p.metodo; }).filter(function (x, i, l) { return l.indexOf(x) === i; });
    var metodo = metodosDistintos.length === 1 ? metodosDistintos[0] : metodosDistintos.length ? 'Misto' : vale ? 'Vale-presente' : 'Cortesia';
    var parcelas = Math.max.apply(null, [1].concat(reais.map(function (p) { return p.parcelas; })));
    var obsPag = 'Comanda ' + cm.id + (pags.length > 1 ? ' · ' + pags.map(function (p) { return p.metodo + ' ' + brl(p.valor); }).join(' + ') : '');
    var hoje = hojeTexto();
    calc.forEach(function (it, idx) {
      var a = it.atendimentoId ? lerAba('Atendimentos').filter(function (y) { return y.id === it.atendimentoId; })[0] : null;
      if (it.pago) {
        // atendimento já pago (pacote, pago antes ou cortesia): só marca como atendido
        if (a && a.status !== 'atendido') {
          atualizarLinha('Atendimentos', a._linha, { status: 'atendido', comanda: cm.id, atualizado_em: agoraTexto() });
          var a2 = lerAba('Atendimentos').filter(function (y) { return y.id === a.id; })[0];
          comissaoDoAtendimento(a2, true);
          aplicarConsumo(a2.servico_id, 'atend:' + a2.id, a2.nome, true, m.email);
        }
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
        profissional: it.profissional });
      SpreadsheetApp.flush();
      var creditoId = concluirPagamento(linhaPagamento(nsu), { metodo: metodo, parcelas: parcelas, valor_pago: valorLinha, inicio: it.data || hoje,
        origemCredito: 'comanda', observacao: obsPag, semCredito: it.tipo === 'produto' });
      if (it.tipo === 'produto') {
        try { movimentarEstoque(it.id, -it.qtd, 'venda', 'Comanda ' + cm.id + ' · ' + cm.nome, 'comanda:' + cm.id, m.email); } catch (e) { Logger.log('estoque: ' + e.message); }
        if (it.profissional) {
          var pr = profissionalPorNome(it.profissional);
          if (pr && pr.comissaoProduto > 0) gravarComissao({ ref: cm.id + '-' + idx, data: hoje, profissional: pr.nome, origem: 'produto', item: it.nome + ' · ' + cm.nome, base: it.total, pct: pr.comissaoProduto });
        }
      } else if (it.tipo === 'servico') {
        if (a) {
          atualizarLinha('Atendimentos', a._linha, { status: 'atendido', pagamento: 'pago', order_nsu: nsu, credito_id: creditoId || '', valor: it.total, comanda: cm.id, atualizado_em: agoraTexto() });
          var a3 = lerAba('Atendimentos').filter(function (y) { return y.id === a.id; })[0];
          comissaoDoAtendimento(a3, true);
          aplicarConsumo(a3.servico_id, 'atend:' + a3.id, a3.nome, true, m.email);
        } else if (it.profissional) {
          // serviço feito na hora, sem agendamento
          gravarComissao({ ref: cm.id + '-' + idx, data: hoje, profissional: it.profissional, origem: 'comanda', item: it.nome + ' · ' + cm.nome, base: it.total,
            pct: pctComissao(it.profissional, it.id) });
          aplicarConsumo(it.id, 'comanda:' + cm.id + '-' + idx, cm.nome, true, m.email);
        }
      }
    });
    atualizarLinha('Comandas', c._linha, { status: 'fechada', fechada_em: agoraTexto(), fechada_por: m.email, pagamentos: JSON.stringify(pags), itens: JSON.stringify(calc),
      total: total, subtotal: dinheiro(calc.reduce(function (s, i) { return s + (i.pago ? 0 : i.preco * i.qtd); }, 0)),
      desconto: dinheiro(calc.reduce(function (s, i) { return s + i.desconto; }, 0)) });
    SpreadsheetApp.flush();
    registrar(m, 'fechou comanda', cm.nome + ' · ' + brl(total) + ' · ' + pags.map(function (p) { return p.metodo; }).join(' + '));
    return comandaPublica(acharComanda(cm.id));
  } finally {
    trava.releaseLock();
  }
}
