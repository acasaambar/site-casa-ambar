/**
 * ============================================================
 *  CASA ÂMBAR — CUPONS DE DESCONTO E VALES-PRESENTE
 * ============================================================
 *  Cupom: código de desconto (% ou R$) aplicado no pagamento.
 *  Vale-presente: CORTESIA gerada pela equipe (aniversário, campanha...).
 *    tipo "plano": dá uma aula/plano do catálogo (vira crédito ao resgatar)
 *    tipo "valor": dá um valor em R$ para usar nas compras (tem saldo)
 */

function codigoLimpo(c) {
  return String(c || '').trim().toUpperCase().replace(/\s+/g, '');
}

function acharCupom(codigo) {
  codigo = codigoLimpo(codigo);
  if (!codigo) return null;
  return lerAba('Cupons').filter(function (c) { return codigoLimpo(c.codigo) === codigo; })[0] || null;
}

function acharVale(codigo) {
  codigo = codigoLimpo(codigo);
  if (!codigo) return null;
  return lerAba('Vales').filter(function (v) { return codigoLimpo(v.codigo) === codigo; })[0] || null;
}

function pagamentosPagos() {
  return lerAba('Pagamentos').filter(function (p) { return p.status === 'pago'; });
}

function usosCupom(codigo, cpf, pagos) {
  pagos = pagos || pagamentosPagos();
  var c = codigoLimpo(codigo);
  var vistos = {};
  // uma comanda com vários itens conta como um uso só
  var doCupom = pagos.filter(function (p) {
    if (codigoLimpo(p.cupom) !== c) return false;
    var k = p.comanda ? 'Q' + p.comanda : 'P' + p.order_nsu;
    if (vistos[k]) return false;
    vistos[k] = 1;
    return true;
  });
  return { total: doCupom.length, doAluno: cpf ? doCupom.filter(function (p) { return normCpf(p.cpf) === normCpf(cpf); }).length : 0,
    desconto: doCupom.reduce(function (s, p) { return s + numero(p.desconto); }, 0) };
}

function saldoVale(v, pagos) {
  if (v.tipo === 'plano') return v.status === 'ativo' ? 1 : 0;
  pagos = pagos || pagamentosPagos();
  var c = codigoLimpo(v.codigo);
  var usado = pagos.filter(function (p) { return codigoLimpo(p.vale) === c; }).reduce(function (s, p) { return s + numero(p.vale_usado); }, 0);
  return Math.max(0, Math.round((numero(v.valor) - usado) * 100) / 100);
}

function valeVencido(v) {
  var val = dataTexto(v.validade || '');
  return val && val !== 'undefined' && val < hojeTexto();
}

// Problemas do cupom para este plano/aluno (ou '' se pode usar)
function motivoCupomInvalido(c, plano, cpf) {
  if (String(c.ativo).toUpperCase() === 'NÃO') return 'Este cupom não está mais ativo.';
  var hoje = hojeTexto();
  if (c.inicio && dataTexto(c.inicio) > hoje) return 'Este cupom ainda não começou a valer.';
  if (c.fim && dataTexto(c.fim) < hoje) return 'Este cupom expirou.';
  if (c.modalidade && c.modalidade !== 'Todas' && plano && String(plano.modalidade) !== String(c.modalidade)) return 'Este cupom vale só para ' + c.modalidade + '.';
  if (c.tipo_plano && c.tipo_plano !== 'todos' && plano && String(plano.tipo) !== String(c.tipo_plano)) return 'Este cupom não vale para este tipo de plano.';
  var pagos = pagamentosPagos();
  var u = usosCupom(c.codigo, cpf, pagos);
  if (numero(c.limite_total) > 0 && u.total >= numero(c.limite_total)) return 'Este cupom já atingiu o limite de usos.';
  if (numero(c.limite_por_aluno) > 0 && cpf && u.doAluno >= numero(c.limite_por_aluno)) return 'Você já usou este cupom.';
  if (String(c.primeira_compra).toUpperCase() === 'SIM' && cpf && pagos.some(function (p) { return normCpf(p.cpf) === normCpf(cpf) && numero(p.valor) > 0; })) {
    return 'Este cupom é só para a primeira compra.';
  }
  return '';
}

function motivoValeInvalido(v, plano, cpf) {
  if (v.status === 'cancelado') return 'Este vale foi cancelado.';
  if (v.status === 'resgatado' || v.status === 'usado') return 'Este vale já foi usado.';
  if (valeVencido(v)) return 'Este vale expirou em ' + dataTexto(v.validade).split('-').reverse().join('/') + '.';
  if (v.cpf && cpf && normCpf(v.cpf) !== normCpf(cpf)) return 'Este vale é de outra pessoa.';
  if (plano && v.tipo === 'plano' && v.plano_id !== plano.id) {
    var p = buscarItemVenda(v.plano_id);
    return 'Este vale dá "' + (p ? p.nome : v.plano_id) + '". Resgate em Meu plano → Tenho um vale-presente.';
  }
  if (v.tipo !== 'plano' && saldoVale(v) <= 0) return 'Este vale não tem mais saldo.';
  return '';
}

// Preço final de um item (plano, serviço, pacote ou produto) com promoção, cupom ou vale.
// opts: { data: 'aaaa-mm-dd' (dia do serviço), canal: 'site' | 'bancada' }
// Promoção e cupom não somam: vale o maior desconto. O vale-presente entra depois da promoção.
function calcularPreco(plano, cpf, codigo, opts) {
  opts = opts || {};
  var base = numero(plano.preco);
  var r = { valorOriginal: base, desconto: 0, cupom: '', vale: '', valeUsado: 0, valorFinal: base, mensagem: '', promocao: '' };
  var promo = melhorPromocao(plano, opts.data || hojeTexto(), opts.canal || 'site');
  var aplicarPromo = function () {
    if (!promo) return;
    r.promocao = promo.nome;
    r.desconto = promo.desconto;
    r.valorFinal = Math.round((base - promo.desconto) * 100) / 100;
    r.mensagem = 'Promoção ' + promo.nome + ': ' + promo.texto + '.';
  };
  codigo = codigoLimpo(codigo);
  if (!codigo) { aplicarPromo(); return r; }
  var c = acharCupom(codigo);
  if (c) {
    var m = motivoCupomInvalido(c, plano, cpf);
    if (m) throw erroCod(m, 'CODIGO_INVALIDO');
    var desc = c.tipo === 'percentual' ? base * numero(c.valor) / 100 : numero(c.valor);
    desc = Math.min(base, Math.round(desc * 100) / 100);
    if (promo && promo.desconto >= desc) {
      aplicarPromo();
      r.mensagem += ' Ela já dá um desconto igual ou maior que o cupom, então o cupom não foi usado.';
      return r;
    }
    r.cupom = codigoLimpo(c.codigo);
    r.desconto = desc;
    r.valorFinal = Math.round((base - desc) * 100) / 100;
    r.mensagem = 'Cupom ' + r.cupom + ': ' + (c.tipo === 'percentual' ? numero(c.valor) + '% de desconto' : 'R$ ' + desc.toFixed(2).replace('.', ',') + ' de desconto');
    return r;
  }
  var v = acharVale(codigo);
  if (v) {
    var mv = motivoValeInvalido(v, plano, cpf);
    if (mv) throw erroCod(mv, 'CODIGO_INVALIDO');
    aplicarPromo();
    var resto = r.valorFinal;
    var usa = v.tipo === 'plano' ? resto : Math.min(resto, saldoVale(v));
    r.vale = codigoLimpo(v.codigo);
    r.valeUsado = Math.round(usa * 100) / 100;
    r.desconto = Math.round((r.desconto + usa) * 100) / 100;
    r.valorFinal = Math.round((resto - usa) * 100) / 100;
    r.mensagem = (promo ? r.mensagem + ' ' : '') + (v.tipo === 'plano' ? 'Vale-presente: esta compra sai como cortesia.' : 'Vale-presente: R$ ' + usa.toFixed(2).replace('.', ',') + ' do seu vale.');
    return r;
  }
  throw erroCod('Código não encontrado. Confira as letras e os números.', 'CODIGO_INVALIDO');
}

// Aluno digita o código no pagamento
function validarCodigo(d) {
  var aluno = alunoDaSessao(d.token);
  var plano = buscarPlano(d.planoId);
  if (!plano) throw new Error('Plano não encontrado.');
  limitarCodigos(normCpf(aluno.cpf));
  var r;
  try { r = calcularPreco(plano, normCpf(aluno.cpf), d.codigo, { canal: 'site' }); } catch (e) { contarErroCodigo(normCpf(aluno.cpf)); throw e; }
  return { codigo: r.cupom || r.vale, tipo: r.cupom ? 'cupom' : 'vale', valorOriginal: r.valorOriginal, desconto: r.desconto, valorFinal: r.valorFinal, mensagem: r.mensagem };
}

// Aluno resgata um vale em Meu plano
function resgatarVale(d) {
  var aluno = alunoDaSessao(d.token);
  limitarCodigos(normCpf(aluno.cpf));
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    return aplicarVale(aluno, d.codigo, 'aluno');
  } catch (e) {
    contarErroCodigo(normCpf(aluno.cpf));
    throw e;
  } finally {
    trava.releaseLock();
  }
}

function aplicarVale(aluno, codigo, quem) {
  var v = acharVale(codigo);
  if (!v) throw new Error('Vale não encontrado. Confira as letras e os números.');
  var cpf = normCpf(aluno.cpf);
  var m = motivoValeInvalido(v, null, cpf);
  if (m) throw new Error(m);
  if (v.tipo !== 'plano') {
    // vale em R$: fica ligado a esta pessoa e é usado no pagamento
    if (!v.cpf) atualizarLinha('Vales', v._linha, { cpf: cpf, nome: aluno.nome });
    return { tipo: 'valor', codigo: codigoLimpo(v.codigo), saldo: saldoVale(v), validade: dataTexto(v.validade),
      mensagem: 'Seu vale tem R$ ' + saldoVale(v).toFixed(2).replace('.', ',') + '. Use o código ' + codigoLimpo(v.codigo) + ' no pagamento.' };
  }
  var plano = buscarItemVenda(v.plano_id);
  if (!plano) throw new Error('O plano deste vale não existe mais. Fale com a recepção.');
  var nsu = novoNsu('V');
  adicionarLinha('Pagamentos', { order_nsu: nsu, cpf: cpf, nome: aluno.nome, plano_id: plano.id, descricao: plano.nome, valor: 0, status: 'pendente',
    criado_em: agoraTexto(), valor_original: plano.preco, desconto: plano.preco, vale: codigoLimpo(v.codigo), vale_usado: plano.preco,
    origem: quem === 'aluno' ? 'site' : 'balcão', registrado_por: quem === 'aluno' ? '' : quem });
  SpreadsheetApp.flush();
  concluirPagamento(linhaPagamento(nsu), { metodo: 'Vale-presente', origemCredito: 'vale ' + codigoLimpo(v.codigo) });
  return { tipo: 'plano', codigo: codigoLimpo(v.codigo), plano: plano.nome, mensagem: 'Pronto! "' + plano.nome + '" entrou no seu plano. Já pode reservar.' };
}

// ---------------- geração de códigos ----------------
function gerarCodigoVale() {
  var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I
  var existentes = {};
  lerAba('Vales').forEach(function (v) { existentes[codigoLimpo(v.codigo)] = 1; });
  for (var t = 0; t < 20; t++) {
    var c = 'AMBAR-';
    for (var i = 0; i < 8; i++) {
      if (i === 4) c += '-';
      c += letras[Math.floor(Math.random() * letras.length)];
    }
    if (!existentes[c]) return c;
  }
  throw new Error('Não foi possível gerar o código. Tente de novo.');
}

function descreverVale(v) {
  if (v.tipo === 'plano') {
    var p = buscarItemVenda(v.plano_id);
    return p ? p.nome : String(v.plano_id);
  }
  return 'R$ ' + numero(v.valor).toFixed(2).replace('.', ',') + ' para usar na Casa Âmbar';
}

function textoWhatsVale(v) {
  var nome = primeiroNome(v.nome);
  var val = dataTexto(v.validade).split('-').reverse().join('/');
  return (nome ? 'Olá, ' + nome + '! ' : 'Olá! ') + 'A Casa Âmbar preparou um presente para você ✨\n\n' +
    (v.mensagem ? v.mensagem + '\n\n' : '') +
    '🎁 Vale-presente: ' + descreverVale(v) + '\nCódigo: *' + v.codigo + '*\nVálido até ' + val + '.\n\n' +
    'Para usar: entre em ' + AJUSTES.siteUrl + ' → Área do aluno → Meu plano → "Tenho um vale-presente".';
}

function enviarEmailVale(v) {
  var val = dataTexto(v.validade).split('-').reverse().join('/');
  var cartao = '<div style="margin:22px 0;padding:22px;border-radius:14px;background:#2F3821;text-align:center">' +
    '<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:4px;color:#A6845E">VALE-PRESENTE</div>' +
    '<div style="font-size:20px;color:#FBF3E2;margin:10px 0 14px">' + escHtml(descreverVale(v)) + '</div>' +
    '<div style="font-family:\'Courier New\',monospace;font-size:22px;letter-spacing:3px;color:#E9DDC5;background:rgba(233,221,197,.1);padding:10px;border-radius:10px">' +
    escHtml(v.codigo) + '</div><div style="font-family:Arial,sans-serif;font-size:11px;color:#BDB49C;margin-top:12px">válido até ' + val + '</div></div>';
  var pars = ['Olá' + (v.nome ? ', ' + primeiroNome(v.nome) : '') + '!'];
  if (v.mensagem) pars.push(String(v.mensagem));
  pars.push('A Casa Âmbar preparou um presente para você. Para usar, entre na área do aluno, abra "Meu plano" e toque em "Tenho um vale-presente".');
  enviarEmail(v.email, 'Um presente para você · Casa Âmbar', 'Um presente para você', pars, { texto: 'Usar meu vale', url: AJUSTES.siteUrl + '#/meu-plano?vale=' + v.codigo }, cartao);
}
