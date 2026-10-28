import { useEffect, useRef } from 'react';

// último elemento que recebeu foco: o botão que abre a janela costuma ficar desabilitado ("Reservando…")
// no instante em que ela abre, e então o foco já está no body; este registro permite devolvê-lo ao botão
let ultimoFoco = null;
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (e) => { ultimoFoco = e.target; });
}

// Janela da área do aluno (confirmar reserva, comprar plano, ficha e contrato antes do plano).
// Acessibilidade: ao abrir, o foco vai para a janela e o resto da página fica isolado (Tab e leitor de tela
// não "vazam" para trás); Esc fecha quando a tela passa aoFechar; ao fechar, o foco volta para onde estava.
export default function Dialogo({ aoFechar, children, ...resto }) {
  const ref = useRef(null);
  const fechar = useRef(aoFechar);
  useEffect(() => { fechar.current = aoFechar; });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ativo = document.activeElement;
    const anterior = ativo && ativo !== document.body ? ativo : ultimoFoco;
    // isola tudo o que não é a janela: os irmãos dela e dos seus ancestrais (até o body)
    const isolados = [];
    for (let no = el; no && no !== document.body; no = no.parentElement) {
      const pai = no.parentElement;
      if (!pai) break;
      for (const irmao of pai.children) {
        if (irmao === no || irmao.hasAttribute('inert') || irmao.tagName === 'SCRIPT') continue;
        irmao.setAttribute('inert', '');
        isolados.push(irmao);
      }
    }
    el.focus({ preventScroll: true });
    const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
    const teclas = (e) => {
      if (e.key === 'Escape' && fechar.current) {
        e.stopPropagation();
        fechar.current();
        return;
      }
      // Tab preso na janela: do último volta ao primeiro (e Shift+Tab do primeiro vai ao último)
      if (e.key === 'Tab') {
        const itens = [...el.querySelectorAll(FOCAVEIS)].filter((i) => i.getClientRects().length > 0);
        if (!itens.length) { e.preventDefault(); el.focus({ preventScroll: true }); return; }
        const primeiro = itens[0];
        const ultimo = itens[itens.length - 1];
        const atual = document.activeElement;
        if (e.shiftKey && (atual === primeiro || atual === el || !el.contains(atual))) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && (atual === ultimo || !el.contains(atual))) { e.preventDefault(); primeiro.focus(); }
      }
    };
    document.addEventListener('keydown', teclas);
    return () => {
      document.removeEventListener('keydown', teclas);
      isolados.forEach((i) => i.removeAttribute('inert'));
      if (anterior && anterior !== el && !anterior.disabled && typeof anterior.focus === 'function' && document.contains(anterior)) anterior.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} {...resto}>
      {children}
    </div>
  );
}
