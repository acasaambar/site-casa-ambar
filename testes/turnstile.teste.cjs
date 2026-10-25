// "Não sou robô" (Cloudflare Turnstile) no cadastro e no "Esqueci minha senha" do site.
// Desligado sem a propriedade TURNSTILE_SECRET; ligado, só passa com a confirmação da Cloudflare;
// se a Cloudflare cair ou a chave estiver errada, deixa passar (ninguém de verdade fica de fora).
const { criar } = require('./simulador.cjs');
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, chamar, emails, props, chamadasIP } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const END = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const CPFS = ['52998224725', '11144477735', '39053344705', '15350946056', '86288366757', '71428793860'];
let n = 0;
const cadastro = (extra) => chamar('cadastrar', { endereco: END, cpf: CPFS[n], nome: 'Pessoa Teste' + n, whatsapp: '8599999000' + n, email: `p${n++}@gmail.com`, senha: 'abc12345', ...extra });
const doCloudflare = () => chamadasIP.filter((c) => c.url.includes('turnstile'));
ctx.configurarPlanilha();
let r;

console.log('— sem a chave secreta: tudo como antes');
r = cadastro();
ok(r.ok && r.dados.token, 'cadastro sem verificação funciona', r.erro);
ok(doCloudflare().length === 0, 'nem chama a Cloudflare');

console.log('— com a chave secreta');
props.TURNSTILE_SECRET = 'segredo-de-teste';
r = cadastro();
ok(!r.ok && r.codigo === 'VERIFICACAO', 'sem a confirmação: recusado', r);
r = cadastro({ verificacao: 'robo' });
ok(!r.ok && r.codigo === 'VERIFICACAO', 'confirmação falsa: recusado', r);
ok(!chamar('entrar', { cpf: CPFS[n - 1], senha: 'abc12345' }).ok, 'e o cadastro recusado não foi criado');
r = cadastro({ verificacao: 'humano-ok' });
ok(r.ok && r.dados.token, 'confirmação válida: cadastra', r.erro);
const ultima = doCloudflare().at(-1);
ok(ultima && ultima.corpo.secret === 'segredo-de-teste' && ultima.corpo.response === 'humano-ok', 'manda a chave e a confirmação para a Cloudflare');
r = cadastro({ cpf: '123', verificacao: 'humano-ok' });
ok(!r.ok && /CPF/.test(r.erro), 'erro de preenchimento aparece antes (não gasta a confirmação)', r.erro);
n--;

console.log('— Cloudflare fora do ar ou chave errada: deixa passar');
global.__turnstile = 'cair';
r = cadastro({ verificacao: 'qualquer' });
ok(r.ok, 'Cloudflare sem resposta: cadastra', r.erro);
global.__turnstile = 'segredo-errado';
r = cadastro({ verificacao: 'qualquer' });
ok(r.ok, 'chave secreta errada: cadastra (e anota no log)', r.erro);
global.__turnstile = '';

console.log('— Esqueci minha senha');
const antes = emails.length;
r = chamar('esqueciSenha', { cpf: CPFS[0] });
ok(!r.ok && r.codigo === 'VERIFICACAO' && emails.length === antes, 'sem a confirmação: recusado e nenhum e-mail sai', r);
r = chamar('esqueciSenha', { cpf: CPFS[0], verificacao: 'humano-ok' });
ok(r.ok && emails.length === antes + 1, 'com a confirmação: manda o link', r.erro);
delete props.TURNSTILE_SECRET;
r = chamar('esqueciSenha', { cpf: CPFS[0] });
ok(r.ok, 'sem a chave secreta: funciona como antes', r.erro);

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
