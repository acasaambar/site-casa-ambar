import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBancada } from './sessao.jsx';
import { Modal, Vazio, Tag, Erro, plural, DIAS, hora } from './ui.jsx';
import { Icone } from './icones.jsx';
import './css/avisos.css';

// ============================================================
//  SINO DA BANCADA: reservas e cancelamentos feitos pelo site (b_avisos, últimos 14 dias)
//  Pergunta ao servidor a cada minuto (e ao voltar para a aba). "Visto" fica neste aparelho, por pessoa.
// ============================================================
const MINUTO = 60e3;
const chaveVisto = (email) => `ambar_avisos_visto|${email || ''}`;
const lerVisto = (email) => { try { return localStorage.getItem(chaveVisto(email)) || ''; } catch { return ''; } };
const gravarVisto = (email, em) => { try { localStorage.setItem(chaveVisto(email), em); } catch { /* sem armazenamento */ } };

// "qui, 12/11 às 16h"
function quandoAula(a) {
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
  return (
    <>
      {toast && !aberto && (
        <div className="av-toast" role="status">
          <span className={`av-toast__icone av-toast__icone--${toast.tipo}`} aria-hidden="true"><Icone nome="sino" tamanho={18} /></span>
          <span className="av-toast__texto">
            <strong>{toast.tipo === 'cancelou' ? 'Cancelamento pelo site' : 'Nova reserva pelo site'}</strong>
            <span>{toast.nome} · {toast.modalidade}, {quandoAula(toast)}</span>
          </span>
          <button type="button" className="botao botao--cheio botao--p" onClick={abrir}>Ver</button>
          <button type="button" className="av-toast__fechar" aria-label="Fechar aviso" onClick={fecharToast}><Icone nome="fechar" tamanho={16} /></button>
        </div>
      )}

      {aberto && (
        <Modal rotulo="Reservas e cancelamentos feitos pelo site" titulo="Avisos do site" aoFechar={fechar}>
          <div className="b-form">
            <Erro>{erro}</Erro>
            {avisos.length === 0 ? (
              <Vazio titulo="Nenhum aviso nos últimos 14 dias" forma="presenca">Quando alguém reservar ou cancelar uma aula pelo site, aparece aqui.</Vazio>
            ) : (
              <ul className="av-lista">
                {avisos.map((a) => {
                  const novo = a.em > visto;
                  return (
                    <li key={a.id} className={`av-item av-item--${a.tipo}${novo ? ' av-item--novo' : ''}`}>
                      <span className="av-item__marca" aria-hidden="true" />
                      <div className="av-item__corpo">
                        <span className="av-item__titulo">
                          <span><strong>{a.nome}</strong> {a.tipo === 'cancelou' ? 'cancelou' : 'reservou'} <strong>{a.modalidade}</strong></span>
                          {novo && <Tag tom="ambar">novo</Tag>}
                        </span>
                        <span className="b-meta">
                          <span>{quandoAula(a)}</span>
                          {a.professor ? <span>com {a.professor}</span> : <span className="av-item__falta">sem quem dá a aula</span>}
                          <span>{haQuanto(a.em, dados?.agora)}</span>
                        </span>
                      </div>
                      <button type="button" className="botao botao--fantasma botao--p" onClick={() => irParaAula(a)}>Abrir a aula</button>
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
