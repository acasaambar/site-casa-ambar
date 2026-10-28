// Busca e filtros da tela Vendas (src/bancada/buscaVendas.js): nome, valor, faixa, CPF, código, forma, quem lançou.
import { filtrarVendas, temFiltro, FILTROS_VAZIOS } from '../src/bancada/buscaVendas.js';

let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } else console.log('  ✓', msg); };
const venda = (o) => { const v = { orderNsu: 'P1', cpf: '52998224725', nome: 'Maria José', descricao: 'Drenagem Linfática', valor: 150, valorOriginal: 150, valeUsado: 0, metodo: 'Pix', bandeira: '', cupom: '', vale: '',
  status: 'pago', origem: 'balcão', observacao: '', comanda: '', registradoPor: 'bia@acasaambar.com.br', formas: [], ...o }; v.valorPago = o.valorPago ?? v.valor; v.valorOriginal = o.valorOriginal ?? v.valor; return v; };
const L = [
  venda({ orderNsu: 'P2610280001AAA', nome: 'Maria José', descricao: 'Drenagem Linfática', valor: 150 }),
  venda({ orderNsu: 'P2610280002BBB', nome: 'João Pedro', cpf: '11144477735', descricao: 'Pilates mensal 2x', valor: 1200.5, valorOriginal: 1200.5, metodo: 'Cartão de crédito', bandeira: 'Visa', parcelas: 3, origem: 'site', registradoPor: '' }),
  venda({ orderNsu: 'P2610280003CCC', nome: 'Ana Lúcia', cpf: '39053344705', descricao: 'Massagem relaxante', valor: 90, valorOriginal: 100, metodo: 'Cartão de débito', cupom: 'BEMVINDA10', observacao: 'Comanda Q26102808315AABCDE', comanda: 'Q26102808315AABCDE' }),
  venda({ orderNsu: 'P2610280004DDD', nome: 'Maria Clara', descricao: 'Yoga avulsa', valor: 60, metodo: 'Misto', formas: [{ metodo: 'Pix', valor: 40 }, { metodo: 'Dinheiro', valor: 20 }], registradoPor: 'lia@gmail.com' }),
  venda({ orderNsu: 'P2610280005EEE', nome: 'Carlos', descricao: 'Drenagem Linfática', valor: 150, status: 'excluido', observacao: 'EXCLUÍDA em 28/10 por bia: lançada por engano' }),
];
const f = (o) => filtrarVendas(L, { ...FILTROS_VAZIOS, ...o }).map((p) => p.nome);

ok(f({}).length === 5, 'sem filtro devolve tudo');
ok(!temFiltro(FILTROS_VAZIOS) && temFiltro({ ...FILTROS_VAZIOS, forma: 'Pix' }), 'temFiltro');
ok(JSON.stringify(f({ busca: 'maria' })) === '["Maria José","Maria Clara"]', 'nome (parte)', f({ busca: 'maria' }));
ok(JSON.stringify(f({ busca: 'JOSE' })) === '["Maria José"]', 'sem acento e sem diferença de maiúsculas', f({ busca: 'JOSE' }));
ok(JSON.stringify(f({ busca: 'maria drenagem' })) === '["Maria José"]', 'duas palavras: todas precisam combinar', f({ busca: 'maria drenagem' }));
ok(JSON.stringify(f({ busca: '150' })) === '["Maria José","Carlos"]', 'valor exato "150"', f({ busca: '150' }));
ok(JSON.stringify(f({ busca: '1.200,50' })) === '["João Pedro"]', 'valor "1.200,50"', f({ busca: '1.200,50' }));
ok(JSON.stringify(f({ busca: '1200.5' })) === '["João Pedro"]', 'valor "1200.5"', f({ busca: '1200.5' }));
ok(JSON.stringify(f({ busca: 'r$90' })) === '["Ana Lúcia"]', 'valor "R$90"', f({ busca: 'r$90' }));
ok(JSON.stringify(f({ busca: '100' })) === '["Ana Lúcia"]', 'acha também pelo preço antes do desconto', f({ busca: '100' }));
ok(JSON.stringify(f({ busca: '40' })) === '["Maria Clara"]', 'acha o valor de uma das formas (Pix R$ 40 do pagamento dividido)', f({ busca: '40' }));
ok(JSON.stringify(f({ busca: '80-100' })) === '["Ana Lúcia"]', 'faixa 80-100', f({ busca: '80-100' }));
ok(JSON.stringify(f({ busca: '>1000' })) === '["João Pedro"]', 'maior que 1000', f({ busca: '>1000' }));
ok(JSON.stringify(f({ busca: '<70' })) === '["Maria Clara"]', 'menor que 70', f({ busca: '<70' }));
ok(JSON.stringify(f({ busca: '529.982.247-25' })) === '["Maria José","Maria Clara","Carlos"]', 'CPF formatado (não vira faixa de valores)', f({ busca: '529.982.247-25' }));
ok(JSON.stringify(f({ busca: '52998224725' })) === '["Maria José","Maria Clara","Carlos"]', 'CPF só números', f({ busca: '52998224725' }));
ok(JSON.stringify(f({ busca: '1114447' })) === '["João Pedro"]', 'pedaço do CPF (3+ dígitos)', f({ busca: '1114447' }));
ok(JSON.stringify(f({ busca: 'ccc' })) === '["Ana Lúcia"]', 'pedaço do código', f({ busca: 'ccc' }));
ok(JSON.stringify(f({ busca: 'bemvinda' })) === '["Ana Lúcia"]', 'cupom', f({ busca: 'bemvinda' }));
ok(JSON.stringify(f({ busca: 'visa' })) === '["João Pedro"]', 'bandeira', f({ busca: 'visa' }));
ok(JSON.stringify(f({ busca: 'engano' })) === '["Carlos"]', 'observação', f({ busca: 'engano' }));
ok(JSON.stringify(f({ busca: 'excluida' })) === '["Carlos"]', 'situação excluída', f({ busca: 'excluida' }));
ok(JSON.stringify(f({ busca: 'abcde' })) === '["Ana Lúcia"]', 'número da comanda', f({ busca: 'abcde' }));
ok(f({ busca: 'zzzz' }).length === 0, 'nada encontrado');
ok(JSON.stringify(f({ forma: 'Pix' })) === '["Maria José","Maria Clara","Carlos"]', 'forma Pix (inclui parte de pagamento dividido)', f({ forma: 'Pix' }));
ok(JSON.stringify(f({ forma: 'Dinheiro' })) === '["Maria Clara"]', 'forma Dinheiro só no dividido', f({ forma: 'Dinheiro' }));
ok(JSON.stringify(f({ min: '100', max: '1.000' })) === '["Maria José","Carlos"]', 'valor de 100 até 1.000', f({ min: '100', max: '1.000' }));
ok(JSON.stringify(f({ min: '1000' })) === '["João Pedro"]', 'valor a partir de 1000', f({ min: '1000' }));
ok(JSON.stringify(f({ quem: 'lia@gmail.com' })) === '["Maria Clara"]', 'quem lançou', f({ quem: 'lia@gmail.com' }));
ok(JSON.stringify(f({ busca: 'drenagem', forma: 'Pix', max: '150' })) === '["Maria José","Carlos"]', 'busca + forma + valor juntos', f({ busca: 'drenagem', forma: 'Pix', max: '150' }));
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\nTudo certo (busca nas vendas)');
