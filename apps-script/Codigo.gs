/**
 * ============================================================
 *  CASA ÂMBAR — BACKEND DE RESERVAS (Google Apps Script)
 *  Banco de dados: a planilha onde este script está instalado.
 * ============================================================
 *
 *  COMO INSTALAR (uma vez só):
 *  1. Crie uma planilha nova no Google Sheets (conta da Casa Âmbar) e coloque
 *     o ID dela em PLANILHA_ID, logo abaixo.
 *  2. Em script.google.com (ou Extensões → Apps Script), apague o que houver
 *     e cole este arquivo inteiro.
 *  3. No menu da esquerda, clique na engrenagem (Configurações do projeto)
 *     e marque "Mostrar arquivo de manifesto appsscript.json".
 *     Abra o appsscript.json e troque o conteúdo pelo arquivo appsscript.json da pasta.
 *  4. Salve. No topo, escolha a função "configurarPlanilha" e clique em Executar.
 *     Autorize o acesso. As abas Grade, Alunos, Reservas e Sessoes serão criadas.
 *  5. Clique em Implantar → Nova implantação → tipo "App da Web".
 *     Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 *  6. Copie a URL que termina em /exec e cole em src/config.js (API_URL).
 *
 *  Sempre que mudar este código: Implantar → Gerenciar implantações →
 *  editar (lápis) → Versão: Nova versão → Implantar. A URL continua a mesma.
 */

// -------------------- PLANILHA --------------------
// ID da planilha (o trecho da URL entre /d/ e /edit)
var PLANILHA_ID = '1FM-mNF_w0FSS48rhEYp54dRrgwANpIbtTEK2nmWewdo';

var _planilha = null;
function planilha() {
  if (!_planilha) _planilha = SpreadsheetApp.openById(PLANILHA_ID);
  return _planilha;
}

// -------------------- CHAVE DA INFINITEPAY --------------------
// A API Key NÃO fica no código (o GitHub é público). Ela fica em:
// Apps Script → Configurações do projeto (engrenagem) → Propriedades do script
//   Propriedade: INFINITEPAY_API_KEY    Valor: a chave gerada no Checkout da InfinitePay
function chaveInfinitePay() {
  return PropertiesService.getScriptProperties().getProperty('INFINITEPAY_API_KEY') || '';
}

// -------------------- AJUSTES --------------------
var AJUSTES = {
  diasVisiveis: 7, // quantos dias aparecem na agenda
  checkinAbreMinAntes: 30, // check-in libera X minutos antes
  cancelarAteHorasAntes: 2, // cancelamento até X horas antes
  duracaoAulaMin: 60,
  validadeSessaoDias: 30, // o aluno fica conectado por X dias
  fuso: 'America/Fortaleza',
  // Pagamentos (InfinitePay · Checkout Integrado)
  infinitepayHandle: 'acasaambar', // InfiniteTag sem o $
  siteUrl: 'https://www.acasambar.com.br/',
  apiUrl: 'https://script.google.com/macros/s/AKfycbyifKgzuxAU0V-RR639J3vs1opngMDOPWpLXMEWg7LkgB4bpyoVy4yqRXuLu7_v_DWx/exec',
  reservaPendenteMin: 20, // tapete fica guardado por X minutos enquanto a aluna paga
  // Wellhub (parceiro a partir do Gold+): quem tem o plano reserva pelo site
  // e faz o check-in no app Wellhub ao chegar.
  wellhub: {
    ativo: true,
    modalidades: ['Yoga', 'Pilates'],
    reservasPorDia: 1, // o Wellhub permite 1 check-in por dia no mesmo parceiro
    planoMinimo: 'Gold+',
  },
};

// Ajustes que a bancada pode mudar (ficam nas Propriedades do script)
var AJUSTES_EDITAVEIS = ['diasVisiveis', 'checkinAbreMinAntes', 'cancelarAteHorasAntes', 'reservaPendenteMin', 'valeValidadeDias', 'wellhubAtivo', 'wellhubReservasPorDia', 'wellhubPendentePodeReservar',
  'lembreteServicos', 'lembreteAulas'];
AJUSTES.valeValidadeDias = 365;
AJUSTES.lembreteServicos = true; // e-mail na véspera para quem tem serviço agendado
AJUSTES.lembreteAulas = false; // e-mail na véspera para quem reservou aula
var _ajustesAplicados = false;
function aplicarAjustesSalvos() {
  if (_ajustesAplicados) return;
  _ajustesAplicados = true;
  var j = {};
  try { j = JSON.parse(PropertiesService.getScriptProperties().getProperty('AJUSTES_JSON') || '{}') || {}; } catch (e) { j = {}; }
  ['diasVisiveis', 'checkinAbreMinAntes', 'cancelarAteHorasAntes', 'reservaPendenteMin', 'valeValidadeDias'].forEach(function (k) {
    if (j[k] != null && !isNaN(Number(j[k]))) AJUSTES[k] = Number(j[k]);
  });
  if (j.wellhubAtivo != null) AJUSTES.wellhub.ativo = !!j.wellhubAtivo;
  if (j.wellhubReservasPorDia != null) AJUSTES.wellhub.reservasPorDia = Number(j.wellhubReservasPorDia) || 1;
  if (j.wellhubPendentePodeReservar != null) AJUSTES.wellhub.pendentePodeReservar = !!j.wellhubPendentePodeReservar;
  if (j.lembreteServicos != null) AJUSTES.lembreteServicos = !!j.lembreteServicos;
  if (j.lembreteAulas != null) AJUSTES.lembreteAulas = !!j.lembreteAulas;
}

var ABAS = {
  Grade: ['ativo', 'modalidade', 'dia_semana', 'hora', 'professor', 'capacidade'],
  Alunos: ['cpf', 'nome', 'whatsapp', 'email', 'senha_hash', 'sal', 'criado_em', 'ativo', 'wellhub', 'wellhub_id', 'wellhub_desde', 'obs_internas', 'origem_cadastro',
    'nascimento', 'marketing'],
  Reservas: ['id', 'aula_id', 'data', 'hora', 'modalidade', 'professor', 'cpf', 'nome', 'tapete', 'status', 'criada_em', 'checkin_em', 'cancelada_em', 'credito_id', 'pagamento_nsu', 'expira_ms', 'lembrete'],
  Sessoes: ['token', 'cpf', 'criada_em', 'expira_em'],
  Bloqueios: ['data', 'hora', 'modalidade', 'motivo'],
  Anamneses: ['cpf', 'nome', 'preenchida_em', 'data_nascimento', 'emergencia_nome', 'emergencia_parentesco', 'emergencia_telefone', 'plano_saude',
    'parq_1', 'parq_2', 'parq_3', 'parq_4', 'parq_5', 'parq_6', 'parq_7', 'parq_algum_sim',
    'comorbidades', 'comorbidade_outra', 'gestante', 'gestante_semanas', 'cirurgias', 'lesoes', 'medicamentos', 'alergias',
    'atividade_regular', 'observacoes', 'declaracao', 'consentimento', 'pdf'],
  // Catálogo do que se vende no site (edite preços e planos aqui)
  Planos: ['id', 'ativo', 'modalidade', 'tipo', 'nome', 'aulas_semana', 'aulas_total', 'validade_dias', 'preco', 'descricao', 'sem_juros_ate'],
  Pagamentos: ['order_nsu', 'cpf', 'nome', 'plano_id', 'descricao', 'valor', 'status', 'link', 'criado_em', 'pago_em', 'metodo', 'parcelas',
    'valor_pago', 'transaction_nsu', 'slug', 'recibo', 'reserva_id', 'aula_id', 'tapete', 'observacao',
    'valor_original', 'desconto', 'cupom', 'vale', 'vale_usado', 'origem', 'registrado_por', 'promocao', 'comanda', 'tipo_item', 'profissional'],
  // Créditos de aula de cada aluno (vêm de pagamentos ou são lançados à mão pela recepção)
  Creditos: ['id', 'cpf', 'nome', 'plano_id', 'descricao', 'modalidade', 'tipo', 'aulas_semana', 'aulas_total', 'inicio', 'fim', 'origem', 'ativo'],
  // ---- bancada interna ----
  Equipe: ['email', 'nome', 'papel', 'professor_nome', 'senha_hash', 'sal', 'ativo', 'criado_em', 'ultimo_acesso'],
  SessoesEquipe: ['token', 'email', 'criada_em', 'expira_em'],
  Redefinicoes: ['token_hash', 'tipo', 'id', 'email', 'criado_em', 'expira_ms', 'usado_em', 'motivo'],
  Registro: ['quando', 'quem', 'acao', 'detalhe'],
  Cupons: ['codigo', 'ativo', 'tipo', 'valor', 'modalidade', 'tipo_plano', 'inicio', 'fim', 'limite_total', 'limite_por_aluno', 'primeira_compra', 'descricao', 'criado_por', 'criado_em'],
  // Vale-presente é cortesia (não é vendido): dá uma aula/plano do catálogo ou um valor em R$
  Vales: ['codigo', 'status', 'tipo', 'plano_id', 'valor', 'cpf', 'nome', 'email', 'whatsapp', 'motivo', 'campanha', 'mensagem',
    'criado_em', 'criado_por', 'validade', 'resgatado_em', 'resgatado_cpf', 'enviado'],
  // ---- serviços (estética, fisioterapia...) agendados pela bancada ----
  Servicos: ['id', 'ativo', 'categoria', 'nome', 'duracao_min', 'preco', 'descricao', 'sem_juros_ate', 'comissao', 'consumo'],
  Pacotes: ['id', 'ativo', 'servico_id', 'sessoes', 'preco', 'validade_dias', 'sem_juros_ate'],
  Profissionais: ['nome', 'ativo', 'categorias', 'dias', 'inicio', 'fim', 'comissao', 'comissao_produto', 'servicos'],
  Professoras: ['nome', 'ativo', 'pilates_pct', 'wellhub_pct', 'yoga_por_aula', 'desde', 'atualizado_em'],
  Atendimentos: ['id', 'data', 'hora', 'duracao_min', 'servico_id', 'servico', 'categoria', 'profissional', 'cpf', 'nome', 'whatsapp', 'status',
    'pagamento', 'valor', 'credito_id', 'order_nsu', 'obs', 'criado_por', 'criado_em', 'atualizado_em', 'lembrete', 'comanda'],
  // ---- gestão (Gestao.gs) ----
  Produtos: ['id', 'ativo', 'nome', 'categoria', 'marca', 'unidade', 'preco', 'custo', 'estoque', 'minimo', 'vende', 'obs'],
  MovEstoque: ['quando', 'produto_id', 'produto', 'tipo', 'qtd', 'custo_unit', 'valor', 'motivo', 'ref', 'quem'],
  Comandas: ['id', 'status', 'aberta_em', 'fechada_em', 'cpf', 'nome', 'whatsapp', 'itens', 'subtotal', 'desconto', 'total', 'pagamentos', 'codigo', 'obs',
    'aberta_por', 'fechada_por'],
  Comissoes: ['id', 'data', 'profissional', 'origem', 'ref', 'item', 'base', 'pct', 'valor', 'status', 'pago_em', 'pago_por', 'despesa_id', 'criado_em'],
  Despesas: ['id', 'data', 'descricao', 'categoria', 'valor', 'forma', 'status', 'pago_em', 'recorrente', 'fornecedor', 'obs', 'ref', 'criado_por', 'criado_em'],
  Caixa: ['data', 'status', 'abertura', 'aberto_por', 'aberto_em', 'movimentos', 'dinheiro_vendas', 'esperado', 'contado', 'diferenca', 'fechado_por', 'fechado_em', 'obs'],
  Folgas: ['id', 'profissional', 'data', 'inicio', 'fim', 'motivo', 'criado_por', 'criado_em'],
  // ---- marketing e clientes (Marketing.gs, Clientes.gs) ----
  Promocoes: ['id', 'ativo', 'nome', 'descricao', 'tipo', 'valor', 'itens', 'categorias', 'dias', 'de', 'ate', 'onde', 'criado_por', 'criado_em'],
  Campanhas: ['id', 'criada_em', 'nome', 'publico', 'canal', 'assunto', 'mensagem', 'total', 'enviados', 'criado_por'],
  FichasEstetica: ['cpf', 'nome', 'atualizada_em', 'atualizada_por', 'queixa', 'objetivo', 'alergias', 'medicamentos', 'condicoes', 'acidos', 'procedimentos',
    'exposicao_solar', 'fototipo', 'tipo_pele', 'obs', 'consentimento_fotos'],
  Evolucoes: ['id', 'cpf', 'nome', 'data', 'profissional', 'atendimento_id', 'servico', 'anotacao', 'fotos', 'criado_por', 'criado_em'],
};

// Catálogo inicial (vai para a aba Planos na configuração)
var CATALOGO_INICIAL = [
  ['yoga-avulsa', 'SIM', 'Yoga', 'avulsa', 'Yoga · aula avulsa', 0, 1, 30, 63, 'Uma aula, válida por 30 dias'],
  ['yoga-mensal-1x', 'SIM', 'Yoga', 'mensal', 'Yoga · 1x na semana', 1, 0, 30, 200, 'Plano mensal'],
  ['yoga-mensal-2x', 'SIM', 'Yoga', 'mensal', 'Yoga · 2x na semana', 2, 0, 30, 350, 'Plano mensal'],
  ['yoga-mensal-3x', 'SIM', 'Yoga', 'mensal', 'Yoga · 3x na semana', 3, 0, 30, 480, 'Plano mensal'],
  ['yoga-mensal-4x', 'SIM', 'Yoga', 'mensal', 'Yoga · 4x na semana', 4, 0, 30, 580, 'Plano mensal'],
  ['yoga-trimestral-1x', 'SIM', 'Yoga', 'trimestral', 'Yoga · 1x na semana · trimestral', 1, 0, 90, 561, '3 meses (R$ 187/mês)'],
  ['yoga-trimestral-2x', 'SIM', 'Yoga', 'trimestral', 'Yoga · 2x na semana · trimestral', 2, 0, 90, 978, '3 meses (R$ 326/mês)'],
  ['yoga-trimestral-3x', 'SIM', 'Yoga', 'trimestral', 'Yoga · 3x na semana · trimestral', 3, 0, 90, 1344, '3 meses (R$ 448/mês)'],
  ['yoga-trimestral-4x', 'SIM', 'Yoga', 'trimestral', 'Yoga · 4x na semana · trimestral', 4, 0, 90, 1626, '3 meses (R$ 542/mês)'],
  ['pilates-avulsa', 'SIM', 'Pilates', 'avulsa', 'Pilates · aula avulsa', 0, 1, 30, 75, 'Uma aula, válida por 30 dias'],
  ['pilates-mensal-2x', 'SIM', 'Pilates', 'mensal', 'Pilates · 2x na semana', 2, 0, 30, 380, 'Plano mensal'],
  ['pilates-mensal-3x', 'SIM', 'Pilates', 'mensal', 'Pilates · 3x na semana', 3, 0, 30, 480, 'Plano mensal'],
  ['pilates-trimestral-2x', 'SIM', 'Pilates', 'trimestral', 'Pilates · 2x na semana · trimestral', 2, 0, 90, 1065, '3 meses (R$ 355/mês)'],
  ['pilates-trimestral-3x', 'SIM', 'Pilates', 'trimestral', 'Pilates · 3x na semana · trimestral', 3, 0, 90, 1347, '3 meses (R$ 449/mês)'],
];

// Nome da pasta do Google Drive onde ficam os PDFs das fichas de saúde
var PASTA_ANAMNESES = 'Casa Âmbar · Anamneses';

// Perguntas do PAR-Q (as mesmas do site), usadas no PDF
var PARQ_TEXTOS = [
  'Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?',
  'Você sente dores no peito quando pratica atividade física?',
  'No último mês, você sentiu dores no peito quando praticou atividade física?',
  'Você apresenta desequilíbrio devido a tontura e/ou perda da consciência?',
  'Você possui algum problema ósseo ou articular que poderia piorar com atividade física?',
  'Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?',
  'Sabe de alguma outra razão pela qual você não deve praticar atividade física?',
];

// ============================================================
//  1) CONFIGURAÇÃO INICIAL — execute uma vez
// ============================================================
function configurarPlanilha() {
  var ss = planilha();
  Object.keys(ABAS).forEach(function (nome) {
    var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
    if (aba.getLastRow() === 0) {
      aba.appendRow(ABAS[nome]);
      aba.getRange(1, 1, 1, ABAS[nome].length).setFontWeight('bold').setBackground('#2F3821').setFontColor('#E9DDC5');
      aba.setFrozenRows(1);
    }
  });
  // colunas de texto (para o CPF não perder zeros à esquerda)
  ss.getSheetByName('Alunos').getRange('A:C').setNumberFormat('@');
  ss.getSheetByName('Reservas').getRange('A:H').setNumberFormat('@');
  ss.getSheetByName('Grade').getRange('D:D').setNumberFormat('@');
  ss.getSheetByName('Bloqueios').getRange('A:B').setNumberFormat('@');
  ss.getSheetByName('Anamneses').getRange('A:G').setNumberFormat('@');
  ss.getSheetByName('Sessoes').getRange('A:B').setNumberFormat('@');
  ss.getSheetByName('Pagamentos').getRange('A:E').setNumberFormat('@');
  ss.getSheetByName('Creditos').getRange('A:K').setNumberFormat('@');
  ss.getSheetByName('Planos').getRange('A:E').setNumberFormat('@');
  Object.keys(ABAS).forEach(function (n) { garantirCabecalho(ss.getSheetByName(n), n); });
  var planos = ss.getSheetByName('Planos');
  if (planos.getLastRow() === 1) {
    planos.getRange(2, 1, CATALOGO_INICIAL.length, CATALOGO_INICIAL[0].length).setValues(CATALOGO_INICIAL);
  }
  pastaAnamneses(); // cria a pasta no Drive, se ainda não existir
  // testa o acesso à internet (InfinitePay) para pedir a autorização agora
  try { UrlFetchApp.fetch('https://www.infinitepay.io', { muteHttpExceptions: true }); } catch (e) { Logger.log('Aviso: ' + e.message); }

  var grade = ss.getSheetByName('Grade');
  if (grade.getLastRow() === 1) {
    var linhas = [];
    // dia_semana: 0=domingo, 1=segunda ... 6=sábado
    [[1, '06:30', 'Ana Paula'], [1, '07:30', 'Ana Paula'], [1, '18:30', 'Hanna'],
     [3, '06:30', 'Ana Paula'], [3, '07:30', 'Ana Paula'], [3, '18:30', 'Hanna'],
     [5, '06:30', 'Ana Paula'], [5, '07:30', 'Ana Paula'], [6, '07:00', 'Ana Paula']]
      .forEach(function (g) { linhas.push(['SIM', 'Yoga', g[0], g[1], g[2], 12]); });
    [1, 2, 3, 4, 5].forEach(function (d) {
      ['06:00', '07:00', '08:00', '09:00', '16:00', '17:00', '18:00', '19:00'].forEach(function (h) {
        linhas.push(['SIM', 'Pilates', d, h, Number(h.slice(0, 2)) < 12 ? 'Kalliny' : 'Sara', 4]);
      });
    });
    grade.getRange(2, 1, linhas.length, linhas[0].length).setValues(linhas);
  }
  Logger.log('Planilha configurada! Abas: ' + ss.getSheets().map(function (a) { return a.getName(); }).join(', '));
}

// Execute esta função uma vez para autorizar os pagamentos (InfinitePay).
// Ela pede ao Google a permissão "Conectar a um serviço externo".
function autorizarPagamentos() {
  var resp = UrlFetchApp.fetch('https://api.checkout.infinitepay.io/links', { method: 'get', muteHttpExceptions: true });
  Logger.log('Conexão com a InfinitePay liberada (resposta ' + resp.getResponseCode() + '). Pode fechar esta aba.');
}

// Diagnóstico: testa a criação de um link de R$ 1,00 de várias formas e mostra
// a resposta exata da InfinitePay no registro de execução. Não cobra nada.
function testarInfinitePay() {
  var base = { handle: AJUSTES.infinitepayHandle, items: [{ quantity: 1, price: 100, description: 'Teste Casa Ambar' }] };
  var nsu = 'TESTE' + Date.now();
  var variantes = [
    ['1. mínimo (handle + item)', base],
    ['2. + order_nsu', Object.assign({}, base, { order_nsu: nsu })],
    ['3. + redirect_url', Object.assign({}, base, { order_nsu: nsu + 'b', redirect_url: AJUSTES.siteUrl })],
    ['4. + webhook_url', Object.assign({}, base, { order_nsu: nsu + 'c', redirect_url: AJUSTES.siteUrl, webhook_url: AJUSTES.apiUrl })],
    ['5. + customer', Object.assign({}, base, { order_nsu: nsu + 'd', redirect_url: AJUSTES.siteUrl, webhook_url: AJUSTES.apiUrl,
      customer: { name: 'Teste Casa Ambar', phone_number: '+5585991856528' } })],
    // regra por link (exige a API Key nas Propriedades do script)
    ['6. com chave · 1x sem juros', Object.assign({}, base, { order_nsu: nsu + 'e', options: { assured_installments: 1 } }), true],
    ['7. com chave · até 3x sem juros', Object.assign({}, base, { order_nsu: nsu + 'f', options: { assured_installments: 3 } }), true],
  ];
  var chave = chaveInfinitePay();
  Logger.log(chave ? 'API Key encontrada (termina em …' + chave.slice(-4) + ').' : 'ATENÇÃO: API Key não configurada (INFINITEPAY_API_KEY). Testes 6 e 7 vão sem chave.');
  variantes.forEach(function (v) {
    var resp = UrlFetchApp.fetch('https://api.checkout.infinitepay.io/links', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(v[1]), muteHttpExceptions: true,
      headers: v[2] && chave ? { 'X-Api-Key': chave } : {},
    });
    Logger.log(v[0] + ' → HTTP ' + resp.getResponseCode() + ' · ' + resp.getContentText().slice(0, 400));
  });
}

// Obs.: sem API Key a InfinitePay descarta campos extras. Com a chave (X-Api-Key),
// options.assured_installments define as parcelas sem juros de cada link (resposta do suporte, 18/10/2026).

// ============================================================
//  2) PORTA DE ENTRADA DO SITE
// ============================================================
function doPost(e) {
  novaExecucao();
  aplicarAjustesSalvos();
  var corpo;
  try {
    corpo = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder(false, null, 'Pedido inválido.');
  }
  // aviso automático da InfinitePay (pagamento aprovado)
  if (corpo && !corpo.acao && corpo.order_nsu) {
    try {
      processarPagamento(String(corpo.order_nsu), corpo.transaction_nsu, corpo.invoice_slug || corpo.slug, 'webhook');
      return responder(true, { recebido: true });
    } catch (err) {
      return responder(false, null, err.message);
    }
  }
  try {
    var acoes = {
      cadastrar: cadastrar,
      entrar: entrar,
      sair: sair,
      aulas: listarAulas,
      aula: detalharAula,
      reservar: reservar,
      cancelar: cancelar,
      checkin: fazerCheckin,
      minhasReservas: minhasReservas,
      salvarAnamnese: salvarAnamnese,
      minhaFicha: minhaFicha,
      meuPlano: meuPlano,
      comprar: comprar,
      confirmarPagamento: confirmarPagamento,
      ativarWellhub: ativarWellhub,
      descartarPagamento: descartarPagamento,
      // senha
      esqueciSenha: esqueciSenha,
      verLinkSenha: verLinkSenha,
      novaSenha: novaSenha,
      salvarEmail: salvarEmail,
      regras: regrasPublicas,
      // cupons e vale-presente
      validarCodigo: validarCodigo,
      resgatarVale: resgatarVale,
      // descadastro dos e-mails de campanha
      sairLista: sairLista,
      // bancada (login da equipe)
      b_entrar: bancadaEntrar,
      b_esqueci: bancadaEsqueci,
    };
    var fn = acoes[corpo.acao];
    if (!fn && /^b_/.test(String(corpo.acao))) return responder(true, executarBancada(corpo));
    if (!fn) return responder(false, null, 'Ação desconhecida.');
    return responder(true, fn(corpo));
  } catch (err) {
    var msg = err.message || String(err);
    // falta de autorização do Google: mostra uma mensagem simples para a aluna
    if (/permiss|authoriz|autoriza/i.test(msg)) {
      Logger.log('Falta autorização: ' + msg);
      msg = 'Esta função está sendo ativada pela Casa Âmbar. Tente de novo mais tarde ou fale com a recepção.';
    } else if (err instanceof TypeError || err instanceof ReferenceError || /is not a function|undefined|null|Cannot read/i.test(msg)) {
      // erro interno: registra para a equipe e mostra mensagem neutra
      Logger.log('Erro interno em ' + (corpo && corpo.acao) + ': ' + msg + '\n' + (err.stack || ''));
      msg = 'Algo deu errado do nosso lado. Tente de novo em instantes.';
    }
    return responder(false, err.dados || null, msg, err.codigo);
  }
}

// Erro com código, para o site reagir (ex.: SEM_CREDITO abre a opção de pagar)
function erroCod(msg, codigo, dados) {
  var e = new Error(msg);
  e.codigo = codigo;
  e.dados = dados;
  return e;
}

// Versão do código (muda a cada atualização publicada)
var VERSAO = '2026-10-19 · v19 (comandas, estoque, financeiro, comissões, promoções e campanhas)';

function doGet() {
  return responder(true, { status: 'Casa Âmbar API no ar', versao: VERSAO });
}

function responder(ok, dados, erro, codigo) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, dados: dados, erro: erro || null, codigo: codigo || null }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  3) ALUNOS E LOGIN (CPF + senha)
// ============================================================
function cadastrar(d) {
  var cpf = soDigitos(d.cpf);
  if (!cpfValido(cpf)) throw new Error('CPF inválido.');
  if (!d.nome || String(d.nome).trim().split(' ').length < 2) throw new Error('Informe nome e sobrenome.');
  if (soDigitos(d.whatsapp).length < 10) throw new Error('Informe um WhatsApp com DDD.');
  if (!emailValido(d.email)) throw new Error('Informe um e-mail válido. É por ele que você recupera a senha.');
  validarSenhaNova(d.senha);

  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    if (buscarAluno(cpf)) throw new Error('Este CPF já tem cadastro. Use "Entrar".');
    var sal = Utilities.getUuid();
    adicionarLinha('Alunos', { cpf: cpf, nome: String(d.nome).trim(), whatsapp: soDigitos(d.whatsapp), email: String(d.email).trim().toLowerCase(),
      senha_hash: hashSenhaV2(d.senha, sal), sal: sal, criado_em: agoraTexto(), ativo: 'SIM', origem_cadastro: 'site' });
  } finally {
    trava.releaseLock();
  }
  var aluno = buscarAluno(cpf);
  return { token: criarSessao(cpf), aluno: publico(aluno) };
}

function entrar(d) {
  var cpf = normCpf(d.cpf);
  limitarTentativas('a_' + cpf);
  var aluno = buscarAluno(cpf);
  var v = aluno && aluno.ativo !== 'NÃO' ? verificarSenha(d.senha, aluno.senha_hash, aluno.sal) : { ok: false };
  if (!v.ok) {
    registrarFalha('a_' + cpf);
    Utilities.sleep(600); // dificulta tentativas em massa
    throw new Error(aluno && !aluno.senha_hash ? 'Você ainda não criou sua senha. Toque em "Esqueci minha senha" para receber o link no e-mail.' : 'CPF ou senha incorretos.');
  }
  limparFalhas('a_' + cpf);
  // senha no formato antigo: regrava com sal + pimenta
  if (v.atualizar) gravarSenha('Alunos', aluno._linha, d.senha);
  return { token: criarSessao(cpf), aluno: publico(aluno) };
}

function sair(d) {
  if (!d.token) return true;
  var s = aba('Sessoes');
  var h = hashToken(d.token);
  var linhas = s.getDataRange().getValues();
  for (var i = linhas.length - 1; i >= 1; i--) {
    if (linhas[i][0] === h || linhas[i][0] === d.token) s.deleteRow(i + 1);
  }
  try { CacheService.getScriptCache().remove('s_' + h); } catch (e) { /* ignora */ }
  return true;
}

// A planilha guarda só o hash do token: quem abrir a aba Sessoes não consegue entrar como o aluno
function hashToken(token) {
  return 'h' + sha256Hex('sessao:' + String(token));
}

function criarSessao(cpf) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var expira = new Date(Date.now() + AJUSTES.validadeSessaoDias * 86400000);
  aba('Sessoes').appendRow([hashToken(token), normCpf(cpf), agoraTexto(), expira.toISOString()]);
  limparSessoesVencidas('Sessoes');
  return token;
}

// apaga sessões vencidas de vez em quando (no máximo 1x por hora)
function limparSessoesVencidas(nomeAba) {
  var cache = CacheService.getScriptCache();
  if (cache.get('limpeza_' + nomeAba)) return;
  cache.put('limpeza_' + nomeAba, '1', 3600);
  var s = aba(nomeAba);
  var linhas = s.getDataRange().getValues();
  var agora = new Date();
  for (var i = linhas.length - 1; i >= 1; i--) {
    var exp = new Date(linhas[i][3]);
    if (!isNaN(exp.getTime()) && exp < agora) s.deleteRow(i + 1);
  }
}

function alunoDaSessao(token) {
  if (!token || String(token).length < 20) throw new Error('Sua sessão expirou. Entre novamente.');
  var cache = CacheService.getScriptCache();
  var h = hashToken(token);
  var cpf = cache.get('s_' + h);
  if (!cpf) {
    var linhas = valoresAba('Sessoes');
    for (var i = 1; i < linhas.length; i++) {
      // aceita também sessões antigas (token puro), criadas antes desta versão
      if ((linhas[i][0] === h || linhas[i][0] === token) && new Date(linhas[i][3]) > new Date()) {
        cpf = normCpf(linhas[i][1]);
        break;
      }
    }
    if (!cpf) throw new Error('Sua sessão expirou. Entre novamente.');
    cache.put('s_' + h, cpf, 1800);
  }
  var aluno = buscarAluno(cpf);
  if (!aluno || aluno.ativo === 'NÃO') throw new Error('Sua sessão expirou. Entre novamente.');
  return aluno;
}

function buscarAluno(cpf) {
  var linhas = valoresAba('Alunos');
  var cab = linhas[0];
  for (var i = 1; i < linhas.length; i++) {
    if (normCpf(linhas[i][0]) === normCpf(cpf)) {
      var a = objeto(cab, linhas[i]);
      a._linha = i + 1;
      return a;
    }
  }
  return null;
}

function publico(a) {
  var cpf = normCpf(a.cpf);
  return { nome: a.nome, cpf: cpf, whatsapp: String(a.whatsapp), email: String(a.email || ''), anamnese: !!linhaAnamnese(cpf), wellhub: statusWellhub(a) };
}

function hashSenha(senha, sal) {
  var txt = sal + ':' + senha;
  var bytes;
  for (var i = 0; i < 200; i++) {
    bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt, Utilities.Charset.UTF_8);
    txt = Utilities.base64Encode(bytes) + sal;
  }
  return Utilities.base64Encode(bytes);
}

// ============================================================
//  4) AULAS
// ============================================================
function gerarAulas(dataInicio, dias) {
  var grade = valoresAba('Grade');
  var cab = grade[0];
  var bloqueios = valoresAba('Bloqueios').slice(1).map(function (b) {
    return dataTexto(b[0]) + '|' + horaTexto(b[1]) + '|' + String(b[2]).toLowerCase();
  });
  var hoje = dataInicio ? new Date(dataInicio + 'T12:00:00-03:00') : new Date();
  var total = dias || AJUSTES.diasVisiveis;
  var lista = [];
  for (var i = 0; i < total; i++) {
    var dia = new Date(hoje.getTime() + i * 86400000);
    var data = Utilities.formatDate(dia, AJUSTES.fuso, 'yyyy-MM-dd');
    var semana = Number(Utilities.formatDate(dia, AJUSTES.fuso, 'u')) % 7; // 1=seg ... 7=dom → 0
    for (var j = 1; j < grade.length; j++) {
      var g = objeto(cab, grade[j]);
      if (!String(g.modalidade || '').trim() || String(g.dia_semana) === '') continue; // linha vazia
      if (String(g.ativo).toUpperCase() === 'NÃO' || Number(g.dia_semana) !== semana) continue;
      var hora = horaTexto(g.hora);
      var mod = String(g.modalidade).trim();
      var chave = data + '|' + hora + '|' + mod.toLowerCase();
      if (bloqueios.indexOf(chave) >= 0 || bloqueios.indexOf(data + '||' + mod.toLowerCase()) >= 0 || bloqueios.indexOf(data + '||') >= 0) continue;
      lista.push({
        id: data + '_' + hora + '_' + mod.toLowerCase(),
        data: data,
        hora: hora,
        modalidade: mod,
        professor: g.professor,
        capacidade: Number(g.capacidade) || 12,
        duracao: AJUSTES.duracaoAulaMin,
      });
    }
  }
  return lista.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

function reservasAtivas() {
  var linhas = valoresAba('Reservas');
  var cab = linhas[0];
  var lista = [];
  for (var i = 1; i < linhas.length; i++) {
    var r = objeto(cab, linhas[i]);
    r._linha = i + 1;
    if (r.status === 'cancelado') continue;
    if (r.status === 'pendente' && Number(r.expira_ms) && Number(r.expira_ms) < Date.now()) continue;
    lista.push(r);
  }
  return lista;
}

function montarAula(aula, reservas, cpf) {
  var daAula = reservas.filter(function (r) { return r.aula_id === aula.id; });
  var minha = daAula.filter(function (r) { return normCpf(r.cpf) === normCpf(cpf) && r.status !== 'pendente'; })[0];
  aula.ocupados = aula.modalidade === 'Yoga' ? daAula.map(function (r) { return Number(r.tapete); }) : [];
  aula.ocupadosQtd = daAula.length;
  aula.minhaReserva = minha ? { id: minha.id, tapete: minha.tapete ? Number(minha.tapete) : null } : null;
  return aula;
}

function listarAulas(d) {
  var aluno = alunoDaSessao(d.token);
  var reservas = reservasAtivas();
  return gerarAulas().map(function (a) { return montarAula(a, reservas, normCpf(aluno.cpf)); });
}

function detalharAula(d) {
  var aluno = alunoDaSessao(d.token);
  var aula = gerarAulas().filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada.');
  return montarAula(aula, reservasAtivas(), normCpf(aluno.cpf));
}

// ============================================================
//  5) RESERVAS (com trava: dois alunos nunca ficam com o mesmo tapete)
// ============================================================
function reservar(d) {
  var aluno = alunoDaSessao(d.token);
  var aula = gerarAulas().filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada.');
  if (inicio(aula) < new Date()) throw new Error('Esta aula já começou.');
  if (!linhaAnamnese(normCpf(aluno.cpf))) throw new Error('Preencha sua ficha de saúde antes de reservar.');

  var cpf = normCpf(aluno.cpf);
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    // uma tentativa anterior de pagar esta mesma aula é descartada
    reservasAtivas().forEach(function (r) {
      if (r.aula_id === aula.id && normCpf(r.cpf) === cpf && r.status === 'pendente') {
        aba('Reservas').getRange(r._linha, coluna('Reservas', 'status')).setValue('cancelado');
      }
    });
    var reservas = reservasAtivas();
    var m = montarAula(aula, reservas, cpf);
    if (m.minhaReserva) throw new Error('Você já tem reserva nesta aula.');
    if (m.ocupadosQtd >= aula.capacidade) throw new Error('Aula lotada.');
    var tapete = '';
    if (aula.modalidade === 'Yoga') {
      tapete = Number(d.tapete);
      if (!tapete || tapete < 1 || tapete > aula.capacidade) throw new Error('Escolha um tapete.');
      if (m.ocupados.indexOf(tapete) >= 0) throw new Error('O tapete ' + tapete + ' acabou de ser reservado. Escolha outro.');
    }
    var id = 'R' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    var credito = escolherCredito(cpf, aula, reservas);

    if (!credito && d.usarWellhub) {
      var podeW = podeUsarWellhub(aluno, aula, reservas);
      if (!podeW.ok) throw new Error(podeW.motivo);
      aba('Reservas').appendRow(linhaSegura([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, cpf, aluno.nome, tapete, 'reservado', agoraTexto(), '', '',
        'WELLHUB', '', '']));
      SpreadsheetApp.flush();
      return { id: id, aulaId: aula.id, data: aula.data, hora: aula.hora, modalidade: aula.modalidade, professor: aula.professor, tapete: tapete || null,
        status: 'reservado', credito: 'Wellhub', wellhub: true };
    }

    if (!credito) {
      var avulsa = buscarPlano(aula.modalidade.toLowerCase() + '-avulsa');
      if (!d.pagarAvulsa || !avulsa) {
        throw erroCod('Você não tem aulas de ' + aula.modalidade + ' disponíveis.', 'SEM_CREDITO', {
          avulsa: avulsa ? planoPublico(avulsa) : null,
          trimestralOnline: !!chaveInfinitePay(),
    wellhub: { status: statusWellhub(aluno), pode: podeUsarWellhub(aluno, aula, reservas) },
        });
      }
      // guarda o tapete por alguns minutos e gera o pagamento da aula avulsa
      var pg = criarPagamento(aluno, avulsa, { reserva_id: id, aula_id: aula.id, tapete: tapete }, d.codigo);
      if (pg.pago) {
        // cupom ou vale cobriu a aula inteira
        aba('Reservas').appendRow(linhaSegura([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, cpf, aluno.nome, tapete, 'reservado', agoraTexto(), '', '',
          pg.creditoId, pg.order_nsu, '']));
        SpreadsheetApp.flush();
        return { id: id, aulaId: aula.id, data: aula.data, hora: aula.hora, modalidade: aula.modalidade, professor: aula.professor, tapete: tapete || null,
          status: 'reservado', credito: 'Vale-presente / cupom' };
      }
      aba('Reservas').appendRow(linhaSegura([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, cpf, aluno.nome, tapete, 'pendente', agoraTexto(), '', '',
        '', pg.order_nsu, Date.now() + AJUSTES.reservaPendenteMin * 60000]));
      SpreadsheetApp.flush();
      return { pagamento: pg };
    }

    aba('Reservas').appendRow(linhaSegura([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, cpf, aluno.nome, tapete, 'reservado', agoraTexto(), '', '',
      credito.id, '', '']));
    SpreadsheetApp.flush();
    return { id: id, aulaId: aula.id, data: aula.data, hora: aula.hora, modalidade: aula.modalidade, professor: aula.professor, tapete: tapete || null, status: 'reservado', credito: credito.descricao };
  } finally {
    trava.releaseLock();
  }
}

// aula_id = "2026-10-19_06:00_pilates": fonte segura da data e da hora
function partesAula(r) {
  var p = String(r.aula_id || '').split('_');
  if (p.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(p[0])) {
    r.data = p[0];
    r.hora = p[1];
  } else {
    r.data = dataTexto(r.data);
    r.hora = horaTexto(r.hora);
  }
  return r;
}

function acharMinhaReserva(d) {
  var aluno = alunoDaSessao(d.token);
  var r = reservasAtivas().filter(function (x) { return x.id === d.reservaId && normCpf(x.cpf) === normCpf(aluno.cpf); })[0];
  if (!r) throw new Error('Reserva não encontrada.');
  return partesAula(r);
}

function cancelar(d) {
  var r = acharMinhaReserva(d);
  var limite = inicio(r).getTime() - AJUSTES.cancelarAteHorasAntes * 3600000;
  if (Date.now() > limite) throw new Error('Cancelamento só até ' + AJUSTES.cancelarAteHorasAntes + 'h antes da aula.');
  var s = aba('Reservas');
  s.getRange(r._linha, coluna('Reservas', 'status')).setValue('cancelado');
  s.getRange(r._linha, coluna('Reservas', 'cancelada_em')).setValue(agoraTexto());
  return true;
}

function fazerCheckin(d) {
  var r = acharMinhaReserva(d);
  var ini = inicio(r).getTime();
  if (Date.now() < ini - AJUSTES.checkinAbreMinAntes * 60000) throw new Error('O check-in abre ' + AJUSTES.checkinAbreMinAntes + ' min antes da aula.');
  if (Date.now() > ini + AJUSTES.duracaoAulaMin * 60000) throw new Error('Esta aula já terminou.');
  var s = aba('Reservas');
  s.getRange(r._linha, coluna('Reservas', 'status')).setValue('check-in');
  s.getRange(r._linha, coluna('Reservas', 'checkin_em')).setValue(agoraTexto());
  return true;
}

function minhasReservas(d) {
  var aluno = alunoDaSessao(d.token);
  var linhas = valoresAba('Reservas');
  var cab = linhas[0];
  var lista = [];
  for (var i = 1; i < linhas.length; i++) {
    var r = objeto(cab, linhas[i]);
    if (normCpf(r.cpf) !== normCpf(aluno.cpf) || r.status === 'cancelado' || r.status === 'pendente') continue;
    partesAula(r);
    lista.push({
      id: r.id, aulaId: r.aula_id, data: r.data, hora: r.hora,
      modalidade: r.modalidade, professor: r.professor, tapete: r.tapete ? Number(r.tapete) : null, status: r.status, wellhub: String(r.credito_id) === 'WELLHUB',
    });
  }
  return lista.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

// ============================================================
//  6) FICHA DE SAÚDE (ANAMNESE)
//  Salva uma linha na aba "Anamneses" (uma por aluno, a mais recente)
//  e um PDF na pasta do Drive "Casa Âmbar · Anamneses".
// ============================================================
function salvarAnamnese(d) {
  var aluno = alunoDaSessao(d.token);
  var f = d.ficha || {};
  var cpf = normCpf(aluno.cpf);

  if (!f.emergencia_nome || soDigitos(f.emergencia_telefone).length < 10) throw new Error('Informe o contato de emergência com telefone.');
  for (var i = 1; i <= 7; i++) {
    if (f['parq_' + i] !== 'sim' && f['parq_' + i] !== 'nao') throw new Error('Responda todas as perguntas do questionário.');
  }
  if (!f.declaracao || !f.consentimento) throw new Error('É preciso marcar a declaração e o consentimento.');

  var algumSim = [1, 2, 3, 4, 5, 6, 7].some(function (n) { return f['parq_' + n] === 'sim'; });
  var limpar = function (v) { return String(v == null ? '' : v).slice(0, 1000); };
  var valores = {
    cpf: cpf,
    nome: aluno.nome,
    preenchida_em: agoraTexto(),
    data_nascimento: limpar(f.data_nascimento),
    emergencia_nome: limpar(f.emergencia_nome),
    emergencia_parentesco: limpar(f.emergencia_parentesco),
    emergencia_telefone: soDigitos(f.emergencia_telefone),
    plano_saude: limpar(f.plano_saude),
    parq_algum_sim: algumSim ? 'SIM' : 'NÃO',
    comorbidades: (f.comorbidades || []).map(limpar).join(', '),
    comorbidade_outra: limpar(f.comorbidade_outra),
    gestante: limpar(f.gestante),
    gestante_semanas: limpar(f.gestante_semanas),
    cirurgias: limpar(f.cirurgias),
    lesoes: limpar(f.lesoes),
    medicamentos: limpar(f.medicamentos),
    alergias: limpar(f.alergias),
    atividade_regular: limpar(f.atividade_regular),
    observacoes: limpar(f.observacoes),
    declaracao: 'SIM',
    consentimento: 'SIM',
  };
  for (var n = 1; n <= 7; n++) valores['parq_' + n] = f['parq_' + n] === 'sim' ? 'SIM' : 'NÃO';

  // PDF no Drive
  try {
    valores.pdf = gerarPdfAnamnese(valores);
  } catch (err) {
    valores.pdf = 'erro ao gerar PDF: ' + err.message;
  }

  var linha = ABAS.Anamneses.map(function (c) { return valores[c] == null ? '' : valores[c]; });
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    var s = aba('Anamneses');
    var existente = linhaAnamnese(cpf);
    linha = linhaSegura(linha);
    if (existente) s.getRange(existente, 1, 1, linha.length).setValues([linha]);
    else s.appendRow(linha);
  } finally {
    trava.releaseLock();
  }
  return { ok: true, alerta: algumSim };
}

// Ficha já preenchida, no formato do formulário do site (para revisar e atualizar)
function minhaFicha(d) {
  var aluno = alunoDaSessao(d.token);
  var cpf = normCpf(aluno.cpf);
  var f = lerAba('Anamneses').filter(function (x) { return normCpf(x.cpf) === cpf; })[0];
  if (!f) return null;
  var txt = function (v) { return String(v == null ? '' : v); };
  var o = {
    data_nascimento: dataTexto(f.data_nascimento || ''), emergencia_nome: txt(f.emergencia_nome), emergencia_parentesco: txt(f.emergencia_parentesco),
    emergencia_telefone: txt(f.emergencia_telefone), plano_saude: txt(f.plano_saude),
    comorbidades: txt(f.comorbidades).split(', ').filter(String), comorbidade_outra: txt(f.comorbidade_outra), gestante: txt(f.gestante),
    gestante_semanas: txt(f.gestante_semanas), cirurgias: txt(f.cirurgias), lesoes: txt(f.lesoes), medicamentos: txt(f.medicamentos),
    alergias: txt(f.alergias), atividade_regular: txt(f.atividade_regular), observacoes: txt(f.observacoes), preenchida_em: txt(f.preenchida_em),
  };
  for (var n = 1; n <= 7; n++) o['parq_' + n] = txt(f['parq_' + n]).toUpperCase() === 'SIM' ? 'sim' : txt(f['parq_' + n]) ? 'nao' : '';
  return o;
}

function linhaAnamnese(cpf) {
  var s = aba('Anamneses');
  if (!s || s.getLastRow() < 2) return 0;
  var cpfs = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < cpfs.length; i++) {
    if (normCpf(cpfs[i][0]) === normCpf(cpf)) return i + 2;
  }
  return 0;
}

function pastaAnamneses() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PASTA_ANAMNESES_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* pasta apagada: cria outra */ }
  }
  var it = DriveApp.getFoldersByName(PASTA_ANAMNESES);
  var pasta = it.hasNext() ? it.next() : DriveApp.createFolder(PASTA_ANAMNESES);
  props.setProperty('PASTA_ANAMNESES_ID', pasta.getId());
  return pasta;
}

function gerarPdfAnamnese(v) {
  var esc = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var linhaInfo = function (rotulo, valor) {
    return '<tr><th>' + rotulo + '</th><td>' + (esc(valor) || '<span class="vazio">não informado</span>') + '</td></tr>';
  };
  var cpfFmt = v.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  var tel = v.emergencia_telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  var parq = PARQ_TEXTOS.map(function (t, i) {
    var r = v['parq_' + (i + 1)];
    return '<tr><td>' + (i + 1) + '. ' + esc(t) + '</td><td class="resp ' + (r === 'SIM' ? 'sim' : '') + '">' + r + '</td></tr>';
  }).join('');

  var html =
    '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Helvetica,Arial,sans-serif;color:#2F3821;font-size:11px;margin:28px}' +
    'h1{font-size:20px;letter-spacing:4px;margin:0;font-weight:normal}' +
    'h2{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#7E3717;margin:22px 0 6px;border-bottom:1px solid #A6845E;padding-bottom:4px}' +
    '.topo{border-bottom:2px solid #2F3821;padding-bottom:10px;margin-bottom:6px}.sub{color:#6F784D;font-size:10px;letter-spacing:2px}' +
    'table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #E9DDC5;vertical-align:top}' +
    'th{width:34%;color:#5B6046;font-weight:normal}.resp{width:44px;text-align:center;font-weight:bold}.sim{color:#7E3717}' +
    '.alerta{background:#F3DCD0;color:#6E2A10;padding:8px 10px;margin-top:8px}.vazio{color:#A6A08C}' +
    '.assin{margin-top:46px;display:flex}.assin div{border-top:1px solid #2F3821;width:46%;padding-top:4px;font-size:10px;margin-right:8%}' +
    '</style></head><body>' +
    '<div class="topo"><h1>CASA ÂMBAR</h1><div class="sub">FICHA DE SAÚDE · ANAMNESE</div></div>' +
    '<p>Preenchida pelo aluno no site em ' + esc(v.preenchida_em) + '.</p>' +
    '<h2>Aluno</h2><table>' + linhaInfo('Nome', v.nome) + linhaInfo('CPF', cpfFmt) + linhaInfo('Data de nascimento', v.data_nascimento) + linhaInfo('Plano de saúde', v.plano_saude) + '</table>' +
    '<h2>Contato de emergência</h2><table>' + linhaInfo('Nome', v.emergencia_nome) + linhaInfo('Parentesco', v.emergencia_parentesco) + linhaInfo('Telefone', tel) + '</table>' +
    '<h2>Questionário de prontidão para atividade física (PAR-Q)</h2><table>' + parq + '</table>' +
    (v.parq_algum_sim === 'SIM' ? '<div class="alerta">Há resposta SIM no PAR-Q: recomenda-se liberação médica antes de iniciar as atividades.</div>' : '') +
    '<h2>Histórico de saúde</h2><table>' +
    linhaInfo('Condições de saúde', [v.comorbidades, v.comorbidade_outra].filter(String).join(', ')) +
    linhaInfo('Gestante', v.gestante + (v.gestante_semanas ? ' · ' + v.gestante_semanas + ' semanas' : '')) +
    linhaInfo('Cirurgias (últimos 12 meses)', v.cirurgias) +
    linhaInfo('Lesões ou dores atuais', v.lesoes) +
    linhaInfo('Medicamentos de uso contínuo', v.medicamentos) +
    linhaInfo('Alergias', v.alergias) +
    linhaInfo('Pratica atividade física regularmente', v.atividade_regular) +
    linhaInfo('Observações para a professora', v.observacoes) + '</table>' +
    '<h2>Declarações</h2><p>O aluno declarou que as informações acima são verdadeiras e autorizou a Casa Âmbar a armazená-las ' +
    'exclusivamente para a sua segurança durante as práticas, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>' +
    '<div class="assin"><div>Assinatura do aluno</div><div>Data</div></div>' +
    '</body></html>';

  var nomeArquivo = 'Anamnese · ' + v.nome + ' · ' + v.cpf + '.pdf';
  var pasta = pastaAnamneses();
  // substitui a ficha anterior do mesmo aluno
  var antigos = pasta.searchFiles("title contains '" + v.cpf + "'");
  while (antigos.hasNext()) antigos.next().setTrashed(true);
  var pdf = Utilities.newBlob(html, 'text/html', 'ficha.html').getAs('application/pdf').setName(nomeArquivo);
  return pasta.createFile(pdf).getUrl();
}

// ============================================================
//  7) PLANOS, CRÉDITOS E PAGAMENTOS (InfinitePay)
// ============================================================
function numero(v) {
  return Number(String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
}

function listarPlanos() {
  // conferências feitas uma vez por pedido (depois os planos vêm da memória)
  if (!_memo.Planos) prepararPlanos();
  var linhas = valoresAba('Planos');
  var cab = linhas[0];
  var lista = [];
  for (var i = 1; i < linhas.length; i++) {
    var p = objeto(cab, linhas[i]);
    if (!p.id || String(p.ativo).toUpperCase() === 'NÃO') continue;
    p.preco = numero(p.preco);
    p.aulas_semana = numero(p.aulas_semana);
    p.aulas_total = numero(p.aulas_total);
    p.validade_dias = numero(p.validade_dias) || 30;
    p.sem_juros_ate = semJurosAte(p);
    lista.push(p);
  }
  return lista;
}

function prepararPlanos() {
  var abaPlanos = aba('Planos');
  // aba vazia (criada automaticamente): preenche com o catálogo padrão
  if (abaPlanos.getLastRow() < 2) {
    abaPlanos.getRange('A:E').setNumberFormat('@');
    abaPlanos.getRange(2, 1, CATALOGO_INICIAL.length, CATALOGO_INICIAL[0].length).setValues(CATALOGO_INICIAL);
    SpreadsheetApp.flush();
  }
  // ajuste único: aula avulsa passou a valer 30 dias (antes 60)
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('AVULSA_30_DIAS')) {
    var dadosPlanos = abaPlanos.getDataRange().getValues();
    var cabP = dadosPlanos[0];
    var colTipo = cabP.indexOf('tipo'), colVal = cabP.indexOf('validade_dias'), colDesc = cabP.indexOf('descricao');
    for (var k = 1; k < dadosPlanos.length; k++) {
      if (String(dadosPlanos[k][colTipo]) === 'avulsa' && Number(dadosPlanos[k][colVal]) === 60) {
        abaPlanos.getRange(k + 1, colVal + 1).setValue(30);
        abaPlanos.getRange(k + 1, colDesc + 1).setValue('Uma aula, válida por 30 dias');
      }
    }
    props.setProperty('AVULSA_30_DIAS', 'ok');
  }
}

function buscarPlano(id) {
  return listarPlanos().filter(function (p) { return p.id === id; })[0] || null;
}

// Regra da casa: todos podem parcelar em até 12x no cartão.
// Sem juros: avulsa e mensal só em 1x; trimestral até 3x. Acima disso, com juros.
// A coluna sem_juros_ate da aba Planos, se preenchida, vale no lugar desta regra.
function semJurosAte(p) {
  var n = numero(p.sem_juros_ate);
  if (n >= 1) return n;
  return String(p.tipo) === 'trimestral' ? 3 : 1;
}

function condicaoPagamento(p) {
  var n = semJurosAte(p);
  return n > 1 ? 'até ' + n + 'x sem juros' : '1x sem juros';
}

function planoPublico(p) {
  var promo = melhorPromocao(p, hojeTexto(), 'site');
  return { id: p.id, modalidade: p.modalidade, tipo: p.tipo, nome: p.nome, aulasSemana: p.aulas_semana, aulasTotal: p.aulas_total, validadeDias: p.validade_dias, preco: p.preco, descricao: p.descricao, semJurosAte: semJurosAte(p),
    promocao: promo ? { nome: promo.nome, texto: promo.texto, preco: dinheiro(p.preco - promo.desconto) } : null };
}

// A recepção pode lançar um plano pago no balcão preenchendo só: cpf, plano_id e inicio.
// O resto da linha (id, descrição, aulas, fim...) é completado automaticamente.
function completarCreditosManuais(abaC, linhas) {
  var cab = linhas[0];
  var col = function (n) { return cab.indexOf(n); };
  for (var i = 1; i < linhas.length; i++) {
    var c = objeto(cab, linhas[i]);
    if (c.id || !c.cpf || !c.plano_id) continue;
    var plano = buscarPlano(String(c.plano_id).trim());
    if (!plano) continue;
    var inicio = c.inicio ? dataTexto(c.inicio) : hojeTexto();
    var aluno = buscarAluno(normCpf(c.cpf));
    var valores = {
      id: 'M' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + i,
      cpf: normCpf(c.cpf), nome: c.nome || (aluno ? aluno.nome : ''), plano_id: plano.id, descricao: plano.nome, modalidade: plano.modalidade,
      tipo: plano.tipo, aulas_semana: plano.aulas_semana, aulas_total: plano.aulas_total, inicio: inicio,
      fim: c.fim ? dataTexto(c.fim) : somarDias(inicio, plano.validade_dias - 1), origem: c.origem || 'recepção', ativo: c.ativo || 'SIM',
    };
    Object.keys(valores).forEach(function (k) {
      if (col(k) >= 0) {
        abaC.getRange(i + 1, col(k) + 1).setValue(valores[k]);
        linhas[i][col(k)] = valores[k];
      }
    });
  }
  return linhas;
}

// créditos já completados (ver acima), lidos uma vez por pedido
function valoresCreditos() {
  if (!_memo.Creditos) {
    var abaC = aba('Creditos');
    _memo.Creditos = { valores: completarCreditosManuais(abaC, abaC.getDataRange().getValues()), objetos: null };
  }
  return _memo.Creditos.valores;
}

function creditosDo(cpf) {
  var linhas = valoresCreditos();
  var cab = linhas[0];
  var lista = [];
  for (var i = 1; i < linhas.length; i++) {
    var c = objeto(cab, linhas[i]);
    if (!c.id || normCpf(c.cpf) !== normCpf(cpf) || String(c.ativo).toUpperCase() === 'NÃO') continue;
    c.inicio = dataTexto(c.inicio);
    c.fim = dataTexto(c.fim);
    c.aulas_semana = numero(c.aulas_semana);
    c.aulas_total = numero(c.aulas_total);
    lista.push(c);
  }
  return lista;
}

// segunda-feira da semana de uma data "aaaa-mm-dd"
function semanaDe(data) {
  var p = data.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  var dia = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dia);
  return d.toISOString().slice(0, 10);
}

function usoDoCredito(c, reservas, dataRef) {
  var minhas = reservas.filter(function (r) { return String(r.credito_id) === String(c.id); });
  if (c.aulas_semana > 0) {
    var sem = semanaDe(dataRef);
    return minhas.filter(function (r) { return semanaDe(partesAula(r).data) === sem; }).length;
  }
  return minhas.length;
}

// Escolhe o crédito que vai pagar esta aula (plano semanal primeiro, depois avulsas)
function escolherCredito(cpf, aula, reservas) {
  var validos = creditosDo(cpf).filter(function (c) {
    return String(c.modalidade).toLowerCase() === aula.modalidade.toLowerCase() && c.inicio <= aula.data && aula.data <= c.fim;
  });
  validos.sort(function (a, b) {
    var pa = a.aulas_semana > 0 ? 0 : 1, pb = b.aulas_semana > 0 ? 0 : 1;
    return pa - pb || String(a.fim).localeCompare(String(b.fim));
  });
  for (var i = 0; i < validos.length; i++) {
    var c = validos[i];
    var limite = c.aulas_semana > 0 ? c.aulas_semana : c.aulas_total;
    if (usoDoCredito(c, reservas, aula.data) < limite) return c;
  }
  return null;
}

function somarDias(data, dias) {
  var p = data.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + dias));
  return d.toISOString().slice(0, 10);
}

function hojeTexto() {
  return Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyyy-MM-dd');
}

function meuPlano(d) {
  var aluno = alunoDaSessao(d.token);
  var cpf = normCpf(aluno.cpf);
  var reservas = reservasAtivas();
  var hoje = hojeTexto();
  var creditos = creditosDo(cpf)
    .filter(function (c) { return c.fim >= hoje; })
    .map(function (c) {
      var limite = c.aulas_semana > 0 ? c.aulas_semana : c.aulas_total;
      var usadas = usoDoCredito(c, reservas, hoje);
      return { id: c.id, planoId: c.plano_id, descricao: c.descricao, modalidade: c.modalidade, tipo: c.tipo, aulasSemana: c.aulas_semana, aulasTotal: c.aulas_total,
        inicio: c.inicio, fim: c.fim, usadas: usadas, limite: limite, restantes: Math.max(0, limite - usadas) };
    });

  var linhas = valoresAba('Pagamentos');
  var cab = linhas[0];
  var pagamentos = [];
  var limitePendente = Date.now() - PENDENTE_VALE_HORAS * 3600000;
  for (var i = 1; i < linhas.length; i++) {
    var p = objeto(cab, linhas[i]);
    if (normCpf(p.cpf) !== cpf) continue;
    // tentativa de pagamento não concluída: some depois de algumas horas (fica 'expirado' na planilha)
    if (p.status === 'pendente' && new Date(String(p.criado_em).replace(' ', 'T') + '-03:00').getTime() < limitePendente) {
      aba('Pagamentos').getRange(i + 1, coluna('Pagamentos', 'status')).setValue('expirado');
      continue;
    }
    if (p.status === 'expirado' || p.status === 'descartado') continue;
    pagamentos.push({ orderNsu: String(p.order_nsu), descricao: p.descricao, valor: numero(p.valor), status: p.status, criadoEm: String(p.criado_em),
      pagoEm: String(p.pago_em || ''), metodo: p.metodo, parcelas: p.parcelas, recibo: p.recibo, link: p.status === 'pendente' ? p.link : '' });
  }
  pagamentos.reverse();
  return { catalogo: listarPlanos().map(planoPublico), creditos: creditos, pagamentos: pagamentos,
    trimestralOnline: !!chaveInfinitePay(),
    wellhub: { status: statusWellhub(aluno), id: String(aluno.wellhub_id || ''), modalidades: AJUSTES.wellhub.modalidades, planoMinimo: AJUSTES.wellhub.planoMinimo } };
}

// Pagamento iniciado e não concluído some de "Meus pagamentos" depois de X horas
var PENDENTE_VALE_HORAS = 24;

// Aluno descarta uma tentativa de pagamento que não vai concluir
function descartarPagamento(d) {
  var aluno = alunoDaSessao(d.token);
  var pg = linhaPagamento(String(d.orderNsu || ''));
  if (!pg || normCpf(pg.cpf) !== normCpf(aluno.cpf)) throw new Error('Pagamento não encontrado.');
  if (pg.status !== 'pendente') throw new Error('Só pagamentos pendentes podem ser removidos.');
  atualizarLinha('Pagamentos', pg._linha, { status: 'descartado' });
  // libera o tapete que estava guardado para este pagamento
  if (pg.reserva_id) {
    var r = lerAba('Reservas').filter(function (x) { return x.id === pg.reserva_id && x.status === 'pendente'; })[0];
    if (r) atualizarLinha('Reservas', r._linha, { status: 'cancelado', cancelada_em: agoraTexto() });
  }
  return true;
}

function comprar(d) {
  var aluno = alunoDaSessao(d.token);
  var plano = buscarPlano(d.planoId);
  if (!plano) throw new Error('Plano não encontrado.');
  if (String(plano.tipo) === 'trimestral' && !chaveInfinitePay()) {
    throw erroCod('O plano trimestral em até 3x sem juros é feito com a nossa atendente.', 'TRIMESTRAL_ATENDENTE');
  }
  return criarPagamento(aluno, plano, {}, d.codigo);
}

// Cria o pagamento (com cupom ou vale-presente, se houver).
// Se o desconto cobrir tudo, já conclui sem passar pela InfinitePay.
function criarPagamento(aluno, plano, extras, codigo) {
  var cpf = normCpf(aluno.cpf);
  var calc = calcularPreco(plano, cpf, codigo, { canal: 'site' });
  var orderNsu = novoNsu('P');
  var linha = {
    order_nsu: orderNsu, cpf: cpf, nome: aluno.nome, plano_id: plano.id, descricao: plano.nome, valor: calc.valorFinal, status: 'pendente', link: '',
    criado_em: agoraTexto(), reserva_id: extras.reserva_id || '', aula_id: extras.aula_id || '', tapete: extras.tapete || '',
    valor_original: calc.valorOriginal, desconto: calc.desconto, cupom: calc.cupom, vale: calc.vale, vale_usado: calc.valeUsado, origem: 'site', promocao: calc.promocao,
  };
  if (calc.valorFinal <= 0) {
    adicionarLinha('Pagamentos', linha);
    SpreadsheetApp.flush();
    var creditoId = concluirPagamento(linhaPagamento(orderNsu), { metodo: calc.vale ? 'Vale-presente' : 'Cupom' });
    return { pago: true, order_nsu: orderNsu, creditoId: creditoId, valor: 0, descricao: plano.nome };
  }
  linha.link = infinitepayCriarLink({ descricao: plano.nome + (calc.desconto ? ' (com desconto)' : ''), valor: calc.valorFinal, semJuros: semJurosAte(plano) }, aluno, orderNsu);
  adicionarLinha('Pagamentos', linha);
  SpreadsheetApp.flush();
  return { order_nsu: orderNsu, link: linha.link, valor: calc.valorFinal, valorOriginal: calc.valorOriginal, desconto: calc.desconto, descricao: plano.nome };
}

// item = { descricao, valor, semJuros }
function infinitepayCriarLink(item, aluno, orderNsu) {
  var whats = soDigitos(aluno.whatsapp);
  var semJuros = item.semJuros || 1;
  var corpo = {
    handle: AJUSTES.infinitepayHandle,
    items: [{ quantity: 1, price: Math.round(item.valor * 100), description: item.descricao + ' (' + (semJuros > 1 ? 'até ' + semJuros + 'x sem juros' : '1x sem juros') + ')' }],
    order_nsu: orderNsu,
    redirect_url: AJUSTES.siteUrl + '?pagamento=' + orderNsu,
    webhook_url: AJUSTES.apiUrl,
    customer: { name: aluno.nome, phone_number: whats ? '+55' + whats : undefined, email: aluno.email || undefined },
  };
  var chave = chaveInfinitePay();
  var cabecalhos = {};
  if (chave) {
    // regra por link: até quantas parcelas a Casa Âmbar assume os juros
    corpo.options = { assured_installments: semJuros };
    cabecalhos['X-Api-Key'] = chave;
  }
  var resp = UrlFetchApp.fetch('https://api.checkout.infinitepay.io/links', {
    method: 'post',
    contentType: 'application/json',
    headers: cabecalhos,
    payload: JSON.stringify(corpo),
    muteHttpExceptions: true,
  });
  var texto = resp.getContentText();
  if (resp.getResponseCode() >= 300) {
    Logger.log('InfinitePay links ' + resp.getResponseCode() + ': ' + texto);
    throw new Error('Não foi possível gerar o pagamento agora (código ' + resp.getResponseCode() + '). Tente de novo em instantes ou fale com a recepção.');
  }
  var j = {};
  try { j = JSON.parse(texto); } catch (e) { /* resposta em texto */ }
  var link = j.url || j.link || j.checkout_url || j.payment_url || (j.data && (j.data.url || j.data.link));
  if (!link) {
    var achado = texto.match(/https:\/\/[^"'\s]+/);
    link = achado ? achado[0] : '';
  }
  if (!link) throw new Error('A InfinitePay não devolveu o link de pagamento.');
  return link;
}

function infinitepayConferir(orderNsu, transactionNsu, slug) {
  var resp = UrlFetchApp.fetch('https://api.checkout.infinitepay.io/payment_check', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ handle: AJUSTES.infinitepayHandle, order_nsu: orderNsu, transaction_nsu: transactionNsu, slug: slug }),
    muteHttpExceptions: true,
  });
  try { return JSON.parse(resp.getContentText()); } catch (e) { return {}; }
}

// Chamado quando a aluna volta da InfinitePay para o site
function confirmarPagamento(d) {
  var aluno = alunoDaSessao(d.token);
  var pg = linhaPagamento(String(d.orderNsu || ''));
  if (!pg || normCpf(pg.cpf) !== normCpf(aluno.cpf)) throw new Error('Pagamento não encontrado.');
  if (pg.status !== 'pago' && d.transactionNsu && d.slug) processarPagamento(pg.order_nsu, d.transactionNsu, d.slug, 'retorno');
  pg = linhaPagamento(pg.order_nsu);
  var reserva = null;
  if (pg.reserva_id) {
    var r = reservasAtivas().filter(function (x) { return x.id === pg.reserva_id; })[0];
    if (r) {
      partesAula(r);
      reserva = { id: r.id, status: r.status, data: r.data, hora: r.hora, modalidade: r.modalidade, professor: r.professor, tapete: r.tapete ? Number(r.tapete) : null };
    }
  }
  return { status: pg.status, descricao: pg.descricao, valor: numero(pg.valor), recibo: pg.recibo, observacao: pg.observacao, reserva: reserva };
}

function linhaPagamento(orderNsu) {
  var linhas = valoresAba('Pagamentos');
  var cab = linhas[0];
  for (var i = 1; i < linhas.length; i++) {
    if (String(linhas[i][0]) === orderNsu) {
      var p = objeto(cab, linhas[i]);
      p.order_nsu = String(p.order_nsu);
      p._linha = i + 1;
      return p;
    }
  }
  return null;
}

// Confere na InfinitePay e, se aprovado, libera o crédito (e a reserva que estava aguardando)
function processarPagamento(orderNsu, transactionNsu, slug, origem) {
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var pg = linhaPagamento(orderNsu);
    if (!pg) throw new Error('Pagamento ' + orderNsu + ' não encontrado.');
    if (pg.status === 'pago') return pg;
    if (!transactionNsu || !slug) return pg;

    var conf = infinitepayConferir(orderNsu, transactionNsu, slug);
    var esperado = Math.round(numero(pg.valor) * 100);
    if (!conf || !conf.paid || Number(conf.amount) < esperado) {
      Logger.log('Pagamento não confirmado (' + origem + '): ' + JSON.stringify(conf));
      return pg;
    }
    var obs = '';
    var planoRegra = buscarPlano(pg.plano_id);
    // parcelou dentro do "sem juros" deste plano, mas a InfinitePay cobrou juros da aluna:
    // avisa a recepção quanto devolver (valor pago − valor do plano)
    var parcelasPagas = Number(conf.installments || 1);
    var jurosPagos = (Number(conf.paid_amount || conf.amount) - Number(conf.amount)) / 100;
    if (planoRegra && parcelasPagas > 1 && parcelasPagas <= semJurosAte(planoRegra) && jurosPagos > 0.009) {
      obs = 'DEVOLVER R$ ' + jurosPagos.toFixed(2).replace('.', ',') + ' de juros à aluna: pagou em ' + parcelasPagas + 'x, que é sem juros neste plano.';
    }
    concluirPagamento(pg, {
      metodo: conf.capture_method === 'pix' ? 'Pix' : conf.capture_method === 'credit_card' ? 'Cartão' : String(conf.capture_method || ''),
      parcelas: conf.installments || 1,
      valor_pago: Number(conf.paid_amount || conf.amount) / 100,
      transaction_nsu: String(transactionNsu),
      slug: String(slug),
      observacao: obs,
    });
    return linhaPagamento(orderNsu);
  } finally {
    trava.releaseLock();
  }
}

// Marca como pago, cria o crédito de aulas e libera a reserva que aguardava.
// Usado pela InfinitePay, pelos descontos de 100% e pelas vendas no balcão.
function concluirPagamento(pg, info) {
  var obs = [info.observacao || ''];
  // vale-presente usado neste pagamento
  if (pg.vale) {
    var v = acharVale(pg.vale);
    if (v && v.tipo === 'plano') {
      atualizarLinha('Vales', v._linha, { status: 'resgatado', resgatado_em: agoraTexto(), resgatado_cpf: normCpf(pg.cpf) });
    } else if (v && saldoVale(v) + 0.009 < numero(pg.vale_usado)) {
      obs.push('ATENÇÃO: o vale ' + pg.vale + ' não tinha mais saldo suficiente (diferença de R$ ' + (numero(pg.vale_usado) - saldoVale(v)).toFixed(2).replace('.', ',') + ').');
    }
  }
  atualizarLinha('Pagamentos', pg._linha, {
    status: 'pago', pago_em: agoraTexto(), metodo: info.metodo || '', parcelas: info.parcelas || 1,
    valor_pago: info.valor_pago != null ? info.valor_pago : numero(pg.valor), transaction_nsu: info.transaction_nsu || '', slug: info.slug || '',
    observacao: obs.filter(String).join(' ') || pg.observacao || '',
  });
  if (pg.vale) {
    var v2 = acharVale(pg.vale);
    if (v2 && v2.tipo !== 'plano' && saldoVale(v2) <= 0.009) atualizarLinha('Vales', v2._linha, { status: 'usado', resgatado_em: agoraTexto(), resgatado_cpf: normCpf(pg.cpf) });
  }

  // crédito novo (cliente de serviço sem cadastro não tem crédito)
  var plano = buscarItemVenda(pg.plano_id) || { id: pg.plano_id, nome: pg.descricao, modalidade: '', tipo: 'avulsa', aulas_semana: 0, aulas_total: 1, validade_dias: 30 };
  var inicioCred = info.inicio || hojeTexto();
  var creditoId = 'C' + String(pg.order_nsu).slice(1);
  if (!soDigitos(pg.cpf) || info.semCredito) { SpreadsheetApp.flush(); return ''; }
  adicionarLinha('Creditos', { id: creditoId, cpf: normCpf(pg.cpf), nome: pg.nome, plano_id: plano.id, descricao: plano.nome, modalidade: plano.modalidade, tipo: plano.tipo,
    aulas_semana: plano.aulas_semana, aulas_total: plano.aulas_total, inicio: inicioCred, fim: somarDias(inicioCred, plano.validade_dias - 1),
    origem: (info.origemCredito || 'pagamento') + ' ' + pg.order_nsu, ativo: 'SIM' });

  // reserva que estava aguardando este pagamento
  if (pg.reserva_id) {
    var linhas = valoresAba('Reservas');
    var cab = linhas[0];
    for (var i = 1; i < linhas.length; i++) {
      var r = objeto(cab, linhas[i]);
      if (r.id !== pg.reserva_id) continue;
      var ocupado = reservasAtivas().some(function (x) {
        return x.id !== r.id && x.aula_id === r.aula_id && r.tapete && Number(x.tapete) === Number(r.tapete);
      });
      if (ocupado || r.status === 'cancelado') {
        atualizarLinha('Pagamentos', pg._linha, { observacao: 'O lugar foi ocupado antes da confirmação; o crédito ficou disponível.' });
      } else {
        atualizarLinha('Reservas', i + 1, { status: 'reservado', credito_id: creditoId, expira_ms: '' });
      }
      break;
    }
  }
  SpreadsheetApp.flush();
  return creditoId;
}

// ============================================================
//  8) WELLHUB
//  A aluna informa o ID Wellhub dela no site. Enquanto a recepção não confirma,
//  o status fica "pendente" (já pode reservar). A recepção muda na aba Alunos,
//  coluna wellhub: SIM (confirmado) ou NÃO (bloqueado).
// ============================================================
function statusWellhub(a) {
  if (!AJUSTES.wellhub.ativo) return 'desligado';
  var v = String((a && a.wellhub) || '').trim().toUpperCase();
  if (v === 'SIM') return 'confirmado';
  if (v === 'NÃO' || v === 'NAO') return 'bloqueado';
  if (v === 'PENDENTE') return 'pendente';
  return 'nao_informado';
}

function podeUsarWellhub(aluno, aula, reservas) {
  var st = statusWellhub(aluno);
  if (st === 'desligado') return { ok: false, motivo: 'Reservas pelo Wellhub não estão disponíveis no momento.' };
  if (st === 'nao_informado') return { ok: false, motivo: 'Ative o Wellhub em Meu plano para reservar com ele.' };
  if (st === 'pendente' && AJUSTES.wellhub.pendentePodeReservar === false) return { ok: false, motivo: 'Seu Wellhub está aguardando a confirmação da recepção.' };
  if (st === 'bloqueado') return { ok: false, motivo: 'Seu Wellhub não foi confirmado. Fale com a recepção.' };
  if (AJUSTES.wellhub.modalidades.indexOf(aula.modalidade) < 0) return { ok: false, motivo: aula.modalidade + ' não está disponível pelo Wellhub.' };
  var cpf = normCpf(aluno.cpf);
  var noDia = reservas.filter(function (r) {
    return normCpf(r.cpf) === cpf && String(r.credito_id) === 'WELLHUB' && partesAula(r).data === aula.data;
  }).length;
  if (noDia >= AJUSTES.wellhub.reservasPorDia) return { ok: false, motivo: 'Pelo Wellhub é possível ' + AJUSTES.wellhub.reservasPorDia + ' aula por dia.' };
  return { ok: true };
}

function ativarWellhub(d) {
  var aluno = alunoDaSessao(d.token);
  var id = soDigitos(d.wellhubId);
  if (id.length < 6 || id.length > 20) throw new Error('Confira o seu ID Wellhub (fica no app Wellhub, no seu perfil).');
  if (!d.confirmo) throw new Error('Confirme que seu plano Wellhub é ' + AJUSTES.wellhub.planoMinimo + ' ou superior.');
  if (statusWellhub(aluno) === 'bloqueado') throw new Error('Seu Wellhub não foi confirmado. Fale com a recepção.');
  var s = aba('Alunos');
  var col = function (c) { return coluna('Alunos', c); };
  if (statusWellhub(aluno) !== 'confirmado') s.getRange(aluno._linha, col('wellhub')).setValue('pendente');
  s.getRange(aluno._linha, col('wellhub_id')).setNumberFormat('@').setValue(id);
  s.getRange(aluno._linha, col('wellhub_desde')).setValue(agoraTexto());
  return { status: statusWellhub(buscarAluno(aluno.cpf)), id: id };
}

// ============================================================
//  9) UTILIDADES
// ============================================================
// ---------- memória do pedido ----------
// Cada leitura da planilha custa caro no Google (0,1 a 0,5 s). Durante um mesmo pedido,
// o que já foi lido fica guardado aqui. Pedir a aba com aba(nome) (para gravar)
// descarta a cópia daquela aba, então a próxima leitura vem atualizada.
var _abas = {};
var _memo = {};
function novaExecucao() {
  _abas = {};
  _memo = {};
  _planilha = null;
  _itensVenda = null;
  _ajustesAplicados = false;
  _cabecalhoOk = null;
}

// Pega a trava (uma ação por vez) e esquece o que foi lido antes:
// dentro da trava tudo é lido de novo, para não decidir com dados velhos.
function esperarTrava(trava, ms) {
  trava.waitLock(ms);
  _memo = {};
}

function aba(nome) {
  delete _memo[nome];
  return abaSemDescartar(nome);
}

// valores da aba (com o cabeçalho), lidos uma vez por pedido. Não altere o resultado.
function valoresAba(nome) {
  if (!_memo[nome]) {
    var v = abaSemDescartar(nome).getDataRange().getValues();
    _memo[nome] = { valores: v, objetos: null };
  }
  return _memo[nome].valores;
}

function abaSemDescartar(nome) {
  if (_abas[nome]) return _abas[nome];
  var ss = planilha();
  var s = ss.getSheetByName(nome);
  if (!s && ABAS[nome]) {
    // aba nova (ex.: Anamneses) ainda não criada: cria com o cabeçalho
    s = ss.insertSheet(nome);
    s.appendRow(ABAS[nome]);
    s.getRange(1, 1, 1, ABAS[nome].length).setFontWeight('bold').setBackground('#2F3821').setFontColor('#E9DDC5');
    s.setFrozenRows(1);
    s.getRange(FORMATO_TEXTO[nome] || (nome === 'Sessoes' ? 'A:B' : 'A:G')).setNumberFormat('@');
  }
  if (!s) throw new Error('Aba "' + nome + '" não encontrada. Execute configurarPlanilha.');
  garantirCabecalho(s, nome);
  _abas[nome] = s;
  return s;
}

var FORMATO_TEXTO = { Equipe: 'A:D', SessoesEquipe: 'A:B', Redefinicoes: 'A:D', Registro: 'A:D', Cupons: 'A:H', Vales: 'A:R',
  Servicos: 'A:D', Pacotes: 'A:C', Profissionais: 'A:F', Professoras: 'A:B', Atendimentos: 'A:K', Produtos: 'A:F', MovEstoque: 'A:D', Comandas: 'A:G', Comissoes: 'A:F',
  Despesas: 'A:D', Caixa: 'A:E', Folgas: 'A:F', Promocoes: 'A:E', Campanhas: 'A:G', FichasEstetica: 'A:B', Evolucoes: 'A:G' };

// Acrescenta no cabeçalho as colunas novas que uma aba antiga ainda não tem.
// A conferência fica guardada por 6 h (muda sozinha quando o código ganha colunas novas).
var _cabecalhoOk = null;
function garantirCabecalho(s, nome) {
  if (!ABAS[nome] || !s) return;
  var assinatura = ABAS[nome].join(',');
  var cache = CacheService.getScriptCache();
  if (!_cabecalhoOk) {
    try { _cabecalhoOk = JSON.parse(cache.get('cabecalhos_ok') || '{}') || {}; } catch (e) { _cabecalhoOk = {}; }
  }
  if (_cabecalhoOk[nome] === assinatura) return;
  var atual = s.getLastColumn ? s.getRange(1, 1, 1, Math.max(1, s.getLastColumn())).getValues()[0] : [];
  ABAS[nome].forEach(function (col, i) {
    if (String(atual[i] || '') !== col && atual.indexOf(col) < 0) s.getRange(1, i + 1).setValue(col);
  });
  _cabecalhoOk[nome] = assinatura;
  try { cache.put('cabecalhos_ok', JSON.stringify(_cabecalhoOk), 21600); } catch (e) { /* ignora */ }
}

// Texto vindo de fora nunca vira fórmula na planilha (=, +, -, @ no início
// poderiam executar IMPORTXML/HYPERLINK e vazar dados). Também limita o tamanho.
function seguro(v) {
  if (typeof v !== 'string') return v;
  // listas em JSON (itens de comanda, movimentos de caixa) podem ser longas; nunca começam com fórmula
  var lim = /^[\[{]/.test(v) ? 45000 : 2000;
  var t = v.length > lim ? v.slice(0, lim) : v;
  return /^[=+\-@\t\r]/.test(t) ? "'" + t : t;
}
function linhaSegura(arr) {
  return arr.map(seguro);
}

// Acrescenta uma linha a partir de um objeto { coluna: valor }
function adicionarLinha(nomeAba, obj) {
  var s = aba(nomeAba);
  s.appendRow(linhaSegura(ABAS[nomeAba].map(function (c) { return obj[c] == null ? '' : obj[c]; })));
  return s.getLastRow();
}

// Código único de pagamento. Compara sem a letra da frente porque o crédito
// usa os mesmos dígitos ('C' + …): nunca repete, nem com duas vendas no mesmo segundo.
function novoNsu(prefixo) {
  var s = aba('Pagamentos');
  var n = s.getLastRow();
  var usados = {};
  if (n > 1) s.getRange(2, 1, n - 1, 1).getValues().forEach(function (l) { usados[String(l[0]).slice(1)] = 1; });
  for (var t = 0; t < 30; t++) {
    var c = Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + Math.floor(Math.random() * 9000 + 1000);
    if (!usados[c]) return prefixo + c;
  }
  return prefixo + Utilities.getUuid().replace(/\D/g, '').slice(0, 18);
}

// Várias linhas de uma vez (importação, recorrentes): muito mais rápido que uma por uma
function adicionarLinhas(nomeAba, objs) {
  if (!objs || !objs.length) return;
  var s = aba(nomeAba);
  var cols = ABAS[nomeAba];
  var vals = objs.map(function (o) { return linhaSegura(cols.map(function (c) { return o[c] == null ? '' : o[c]; })); });
  s.getRange(s.getLastRow() + 1, 1, vals.length, cols.length).setValues(vals);
}

// Atualiza só as colunas informadas de uma linha.
// Colunas vizinhas vão juntas numa gravação só (bem mais rápido que uma por uma).
function atualizarLinha(nomeAba, linha, obj) {
  var s = aba(nomeAba);
  var cols = [];
  Object.keys(obj).forEach(function (c) {
    var col = coluna(nomeAba, c);
    if (col > 0) cols.push([col, seguro(obj[c] == null ? '' : obj[c])]);
  });
  cols.sort(function (a, b) { return a[0] - b[0]; });
  for (var i = 0; i < cols.length;) {
    var j = i;
    while (j + 1 < cols.length && cols[j + 1][0] === cols[j][0] + 1) j++;
    var trecho = cols.slice(i, j + 1);
    if (trecho.length === 1) s.getRange(linha, trecho[0][0]).setValue(trecho[0][1]);
    else s.getRange(linha, trecho[0][0], 1, trecho.length).setValues([trecho.map(function (x) { return x[1]; })]);
    i = j + 1;
  }
}

// Todas as linhas de uma aba como objetos (com _linha).
// Cada chamada recebe cópias: pode alterar os objetos sem afetar as próximas leituras.
function lerAba(nomeAba) {
  var linhas = valoresAba(nomeAba);
  var m = _memo[nomeAba];
  if (!m.objetos) {
    var cab = linhas[0];
    m.objetos = [];
    for (var i = 1; i < linhas.length; i++) {
      var o = objeto(cab, linhas[i]);
      o._linha = i + 1;
      m.objetos.push(o);
    }
  }
  return m.objetos.map(function (o) { var c = {}; for (var k in o) c[k] = o[k]; return c; });
}

function coluna(nomeAba, campo) {
  return ABAS[nomeAba].indexOf(campo) + 1;
}

function ehData(v) {
  return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime());
}

// A planilha transforma textos como "2026-10-18 09:30:00" em data/hora.
// Aqui elas voltam a ser texto, no fuso da planilha (o mesmo valor que foi gravado).
var _fusoCache = null;
function objeto(cab, linha) {
  var o = {};
  cab.forEach(function (c, i) {
    var v = linha[i];
    if (ehData(v)) {
      _fusoCache = _fusoCache || fusoPlanilha();
      v = v.getFullYear() < 1901 ? Utilities.formatDate(v, _fusoCache, 'HH:mm') : Utilities.formatDate(v, _fusoCache, 'yyyy-MM-dd HH:mm:ss').replace(/ 00:00:00$/, '');
    }
    o[c] = v;
  });
  return o;
}

function soDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

// CPF sempre com 11 dígitos (a planilha pode apagar o zero da frente)
function normCpf(v) {
  return soDigitos(v).padStart(11, '0');
}

function cpfValido(c) {
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  function calc(n) {
    var soma = 0;
    for (var i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    var r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  }
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

function agoraTexto() {
  return Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyyy-MM-dd HH:mm:ss');
}

// A planilha converte "2026-10-19" e "06:00" em data/hora no fuso DELA.
// Para ler de volta o valor digitado, formatamos no mesmo fuso da planilha.
function fusoPlanilha() {
  try { return planilha().getSpreadsheetTimeZone() || AJUSTES.fuso; } catch (e) { return AJUSTES.fuso; }
}

function dataTexto(v) {
  if (ehData(v)) return Utilities.formatDate(v, fusoPlanilha(), 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

function horaTexto(v) {
  if (ehData(v)) return Utilities.formatDate(v, fusoPlanilha(), 'HH:mm');
  var s = String(v).trim();
  if (!s) return '';
  var p = s.split(':');
  return ('0' + p[0]).slice(-2) + ':' + ((p[1] || '00') + '0').slice(0, 2);
}

// Início da aula como data real, no fuso de Fortaleza (UTC-3)
function inicio(aula) {
  return new Date(dataTexto(aula.data) + 'T' + horaTexto(aula.hora) + ':00-03:00');
}
