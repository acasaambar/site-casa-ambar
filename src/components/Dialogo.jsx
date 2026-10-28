import { useEffect, useRef } from 'react';

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
    const anterior = document.activeElement;
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
    const teclas = (e) => {
      if (e.key === 'Escape' && fechar.current) {
        e.stopPropagation();
        fechar.current();
      }
    };
    document.addEventListener('keydown', teclas);
    return () => {
      document.removeEventListener('keydown', teclas);
      isolados.forEach((i) => i.removeAttribute('inert'));
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) anterior.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} {...resto}>
      {children}
    </div>
  );
}
