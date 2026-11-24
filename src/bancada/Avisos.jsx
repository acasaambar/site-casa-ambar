import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBancada } from './sessao.jsx';
import { Modal, Vazio, Tag, Erro, plural, DIAS, hora, real } from './ui.jsx';
import { Icone } from './icones.jsx';
import './css/avisos.css';

// ============================================================
//  SINO DA BANCADA: tudo o que acontece pelo site (b_avisos, últimos 14 dias)
//  reserva / cancelou · pagando (começou a pagar: nasce antes da InfinitePay responder, com a situação ao vivo)
//  compra (plano pago pelo site) · conferir (voltou do pagamento sem confirmação: olhar o comprovante)
//  Pergunta ao servidor a cada minuto (e ao voltar para a aba). "Visto" fica neste aparelho, por pessoa.
// ============================================================
const MINUTO = 60e3;
const chaveVisto = (email) => `ambar_avisos_visto|${email || ''}`;
const lerVisto = (email) => { try { return localStorage.getItem(chaveVisto(email)) || ''; } catch { return ''; } };
const gravarVisto = (email, em) => { try { localStorage.setItem(chaveVisto(email), em); } catch { /* sem armazenamento */ } };

// "qui, 12/11 às 16h"
function quandoAula(a) {
  if (!a.data) return '';
  const [y, mm, dd] = String(a.data).split('-').map(Number);
  const d = new Date(y, mm - 1, dd);
  return `${DIAS[d.getDay()]}, ${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')} às ${hora(a.hora)}`;
}
// "há 5 min", "há 2 h", "ontem às 18:40", "10/11 às 09:12"
function haQuanto(em, agoraServidor) {
  const [d, h = ''] = String(em).split(' ');
  const t = new Date(`${d}T${h || '00:00:00'}`).getTime();
  const agora = agoraServidor ? new Date(String(agoraServidor).replace(' ', 'T')).getTime() : Date.now();
  const min = Math.max(0, Math.round((agora - t) / MINUTO));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 12 * 60) return `há ${Math.round(min / 60)} h`;
  const [, mm, dd] = d.split('-');
  return `${dd}/${mm} às ${h.slice(0, 5)}`;
}

// situação do pagamento do site (o servidor confere a aba Pagamentos a cada busca)
const SITUACAO = {
  aguardando: { tom: 'aviso', texto: 'aguardando a InfinitePay' },
  pago: { tom: 'ok', texto: 'pago' },
  nao_confirmado: { tom: 'alerta', texto: 'não confirmado' },
  descartado: { tom: 'apagado', texto: 'descartado pela equipe' },
  estornado: { tom: 'apagado', texto: 'estornado' },
  excluido: { tom: 'apagado', texto: 'excluído' },
};

// título curto de cada aviso (no canto e na lista)
export function tituloDoAviso(a) {
  if (a.tipo === 'cancelou') return 'Cancelamento pelo site';
  if (a.tipo === 'pagando') return a.aulaId ? 'Reserva pelo site: pagando' : 'Compra pelo site: pagando';
  if (a.tipo === 'compra') return 'Compra pelo site';
  if (a.tipo === 'conferir') return 'Pagamento do site para conferir';
  return 'Nova reserva pelo site';
}
const VERBO = { reserva: 'reservou', cancelou: 'cancelou', pagando: 'está pagando', compra: 'comprou', conferir: 'diz que pagou' };

// "Pilates, qui, 12/11 às 16h" ou "Plano mensal Pilates 2x · R$ 380,00"
function oQue(a) {
  if (a.aulaId && a.data) return `${a.modalidade}, ${quandoAula(a)}`;
  return [a.descricao, a.valor != null ? real(a.valor) : ''].filter(Boolean).join(' · ');
}

// uma busca só por bancada aberta (o sino aparece no menu lateral e no topo do celular)
export function useAvisos() {
  const { chamar, membro } = useBancada();
  const email = membro?.email;
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState(false);
  const [visto, setVisto] = useState(() => lerVisto(email));
  const [toast, setToast] = useState(null);
  const ultimo = useRef(null); // o aviso mais novo já recebido nesta aba (o aviso no canto só aparece com novidade)

  const buscar = useCallback(async () => {
    try {
      const r = await chamar('avisos', {});
      if (!r || !Array.isArray(r.avisos)) return;
      setErro('');
      setDados(r);
      const maisNovo = r.avisos[0]?.em || '';
      if (ultimo.current !== null && maisNovo > ultimo.current) setToast(r.avisos[0]);
      if (ultimo.current === null || maisNovo > ultimo.current) ultimo.current = maisNovo;
    } catch (e) { setErro(e.message); }
  }, [chamar]);

  useEffect(() => {
    buscar();
    const t = setInterval(() => { if (document.visibilityState === 'visible') buscar(); }, MINUTO);
    const voltou = () => { if (document.visibilityState === 'visible') buscar(); };
    document.addEventListener('visibilitychange', voltou);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', voltou); };
  }, [buscar]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 15000);
    return () => clearTimeout(t);
  }, [toast]);

  const avisos = dados?.avisos || [];
  const novos = avisos.filter((a) => a.em > visto).length;
  const abrir = () => { setAberto(true); setToast(null); buscar(); };
  const fechar = () => {
    setAberto(false);
    // ao fechar, tudo o que estava na lista conta como visto neste aparelho
    if (avisos[0]) { gravarVisto(email, avisos[0].em); setVisto(avisos[0].em); }
  };
  return { dados, avisos, erro, novos, visto, aberto, abrir, fechar, toast, fecharToast: () => setToast(null) };
}

export function BotaoAvisos({ avisos: av, className = '' }) {
  const { novos, abrir } = av;
  return (
    <button type="button" className={`av-sino ${className}`.trim()} onClick={abrir} aria-haspopup="dialog"
      aria-label={novos ? `Avisos do site: ${plural(novos, 'novo', 'novos')}` : 'Avisos do site'}>
      <Icone nome="sino" tamanho={20} tracado={1.8} />
      <span className="av-sino__texto">Avisos do site</span>
      {novos > 0 && <span className="av-sino__num" aria-hidden="true">{novos > 99 ? '99+' : novos}</span>}
    </button>
  );
}

export function PainelAvisos({ avisos: av }) {
  const navigate = useNavigate();
  const { dados, avisos, erro, visto, aberto, abrir, fechar, toast, fecharToast } = av;
  const irParaAula = (a) => {
    fechar();
    navigate('/bancada/agenda', { state: { dia: a.data, abrir: a.aulaId } });
  };
  // ficha do cliente → Pagamentos (onde ficam "Confirmar recebimento" e "Descartar")
  const irParaFicha = (a) => {
    fechar();
    navigate(`/bancada/alunos/${a.cpf}`, { state: { aba: 'pagamentos' } });
  };
  const pagamento = (a) => a.tipo === 'pagando' || a.tipo === 'conferir' || (a.tipo === 'compra' && !a.aulaId);
  return (
    <>
      {toast && !aberto && (
        <div className="av-toast" role="status">
          <span className={`av-toast__icone av-toast__icone--${toast.tipo}`} aria-hidden="true"><Icone nome="sino" tamanho={18} /></span>
          <span className="av-toast__texto">
            <strong>{tituloDoAviso(toast)}</strong>
            <span>{toast.nome} · {oQue(toast)}</span>
          </span>
          <button type="button" className="botao botao--cheio botao--p" onClick={abrir}>Ver</button>
          <button type="button" className="av-toast__fechar" aria-label="Fechar aviso" onClick={fecharToast}><Icone nome="fechar" tamanho={16} /></button>
        </div>
      )}

      {aberto && (
        <Modal rotulo="Reservas, compras e cancelamentos feitos pelo site" titulo="Avisos do site" aoFechar={fechar}>
          <div className="b-form">
            <Erro>{erro}</Erro>
            {avisos.length === 0 ? (
              <Vazio titulo="Nenhum aviso nos últimos 14 dias" forma="presenca">Quando alguém reservar, pagar ou cancelar pelo site, aparece aqui.</Vazio>
            ) : (
              <ul className="av-lista">
                {avisos.map((a) => {
                  const novo = a.em > visto;
                  // "conferir" ainda em aberto: a InfinitePay não confirmou (não é só "aguardando")
                  const sit = a.tipo === 'conferir' && a.situacao !== 'pago' && a.situacao !== 'descartado' ? { tom: 'alerta', texto: 'sem confirmação' } : a.situacao && SITUACAO[a.situacao];
                  const ehAula = !!(a.aulaId && a.data);
                  const atencao = (a.tipo === 'conferir' && a.situacao !== 'pago' && a.situacao !== 'descartado') || (a.tipo === 'pagando' && a.situacao === 'nao_confirmado');
                  return (
                    <li key={a.id} className={`av-item av-item--${a.tipo}${atencao ? ' av-item--atencao' : ''}${novo ? ' av-item--novo' : ''}`}>
                      <span className="av-item__marca" aria-hidden="true" />
                      <div className="av-item__corpo">
                        <span className="av-item__titulo">
                          <span><strong>{a.nome}</strong> {VERBO[a.tipo] || 'reservou'} {ehAula ? <strong>{a.modalidade}</strong> : <strong>{a.descricao || 'pelo site'}</strong>}</span>
                          {sit && <Tag tom={sit.tom}>{sit.texto}</Tag>}
                          {novo && <Tag tom="ambar">novo</Tag>}
                        </span>
                        <span className="b-meta">
                          {ehAula && <span>{quandoAula(a)}</span>}
                          {ehAula && (a.professor ? <span>com {a.professor}</span> : <span className="av-item__falta">sem quem dá a aula</span>)}
                          {a.valor != null && <span>{real(a.valor)}</span>}
                          <span>{haQuanto(a.em, dados?.agora)}</span>
                        </span>
                        {atencao && (
                          <span className="av-item__dica">
                            A InfinitePay não confirmou. Peça o comprovante e use <strong>Confirmar recebimento</strong> na ficha (Pagamentos); a reserva volta sozinha.
                          </span>
                        )}
                        {a.tipo === 'pagando' && a.situacao === 'aguardando' && (
                          <span className="av-item__dica av-item__dica--calma">O lugar fica guardado enquanto a pessoa paga. Se não confirmar, este aviso fica vermelho.</span>
                        )}
                      </div>
                      <span className="av-item__acoes">
                        {ehAula && <button type="button" className="botao botao--fantasma botao--p" onClick={() => irParaAula(a)}>Abrir a aula</button>}
                        {a.cpf && pagamento(a) && <button type="button" className={`botao botao--p ${atencao ? 'botao--cheio' : 'botao--fantasma'}`} onClick={() => irParaFicha(a)}>Abrir a ficha</button>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
