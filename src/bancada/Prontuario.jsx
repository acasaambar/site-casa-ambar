import { useEffect, useRef, useState } from 'react';
import { useBancada } from './sessao.jsx';
import { Carregando, Erro, Modal, BotaoAcao, Tag, dataBR, hojeIso } from './ui.jsx';

// fotos já baixadas nesta sessão (não pede de novo ao servidor)
const cacheFotos = new Map();

// reduz a foto no próprio celular antes de enviar (máx. 1400 px, JPEG)
function reduzirFoto(arquivo) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(arquivo.type)) { reject(new Error('Escolha uma imagem.')); return; }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a foto.')); };
    img.src = url;
  });
}

function Foto({ id, aoAbrir }) {
  const { chamar } = useBancada();
  const [src, setSrc] = useState(cacheFotos.get(id) || '');
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    if (src) return undefined;
    let vivo = true;
    chamar('foto', { id }).then((d) => { cacheFotos.set(id, d); if (vivo) setSrc(d); }).catch(() => vivo && setFalhou(true));
    return () => { vivo = false; };
  }, [id, src, chamar]);
  if (falhou) return <span className="pt-foto pt-foto--erro">foto indisponível</span>;
  if (!src) return <span className="pt-foto pt-foto--carregando" aria-label="Carregando foto" />;
  return <button type="button" className="pt-foto" onClick={() => aoAbrir(src)}><img src={src} alt="Foto da evolução" /></button>;
}

// alvo: { atendimentoId } (pela agenda) ou { cpf } (pela ficha da cliente)
export function ProntuarioConteudo({ alvo, editavel = true }) {
  const { membro, chamar } = useBancada();
  const [p, setP] = useState(null);
  const [erro, setErro] = useState('');
  const [editarFicha, setEditarFicha] = useState(false);
  const [ampliada, setAmpliada] = useState('');
  const chave = JSON.stringify(alvo);
  useEffect(() => {
    let vivo = true;
    chamar('prontuario', alvo).then((r) => vivo && setP(r)).catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  if (erro && !p) return <Erro>{erro}</Erro>;
  if (!p) return <Carregando />;
  const f = p.fichaEstetica;
  return (
    <div className="pt">
      {(p.alertaSaude || p.alergiasAnamnese) && (
        <p className="aviso pt-alerta">{p.alertaSaude ? 'Ficha de saúde com resposta “sim” no PAR-Q. ' : ''}{p.alergiasAnamnese ? `Alergias informadas: ${p.alergiasAnamnese}.` : ''}</p>
      )}
      <section className="pt-ficha">
        <header className="b-cartao__topo">
          <h3 className="pt-titulo">Ficha de estética</h3>
          {editavel && <button type="button" className="link-acao" onClick={() => setEditarFicha(true)}>{f ? 'atualizar' : 'preencher'}</button>}
        </header>
        {!f ? <p className="b-suave">Ainda não preenchida. Preencha na primeira sessão, com a cliente.</p> : (
          <>
            <dl className="b-dados">
              {f.queixa && <><dt>Queixa principal</dt><dd>{f.queixa}</dd></>}
              {f.objetivo && <><dt>Objetivo</dt><dd>{f.objetivo}</dd></>}
              {(f.tipoPele || f.fototipo) && <><dt>Pele</dt><dd>{[f.tipoPele, f.fototipo && `fototipo ${f.fototipo}`].filter(Boolean).join(' · ')}</dd></>}
              {f.alergias && <><dt>Alergias</dt><dd>{f.alergias}</dd></>}
              {f.medicamentos && <><dt>Medicamentos</dt><dd>{f.medicamentos}</dd></>}
              {f.acidos && <><dt>Ácidos e cosméticos em uso</dt><dd>{f.acidos}</dd></>}
              {f.procedimentos && <><dt>Procedimentos anteriores</dt><dd>{f.procedimentos}</dd></>}
              {f.exposicaoSolar && <><dt>Exposição ao sol</dt><dd>{f.exposicaoSolar}</dd></>}
              {f.obs && <><dt>Observações</dt><dd>{f.obs}</dd></>}
            </dl>
            {f.condicoes.length > 0 && <div className="b-reserva__tags pt-condicoes">{f.condicoes.map((c) => <Tag key={c} tom="alerta">{c}</Tag>)}</div>}
            <p className="b-suave">Atualizada em {dataBR(f.atualizadaEm)} por {f.atualizadaPor}{f.consentimentoFotos ? ' · autorizou fotos' : ' · sem autorização para fotos'}</p>
          </>
        )}
      </section>

      <section className="pt-evolucao">
        <h3 className="pt-titulo">Evolução</h3>
        {editavel && <NovaEvolucao alvo={alvo} fotosOk={!f || f.consentimentoFotos} aoSalvar={setP} />}
        {p.evolucoes.length === 0 && <p className="b-suave">Nenhum registro ainda.</p>}
        <ol className="pt-linha">
          {p.evolucoes.map((e) => (
            <li key={e.id}>
              <span className="pt-linha__data"><strong>{Number(e.data.slice(8))}</strong><small>{dataBR(e.data).slice(3)}</small></span>
              <div className="pt-linha__corpo">
                <span className="b-suave">{[e.servico, e.profissional].filter(Boolean).join(' · ')}</span>
                {e.anotacao && <p>{e.anotacao}</p>}
                {e.fotos.length > 0 && <div className="pt-fotos">{e.fotos.map((id) => <Foto key={id} id={id} aoAbrir={setAmpliada} />)}</div>}
                {(membro.papel === 'admin' || e.autor === membro.email.split('@')[0]) && (
                  <BotaoAcao className="link-sair" confirmar="Apagar este registro e as fotos?" acao={async () => {
                    try { await chamar('excluirEvolucao', { id: e.id }); setP({ ...p, evolucoes: p.evolucoes.filter((x) => x.id !== e.id) }); } catch (err) { setErro(err.message); }
                  }}>apagar</BotaoAcao>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
      <Erro>{erro}</Erro>
      {editarFicha && <EditarFicha alvo={alvo} f={f} condicoes={p.condicoes} aoFechar={() => setEditarFicha(false)} aoSalvar={(r) => { setP(r); setEditarFicha(false); }} />}
      {ampliada && (
        <div className="pt-ampliada" role="dialog" aria-label="Foto ampliada" onClick={() => setAmpliada('')} onKeyDown={(e) => e.key === 'Escape' && setAmpliada('')} tabIndex={-1}>
          <img src={ampliada} alt="Foto da evolução ampliada" />
          <button type="button" className="b-fechar" aria-label="Fechar">×</button>
        </div>
      )}
    </div>
  );
}

function NovaEvolucao({ alvo, fotosOk, aoSalvar }) {
  const { chamar } = useBancada();
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState([]);
  const [erro, setErro] = useState('');
  const input = useRef(null);
  async function adicionar(lista) {
    setErro('');
    try {
      const novas = await Promise.all([...lista].slice(0, 6 - fotos.length).map(reduzirFoto));
      setFotos((x) => [...x, ...novas].slice(0, 6));
    } catch (e) { setErro(e.message); }
  }
  return (
    <div className="pt-nova">
      <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Como foi a sessão: área tratada, produtos, reação da pele, orientação para casa…" aria-label="Anotação da sessão" />
      {fotos.length > 0 && (
        <div className="pt-fotos">
          {fotos.map((src, i) => (
            <span key={i} className="pt-foto pt-foto--nova"><img src={src} alt={`Foto ${i + 1}`} />
              <button type="button" aria-label="Tirar foto" onClick={() => setFotos(fotos.filter((_, k) => k !== i))}>×</button></span>
          ))}
        </div>
      )}
      <div className="pt-nova__acoes">
        <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }} />
        <button type="button" className="botao botao--linha botao--p" disabled={fotos.length >= 6} onClick={() => input.current?.click()}>
          {fotos.length ? 'Mais fotos' : 'Fotos de antes e depois'}
        </button>
        {!fotosOk && fotos.length > 0 && <span className="b-alerta-txt">A ficha diz que a cliente não autorizou fotos.</span>}
        <BotaoAcao className="botao botao--cheio botao--p" disabled={!texto.trim() && !fotos.length} acao={async () => {
          setErro('');
          try { aoSalvar(await chamar('salvarEvolucao', { ...alvo, anotacao: texto, fotos, data: hojeIso() })); setTexto(''); setFotos([]); } catch (e) { setErro(e.message); }
        }}>Salvar registro</BotaoAcao>
      </div>
      <Erro>{erro}</Erro>
    </div>
  );
}

function EditarFicha({ alvo, f, condicoes, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [x, setX] = useState({ queixa: f?.queixa || '', objetivo: f?.objetivo || '', alergias: f?.alergias || '', medicamentos: f?.medicamentos || '', condicoes: f?.condicoes || [],
    acidos: f?.acidos || '', procedimentos: f?.procedimentos || '', exposicaoSolar: f?.exposicaoSolar || '', fototipo: f?.fototipo || '', tipoPele: f?.tipoPele || '',
    obs: f?.obs || '', consentimentoFotos: f ? f.consentimentoFotos : false });
  const [erro, setErro] = useState('');
  const campo = (k) => ({ value: x[k], onChange: (e) => setX({ ...x, [k]: e.target.value }) });
  const alterna = (c) => setX({ ...x, condicoes: x.condicoes.includes(c) ? x.condicoes.filter((y) => y !== c) : [...x.condicoes, c] });
  return (
    <Modal titulo="Ficha de estética" rotulo="Preencha com a cliente. Só a equipe vê." aoFechar={aoFechar} largo>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Queixa principal</span><input {...campo('queixa')} placeholder="Ex.: manchas na testa, flacidez" /></label>
        <label className="b-campo"><span className="rotulo">Objetivo</span><input {...campo('objetivo')} /></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Tipo de pele</span>
            <select {...campo('tipoPele')}><option value="">—</option>{['Normal', 'Seca', 'Oleosa', 'Mista', 'Sensível', 'Acneica'].map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Fototipo (Fitzpatrick)</span>
            <select {...campo('fototipo')}><option value="">—</option>{['I', 'II', 'III', 'IV', 'V', 'VI'].map((t) => <option key={t}>{t}</option>)}</select></label>
        </div>
        <fieldset className="b-opcoes">
          <legend className="rotulo">Condições de saúde (marque as que a cliente tem)</legend>
          <div className="b-filtros">{condicoes.map((c) => <button key={c} type="button" className={`b-chip${x.condicoes.includes(c) ? ' b-chip--ativo' : ''}`} onClick={() => alterna(c)}>{c}</button>)}</div>
        </fieldset>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Alergias</span><input {...campo('alergias')} /></label>
          <label className="b-campo"><span className="rotulo">Medicamentos em uso</span><input {...campo('medicamentos')} /></label>
        </div>
        <label className="b-campo"><span className="rotulo">Ácidos e cosméticos em uso</span><input {...campo('acidos')} placeholder="Ex.: ácido retinoico à noite" /></label>
        <label className="b-campo"><span className="rotulo">Procedimentos anteriores</span><input {...campo('procedimentos')} placeholder="Ex.: laser em 2025, botox" /></label>
        <label className="b-campo"><span className="rotulo">Exposição ao sol</span>
          <select {...campo('exposicaoSolar')}><option value="">—</option>{['Pouca', 'Moderada', 'Muita', 'Usa protetor todo dia', 'Não usa protetor'].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="b-campo"><span className="rotulo">Observações</span><textarea rows={3} {...campo('obs')} /></label>
        <label className="b-check"><input type="checkbox" checked={x.consentimentoFotos} onChange={(e) => setX({ ...x, consentimentoFotos: e.target.checked })} /> A cliente autoriza fotos de antes e depois (uso interno, não publicadas)</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { aoSalvar(await chamar('salvarFichaEstetica', { ...alvo, ficha: x })); } catch (e) { setErro(e.message); }
        }}>Salvar ficha</BotaoAcao>
      </div>
    </Modal>
  );
}

export function ProntuarioModal({ alvo, nome, aoFechar }) {
  return (
    <Modal titulo={nome || 'Ficha e evolução'} rotulo="Ficha de estética e evolução das sessões" aoFechar={aoFechar} largo>
      <ProntuarioConteudo alvo={alvo} />
    </Modal>
  );
}
