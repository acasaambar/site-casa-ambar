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
  validadeSessaoDias: 7, // o login da área do aluno vale no máximo 7 dias (depois, entra de novo)
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
  'lembreteServicos', 'lembreteAulas', 'comissaoLiquida'];
AJUSTES.valeValidadeDias = 365;
AJUSTES.lembreteServicos = true; // e-mail na véspera para quem tem serviço agendado
AJUSTES.lembreteAulas = false; // e-mail na véspera para quem reservou aula
// taxas da maquininha e do link (% de cada venda), para o resultado líquido no Financeiro (Ajustes)
// Tabela da InfinitePay da Casa (maquininha e link). Cada coluna de crédito/link tem 12 posições: 1x a 12x (null = ainda não informada).
//   debito: por grupo de bandeira (vm = Visa e Mastercard, elo, amex) · credito: por grupo e por parcela · link: por parcela (vale para qualquer bandeira)
// Os valores de partida são os que a Casa já usava (débito, crédito à vista e link); as parcelas de 2x a 12x ficam para conferir no app da InfinitePay.
var GRUPOS_TAXA = ['vm', 'elo', 'amex'];
function colunaTaxa(primeira) { var c = []; for (var i = 0; i < 12; i++) c.push(i === 0 ? primeira : null); return c; }
// Tabela do app da InfinitePay (calculadora, plano "1 Dia Útil", vídeos de 26/10/2026: aba Maquininha e aba Link). Mudou a tabela? Troque os números e some 1 em TABELA_VERSAO:
// quem salvou uma tabela de versão antiga volta a usar os números novos de débito, crédito e link (pix e prazos salvos ficam).
var TABELA_VERSAO = 3;
function taxasPadrao() {
  return { versao: TABELA_VERSAO, pix: 0,
    // débito: Visa e Mastercard (mesma tabela) e Elo; a American Express não tem débito
    debito: { vm: 1.37, elo: 2.58, amex: null },
    // crédito de 1x a 12x. Elo e American Express têm a mesma tabela
    credito: { vm: [3.15, 5.39, 6.12, 6.85, 7.57, 8.28, 8.99, 9.69, 10.38, 11.06, 11.74, 12.4],
      elo: [4.91, 6.47, 7.2, 7.92, 8.63, 9.33, 10.03, 10.72, 11.41, 12.08, 12.75, 13.41],
      amex: [4.91, 6.47, 7.2, 7.92, 8.63, 9.33, 10.03, 10.72, 11.41, 12.08, 12.75, 13.41] },
    // link (qualquer bandeira: a aba Link do app nem pergunta a bandeira); o salto de 6x para 7x é da própria tabela
    link: [4.2, 6.09, 7.01, 7.91, 8.8, 9.67, 12.59, 13.42, 14.25, 15.06, 15.87, 16.66],
    // dias úteis até o dinheiro cair na conta (InfinitePay: 1 dia útil no cartão e no link; Pix na hora)
    prazos: { pix: 0, debito: 1, credito: 1, link: 1 } };
}
function numeroTaxa(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}
function colunaDe(v, padrao) {
  var c = [];
  for (var i = 0; i < 12; i++) c.push(v && v.length > i ? numeroTaxa(v[i]) : (padrao ? padrao[i] : null));
  return c;
}
// aceita o formato novo e o antigo (pix, debito, credito1, credito2a6, credito7a12, link: um número cada)
function normalizarTaxas(j) {
  var t = taxasPadrao();
  if (!j || typeof j !== 'object') return t;
  var antiga = Number(j.versao) !== TABELA_VERSAO; // tabela salva antes dos números do app: débito e crédito vêm do padrão novo
  if (j.pix != null) t.pix = numeroTaxa(j.pix) || 0;
  if (antiga) { /* débito e crédito: padrão novo */ }
  else if (typeof j.debito === 'number' || typeof j.debito === 'string') {
    var d = numeroTaxa(j.debito); t.debito = { vm: d, elo: d, amex: null };
  } else if (j.debito && typeof j.debito === 'object') {
    GRUPOS_TAXA.forEach(function (g) { if (j.debito[g] !== undefined) t.debito[g] = numeroTaxa(j.debito[g]); });
  }
  if (antiga) { /* idem */ }
  else if (j.credito && typeof j.credito === 'object' && !Array.isArray(j.credito)) {
    GRUPOS_TAXA.forEach(function (g) { if (j.credito[g]) t.credito[g] = colunaDe(j.credito[g], t.credito[g]); });
  } else if (j.credito1 != null || j.credito2a6 != null || j.credito7a12 != null) {
    var col = []; for (var i = 1; i <= 12; i++) col.push(numeroTaxa(i === 1 ? j.credito1 : i <= 6 ? j.credito2a6 : j.credito7a12));
    GRUPOS_TAXA.forEach(function (g) { t.credito[g] = col.slice(); });
  }
  if (j.prazos && typeof j.prazos === 'object') ['pix', 'debito', 'credito', 'link'].forEach(function (k) {
    var n = Number(j.prazos[k]); if (j.prazos[k] !== '' && j.prazos[k] != null && !isNaN(n) && n >= 0 && n <= 60) t.prazos[k] = Math.round(n);
  });
  if (antiga) { /* link: padrão novo */ }
  else if (Array.isArray(j.link)) t.link = colunaDe(j.link, t.link);
  else if (typeof j.link === 'number' || typeof j.link === 'string') { var l = numeroTaxa(j.link); t.link = colunaTaxa(l).map(function (_, i) { return l; }); }
  return t;
}
AJUSTES.taxas = taxasPadrao();
// a comissão das profissionais é sobre o valor que sobra depois da taxa da maquininha (regra da Casa, out/2026)
AJUSTES.comissaoLiquida = true;
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
  if (j.taxas && typeof j.taxas === 'object') AJUSTES.taxas = normalizarTaxas(j.taxas);
  if (j.comissaoLiquida != null) AJUSTES.comissaoLiquida = !!j.comissaoLiquida;
}

var ABAS = {
  Grade: ['ativo', 'modalidade', 'dia_semana', 'hora', 'professor', 'capacidade'],
  Alunos: ['cpf', 'nome', 'whatsapp', 'email', 'senha_hash', 'sal', 'criado_em', 'ativo', 'wellhub', 'wellhub_id', 'wellhub_desde', 'obs_internas', 'origem_cadastro',
    'nascimento', 'marketing', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'como_conheceu',
    // alerta fixo escrito pela equipe (ex.: "alergia a látex"): aparece na agenda, nas aulas e na comanda
    'alerta'],
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
    'valor_original', 'desconto', 'cupom', 'vale', 'vale_usado', 'origem', 'registrado_por', 'promocao', 'comanda', 'tipo_item', 'profissional', 'bandeira',
    // pagamento dividido em mais de uma forma (fora da comanda): JSON [{ metodo, valor, parcelas, bandeira }]; vazio = uma forma só (coluna metodo)
    'formas'],
  // Créditos de aula de cada aluno (vêm de pagamentos ou são lançados à mão pela recepção)
  Creditos: ['id', 'cpf', 'nome', 'plano_id', 'descricao', 'modalidade', 'tipo', 'aulas_semana', 'aulas_total', 'inicio', 'fim', 'origem', 'ativo'],
  // ---- bancada interna ----
  Equipe: ['email', 'nome', 'papel', 'professor_nome', 'senha_hash', 'sal', 'ativo', 'criado_em', 'ultimo_acesso'],
  SessoesEquipe: ['token', 'email', 'criada_em', 'expira_em',
    // último uso (milissegundos), gravado no máximo a cada 30 min: conta as 3 h sem uso mesmo se o cache do Google falhar
    'uso_em'],
  Redefinicoes: ['token_hash', 'tipo', 'id', 'email', 'criado_em', 'expira_ms', 'usado_em', 'motivo'],
  Registro: ['quando', 'quem', 'acao', 'detalhe'],
  Cupons: ['codigo', 'ativo', 'tipo', 'valor', 'modalidade', 'tipo_plano', 'inicio', 'fim', 'limite_total', 'limite_por_aluno', 'primeira_compra', 'descricao', 'criado_por', 'criado_em'],
  // Vale-presente é sempre vendido (item da comanda): dá uma aula/plano/serviço do catálogo ou um valor em R$
  Vales: ['codigo', 'status', 'tipo', 'plano_id', 'valor', 'cpf', 'nome', 'email', 'whatsapp', 'motivo', 'campanha', 'mensagem',
    'criado_em', 'criado_por', 'validade', 'resgatado_em', 'resgatado_cpf', 'enviado',
    // origem 'vendido' e a comanda da venda (vazio = vale antigo, gerado antes da venda pela comanda)
    'origem', 'comanda'],
  // ---- serviços (estética, fisioterapia...) agendados pela bancada ----
  Servicos: ['id', 'ativo', 'categoria', 'nome', 'duracao_min', 'preco', 'descricao', 'sem_juros_ate', 'comissao', 'consumo',
    // dias até o retorno sugerido (vazio = sem retorno)
    'retorno_dias'],
  // nome = nome do combo (ex.: "Combo Alívio"), opcional
  Pacotes: ['id', 'ativo', 'servico_id', 'sessoes', 'preco', 'validade_dias', 'sem_juros_ate', 'nome'],
  Profissionais: ['nome', 'ativo', 'categorias', 'dias', 'inicio', 'fim', 'comissao', 'comissao_produto', 'servicos', 'horarios', 'especiais'],
  Professoras: ['nome', 'ativo', 'pilates_pct', 'wellhub_pct', 'yoga_por_aula', 'desde', 'atualizado_em',
    // modalidades marcadas no cadastro ("Pilates, Yoga"): valem mesmo antes de a pessoa entrar na Grade de aulas
    'modalidades'],
  // anamnese escrita pelas profissionais (texto livre + fotos), por cliente
  AnamnesesProf: ['id', 'cpf', 'nome', 'titulo', 'conteudo', 'fotos', 'profissional', 'criado_por', 'criado_em', 'atualizado_por', 'atualizado_em'],
  Atendimentos: ['id', 'data', 'hora', 'duracao_min', 'servico_id', 'servico', 'categoria', 'profissional', 'cpf', 'nome', 'whatsapp', 'status',
    'pagamento', 'valor', 'credito_id', 'order_nsu', 'obs', 'criado_por', 'criado_em', 'atualizado_em', 'lembrete', 'comanda',
    // substituição: quem era a titular e de quem é a regra de comissão (vazio = de quem atende)
    'titular', 'comissao_de',
    // retorno sugerido ("avisado 2026-10-21" / "dispensado …") e resposta da cliente pelo link de confirmação
    'retorno', 'resposta', 'resposta_em',
    // combo (pacote) que a cliente escolheu levar ao marcar "paga no dia": entra sozinho na comanda
    'combo',
    // serviços marcados juntos na mesma visita (agendarServicos): a comanda traz todos de uma vez
    'grupo'],
  // ---- gestão (Gestao.gs) ----
  Produtos: ['id', 'ativo', 'nome', 'categoria', 'marca', 'unidade', 'preco', 'custo', 'estoque', 'minimo', 'vende', 'obs'],
  MovEstoque: ['quando', 'produto_id', 'produto', 'tipo', 'qtd', 'custo_unit', 'valor', 'motivo', 'ref', 'quem'],
  Comandas: ['id', 'status', 'aberta_em', 'fechada_em', 'cpf', 'nome', 'whatsapp', 'itens', 'subtotal', 'desconto', 'total', 'pagamentos', 'codigo', 'obs',
    'aberta_por', 'fechada_por',
    // o que mudou na comanda (JSON: [{ q: quando, p: quem, t: texto }])
    'historico'],
  Comissoes: ['id', 'data', 'profissional', 'origem', 'ref', 'item', 'base', 'pct', 'valor', 'status', 'pago_em', 'pago_por', 'despesa_id', 'criado_em'],
  Despesas: ['id', 'data', 'descricao', 'categoria', 'valor', 'forma', 'status', 'pago_em', 'recorrente', 'fornecedor', 'obs', 'ref', 'criado_por', 'criado_em'],
  Caixa: ['data', 'status', 'abertura', 'aberto_por', 'aberto_em', 'movimentos', 'dinheiro_vendas', 'esperado', 'contado', 'diferenca', 'fechado_por', 'fechado_em', 'obs',
    // conferência com o extrato da maquininha (JSON: [{ forma, sistema, informado, diferenca }])
    'conferencia'],
  Folgas: ['id', 'profissional', 'data', 'inicio', 'fim', 'motivo', 'criado_por', 'criado_em'],
  // ---- marketing e clientes (Marketing.gs, Clientes.gs) ----
  Promocoes: ['id', 'ativo', 'nome', 'descricao', 'tipo', 'valor', 'itens', 'categorias', 'dias', 'de', 'ate', 'onde', 'criado_por', 'criado_em'],
  Campanhas: ['id', 'criada_em', 'nome', 'publico', 'canal', 'assunto', 'mensagem', 'total', 'enviados', 'criado_por'],
  FichasEstetica: ['cpf', 'nome', 'atualizada_em', 'atualizada_por', 'queixa', 'objetivo', 'alergias', 'medicamentos', 'condicoes', 'acidos', 'procedimentos',
    'exposicao_solar', 'fototipo', 'tipo_pele', 'obs', 'consentimento_fotos'],
  Evolucoes: ['id', 'cpf', 'nome', 'data', 'profissional', 'atendimento_id', 'servico', 'anotacao', 'fotos', 'criado_por', 'criado_em'],
  // ---- contrato dos planos mensal e trimestral (Contrato.gs): um aceite eletrônico por linha ----
  Contratos: ['id', 'cpf', 'nome', 'plano_id', 'plano', 'versao', 'hash', 'assinado_em', 'nome_digitado', 'dispositivo', 'pdf', 'order_nsu', 'imagem',
    // cópia por e-mail só depois do pagamento (enviado_em); pdf_id = arquivo no Drive; assinatura = desenho da pessoa (PNG no Drive)
    'enviado_em', 'pdf_id', 'assinatura'],
  // ---- lista de espera (Espera.gs): aula lotada ou serviço sem horário ----
  Espera: ['id', 'criado_em', 'tipo', 'aula_id', 'servico_id', 'servico', 'profissional', 'data', 'periodo', 'cpf', 'nome', 'whatsapp', 'obs', 'status',
    'avisado_em', 'resolvido_em', 'criado_por', 'origem'],
  // ---- substituições (Substituicoes.gs) ----
  Substituicoes: ['id', 'tipo', 'ref', 'data', 'hora', 'titulo', 'titular', 'substituto', 'regra', 'status', 'motivo', 'resposta',
    'pedido_por', 'pedido_em', 'feito_por', 'feito_em'],
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
  esquecerCacheDasAbas(); // mexeu na planilha por fora dos pedidos: as cópias do cache deixam de valer
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
  _pedido = { acao: String((corpo && corpo.acao) || '').slice(0, 40), rid: String((corpo && corpo.rid) || '').replace(/[^a-z0-9]/gi, '').slice(0, 40) };
  // aviso automático da InfinitePay (pagamento aprovado)
  if (corpo && !corpo.acao && corpo.order_nsu) {
    // só códigos de pagamento do site, com a confirmação da InfinitePay (o resto nem pega a trava)
    if (!/^P\d{14,20}$/.test(String(corpo.order_nsu)) || !corpo.transaction_nsu || !(corpo.invoice_slug || corpo.slug)) return responder(false, null, 'Pedido inválido.');
    try {
      var previo = linhaPagamento(String(corpo.order_nsu));
      if (!previo) return responder(false, null, 'Não processado.');
      if (previo.status !== 'pendente') return responder(true, { recebido: true });
      processarPagamento(String(corpo.order_nsu), corpo.transaction_nsu, corpo.invoice_slug || corpo.slug, 'webhook');
      return responder(true, { recebido: true });
    } catch (err) {
      Logger.log('webhook: ' + err.message);
      return responder(false, null, 'Não processado.');
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
      contratoDoPlano: contratoDoPlano,
      assinarContrato: assinarContrato,
      confirmarPagamento: confirmarPagamento,
      ativarWellhub: ativarWellhub,
      descartarPagamento: descartarPagamento,
      // senha
      esqueciSenha: esqueciSenha,
      verLinkSenha: verLinkSenha,
      novaSenha: novaSenha,
      salvarEmail: salvarEmail,
      salvarEndereco: salvarEndereco,
      // minha conta
      minhaConta: minhaConta,
      salvarConta: salvarConta,
      trocarEmail: trocarEmail,
      trocarSenha: trocarSenha,
      regras: regrasPublicas,
      // cupons e vale-presente
      validarCodigo: validarCodigo,
      resgatarVale: resgatarVale,
      // descadastro dos e-mails de campanha
      sairLista: sairLista,
      // lista de espera de aula lotada
      entrarEspera: entrarEspera,
      sairEspera: sairEspera,
      // confirmação do horário pelo link do lembrete
      verConfirmacao: verConfirmacao,
      responderConfirmacao: responderConfirmacao,
      // bancada (login da equipe)
      b_entrar: bancadaEntrar,
      b_esqueci: bancadaEsqueci,
    };
    var fn = Object.prototype.hasOwnProperty.call(acoes, corpo.acao) ? acoes[corpo.acao] : null;
    if (!fn && /^b_/.test(String(corpo.acao))) return responder(true, executarBancada(corpo));
    if (!fn) return responder(false, null, 'Ação desconhecida.');
    return responder(true, fn(corpo));
  } catch (err) {
    var msg = err.message || String(err);
    // falta de autorização do Google: mostra uma mensagem simples para a aluna
    if (/permiss|authoriz|autoriza/i.test(msg)) {
      Logger.log('Falta autorização: ' + msg);
      msg = 'Esta função está sendo ativada pela Casa Âmbar. Tente de novo mais tarde ou fale com a recepção.';
    } else if (/lock|timeout|too many times|quota|Exception:|Service .*(unavailable|error)|limit exceeded/i.test(msg)) {
      Logger.log('Google ocupado em ' + (corpo && corpo.acao) + ': ' + msg);
      msg = 'O sistema está muito ocupado agora. Tente de novo em alguns segundos.';
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
  try { confirmarGravacoes(); } catch (e) { Logger.log('cache: ' + e.message); }
  try { datasParaTexto(); } catch (e) { Logger.log('datas: ' + e.message); }
  // tempo no servidor e quantas abas vieram da planilha / do cache (para a tela Velocidade)
  var medida = { ms: _medida.inicio ? Date.now() - _medida.inicio : 0, planilha: _medida.planilha, cache: _medida.cache };
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, dados: dados, erro: erro || null, codigo: codigo || null, medida: medida, acao: _pedido.acao, rid: _pedido.rid }))
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
  var endereco = exigirEndereco(enderecoDe(d.endereco || {}));
  conferirHumano(d);
  limitarPorMinutos('cadastro', 40, 10);
  // a senha é processada antes da trava (é a parte demorada; a fila anda mais rápido)
  var sal = Utilities.getUuid();
  var hash = hashSenhaV2(d.senha, sal);

  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    if (buscarAluno(cpf)) throw new Error('Este CPF já tem cadastro. Use "Entrar".');
    adicionarLinha('Alunos', { cpf: cpf, nome: String(d.nome).trim(), whatsapp: soDigitos(d.whatsapp), email: String(d.email).trim().toLowerCase(),
      senha_hash: hash, sal: sal, criado_em: agoraTexto(), ativo: 'SIM', origem_cadastro: 'site', como_conheceu: textoComoConheceu(d.comoConheceu),
      cep: endereco.cep, endereco: endereco.endereco, numero: endereco.numero, complemento: endereco.complemento || '', bairro: endereco.bairro, cidade: endereco.cidade, uf: endereco.uf });
  } finally {
    soltarTrava(trava);
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
    // mesma mensagem para tudo: não revela se o CPF é cliente da casa
    throw new Error('CPF ou senha incorretos. Se você nunca criou uma senha, toque em "Esqueci minha senha".');
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
    if (linhas[i][0] === h) s.deleteRow(i + 1);
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
  var s = aba('Sessoes');
  s.appendRow([hashToken(token), normCpf(cpf), agoraTexto(), expira.toISOString()]);
  limparSessoesVencidas('Sessoes');
  // muitas sessões da mesma pessoa: apaga as mais antigas
  var linhas = s.getDataRange().getValues(), minhas = [];
  for (var i = 1; i < linhas.length; i++) if (normCpf(linhas[i][1]) === normCpf(cpf)) minhas.push(i + 1);
  var cache = CacheService.getScriptCache();
  minhas.slice(0, Math.max(0, minhas.length - 10)).reverse().forEach(function (l) {
    try { cache.remove('s_' + linhas[l - 1][0]); } catch (e) { /* ignora */ }
    s.deleteRow(l);
  });
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

// data/hora gravada pelo sistema → Date ("2026-10-21 08:00:00" de Fortaleza, ISO ou data que a planilha converteu)
function momentoDe(v) {
  // a planilha converte o texto "2026-10-21 08:00:00" em data no fuso DELA: lê de volta o que foi gravado
  var t = ehData(v) ? dataHoraTexto(v) : String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) return new Date(t);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t)) return new Date(t.slice(0, 19).replace(' ', 'T') + (t.length > 16 ? '' : ':00') + '-03:00');
  return new Date(NaN);
}

// sessão ainda vale: dentro do prazo gravado e do limite de hoje (sessões antigas, mais longas, também caem)
function sessaoValida(linha, maxMs) {
  var exp = ehData(linha[3]) ? linha[3] : momentoDe(linha[3]); // expira_em é gravado em ISO (instante exato)
  if (isNaN(exp.getTime()) || exp <= new Date()) return false;
  var criada = momentoDe(linha[2]);
  return isNaN(criada.getTime()) || Date.now() - criada.getTime() < maxMs;
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
      // só o hash confere (o valor guardado na planilha não serve como token)
      if (linhas[i][0] === h && sessaoValida(linhas[i], AJUSTES.validadeSessaoDias * 86400000)) {
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

// temFicha: se quem chama já sabe se há ficha de saúde (evita outra leitura)
function publico(a, temFicha) {
  var cpf = normCpf(a.cpf);
  return { nome: a.nome, cpf: cpf, whatsapp: String(a.whatsapp), email: String(a.email || ''), anamnese: temFicha != null ? !!temFicha : !!linhaAnamnese(cpf), wellhub: statusWellhub(a),
    endereco: temEndereco(a) };
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
  var trocas = trocasDeAulas(); // substituições: a aula sai com quem vai dar de fato
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
      var id = data + '_' + hora + '_' + mod.toLowerCase();
      var troca = trocas[id];
      lista.push({
        id: id,
        data: data,
        hora: hora,
        modalidade: mod,
        professor: troca ? troca.substituto : g.professor,
        titular: troca ? String(g.professor) : '',
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
  var espera = esperasDoAluno(aluno.cpf);
  return gerarAulas().map(function (a) { var x = montarAula(a, reservas, normCpf(aluno.cpf)); x.naEspera = !!espera[a.id]; return x; });
}

function detalharAula(d) {
  var aluno = alunoDaSessao(d.token);
  var aula = gerarAulas().filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada.');
  var x = montarAula(aula, reservasAtivas(), normCpf(aluno.cpf));
  x.naEspera = !!esperasDoAluno(aluno.cpf)[aula.id];
  return x;
}

// ============================================================
//  5) RESERVAS (com trava: dois alunos nunca ficam com o mesmo tapete)
// ============================================================
// quem estava na lista de espera e conseguiu reservar sai da lista
function reservar(d) {
  var r = reservarAula(d);
  if (r && r.status === 'reservado') esperaResolvida('aula', r.aulaId, normCpf(alunoDaSessao(d.token).cpf));
  return r;
}

function reservarAula(d) {
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
    var id = novoId('R');
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
    soltarTrava(trava);
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
  SpreadsheetApp.flush();
  avisarVagaAula(r.aula_id);
  return true;
}

function fazerCheckin(d) {
  var r = acharMinhaReserva(d);
  if (r.status !== 'reservado' && r.status !== 'check-in') throw new Error('Esta reserva ainda não foi confirmada. Conclua o pagamento primeiro.');
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
    comorbidades: (Array.isArray(f.comorbidades) ? f.comorbidades : []).slice(0, 30).map(limpar).join(', '),
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
    esquecerListaClientes();
    esquecerAlertas();
    var existente = linhaAnamnese(cpf);
    linha = linhaSegura(linha);
    if (existente) s.getRange(existente, 1, 1, linha.length).setValues([linha]);
    else s.appendRow(linha);
  } finally {
    soltarTrava(trava);
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
  return pastaPrivada(PASTA_ANAMNESES, 'PASTA_ANAMNESES_ID');
}

// Pasta privada da Casa no Drive (anamneses, fotos). Guarda o ID nas Propriedades.
// Se precisar procurar pelo nome, só aceita pasta que é da própria conta da Casa
// (uma pasta de mesmo nome compartilhada por outra pessoa não recebe os arquivos).
function pastaPrivada(nome, prop) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(prop);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* pasta apagada: cria outra */ }
  }
  var dono = '';
  try { dono = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { dono = ''; }
  var pasta = null;
  var it = DriveApp.getFoldersByName(nome);
  while (!pasta && it.hasNext()) {
    var p = it.next();
    try { if (dono && String(p.getOwner().getEmail()).toLowerCase() === dono) pasta = p; } catch (e) { /* sem dono visível: ignora */ }
  }
  if (!pasta) pasta = DriveApp.createFolder(nome);
  props.setProperty(prop, pasta.getId());
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
    linhaInfo('Observações para quem dá a aula', v.observacoes) + '</table>' +
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
  doCacheOuPreparar('Planos', prepararPlanos);
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
  var abaPlanos = abaSemDescartar('Planos');
  // aba vazia (criada automaticamente): preenche com o catálogo padrão
  if (abaPlanos.getLastRow() < 2) {
    abaPlanos = aba('Planos');
    abaPlanos.getRange('A:E').setNumberFormat('@');
    abaPlanos.getRange(2, 1, CATALOGO_INICIAL.length, CATALOGO_INICIAL[0].length).setValues(CATALOGO_INICIAL);
    SpreadsheetApp.flush();
  }
  // ajuste único: aula avulsa passou a valer 30 dias (antes 60)
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('AVULSA_30_DIAS')) {
    abaPlanos = aba('Planos');
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
        abaC.getRange(i + 1, col(k) + 1).setValue(seguro(valores[k]));
        linhas[i][col(k)] = valores[k];
      }
    });
  }
  return linhas;
}

// créditos já completados (ver acima), lidos uma vez por pedido
function valoresCreditos() {
  var v = valoresAba('Creditos');
  // linha lançada à mão na planilha (sem id): completa e grava (raro; o resto vem do cache)
  var cab = v[0] || [], cId = cab.indexOf('id'), cCpf = cab.indexOf('cpf'), cPlano = cab.indexOf('plano_id');
  var falta = v.some(function (l, i) { return i > 0 && !l[cId] && l[cCpf] && l[cPlano]; });
  if (falta) {
    var abaC = aba('Creditos');
    _memo.Creditos = { valores: completarCreditosManuais(abaC, valoresComTexto(abaC.getDataRange(), 'Creditos')), objetos: null };
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

// modalidades que existem no site e na área do aluno
var MODALIDADES_DO_SITE = ['Yoga', 'Pilates'];

function meuPlano(d) {
  var aluno = alunoDaSessao(d.token);
  var cpf = normCpf(aluno.cpf);
  var reservas = reservasAtivas();
  var hoje = hojeTexto();
  // a área do aluno é só de Yoga e Pilates: combo e serviço (estética, fisioterapia) são da bancada e nunca aparecem aqui
  var creditos = creditosDo(cpf)
    .filter(function (c) { return c.fim >= hoje && MODALIDADES_DO_SITE.indexOf(String(c.modalidade)) >= 0; })
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
    if (['servico', 'pacote', 'produto'].indexOf(String(p.tipo_item)) >= 0) continue; // compra de serviço/produto feita na bancada
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
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    // plano mensal/trimestral: ficha de saúde e contrato assinado (Contrato.gs)
    var aceite = exigirFichaEContrato(aluno, plano);
    var pg = criarPagamento(aluno, plano, {}, d.codigo);
    if (aceite && !aceite.order_nsu && pg.order_nsu) atualizarLinha('Contratos', aceite._linha, { order_nsu: pg.order_nsu });
    return pg;
  } finally {
    soltarTrava(trava);
  }
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
  return { status: pg.status, descricao: pg.descricao, valor: numero(pg.valor), recibo: pg.recibo, observacao: observacaoParaAluna(pg.observacao), reserva: reserva };
}

// a observação do pagamento também guarda notas internas (estorno, conferência de vale):
// para a aluna, só os avisos feitos para ela
function observacaoParaAluna(obs) {
  obs = String(obs || '');
  if (/lugar foi ocupado/i.test(obs)) return 'O lugar foi ocupado antes da confirmação; o crédito ficou disponível para outra aula.';
  var j = /DEVOLVER R\$ ([\d.,]+) de juros/.exec(obs);
  if (j) return 'Você pagou R$ ' + j[1] + ' de juros que não deveria. A recepção vai devolver.';
  return '';
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
    var transacaoJaUsada = lerAba('Pagamentos').some(function (p) {
      return String(p.order_nsu) !== String(orderNsu) && p.status === 'pago' && String(p.transaction_nsu) === String(transactionNsu);
    });
    if (!conf || conf.paid !== true || !(Number(conf.amount) >= esperado) || transacaoJaUsada) {
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
      obs = 'DEVOLVER R$ ' + jurosPagos.toFixed(2).replace('.', ',') + ' de juros: pagou em ' + parcelasPagas + 'x, que é sem juros neste plano.';
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
    soltarTrava(trava);
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
    } else if (v && saldoVale(v, pagamentosQueContam(pg.order_nsu)) + 0.009 < numero(pg.vale_usado)) {
      obs.push('ATENÇÃO: o vale ' + pg.vale + ' não tinha mais saldo suficiente (diferença de R$ ' + (numero(pg.vale_usado) - saldoVale(v)).toFixed(2).replace('.', ',') + ').');
    }
  }
  atualizarLinha('Pagamentos', pg._linha, {
    status: 'pago', pago_em: info.pagoEm || agoraTexto(), metodo: info.metodo || '', parcelas: info.parcelas || 1,
    valor_pago: info.valor_pago != null ? info.valor_pago : numero(pg.valor), transaction_nsu: info.transaction_nsu || '', slug: info.slug || '',
    observacao: obs.filter(String).join(' ') || pg.observacao || '',
  });
  // contrato assinado deste plano: a cópia por e-mail sai só agora que o pagamento foi confirmado
  try { enviarContratoPago(pg); } catch (e) { Logger.log('contrato pago: ' + e.message); }
  if (pg.vale) {
    var v2 = acharVale(pg.vale);
    if (v2 && v2.tipo !== 'plano' && saldoVale(v2, pagamentosPagos()) <= 0.009) atualizarLinha('Vales', v2._linha, { status: 'usado', resgatado_em: agoraTexto(), resgatado_cpf: normCpf(pg.cpf) });
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
var _semCacheGlobal = false;
function novaExecucao() {
  _semCacheGlobal = false;
  _abas = {};
  _memo = {};
  _planilha = null;
  _itensVenda = null;
  _ajustesAplicados = false;
  _cabecalhoOk = null;
  _alertas = null;
  _abasComData = {};
  _chaveConfirmacao = null;
  _versoes = null;
  _sujas = {};
  _medida = { planilha: 0, cache: 0, inicio: Date.now() };
  _pedido = { acao: '', rid: '' };
}

// Pega a trava (uma ação por vez) e esquece o que foi lido antes:
// dentro da trava tudo é lido de novo, para não decidir com dados velhos (só o catálogo vem do cache).
function esperarTrava(trava, ms) {
  trava.waitLock(ms);
  _memo = {};
  _semCacheGlobal = true;
  _versoes = null;
}

// Solta a trava avisando antes o que foi gravado (quem pegar a trava depois não usa cópia velha do cache)
function soltarTrava(trava) {
  try { confirmarGravacoes(); } finally {
    _semCacheGlobal = false;
    trava.releaseLock();
  }
}

// aba para GRAVAR: descarta a cópia do pedido e marca a aba como mudada (o cache dela é trocado no fim)
function aba(nome) {
  delete _memo[nome];
  _sujas[nome] = true;
  return abaSemDescartar(nome);
}

// valores da aba (com o cabeçalho), lidos uma vez por pedido. Não altere o resultado.
function valoresAba(nome) {
  if (!_memo[nome]) {
    var v = null;
    // fora da trava, qualquer aba pode vir do cache; dentro dela, só o catálogo. Aba gravada neste pedido vem da planilha.
    var versao = ABAS[nome] && !_sujas[nome] && (!_semCacheGlobal || ABAS_EM_CACHE[nome]) ? versaoDaAba(nome) : null;
    if (versao) v = lerCacheAba(nome, versao);
    if (v) _medida.cache++;
    else {
      v = valoresComTexto(abaSemDescartar(nome).getDataRange(), nome);
      _medida.planilha++;
      if (versao) guardarCacheAba(nome, versao, v);
    }
    _memo[nome] = { valores: v, objetos: null };
  }
  return _memo[nome].valores;
}

// ---------- cache das abas entre pedidos (com versão) ----------
// Ler uma aba da planilha custa 0,1–0,5 s; do cache do Google, uns 20–50 ms. Cada aba lida fica guardada
// (comprimida, em partes) com a "versão" da aba. Toda gravação feita pelo sistema troca a versão depois do
// flush (ao soltar a trava e no fim do pedido): a cópia velha deixa de valer para todo mundo.
// Dentro da trava, só o catálogo (ABAS_EM_CACHE) vem do cache; o resto é lido da planilha.
// Mudança feita à mão na planilha aparece em até 5 min (ou na hora: Ajustes → "Ler a planilha de novo").
var ABAS_EM_CACHE = { Grade: 1, Planos: 1, Servicos: 1, Pacotes: 1, Profissionais: 1, Professoras: 1, Promocoes: 1, Substituicoes: 1 };
var SEGUNDOS_CACHE_ABA = 300;
var SEGUNDOS_VERSAO = 21600;
var TAM_PARTE_CACHE = 95000, PARTES_CACHE = 9; // até ~850 KB comprimidos por aba; maior que isso, lê da planilha
var _versoes = null; // versões das abas lidas neste pedido (uma ida ao cache para todas)
var _sujas = {}; // abas gravadas neste pedido, ainda não avisadas
var _medida = { planilha: 0, cache: 0, inicio: 0 }; // vai na resposta (tela Velocidade)
// etiqueta do pedido: volta na resposta, e a tela confere que a resposta é mesmo a do pedido que ela fez
var _pedido = { acao: '', rid: '' };

function novaVersao() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }

function versoesAbas() {
  if (_versoes) return _versoes;
  _versoes = {};
  try {
    var nomes = Object.keys(ABAS);
    var r = CacheService.getScriptCache().getAll(nomes.map(function (n) { return 'v_' + n; }));
    nomes.forEach(function (n) { if (r['v_' + n]) _versoes[n] = r['v_' + n]; });
  } catch (e) { /* sem cache: lê da planilha */ }
  return _versoes;
}

// versão atual da aba; sem versão ainda, cria uma (a leitura da planilha vem DEPOIS, então nada velho fica com ela)
function versaoDaAba(nome) {
  var vs = versoesAbas();
  if (!vs[nome]) {
    var nova = novaVersao();
    try { CacheService.getScriptCache().put('v_' + nome, nova, SEGUNDOS_VERSAO); } catch (e) { return null; }
    vs[nome] = nova;
  }
  return vs[nome];
}

// a quantidade de colunas do código entra na chave: coluna nova publicada não usa cópia com o cabeçalho antigo
function chavesCacheAba(nome, versao) {
  versao = versao + (ABAS[nome] || []).length;
  var c = ['a_' + nome + '_' + versao + '_n'];
  for (var i = 0; i < PARTES_CACHE; i++) c.push('a_' + nome + '_' + versao + '_' + i);
  return c;
}

function lerCacheAba(nome, versao) {
  try {
    var chaves = chavesCacheAba(nome, versao);
    var r = CacheService.getScriptCache().getAll(chaves);
    var n = Number(r[chaves[0]] || 0);
    if (!n) return null;
    var partes = [];
    for (var i = 0; i < n; i++) {
      if (r[chaves[i + 1]] == null) return null;
      partes.push(r[chaves[i + 1]]);
    }
    return JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(partes.join('')), 'application/x-gzip')).getDataAsString());
  } catch (e) { return null; }
}

function guardarCacheAba(nome, versao, valores) {
  try {
    var z = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(valores), 'application/json')).getBytes());
    var n = Math.ceil(z.length / TAM_PARTE_CACHE) || 1;
    if (n > PARTES_CACHE) return;
    var chaves = chavesCacheAba(nome, versao), mapa = {};
    for (var i = 0; i < n; i++) mapa[chaves[i + 1]] = z.slice(i * TAM_PARTE_CACHE, (i + 1) * TAM_PARTE_CACHE);
    mapa[chaves[0]] = String(n);
    CacheService.getScriptCache().putAll(mapa, SEGUNDOS_CACHE_ABA);
  } catch (e) { /* sem cache: segue lendo da planilha */ }
}

// Depois de gravar: flush e versão nova para cada aba mudada (chamado ao soltar a trava e no fim do pedido)
function confirmarGravacoes() {
  var nomes = Object.keys(_sujas);
  if (!nomes.length) return;
  _sujas = {};
  try { SpreadsheetApp.flush(); } catch (e) { /* segue */ }
  var vs = versoesAbas(), mapa = {};
  nomes.forEach(function (n) { if (!ABAS[n]) return; vs[n] = novaVersao(); mapa['v_' + n] = vs[n]; });
  if (!Object.keys(mapa).length) return;
  var cache = CacheService.getScriptCache();
  try { cache.putAll(mapa, SEGUNDOS_VERSAO); } catch (e) {
    // não deu para trocar a versão: apaga (quem ler depois cria outra e lê da planilha)
    try { cache.removeAll(Object.keys(mapa)); } catch (e2) { Logger.log('cache: ' + e2.message); }
  }
}

// Ajustes → "Ler a planilha de novo": esquece todas as cópias (depois de mexer na planilha à mão)
function esquecerCacheDasAbas() {
  Object.keys(ABAS).forEach(function (n) { _sujas[n] = true; });
  confirmarGravacoes();
  esquecerListaClientes();
  try { esquecerAlertas(); } catch (e) { /* ignora */ }
}

// usa o cache se houver; senão roda as conferências da aba (preencher, migrar) e lê da planilha
function doCacheOuPreparar(nome, preparar) {
  if (_memo[nome]) return;
  var versao = _sujas[nome] ? null : versaoDaAba(nome);
  var c = versao ? lerCacheAba(nome, versao) : null;
  if (c) { _memo[nome] = { valores: c, objetos: null }; _medida.cache++; }
  else preparar();
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
  Servicos: 'A:D', Pacotes: 'A:C', Profissionais: 'A:F', Professoras: 'A:B', AnamnesesProf: 'A:B', Atendimentos: 'A:K', Produtos: 'A:F', MovEstoque: 'A:D', Comandas: 'A:G', Comissoes: 'A:F',
  Despesas: 'A:D', Caixa: 'A:E', Folgas: 'A:F', Promocoes: 'A:E', Campanhas: 'A:G', FichasEstetica: 'A:B', Evolucoes: 'A:G', Substituicoes: 'A:E', Espera: 'A:J', Contratos: 'A:H' };

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
  if (v && typeof v === 'object' && !ehData(v)) v = JSON.stringify(v);
  if (typeof v !== 'string') return v;
  // listas em JSON (itens de comanda, movimentos de caixa) podem ser longas; nunca começam com fórmula
  var lim = /^[\[{]/.test(v) ? 45000 : 2000;
  var t = v.length > lim ? v.slice(0, lim) : v;
  return /^[=+\-@\t\r]/.test(t) ? "'" + t : t;
}
function linhaSegura(arr) {
  return arr.map(seguro);
}

// Texto que o Google transformaria em data/hora ("2026-10-27", "2026-10-27 09:00:00", "09:00").
// Velocidade (out/2026): gravado já como texto (formato "@" na célula). Antes virava data, e o próximo
// pedido que lia a aba relia a aba inteira duas vezes para desfazer (datasParaTexto): agendar, marcar
// atendido e fechar comanda faziam o dobro de leituras.
var RE_TEXTO_DATA = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$|^\d{2}:\d{2}$/;
function pareceData(v) { return typeof v === 'string' && RE_TEXTO_DATA.test(v); }

// Acrescenta uma linha a partir de um objeto { coluna: valor }
function adicionarLinha(nomeAba, obj) {
  if (ABAS_DA_LISTA_CLIENTES[nomeAba]) esquecerListaClientes();
  if (ABAS_DOS_ALERTAS[nomeAba]) esquecerAlertas();
  var s = aba(nomeAba);
  var vals = linhaSegura(ABAS[nomeAba].map(function (c) { return obj[c] == null ? '' : obj[c]; }));
  s.appendRow(vals);
  var n = s.getLastRow();
  // o Registro quase nunca é lido: não vale a leitura extra a cada ação
  if (nomeAba !== 'Registro') textoNasDatasDaLinha(s, n, vals);
  return n;
}

// O appendRow do Google ignora o formato de texto: as células de data/hora da linha nova são regravadas
// como texto. Confere antes que a última linha é mesmo a nossa (outro pedido pode ter acrescentado
// uma linha ao mesmo tempo); se não for, fica para o datasParaTexto.
function textoNasDatasDaLinha(s, n, vals) {
  var datas = [];
  vals.forEach(function (v, i) { if (pareceData(v)) datas.push(i); });
  if (!datas.length || n < 2) return;
  try {
    var lida = s.getRange(n, 1, 1, vals.length).getValues()[0];
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i];
      if (typeof v !== 'string' || v === '' || pareceData(v) || /^-?\d+([.,]\d+)?$/.test(v)) continue;
      if (String(lida[i]).replace(/^'/, '') !== v.replace(/^'/, '')) return;
    }
    datas.forEach(function (i) { s.getRange(n, i + 1).setNumberFormat('@').setValue(vals[i]); });
  } catch (e) { Logger.log('datas da linha: ' + e.message); }
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
  if (ABAS_DA_LISTA_CLIENTES[nomeAba]) esquecerListaClientes();
  if (ABAS_DOS_ALERTAS[nomeAba]) esquecerAlertas();
  var s = aba(nomeAba);
  var cols = ABAS[nomeAba];
  var vals = objs.map(function (o) { return linhaSegura(cols.map(function (c) { return o[c] == null ? '' : o[c]; })); });
  var ini = s.getLastRow() + 1;
  // colunas com data/hora: formato de texto antes de gravar (senão o Google transforma em data)
  cols.forEach(function (c, j) { if (vals.some(function (l) { return pareceData(l[j]); })) s.getRange(ini, j + 1, vals.length, 1).setNumberFormat('@'); });
  s.getRange(ini, 1, vals.length, cols.length).setValues(vals);
}

// Atualiza só as colunas informadas de uma linha.
// Colunas vizinhas vão juntas numa gravação só (bem mais rápido que uma por uma).
function atualizarLinha(nomeAba, linha, obj) {
  if (ABAS_DA_LISTA_CLIENTES[nomeAba]) esquecerListaClientes();
  if (ABAS_DOS_ALERTAS[nomeAba]) esquecerAlertas();
  var s = aba(nomeAba);
  var cols = [];
  Object.keys(obj).forEach(function (c) {
    var col = coluna(nomeAba, c);
    if (col > 0) cols.push([col, seguro(obj[c] == null ? '' : obj[c])]);
  });
  cols.sort(function (a, b) { return a[0] - b[0]; });
  if (!cols.length) return;
  // data/hora vai como texto (formato "@" na célula), senão o Google transforma em data
  cols.forEach(function (x) { if (pareceData(x[1])) s.getRange(linha, x[0]).setNumberFormat('@'); });
  // várias colunas espalhadas dentro da trava (ninguém grava ao mesmo tempo): lê a faixa uma vez e grava
  // tudo de uma vez (fechar comanda gravava a mesma linha em 5 ou 6 idas ao Google)
  var grupos = 1;
  for (var g = 1; g < cols.length; g++) if (cols[g][0] !== cols[g - 1][0] + 1) grupos++;
  if (grupos > 2 && _semCacheGlobal) {
    var c0 = cols[0][0], faixa = s.getRange(linha, c0, 1, cols[cols.length - 1][0] - c0 + 1);
    var vals = faixa.getValues()[0];
    cols.forEach(function (x) { vals[x[0] - c0] = x[1]; });
    faixa.setValues([vals]);
    return;
  }
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
  for (var i = 0; i < cab.length; i++) {
    var v = linha[i];
    if (ehData(v)) {
      var t = dataHoraTexto(v);
      v = v.getFullYear() < 1901 ? t.slice(11, 16) : t.replace(/ 00:00:00$/, '');
    }
    o[cab[i]] = v;
  }
  return o;
}

// ---------- datas e horas lidas como TEXTO (sem depender de fuso) ----------
// A planilha transforma "2026-10-27" e "09:00" em data/hora. Lida pelo Google, essa data vem
// convertida pelo fuso, e com a planilha num fuso diferente a hora "andava" (09:00 virava 01:00 e o dia
// voltava um). O texto que a planilha MOSTRA é exatamente o que foi gravado: é ele que vale.
var _abasComData = {};
function valoresComTexto(r, nome) {
  var v = r.getValues();
  var tela = null;
  for (var i = 0; i < v.length; i++) {
    for (var j = 0; j < v[i].length; j++) {
      if (!ehData(v[i][j])) continue;
      if (!tela) tela = r.getDisplayValues();
      v[i][j] = textoDeData(tela[i][j], v[i][j]);
      if (nome && i > 0) _abasComData[nome] = true;
    }
  }
  return v;
}

// texto da tela → "aaaa-mm-dd", "aaaa-mm-dd hh:mm:ss" ou "hh:mm" (os mesmos formatos que o sistema grava)
function textoDeData(tela, d) {
  var t = String(tela || '').trim();
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  var x = m ? [m[1], m[2], m[3], m[4], m[5], m[6]] : null;
  if (!x && (m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t))) x = [m[3], m[2], m[1], m[4], m[5], m[6]];
  var dois = function (n) { return ('0' + n).slice(-2); };
  if (x && Number(x[0]) >= 1901) {
    var dia = x[0] + '-' + dois(x[1]) + '-' + dois(x[2]);
    var hora = x[3] != null ? dois(x[3]) + ':' + x[4] + ':' + (x[5] || '00') : '';
    return hora && hora !== '00:00:00' ? dia + ' ' + hora : dia;
  }
  if (x && x[3] != null) return dois(x[3]) + ':' + x[4];
  if ((m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t))) return dois(m[1]) + ':' + m[2];
  // formato que não dá para ler na tela: conversão pelo fuso (como antes)
  var c = dataHoraTexto(d);
  return d.getFullYear() < 1901 ? c.slice(11, 16) : c.replace(/ 00:00:00$/, '');
}

// No fim do pedido, guarda como texto as datas/horas que a planilha converteu (linhas novas):
// a próxima leitura não precisa buscar a tela. Só com a trava livre e fora das abas que apagam
// linhas sem a trava (as linhas poderiam andar entre ler e gravar).
var ABAS_SEM_DATA_TEXTO = { Sessoes: 1, SessoesEquipe: 1, Redefinicoes: 1, Evolucoes: 1, AnamnesesProf: 1, Bloqueios: 1 };
function datasParaTexto() {
  var nomes = Object.keys(_abasComData).filter(function (n) { return !ABAS_SEM_DATA_TEXTO[n]; });
  _abasComData = {};
  if (!nomes.length) return;
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(50)) return; // trava ocupada: fica para outro pedido (não atrasa a resposta)
  try {
    var gravadas = 0;
    nomes.forEach(function (nome) {
      var s = planilha().getSheetByName(nome);
      if (!s || gravadas > 60) return;
      var r = s.getDataRange();
      var v = r.getValues(), tela = null;
      for (var j = 0; j < (v[0] || []).length; j++) {
        for (var i = 1; i < v.length;) {
          if (!ehData(v[i][j])) { i++; continue; }
          var ini = i;
          while (i < v.length && ehData(v[i][j])) i++;
          if (!tela) tela = r.getDisplayValues();
          var textos = [];
          for (var k = ini; k < i; k++) textos.push([textoDeData(tela[k][j], v[k][j])]);
          s.getRange(ini + 1, j + 1, i - ini, 1).setNumberFormat('@').setValues(textos);
          gravadas++;
        }
      }
      // o conteúdo não muda (o texto é o mesmo que o cache já guarda): não precisa trocar a versão
      delete _memo[nome];
    });
  } finally {
    trava.releaseLock();
  }
}

// "aaaa-mm-dd hh:mm:ss" no fuso da planilha. Formatar pelo Google é caro (milhares de células por tela):
// em fuso fixo (Fortaleza não tem horário de verão desde mar/2002) a conta é feita aqui; o resto é guardado.
var FUSOS_FIXOS = { 'America/Fortaleza': [-3, 1014951600000], GMT: [0, 0], UTC: [0, 0], 'Etc/GMT': [0, 0], 'Etc/UTC': [0, 0] };
var _datasMemo = {};
function dataHoraTexto(v) {
  var fuso = _fusoCache || (_fusoCache = fusoPlanilha());
  var t = v.getTime();
  var fixo = FUSOS_FIXOS[fuso];
  if (fixo && t >= fixo[1]) return new Date(t + fixo[0] * 3600000).toISOString().slice(0, 19).replace('T', ' ');
  var k = fuso + t;
  return _datasMemo[k] || (_datasMemo[k] = Utilities.formatDate(v, fuso, 'yyyy-MM-dd HH:mm:ss'));
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
  if (ehData(v)) return dataHoraTexto(v).slice(0, 10);
  return String(v).slice(0, 10);
}

function horaTexto(v) {
  if (ehData(v)) return dataHoraTexto(v).slice(11, 16);
  var s = String(v).trim();
  if (!s) return '';
  var p = s.split(':');
  return ('0' + p[0]).slice(-2) + ':' + ((p[1] || '00') + '0').slice(0, 2);
}

// Início da aula como data real, no fuso de Fortaleza (UTC-3)
function inicio(aula) {
  return new Date(dataTexto(aula.data) + 'T' + horaTexto(aula.hora) + ':00-03:00');
}
