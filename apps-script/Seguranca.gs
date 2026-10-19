/**
 * ============================================================
 *  CASA ÂMBAR — SENHAS, RECUPERAÇÃO POR E-MAIL E REGRAS PÚBLICAS
 * ============================================================
 *
 *  Senhas: HMAC-SHA256 com SAL (único por pessoa, guardado na planilha)
 *  + PIMENTA (segredo único do sistema, guardado só nas Propriedades do
 *  script, nunca na planilha nem no GitHub), repetido várias vezes.
 *  Quem copiar a planilha não consegue testar senhas sem a pimenta.
 *
 *  A pimenta é criada sozinha no primeiro uso, na propriedade SENHA_PIMENTA.
 *  NUNCA apague nem altere essa propriedade: todas as senhas deixariam de funcionar.
 *
 *  Senhas antigas (só com sal) continuam valendo e são regravadas no formato
 *  novo automaticamente no próximo login de cada pessoa.
 */

var HASH_ITERACOES = 400;

function pimenta() {
  var props = PropertiesService.getScriptProperties();
  var p = props.getProperty('SENHA_PIMENTA');
  if (p) return p;
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    p = props.getProperty('SENHA_PIMENTA');
    if (!p) {
      p = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
      props.setProperty('SENHA_PIMENTA', p);
    }
  } finally {
    trava.releaseLock();
  }
  return p;
}

function hashSenhaV2(senha, sal) {
  var chave = pimenta();
  var bytes = Utilities.computeHmacSha256Signature(sal + ':' + senha, chave, Utilities.Charset.UTF_8);
  for (var i = 1; i < HASH_ITERACOES; i++) {
    bytes = Utilities.computeHmacSha256Signature(Utilities.base64Encode(bytes) + sal, chave, Utilities.Charset.UTF_8);
  }
  return 'v2$' + Utilities.base64Encode(bytes);
}

// { ok, atualizar } — atualizar=true quando a senha ainda está no formato antigo
function verificarSenha(senha, hashSalvo, sal) {
  hashSalvo = String(hashSalvo || '');
  if (!senha || !hashSalvo || !sal) return { ok: false };
  if (hashSalvo.indexOf('v2$') === 0) return { ok: iguais(hashSenhaV2(String(senha), String(sal)), hashSalvo) };
  return { ok: iguais(hashSenha(String(senha), String(sal)), hashSalvo), atualizar: true };
}

// comparação sem atalho (não revela pelo tempo onde a senha difere)
function iguais(a, b) {
  a = String(a); b = String(b);
  var dif = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}

function validarSenhaNova(senha) {
  senha = String(senha || '');
  if (senha.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) throw new Error('Use letras e números na senha.');
  if (/^(\d)\1+$/.test(senha) || /12345678|abcdefgh|senha123/i.test(senha)) throw new Error('Essa senha é fácil de adivinhar. Escolha outra.');
}

// grava senha nova (sal novo) em Alunos ou Equipe
function gravarSenha(nomeAba, linha, senha) {
  var sal = Utilities.getUuid();
  atualizarLinha(nomeAba, linha, { senha_hash: hashSenhaV2(String(senha), sal), sal: sal });
}

function emailValido(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
}

function mascararEmail(e) {
  var p = String(e || '').split('@');
  if (p.length !== 2) return '';
  var dom = p[1].split('.');
  var u = p[0].length <= 2 ? p[0][0] + '*' : p[0].slice(0, 2) + '***';
  return u + '@' + dom[0].slice(0, 2) + '***.' + dom.slice(1).join('.');
}

// ---------------- limite de tentativas ----------------
function limitarTentativas(chave) {
  var n = Number(CacheService.getScriptCache().get('falha_' + chave) || 0);
  if (n >= 8) throw new Error('Muitas tentativas. Aguarde 15 minutos ou use "Esqueci minha senha".');
}
function registrarFalha(chave) {
  var c = CacheService.getScriptCache();
  c.put('falha_' + chave, String(Number(c.get('falha_' + chave) || 0) + 1), 900);
}
function limparFalhas(chave) {
  try { CacheService.getScriptCache().remove('falha_' + chave); } catch (e) { /* ignora */ }
}

// limite simples para adivinhação de códigos (cupom/vale): 15 erros em 15 min por pessoa
function contarErroCodigo(chave) {
  var c = CacheService.getScriptCache();
  var n = Number(c.get('cod_' + chave) || 0) + 1;
  c.put('cod_' + chave, String(n), 900);
}
function limitarCodigos(chave) {
  if (Number(CacheService.getScriptCache().get('cod_' + chave) || 0) >= 15) throw new Error('Muitos códigos inválidos. Aguarde alguns minutos.');
}

// ---------------- links de senha (recuperação e convite) ----------------
function sha256Hex(txt) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(txt), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

// tipo: 'aluno' (id = CPF) ou 'equipe' (id = e-mail). Devolve o link.
function criarLinkSenha(tipo, id, email, horas, motivo) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  adicionarLinha('Redefinicoes', { token_hash: sha256Hex(token), tipo: tipo, id: String(id), email: email, criado_em: agoraTexto(),
    expira_ms: Date.now() + horas * 3600000, usado_em: '', motivo: motivo || 'recuperação' });
  return AJUSTES.siteUrl + '#/nova-senha?t=' + token;
}

function acharLinkSenha(token) {
  if (!token || String(token).length < 40) return null;
  var h = sha256Hex(token);
  var lista = lerAba('Redefinicoes');
  for (var i = lista.length - 1; i >= 0; i--) {
    var r = lista[i];
    if (String(r.token_hash) !== h) continue;
    if (r.usado_em || Number(r.expira_ms) < Date.now()) return null;
    return r;
  }
  return null;
}

// Aluno: "Esqueci minha senha" (pelo CPF).
// A resposta é sempre a mesma: não revela se o CPF tem cadastro nem qual é o e-mail.
function esqueciSenha(d) {
  var cpf = normCpf(d.cpf);
  if (!cpfValido(cpf)) throw new Error('Confira o CPF.');
  var cache = CacheService.getScriptCache();
  var chave = 'esq_' + cpf;
  var pedidos = Number(cache.get(chave) || 0);
  cache.put(chave, String(pedidos + 1), 3600);
  if (pedidos >= 3) return { enviado: true };
  var aluno = buscarAluno(cpf);
  if (!aluno || aluno.ativo === 'NÃO' || !emailValido(aluno.email)) {
    Utilities.sleep(700);
    return { enviado: true };
  }
  var link = criarLinkSenha('aluno', cpf, aluno.email, 1, 'recuperação');
  enviarEmail(aluno.email, 'Crie uma nova senha · Casa Âmbar',
    'Nova senha',
    ['Olá, ' + primeiroNome(aluno.nome) + '.', 'Recebemos um pedido para criar uma nova senha da sua área do aluno.',
      'O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha atual continua valendo.'],
    { texto: 'Criar nova senha', url: link });
  return { enviado: true };
}

// A tela de nova senha confere o link antes de mostrar o formulário
function verLinkSenha(d) {
  limitarTentativas('link_' + String(d.t || '').slice(0, 12));
  var r = acharLinkSenha(d.t);
  if (!r) registrarFalha('link_' + String(d.t || '').slice(0, 12));
  if (!r) throw erroCod('Este link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".', 'LINK_INVALIDO');
  var nome = '';
  if (r.tipo === 'aluno') { var a = buscarAluno(r.id); nome = a ? a.nome : ''; }
  else { var m = buscarMembro(r.id); nome = m ? m.nome : ''; }
  return { tipo: r.tipo, nome: primeiroNome(nome), convite: r.motivo === 'convite' };
}

function novaSenha(d) {
  validarSenhaNova(d.senha);
  limitarTentativas('link_' + String(d.t || '').slice(0, 12));
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    var r = acharLinkSenha(d.t);
    if (!r) throw erroCod('Este link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".', 'LINK_INVALIDO');
    if (r.tipo === 'aluno') {
      var a = buscarAluno(r.id);
      if (!a) throw new Error('Cadastro não encontrado.');
      gravarSenha('Alunos', a._linha, d.senha);
      encerrarSessoes('Sessoes', 's_', normCpf(r.id));
      limparFalhas('a_' + normCpf(r.id));
    } else {
      var m = buscarMembro(r.id);
      if (!m) throw new Error('Acesso não encontrado.');
      // equipe acessa dados de saúde e financeiros: senha mais longa
      if (String(d.senha).length < 10) throw new Error('Para a bancada, use pelo menos 10 caracteres.');
      gravarSenha('Equipe', m._linha, d.senha);
      encerrarSessoes('SessoesEquipe', 'e_', String(r.id).toLowerCase());
      limparFalhas('e_' + String(r.id).toLowerCase());
    }
    atualizarLinha('Redefinicoes', r._linha, { usado_em: agoraTexto() });
  } finally {
    trava.releaseLock();
  }
  return { tipo: r.tipo };
}

// apaga as sessões abertas (troca de senha desconecta os outros aparelhos)
function encerrarSessoes(nomeAba, prefixoCache, id) {
  var s = aba(nomeAba);
  var linhas = s.getDataRange().getValues();
  var cache = CacheService.getScriptCache();
  for (var i = linhas.length - 1; i >= 1; i--) {
    var dono = nomeAba === 'Sessoes' ? normCpf(linhas[i][1]) : String(linhas[i][1]).toLowerCase();
    if (dono === id) {
      try { cache.remove(prefixoCache + linhas[i][0]); } catch (e) { /* ignora */ }
      s.deleteRow(i + 1);
    }
  }
}

// Aluno sem e-mail cadastra o e-mail pela área do aluno
function salvarEmail(d) {
  var aluno = alunoDaSessao(d.token);
  if (!emailValido(d.email)) throw new Error('Informe um e-mail válido.');
  atualizarLinha('Alunos', aluno._linha, { email: String(d.email).trim().toLowerCase() });
  return publico(buscarAluno(aluno.cpf));
}

// Regras que o site mostra (mudam pela bancada → Ajustes)
function regrasPublicas() {
  return { checkinAbreMinAntes: AJUSTES.checkinAbreMinAntes, cancelarAteHorasAntes: AJUSTES.cancelarAteHorasAntes, diasVisiveis: AJUSTES.diasVisiveis,
    wellhubAtivo: AJUSTES.wellhub.ativo };
}

// ---------------- e-mail com a cara da Casa Âmbar ----------------
function primeiroNome(n) {
  return String(n || '').trim().split(' ')[0] || '';
}

function escHtml(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// paragrafos: lista de textos; botao: { texto, url }; extra: HTML pronto (opcional)
function enviarEmail(para, assunto, titulo, paragrafos, botao, extra, rodape) {
  var corpoP = paragrafos.map(function (p) {
    return '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2F3821">' + escHtml(p) + '</p>';
  }).join('');
  var html =
    '<div style="background:#F4EFDF;padding:32px 12px;font-family:Georgia,\'Times New Roman\',serif">' +
    '<div style="max-width:520px;margin:0 auto;background:#FBF7EC;border-radius:18px;overflow:hidden;border:1px solid #E9DDC5">' +
    '<div style="background:#2F3821;padding:26px 28px;text-align:center">' +
    '<div style="color:#E9DDC5;font-size:26px;letter-spacing:8px">CASA ÂMBAR</div>' +
    '<div style="color:#A6845E;font-size:11px;letter-spacing:4px;margin-top:6px;font-family:Arial,sans-serif">HARMONIA EM ESTADO NATURAL</div></div>' +
    '<div style="padding:30px 28px 26px">' +
    '<div style="font-size:24px;letter-spacing:3px;color:#7E3717;margin:0 0 18px;text-transform:uppercase">' + escHtml(titulo) + '</div>' +
    corpoP + (extra || '') +
    (botao ? '<div style="text-align:center;margin:26px 0 8px"><a href="' + escHtml(botao.url) + '" style="background:#2F3821;color:#FBF3E2;text-decoration:none;' +
      'padding:14px 30px;border-radius:999px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;display:inline-block">' +
      escHtml(botao.texto) + '</a></div>' +
      '<p style="font-family:Arial,sans-serif;font-size:11px;color:#8A8670;text-align:center;margin:14px 0 0;word-break:break-all">Se o botão não abrir, copie este endereço: ' +
      escHtml(botao.url) + '</p>' : '') +
    '</div>' +
    '<div style="border-top:1px solid #E9DDC5;padding:16px 28px;font-family:Arial,sans-serif;font-size:11px;color:#8A8670;text-align:center;line-height:1.6">' +
    'Rua Eduardo Salgado, 448 · Aldeota · Fortaleza<br>WhatsApp (85) 99185-6528 · @acasaambar' + (rodape ? '<br><br>' + rodape : '') + '</div></div></div>';
  var texto = titulo + '\n\n' + paragrafos.join('\n\n') + (botao ? '\n\n' + botao.texto + ': ' + botao.url : '');
  MailApp.sendEmail({ to: para, subject: assunto, htmlBody: html, body: texto, name: 'Casa Âmbar' });
}

// ============================================================
//  EXECUTE UMA VEZ no editor do Apps Script depois desta atualização:
//  autoriza o envio de e-mails e cria o primeiro acesso de administrador
//  da bancada para o dono desta conta Google (o link chega por e-mail).
// ============================================================
function autorizarEmails() {
  var dono = Session.getEffectiveUser().getEmail();
  Logger.log('E-mails restantes hoje: ' + MailApp.getRemainingDailyQuota());
  pimenta();
  var admins = lerAba('Equipe').filter(function (m) { return m.papel === 'admin' && String(m.ativo).toUpperCase() !== 'NÃO'; });
  if (admins.length) {
    Logger.log('A bancada já tem administrador: ' + admins.map(function (m) { return m.email; }).join(', '));
    return;
  }
  adicionarLinha('Equipe', { email: dono.toLowerCase(), nome: 'Administração Casa Âmbar', papel: 'admin', ativo: 'SIM', criado_em: agoraTexto() });
  enviarConviteEquipe(buscarMembro(dono));
  Logger.log('Pronto! Enviamos para ' + dono + ' o link para criar a senha da bancada.');
}
