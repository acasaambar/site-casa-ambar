/**
 * ============================================================
 *  CASA ÂMBAR — CONTRATO DOS PLANOS MENSAL E TRIMESTRAL (Yoga e Pilates)
 * ============================================================
 *  Quem escolhe um plano mensal ou trimestral na área do aluno vê este contrato e assina
 *  (aceite eletrônico: marcar "li e concordo" + digitar o nome completo igual ao do cadastro).
 *  Antes disso, quem ainda não preencheu a ficha de saúde preenche (é pedida na 1ª reserva
 *  ou na 1ª contratação de plano, nunca no cadastro).
 *
 *  COMO COLOCAR O CONTRATO DA CASA (só aqui, nenhum outro arquivo muda):
 *   1. Cole o texto em CONTRATO_TEXTO, uma linha por parágrafo.
 *        - linha que começa com "# "  = título de cláusula (ex.: "# 1. Do objeto")
 *        - linha em branco             = ignorada
 *   2. Troque CONTRATO_VERSAO (ex.: '2026-11-01') e mude para CONTRATO_PRONTO = true.
 *      Contrato mudou depois? Edite o texto e troque a versão: quem assinou a versão antiga
 *      assina de novo na próxima contratação. A versão assinada fica registrada.
 *   3. Publique (git push). Enquanto CONTRATO_PRONTO for false, ninguém é obrigado a assinar
 *      (os planos continuam sendo vendidos como hoje, só com a ficha de saúde exigida).
 *
 *  Dá para usar estes campos no texto; eles são trocados na hora de mostrar e de assinar:
 *   {nome} {cpf} {whatsapp} {email} {endereco}  → dados do cadastro da pessoa
 *   {plano} {modalidade} {frequencia} {tipo}    → o plano escolhido (tipo = mensal ou trimestral)
 *   {valor} {validade} {data}                   → preço, dias de validade e a data de hoje
 *
 *  Cada assinatura grava uma linha na aba Contratos (quem, plano, versão, impressão digital do texto,
 *  data e hora) e um PDF na pasta privada "Casa Âmbar · Contratos" do Drive. A pessoa recebe a cópia por e-mail.
 */

var CONTRATO_PRONTO = false;
var CONTRATO_VERSAO = 'rascunho';
var CONTRATO_TITULO = 'Contrato de prestação de serviços';
// true: assina de novo a cada plano que contratar. false: assina uma vez por versão do contrato.
var CONTRATO_A_CADA_COMPRA = true;
var PASTA_CONTRATOS = 'Casa Âmbar · Contratos';
var CONTRATO_TEXTO = [
  '# Contrato de prestação de serviços (texto de exemplo: troque pelo contrato da Casa)',
  'Este é um texto de exemplo. {nome}, CPF {cpf}, contrata o plano {plano} ({tipo}), no valor de {valor}, com validade de {validade} dias.',
].join('\n');

function planoExigeContrato(plano) {
  return !!plano && (plano.tipo === 'mensal' || plano.tipo === 'trimestral') && (plano.modalidade === 'Yoga' || plano.modalidade === 'Pilates');
}

// texto do contrato com os dados da pessoa e do plano
function contratoParaPlano(aluno, plano) {
  var dados = {
    nome: String(aluno.nome || ''), cpf: normCpf(aluno.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    whatsapp: soDigitos(aluno.whatsapp), email: String(aluno.email || ''),
    endereco: [aluno.endereco, aluno.numero, aluno.complemento, aluno.bairro, aluno.cidade && (aluno.cidade + (aluno.uf ? '/' + aluno.uf : '')), aluno.cep].filter(function (x) { return String(x || '').trim(); }).join(', '),
    plano: String(plano.nome || ''), modalidade: String(plano.modalidade || ''), tipo: plano.tipo === 'trimestral' ? 'trimestral' : 'mensal',
    frequencia: numero(plano.aulas_semana) > 0 ? 'até ' + numero(plano.aulas_semana) + ' aula(s) por semana' : '',
    valor: brl(plano.preco), validade: String(numero(plano.validade_dias) || (plano.tipo === 'trimestral' ? 90 : 30)),
    data: hojeTexto().split('-').reverse().join('/'),
  };
  var texto = String(CONTRATO_TEXTO || '').replace(/\{(\w+)\}/g, function (todo, k) { return dados.hasOwnProperty(k) ? dados[k] : todo; });
  return texto.split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim(); });
}

function hashContrato(linhas) { return sha256Hex(CONTRATO_VERSAO + '\n' + linhas.join('\n')); }

function contratoAssinadoDe(cpf) {
  return lerAba('Contratos').filter(function (c) { return c.id && normCpf(c.cpf) === normCpf(cpf); });
}

// aceite que vale para esta contratação: do mesmo plano e da versão atual, assinado há menos de 48 h e ainda sem pagamento
// feito depois dele (o aceite "gasta" quando o plano é pago; pedido não pago pode ser refeito sem assinar de novo)
function aceiteDisponivel(cpf, plano) {
  if (!CONTRATO_PRONTO) return null;
  var limite = Date.now() - 48 * 3600000;
  var pagos = null;
  var lista = contratoAssinadoDe(cpf).filter(function (c) {
    if (String(c.versao) !== CONTRATO_VERSAO) return false;
    if (!CONTRATO_A_CADA_COMPRA) return true;
    if (String(c.plano_id) !== String(plano.id)) return false;
    var quando = momentoDe(c.assinado_em);
    if (isNaN(quando.getTime()) || quando.getTime() < limite) return false;
    pagos = pagos || pagamentosPagos();
    return !pagos.some(function (p) {
      return normCpf(p.cpf) === normCpf(cpf) && String(p.plano_id) === String(plano.id) && String(p.pago_em) >= String(c.assinado_em);
    });
  });
  return lista.length ? lista[lista.length - 1] : null;
}

// site: o que a tela precisa para mostrar o contrato (ou saber que não há)
function contratoDoPlano(d) {
  var aluno = alunoDaSessao(d.token);
  var plano = buscarPlano(String(d.planoId || ''));
  if (!plano) throw new Error('Plano não encontrado.');
  var exige = planoExigeContrato(plano);
  var r = { ficha: !!linhaAnamnese(normCpf(aluno.cpf)), exige: exige && CONTRATO_PRONTO, assinado: false };
  if (!r.exige) return r;
  r.assinado = !!aceiteDisponivel(aluno.cpf, plano);
  r.titulo = CONTRATO_TITULO;
  r.versao = CONTRATO_VERSAO;
  r.texto = contratoParaPlano(aluno, plano);
  r.nomeCadastro = String(aluno.nome || '');
  return r;
}

function pastaContratos() { return pastaPrivada(PASTA_CONTRATOS, 'PASTA_CONTRATOS_ID'); }

function gerarPdfContrato(c, linhas, aluno) {
  var corpo = linhas.map(function (l) {
    return /^#\s/.test(l) ? '<h2>' + escHtml(l.replace(/^#\s+/, '')) + '</h2>' : '<p>' + escHtml(l) + '</p>';
  }).join('');
  var html = '<html><head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;color:#2F3821;font-size:11px;margin:30px;line-height:1.5}' +
    'h1{font-size:18px;letter-spacing:3px;font-weight:normal;margin:0}h2{font-size:12px;margin:16px 0 4px;color:#7E3717}.topo{border-bottom:2px solid #2F3821;padding-bottom:8px;margin-bottom:10px}' +
    '.sub{color:#6F784D;font-size:10px;letter-spacing:2px}.assin{margin-top:26px;border-top:1px solid #A6845E;padding-top:10px}.assin p{margin:2px 0}.mini{color:#6B6F58;font-size:9px;word-break:break-all}</style></head><body>' +
    '<div class="topo"><h1>CASA ÂMBAR</h1><div class="sub">' + escHtml(CONTRATO_TITULO.toUpperCase()) + '</div></div>' + corpo +
    '<div class="assin"><p><strong>Assinado eletronicamente</strong> por ' + escHtml(c.nome_digitado) + ' (CPF ' + escHtml(normCpf(aluno.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')) + ')</p>' +
    '<p>em ' + escHtml(String(c.assinado_em)) + ' (horário de Fortaleza) · contrato versão ' + escHtml(CONTRATO_VERSAO) + ' · plano ' + escHtml(c.plano) + '</p>' +
    '<p class="mini">Impressão digital do texto (SHA-256): ' + escHtml(c.hash) + '</p>' +
    '<p class="mini">Aceite dado na área do aluno do site da Casa Âmbar, com login por CPF e senha da própria pessoa.</p></div></body></html>';
  var nome = 'Contrato · ' + aluno.nome + ' · ' + c.plano_id + ' · ' + c.id + '.pdf';
  var pdf = Utilities.newBlob(html, 'text/html', 'contrato.html').getAs('application/pdf').setName(nome);
  var arq = pastaContratos().createFile(pdf);
  return { url: arq.getUrl(), blob: pdf };
}

// site: assinar o contrato do plano escolhido
function assinarContrato(d) {
  var aluno = alunoDaSessao(d.token);
  var cpf = normCpf(aluno.cpf);
  if (!CONTRATO_PRONTO) throw new Error('O contrato ainda não está disponível. Fale com a recepção.');
  var plano = buscarPlano(String(d.planoId || ''));
  if (!planoExigeContrato(plano)) throw new Error('Este plano não precisa de contrato.');
  if (!linhaAnamnese(cpf)) throw erroCod('Preencha sua ficha de saúde antes de assinar o contrato.', 'FICHA');
  if (d.aceito !== true) throw new Error('Marque que leu e concorda com o contrato.');
  var digitado = semAcento(d.nome), cadastro = semAcento(aluno.nome);
  if (!digitado || digitado !== cadastro) throw new Error('Digite seu nome completo exatamente como está no cadastro: ' + aluno.nome + '.');
  limitarPorMinutos('contrato_' + cpf, 10, 60);
  var linhas = contratoParaPlano(aluno, plano);
  var existente = aceiteDisponivel(cpf, plano);
  if (existente) return { assinado: true, id: String(existente.id), versao: CONTRATO_VERSAO };
  var c = { id: novoId('CT'), cpf: cpf, nome: aluno.nome, plano_id: plano.id, plano: plano.nome, versao: CONTRATO_VERSAO, hash: hashContrato(linhas),
    assinado_em: agoraTexto(), nome_digitado: String(d.nome).replace(/\s+/g, ' ').trim().slice(0, 120), dispositivo: String(d.dispositivo || '').slice(0, 160), pdf: '', order_nsu: '' };
  var pdf = null;
  try { pdf = gerarPdfContrato(c, linhas, aluno); c.pdf = pdf.url; } catch (e) { Logger.log('PDF do contrato: ' + e.message); c.pdf = 'erro ao gerar o PDF'; }
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    var ja = aceiteDisponivel(cpf, plano);
    if (ja) return { assinado: true, id: String(ja.id), versao: CONTRATO_VERSAO };
    adicionarLinha('Contratos', c);
  } finally {
    soltarTrava(trava);
  }
  if (emailValido(aluno.email)) {
    try {
      enviarEmail(aluno.email, 'Cópia do seu contrato · Casa Âmbar', 'Contrato assinado',
        ['Olá, ' + primeiroNome(aluno.nome) + '.', 'Você assinou o contrato do plano ' + plano.nome + ' em ' + c.assinado_em + '. A cópia está em anexo.',
          'Se não foi você, fale com a recepção pelo WhatsApp (85) 99185-6528.'], null, '', '', pdf ? [pdf.blob] : null);
    } catch (e) { Logger.log('cópia do contrato: ' + e.message); }
  }
  return { assinado: true, id: c.id, versao: CONTRATO_VERSAO };
}

// ao criar o pagamento do plano: exige ficha e (se o contrato estiver ligado) o aceite; devolve a linha do aceite para ligar ao pedido
function exigirFichaEContrato(aluno, plano) {
  if (!planoExigeContrato(plano)) return null;
  if (!linhaAnamnese(normCpf(aluno.cpf))) throw erroCod('Preencha sua ficha de saúde antes de contratar um plano.', 'FICHA');
  if (!CONTRATO_PRONTO) return null;
  var a = aceiteDisponivel(aluno.cpf, plano);
  if (!a) throw erroCod('Leia e assine o contrato do plano antes de pagar.', 'CONTRATO');
  return a;
}

// bancada: contratos assinados de uma cliente
function contratosPublicos(cpf) {
  return contratoAssinadoDe(cpf).map(function (c) {
    return { id: String(c.id), plano: String(c.plano), versao: String(c.versao), assinadoEm: String(c.assinado_em), pdf: /^https?:/.test(String(c.pdf)) ? String(c.pdf) : '', pedido: String(c.order_nsu || '') };
  }).reverse();
}
