import { useCallback, useEffect, useRef, useState } from 'react';
import { EXTERNOS } from '../externos.js';

// ============================================================
//  "NÃO SOU ROBÔ" (Cloudflare Turnstile)
//  Quase sempre invisível: só aparece uma caixinha para marcar quando a Cloudflare desconfia.
//  A confirmação vale uma vez só (e por 5 minutos): depois de cada envio ao servidor, chame renovar().
// ============================================================
export const VERIFICACAO_LIGADA = Boolean(EXTERNOS.turnstileSiteKey);
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let carregando = null;
function carregarTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!carregando) {
    carregando = new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => (window.turnstile ? ok(window.turnstile) : falha(new Error('sem turnstile')));
      s.onerror = () => { carregando = null; s.remove(); falha(new Error('não carregou')); };
      document.head.appendChild(s);
    });
  }
  return carregando;
}

// ativo = o formulário que precisa da verificação está na tela
export function useVerificacao(ativo = true) {
  const caixa = useRef(null);
  const id = useRef(null);
  const [token, setToken] = useState('');
  const [falhou, setFalhou] = useState(false);
  const ligada = VERIFICACAO_LIGADA && ativo;

  useEffect(() => {
    if (!ligada) return undefined;
    let vivo = true;
    carregarTurnstile()
      .then((t) => {
        if (!vivo || !caixa.current) return;
        id.current = t.render(caixa.current, {
          sitekey: EXTERNOS.turnstileSiteKey,
          language: 'pt-br',
          theme: 'light',
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (tk) => { setToken(tk); setFalhou(false); },
          'expired-callback': () => setToken(''),
          'timeout-callback': () => setToken(''),
          'error-callback': () => { setToken(''); setFalhou(true); },
        });
      })
      .catch(() => { if (vivo) setFalhou(true); });
    return () => {
      vivo = false;
      if (id.current != null && window.turnstile) { try { window.turnstile.remove(id.current); } catch { /* já saiu */ } }
      id.current = null;
      setToken('');
    };
  }, [ligada]);

  // depois de cada envio: a confirmação usada não vale de novo
  const renovar = useCallback(() => {
    setToken('');
    if (id.current != null && window.turnstile) { try { window.turnstile.reset(id.current); } catch { /* ignora */ } }
  }, []);

  // mensagem para mostrar quando ainda não dá para enviar ('' = pode enviar)
  const falta = !ligada || token ? ''
    : falhou ? 'Não conseguimos confirmar que você não é um robô. Recarregue a página e tente de novo (se continuar, fale com a gente no WhatsApp).'
      : 'Aguarde um instante: estamos confirmando que você não é um robô.';

  return { ligada, token, falta, renovar, caixa: ligada ? <div ref={caixa} className="verificacao" /> : null };
}
