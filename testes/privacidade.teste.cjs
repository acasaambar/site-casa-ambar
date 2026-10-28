// Política de Privacidade no cadastro do site: o aceite da versão em vigor é exigido e fica registrado.
const { m } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } else console.log('  ✓', msg); };
const END = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const dados = (cpf, extra = {}) => ({ cpf, nome: 'Priv Teste', whatsapp: '85940005555', email: `priv${cpf.slice(-3)}@gmail.com`, senha: 'Lavanda2026x', endereco: END, ...extra });
let r;

console.log('— exigência ligada (como no site de verdade)');
ctx.PRIVACIDADE_OBRIGATORIA = true;
r = chamar('cadastrar', dados('16899535009'));
ok(!r.ok && r.codigo === 'PRIVACIDADE' && /Pol[ií]tica de Privacidade/.test(r.erro), 'sem aceite: recusa com código PRIVACIDADE', r);
ok(!ctx.lerAba('Alunos').some((a) => ctx.normCpf(a.cpf) === '16899535009'), 'e nada é cadastrado');
r = chamar('cadastrar', dados('16899535009', { privacidade: '2000-01-01' }));
ok(!r.ok && r.codigo === 'PRIVACIDADE' && /atualizada/.test(r.erro), 'versão antiga: pede para recarregar, ler e aceitar de novo', r);
r = chamar('cadastrar', dados('16899535009', { privacidade: ctx.PRIVACIDADE_VERSAO }));
ok(r.ok && r.dados.token, 'com a versão em vigor: cria a conta', r.erro);
const linha = ctx.lerAba('Alunos').find((a) => ctx.normCpf(a.cpf) === '16899535009');
ok(linha && linha.privacidade_versao === ctx.PRIVACIDADE_VERSAO && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(String(linha.privacidade_em)), 'o aceite fica gravado (versão e data/hora)', linha && [linha.privacidade_versao, linha.privacidade_em]);

console.log('— exigência desligada (testes e demonstração)');
ctx.PRIVACIDADE_OBRIGATORIA = false;
r = chamar('cadastrar', dados('29537995593'));
ok(r.ok, 'sem a exigência o cadastro segue como antes', r.erro);
const l2 = ctx.lerAba('Alunos').find((a) => ctx.normCpf(a.cpf) === '29537995593');
ok(l2 && !l2.privacidade_versao && !l2.privacidade_em, 'e não grava aceite que não houve');

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
