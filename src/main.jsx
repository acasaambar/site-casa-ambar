import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fontes da marca, servidas pelo próprio site
import '@fontsource/italiana/400.css';
import '@fontsource/ibm-plex-mono/300.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/400-italic.css';
import '@fontsource/pinyon-script/400.css';
import './styles.css';
import App from './App.jsx';
import ErroTela from './components/ErroTela.jsx';

// Volta da InfinitePay: o endereço chega com ?pagamento=...&transaction_nsu=...&slug=...
// Guardamos os dados e abrimos a tela de confirmação do pagamento.
(function capturarRetornoDoPagamento() {
  const bruto = (window.location.search + '&' + (window.location.hash.split('?')[1] || '')).replace(/\?/g, '&');
  const p = new URLSearchParams(bruto);
  const pedido = p.get('pagamento') || p.get('order_nsu');
  if (!pedido) return;
  const retorno = {
    orderNsu: pedido,
    transactionNsu: p.get('transaction_nsu') || '',
    slug: p.get('slug') || p.get('invoice_slug') || '',
    recibo: p.get('receipt_url') || '',
    demo: p.get('demo') === '1',
  };
  try {
    sessionStorage.setItem('ambar_retorno', JSON.stringify(retorno));
  } catch {
    /* sem armazenamento */
  }
  window.history.replaceState(null, '', window.location.pathname + '#/pagamento');
})();

// o site não abre dentro de outra página (protege a bancada contra "clickjacking":
// um site falso por cima, enganando a equipe para clicar sem ver)
const emMoldura = (() => { try { return window.top !== window.self; } catch { return true; } })();

if (emMoldura) {
  document.getElementById('root').textContent = 'Abra a Casa Âmbar direto em www.acasambar.com.br';
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErroTela>
        <App />
      </ErroTela>
    </StrictMode>
  );
}
