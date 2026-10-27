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
   {nascimento} {quantidade}                    → data de nascimento e quantidade de aulas do plano
   {imagem}                                     → escolha da pessoa sobre o uso de imagem (tela de assinatura)
 *
 *  Cada assinatura grava uma linha na aba Contratos (quem, plano, versão, impressão digital do texto,
 *  data e hora) e um PDF na pasta privada "Casa Âmbar · Contratos" do Drive. A pessoa recebe a cópia por e-mail.
 */

var CONTRATO_PRONTO = true;
var CONTRATO_VERSAO = '2026-10-27';
var CONTRATO_TITULO = 'Contrato de prestação de serviços';
// true: assina de novo a cada plano que contratar. false: assina uma vez por versão do contrato.
var CONTRATO_A_CADA_COMPRA = true;
var PASTA_CONTRATOS = 'Casa Âmbar · Contratos';
// Texto do contrato da Casa (modelo "Contrato Clientes - Geral"), adaptado para os planos de Yoga e Pilates contratados pelo site.
// Os Anexos I (declaração de saúde, que no site é a ficha de saúde) e II (consentimento de procedimentos de estética/fisioterapia) não entram.
// {imagem} = escolha da pessoa sobre o uso de imagem (marcada na tela de assinatura).
var CONTRATO_TEXTO = [
  'CASA AMBAR LTDA, CNPJ nº 64.075.396/0001-19, com sede na Rua Eduardo Salgado, nº 448, Aldeota, Fortaleza/CE, CEP 60.150-140, e-mail contato@acasaambar.com.br, telefone (85) 9844-3720, doravante CASA AMBAR;',
  'CLIENTE: Nome: {nome} · CPF: {cpf} · Data de nascimento: {nascimento} · Endereço: {endereco} · Telefone/WhatsApp: {whatsapp} · E-mail: {email}.',
  'Se o CLIENTE for menor de 18 anos, a contratação é feita e assinada pelo seu responsável legal, que responde por este contrato.',
  '# Cláusula primeira – Do objeto',
  'A CASA AMBAR prestará ao CLIENTE os serviços assinalados abaixo, por meio de profissionais legalmente habilitados por ela indicados, que poderão ser substituídos por outros de igual qualificação:',
  'Serviço: {modalidade}',
  'Plano ou pacote: {plano} ({tipo})',
  'Quantidade de sessões/aulas: {quantidade}',
  'Frequência: {frequencia}',
  'Validade do pacote: {validade} dias.',
  'Procedimentos invasivos ou minimamente invasivos não são regidos por este contrato e dependem de contrato e termo de consentimento próprios.',
  '# Cláusula segunda – Do preço e pagamento',
  'Valor total: {valor}',
  'Forma de pagamento: pelo link de pagamento seguro da InfinitePay, no Pix ou no cartão, nas condições mostradas no momento do pagamento.',
  'O atraso sujeita o CLIENTE a multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês. Após 30 (trinta) dias de atraso, os atendimentos poderão ser suspensos até a regularização.',
  '# Cláusula terceira – Dos agendamentos, faltas e reposições',
  'Sessões e aulas podem ser remarcadas sem custo se o aviso for dado com, no mínimo, 24 (vinte e quatro) horas de antecedência. A falta sem esse aviso conta como sessão ou aula utilizada.',
  'Nas aulas em turma, a reposição depende de vaga disponível e está limitada a 2 (duas) por mês, dentro da validade do plano. Sessões ou aulas não utilizadas dentro da validade do pacote não geram crédito ou devolução, salvo nos casos da cláusula quinta.',
  'Atrasos do CLIENTE não prorrogam o horário do atendimento.',
  '# Cláusula quarta – Saúde e responsabilidades do cliente',
  'O CLIENTE declara que informará, com veracidade, na avaliação inicial e sempre que houver alteração, suas condições de saúde, medicamentos em uso, cirurgias, gestação, alergias e restrições. Informações omitidas ou falsas podem comprometer a segurança do atendimento e afastar a responsabilidade da CASA AMBAR pelos danos delas decorrentes.',
  'O profissional poderá, por razão técnica, adaptar, interromper ou recusar determinado atendimento, bem como solicitar liberação médica.',
  'Os resultados dependem de fatores individuais, como condição física, frequência e cumprimento das orientações, e não há garantia de resultado específico.',
  '# Cláusula quinta – Do cancelamento',
  'O CLIENTE pode cancelar este contrato a qualquer tempo, mediante aviso por escrito, inclusive por WhatsApp ou e-mail. Serão restituídos os valores das sessões ou aulas não utilizadas, deduzida multa de 30% (trinta por cento) sobre esse saldo.',
  'A multa não será cobrada se o cancelamento decorrer de impossibilidade médica comprovada, de falha na prestação do serviço ou de desistência exercida em até 7 (sete) dias da contratação feita fora do estabelecimento, como pela internet ou por WhatsApp (art. 49 do Código de Defesa do Consumidor).',
  'A restituição será feita em até 10 (dez) dias úteis.',
  '# Cláusula sexta – Dos dados pessoais e imagem',
  'Os dados pessoais do CLIENTE, inclusive os de saúde, serão utilizados apenas para a prestação dos serviços, cumprimento de obrigações legais e comunicação sobre atendimentos, nos termos da Lei nº 13.709/2018.',
  'Autorização de uso de imagem para divulgação em redes sociais e materiais da CASA AMBAR: {imagem}. A autorização pode ser revogada a qualquer tempo, por escrito.',
  '# Cláusula sétima – Vigência e foro',
  'Este contrato vigora até o fim da validade do plano ou pacote contratado e pode ser renovado por nova contratação.',
  'Fica eleito o foro da Comarca de Fortaleza/CE.',
  'Fortaleza/CE, {data}. Assinatura eletrônica do CLIENTE, com nome, data e hora registrados ao final deste documento.',
].join('\n');

function planoExigeContrato(plano) {
  return !!plano && (plano.tipo === 'mensal' || plano.tipo === 'trimestral') && (plano.modalidade === 'Yoga' || plano.modalidade === 'Pilates');
}

// texto do contrato com os dados da pessoa e do plano
function contratoParaPlano(aluno, plano, imagem) {
  var dados = {
    nome: String(aluno.nome || ''), cpf: normCpf(aluno.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    whatsapp: soDigitos(aluno.whatsapp), email: String(aluno.email || ''),
    endereco: [aluno.endereco, aluno.numero, aluno.complemento, aluno.bairro, aluno.cidade && (aluno.cidade + (aluno.uf ? '/' + aluno.uf : '')), aluno.cep].filter(function (x) { return String(x || '').trim(); }).join(', '),
    plano: String(plano.nome || ''), modalidade: String(plano.modalidade || ''), tipo: plano.tipo === 'trimestral' ? 'trimestral' : 'mensal',
    frequencia: numero(plano.aulas_semana) > 0 ? 'até ' + numero(plano.aulas_semana) + ' aula(s) por semana' : '',
    valor: brl(plano.preco), validade: String(numero(plano.validade_dias) || (plano.tipo === 'trimestral' ? 90 : 30)),
    data: hojeTexto().split('-').reverse().join('/'),
    nascimento: nascimentoTexto(aluno.nascimento || nascimentoDaFicha(aluno.cpf)),
    quantidade: numero(plano.aulas_total) > 0 ? numero(plano.aulas_total) + ' aulas' : 'aulas conforme a frequência semanal, dentro da validade',
    imagem: imagem === 'sim' ? '(X) Autorizo ( ) Não autorizo' : imagem === 'nao' ? '( ) Autorizo (X) Não autorizo' : '(escolha abaixo, antes de assinar)',
  };
  var texto = String(CONTRATO_TEXTO || '').replace(/\{(\w+)\}/g, function (todo, k) { return dados.hasOwnProperty(k) ? dados[k] : todo; });
  return texto.split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim(); });
}

// o cadastro do site não pede o nascimento; a ficha de saúde pede
function nascimentoDaFicha(cpf) {
  var f = lerAba('Anamneses').filter(function (x) { return normCpf(x.cpf) === normCpf(cpf); })[0];
  return f ? f.data_nascimento : '';
}

// 'AAAA-MM-DD' (ou a data da planilha) → 'DD/MM/AAAA'
function nascimentoTexto(v) {
  var t = ehData(v) ? dataTexto(v) : String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t.split('-').reverse().join('/') : 'não informada';
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

// desenho da assinatura (PNG em data URL, vindo do quadro do site): confere o formato e o tamanho; devolve os bytes
function bytesDaAssinatura(dataUrl) {
  var t = String(dataUrl || '');
  var m = t.match(/^data:image\/png;base64,([A-Za-z0-9+\/=]+)$/);
  if (!m || t.length > 400000) throw new Error('Desenhe sua assinatura no quadro antes de continuar.');
  var bytes = Utilities.base64Decode(m[1]);
  var texto = function (de, ate) { var s = ''; for (var i = de; i < ate; i++) s += String.fromCharCode(bytes[i] & 255); return s; };
  // PNG de verdade: assinatura de 8 bytes, bloco IHDR logo no começo e bloco IEND no fim
  var pngOk = bytes.length >= 200 && (bytes[0] & 255) === 137 && texto(1, 4) === 'PNG' && texto(12, 16) === 'IHDR' && texto(bytes.length - 8, bytes.length - 4) === 'IEND';
  if (!pngOk) {
    throw new Error('Não deu para ler o desenho da assinatura. Limpe o quadro e assine de novo.');
  }
  return { base64: m[1], bytes: bytes };
}

function gerarPdfContrato(c, linhas, aluno, assinatura) {
  var corpo = linhas.map(function (l) {
    return /^#\s/.test(l) ? '<h2>' + escHtml(l.replace(/^#\s+/, '')) + '</h2>' : '<p>' + escHtml(l) + '</p>';
  }).join('');
  var html = '<html><head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;color:#2F3821;font-size:11px;margin:30px;line-height:1.5}' +
    'h1{font-size:18px;letter-spacing:3px;font-weight:normal;margin:0}h2{font-size:12px;margin:16px 0 4px;color:#7E3717}.topo{border-bottom:2px solid #2F3821;padding-bottom:8px;margin-bottom:10px}' +
    '.sub{color:#6F784D;font-size:10px;letter-spacing:2px}.assin{margin-top:26px;border-top:1px solid #A6845E;padding-top:10px}.assin p{margin:2px 0}.mini{color:#6B6F58;font-size:9px;word-break:break-all}</style></head><body>' +
    '<div class="topo"><h1>CASA ÂMBAR</h1><div class="sub">' + escHtml(CONTRATO_TITULO.toUpperCase()) + '</div></div>' + corpo +
    '<div class="assin">' + (assinatura ? '<p><img src="data:image/png;base64,' + assinatura.base64 + '" width="260" alt="Assinatura"></p>' : '') + '<p><strong>Assinado eletronicamente</strong> por ' + escHtml(c.nome_digitado) + ' (CPF ' + escHtml(normCpf(aluno.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')) + ')</p>' +
    '<p>em ' + escHtml(String(c.assinado_em)) + ' (horário de Fortaleza) · contrato versão ' + escHtml(CONTRATO_VERSAO) + ' · plano ' + escHtml(c.plano) + '</p>' +
    '<p class="mini">Impressão digital do texto (SHA-256): ' + escHtml(c.hash) + '</p>' +
    '<p class="mini">Aceite dado na área do aluno do site da Casa Âmbar, com login por CPF e senha da própria pessoa.</p></div></body></html>';
  var nome = 'Contrato · ' + aluno.nome + ' · ' + c.plano_id + ' · ' + c.id + '.pdf';
  var pdf = Utilities.newBlob(html, 'text/html', 'contrato.html').getAs('application/pdf').setName(nome);
  var arq = pastaContratos().createFile(pdf);
  return { url: arq.getUrl(), id: arq.getId(), blob: pdf };
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
  var imagem = d.imagem === 'sim' || d.imagem === 'nao' ? d.imagem : '';
  if (!imagem) throw new Error('Escolha uma das opções sobre o uso de imagem (cláusula sexta).');
  var digitado = semAcento(d.nome), cadastro = semAcento(aluno.nome);
  if (!digitado || digitado !== cadastro) throw new Error('Digite seu nome completo exatamente como está no cadastro: ' + aluno.nome + '.');
  var desenho = bytesDaAssinatura(d.assinatura);
  limitarPorMinutos('contrato_' + cpf, 10, 60);
  var linhas = contratoParaPlano(aluno, plano, imagem);
  var existente = aceiteDisponivel(cpf, plano);
  if (existente) return { assinado: true, id: String(existente.id), versao: CONTRATO_VERSAO };
  var c = { id: novoId('CT'), cpf: cpf, nome: aluno.nome, plano_id: plano.id, plano: plano.nome, versao: CONTRATO_VERSAO, hash: hashContrato(linhas),
    assinado_em: agoraTexto(), nome_digitado: String(d.nome).replace(/\s+/g, ' ').trim().slice(0, 120), dispositivo: String(d.dispositivo || '').slice(0, 160), pdf: '', order_nsu: '', imagem: imagem === 'sim' ? 'autoriza' : 'não autoriza' };
  var pdf = null;
  // desenho da assinatura guardado como imagem na pasta privada (e também dentro do PDF)
  try {
    var png = pastaContratos().createFile(Utilities.newBlob(desenho.bytes, 'image/png', 'Assinatura · ' + aluno.nome + ' · ' + c.id + '.png'));
    c.assinatura = png.getUrl();
  } catch (e) { Logger.log('assinatura do contrato: ' + e.message); c.assinatura = 'erro ao guardar o desenho'; }
  try { pdf = gerarPdfContrato(c, linhas, aluno, desenho); c.pdf = pdf.url; c.pdf_id = pdf.id; } catch (e) { Logger.log('PDF do contrato: ' + e.message); c.pdf = 'erro ao gerar o PDF'; }
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    var ja = aceiteDisponivel(cpf, plano);
    if (ja) return { assinado: true, id: String(ja.id), versao: CONTRATO_VERSAO };
    adicionarLinha('Contratos', c);
  } finally {
    soltarTrava(trava);
  }
  // a cópia por e-mail NÃO sai agora: só depois que o pagamento do plano for confirmado (enviarContratoPago)
  return { assinado: true, id: c.id, versao: CONTRATO_VERSAO };
}

// pagamento do plano confirmado (site, link ou balcão): manda a cópia assinada do contrato por e-mail, uma vez só
function enviarContratoPago(pg) {
  if (!CONTRATO_PRONTO || !pg || !soDigitos(pg.cpf)) return;
  var plano = buscarPlano(String(pg.plano_id));
  if (!planoExigeContrato(plano)) return;
  var pendentes = contratoAssinadoDe(pg.cpf).filter(function (c) { return String(c.plano_id) === String(pg.plano_id) && !String(c.enviado_em || ''); });
  if (!pendentes.length) return;
  var c = pendentes[pendentes.length - 1];
  // marca antes de mandar: se o pagamento for confirmado duas vezes (webhook + tela), o e-mail não sai em dobro
  atualizarLinha('Contratos', c._linha, { enviado_em: agoraTexto(), order_nsu: String(pg.order_nsu) });
  var aluno = lerAba('Alunos').filter(function (a) { return normCpf(a.cpf) === normCpf(pg.cpf); })[0];
  if (!aluno || !emailValido(aluno.email)) return;
  var anexos = null;
  try { if (c.pdf_id) anexos = [DriveApp.getFileById(String(c.pdf_id)).getBlob()]; } catch (e) { Logger.log('anexo do contrato: ' + e.message); }
  enviarEmail(aluno.email, 'Seu contrato assinado · Casa Âmbar', 'Pagamento confirmado',
    ['Olá, ' + primeiroNome(aluno.nome) + '.', 'Recebemos o pagamento do plano ' + plano.nome + '. A cópia do contrato que você assinou em ' + c.assinado_em + ' ' + (anexos ? 'está em anexo.' : 'fica com a recepção; se quiser, é só pedir pelo WhatsApp.'),
      'Se não foi você, fale com a recepção pelo WhatsApp (85) 99185-6528.'], null, '', '', anexos);
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
    return { id: String(c.id), plano: String(c.plano), versao: String(c.versao), imagem: String(c.imagem || ''), assinadoEm: String(c.assinado_em), pdf: /^https?:/.test(String(c.pdf)) ? String(c.pdf) : '', assinatura: /^https?:/.test(String(c.assinatura)) ? String(c.assinatura) : '', pedido: String(c.order_nsu || ''), enviado: !!String(c.enviado_em || '') };
  }).reverse();
}
