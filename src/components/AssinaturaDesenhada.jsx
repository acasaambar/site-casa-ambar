import { useEffect, useRef, useState } from 'react';

// Quadro para assinar com o dedo, a caneta ou o mouse. Devolve o desenho como imagem PNG (data URL) em aoMudar,
// ou '' enquanto estiver em branco / pouco desenhado.
const LARGURA = 700;
const ALTURA = 240;
const MINIMO_TRACADO = 160; // px de risco no total: evita "assinar" com um pontinho

export default function AssinaturaDesenhada({ aoMudar, desabilitado = false, invalida = false }) {
  const tela = useRef(null);
  const desenhando = useRef(false);
  const anterior = useRef(null);
  const tracado = useRef(0);
  const [tem, setTem] = useState(false);

  function limparTela() {
    const c = tela.current;
    if (!c) return;
    const g = c.getContext('2d');
    g.fillStyle = '#FFFFFF'; // fundo branco opaco (PNG transparente sai preto em alguns PDFs)
    g.fillRect(0, 0, LARGURA, ALTURA);
    g.strokeStyle = '#2F3821';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.lineJoin = 'round';
  }

  useEffect(() => { limparTela(); }, []);

  const ponto = (e) => {
    const r = tela.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * LARGURA) / r.width, y: ((e.clientY - r.top) * ALTURA) / r.height };
  };

  function comecar(e) {
    if (desabilitado) return;
    e.preventDefault();
    tela.current.setPointerCapture?.(e.pointerId);
    desenhando.current = true;
    anterior.current = ponto(e);
    const g = tela.current.getContext('2d');
    g.beginPath();
    g.arc(anterior.current.x, anterior.current.y, 1.4, 0, Math.PI * 2);
    g.fillStyle = '#2F3821';
    g.fill();
  }

  function mover(e) {
    if (!desenhando.current) return;
    e.preventDefault();
    const p = ponto(e);
    const g = tela.current.getContext('2d');
    g.beginPath();
    g.moveTo(anterior.current.x, anterior.current.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    tracado.current += Math.hypot(p.x - anterior.current.x, p.y - anterior.current.y);
    anterior.current = p;
  }

  function terminar() {
    if (!desenhando.current) return;
    desenhando.current = false;
    if (tracado.current >= MINIMO_TRACADO) {
      setTem(true);
      aoMudar(tela.current.toDataURL('image/png'));
    }
  }

  function limpar() {
    limparTela();
    tracado.current = 0;
    setTem(false);
    aoMudar('');
  }

  return (
    <div className="assina">
      <div className="assina__topo">
        <span className="assina__rotulo">Sua assinatura</span>
        <button type="button" className="assina__limpar" onClick={limpar} disabled={!tem || desabilitado}>Limpar e refazer</button>
      </div>
      <div className={`assina__quadro${invalida ? ' assina__quadro--invalido' : ''}`}>
        <canvas
          ref={tela}
          width={LARGURA}
          height={ALTURA}
          className="assina__tela"
          role="img"
          aria-label="Quadro de assinatura: desenhe sua assinatura com o dedo ou o mouse"
          onPointerDown={comecar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          onPointerLeave={terminar}
        />
        {!tem && <span className="assina__dica" aria-hidden="true">Assine aqui com o dedo, a caneta ou o mouse</span>}
        <span className="assina__linha" aria-hidden="true" />
      </div>
    </div>
  );
}
