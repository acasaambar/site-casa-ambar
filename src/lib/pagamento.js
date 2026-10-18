// Abre o pagamento da InfinitePay em uma NOVA ABA, mantendo o site aberto.
//
// Os navegadores só deixam abrir abas no momento do clique. Por isso a aba é
// aberta vazia na hora do clique e recebe o endereço do pagamento quando ele
// fica pronto. Se o navegador bloquear, o pagamento abre na mesma aba.

export function abrirAbaPagamento() {
  let aba = null;
  try {
    aba = window.open('', '_blank');
    if (aba) {
      aba.document.write(
        '<!doctype html><meta charset="utf-8"><title>Casa Âmbar · pagamento</title>' +
          '<body style="margin:0;display:grid;place-items:center;height:100vh;background:#F4EFDF;color:#2F3821;' +
          'font-family:monospace;letter-spacing:.2em;text-transform:uppercase;font-size:12px">Abrindo o pagamento seguro…</body>'
      );
    }
  } catch {
    aba = null;
  }
  return aba;
}

export function fecharAba(aba) {
  try {
    if (aba && !aba.closed) aba.close();
  } catch {
    /* ignora */
  }
}

// pg = { order_nsu, link }
export function seguirParaPagamento(aba, pg, navegar) {
  try {
    sessionStorage.setItem('ambar_retorno', JSON.stringify({ orderNsu: pg.order_nsu, link: pg.link, aguardando: true }));
  } catch {
    /* sem armazenamento */
  }
  if (aba && !aba.closed) {
    aba.location.href = pg.link;
    navegar('/pagamento');
  } else {
    window.location.href = pg.link;
  }
}
