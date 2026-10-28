import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import AreaNav from '../components/AreaNav.jsx';
import { useAuth } from '../lib/auth.jsx';
import { Forma, Sol } from '../components/Marca.jsx';
import { PARQ, COMORBIDADES, PARENTESCO, FICHA_VAZIA } from '../anamnese.js';
import { apontarCampo, mascaraTelefone, soDigitos } from '../lib/util.js';
import { Carregando } from './Aulas.jsx';
import { CONFIG } from '../config.js';
import { rolagemSuave } from '../lib/movimento.js';

const ETAPAS = [
  { titulo: 'Contato de emergência', forma: 'presenca' },
  { titulo: 'Prontidão para a prática', forma: 'equilibrio' },
  { titulo: 'Histórico de saúde', forma: 'sutileza' },
];

// embutida: a ficha aparece dentro de outra tela (primeira reserva, primeiro plano). Sem cabeçalho da área do aluno e sem tela de "salva":
// ao concluir chama aoConcluir e quem a abriu continua o que a pessoa estava fazendo. rotulo/motivo explicam por que ela aparece agora.
export default function FichaSaude({ embutida = false, aoConcluir, rotulo = '', motivo = '', aoVoltar }) {
  const { token, aluno, atualizarAluno, expirou } = useAuth();
  const nav = useNavigate();
  const local = useLocation();
  const destino = local.state?.de || '/aulas';
  const [etapa, setEtapa] = useState(0);
  const [f, setF] = useState(FICHA_VAZIA);
  const [erro, setErro] = useState('');
  // campo a que a mensagem se refere ('' = erro geral, junto dos botões): o aviso fica colado no campo, não no fim de uma página comprida
  const [erroNome, setErroNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(null);
  const formRef = useRef(null);
  const erroRef = useRef(null);

  // ficha já preenchida: abre com as respostas para revisar e atualizar
  const [anterior, setAnterior] = useState(null);
  const [carregandoFicha, setCarregandoFicha] = useState(!!aluno?.anamnese);
  useEffect(() => {
    if (!aluno?.anamnese) return;
    let vivo = true;
    api.minhaFicha(token)
      .then((r) => {
        if (!vivo || !r) return;
        const { preenchida_em: quando, ...resto } = r;
        setF({ ...FICHA_VAZIA, ...resto, emergencia_telefone: mascaraTelefone(resto.emergencia_telefone || ''), declaracao: false, consentimento: false });
        setAnterior(quando || 'sim');
      })
      .catch(() => {})
      .finally(() => vivo && setCarregandoFicha(false));
    return () => { vivo = false; };
  }, [token, aluno?.anamnese]);

  const aviso = (...nomes) => (erro && nomes.includes(erroNome) ? <p className="erro erro--campo" role="alert">{erro}</p> : null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const campo = (k, mascara) => ({
    value: f[k],
    onChange: (e) => set(k, mascara ? mascara(e.target.value) : e.target.value),
  });

  // devolve [mensagem, nome do campo]; vazio quando está tudo certo
  function validar(n) {
    if (n === 0) {
      if (!f.data_nascimento) return ['Informe sua data de nascimento.', 'data_nascimento'];
      if (f.emergencia_nome.trim().length < 3) return ['Informe o nome do contato de emergência.', 'emergencia_nome'];
      if (!f.emergencia_parentesco) return ['Informe o parentesco do contato de emergência.', 'emergencia_parentesco'];
      if (soDigitos(f.emergencia_telefone).length < 10) return ['Informe o telefone do contato de emergência, com DDD.', 'emergencia_telefone'];
    }
    if (n === 1) {
      const faltando = PARQ.findIndex((q) => !f[q.id]);
      if (faltando >= 0) return [`Responda a pergunta ${faltando + 1}.`, PARQ[faltando].id];
    }
    if (n === 2) {
      if (!f.gestante) return ['Responda se está gestante.', 'gestante'];
      if (!f.atividade_regular) return ['Responda se pratica atividade física regularmente.', 'atividade'];
      if (!f.declaracao) return ['Marque a declaração e o consentimento para concluir.', 'declaracao'];
      if (!f.consentimento) return ['Marque a declaração e o consentimento para concluir.', 'consentimento'];
    }
    return [];
  }

  // erro do servidor (sem campo marcado): leva até a mensagem, uma vez por erro
  useEffect(() => {
    if (erro && !formRef.current?.querySelector('[aria-invalid="true"]')) erroRef.current?.scrollIntoView({ behavior: rolagemSuave(), block: 'center' });
  }, [erro]);

  async function avancar(e) {
    e.preventDefault();
    const [msg = '', nome = ''] = validar(etapa);
    setErro(msg);
    setErroNome(nome);
    apontarCampo(formRef.current, nome);
    if (msg) return;
    if (etapa < ETAPAS.length - 1) {
      setEtapa(etapa + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setEnviando(true);
    try {
      const r = await api.salvarAnamnese(token, f);
      atualizarAluno({ anamnese: true });
      if (embutida) { aoConcluir?.(r); return; }
      setFeito(r);
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (/sessão/i.test(err.message)) {
        expirou();
        nav('/entrar', { state: { de: '/ficha-saude' } });
      } else { setErro(err.message); setErroNome(''); }
    } finally {
      setEnviando(false);
    }
  }

  const algumSim = PARQ.some((q) => f[q.id] === 'sim');

  if (feito && !embutida) {
    return (
      <main className="app">
        <div className="largura app__corpo">
          <div className="ficha-ok">
            <Sol tamanho={54} className="cor-caramelo girando-lento" />
            <h1 className="display-m">Ficha de saúde salva</h1>
            <p>Tudo certo, {aluno?.nome.split(' ')[0]}. Suas informações ficam guardadas com cuidado e só a equipe da Casa Âmbar tem acesso.</p>
            {feito.alerta && (
              <p className="aviso">
                Você respondeu “sim” a alguma pergunta do questionário. Recomendamos conversar com seu médico e trazer uma
                liberação para a prática. Quem dá a aula também vai conversar com você na primeira prática.
              </p>
            )}
            <Link to={destino} className="botao botao--cheio">{destino === '/aulas' ? 'Ver aulas e reservar' : 'Continuar'}</Link>
          </div>
        </div>
      </main>
    );
  }

  const topo = (
    <div className="app__topo">
      <div className="largura">
        <span className="rotulo-espacado cor-caramelo">{embutida ? rotulo || 'Ficha de saúde' : 'Ficha de saúde'}</span>
        <h1 className="display-m">{anterior || carregandoFicha ? 'Sua ficha de saúde' : embutida ? 'Ficha de saúde' : 'Antes de começar, queremos te conhecer'}</h1>
        {!carregandoFicha && (
          <p className="ficha__intro">
            {anterior
              ? 'Estas são as respostas que você enviou. Mudou alguma coisa? Atualize e salve de novo.'
              : `${motivo ? motivo + ' ' : ''}Leva uns 2 minutos. Assim quem dá a aula sabe como cuidar de você durante a prática.`}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Envoltorio embutida={embutida}>
      {topo}
      {!embutida && <AreaNav />}
      <div className="largura app__corpo ficha">
        {/* ficha já enviada: espera as respostas chegarem antes de mostrar o formulário */}
        {carregandoFicha ? <Carregando /> : (
        <>
        <ol className="passos" aria-label="Etapas">
          {ETAPAS.map((e, i) => (
            <li key={e.titulo} className={i === etapa ? 'atual' : i < etapa ? 'feito' : ''} aria-current={i === etapa ? 'step' : undefined}>
              <Forma nome={e.forma} tamanho={28} cor="currentColor" />
              <span>{e.titulo}</span>
            </li>
          ))}
        </ol>
        <p className="passos__legenda">Etapa {etapa + 1} de {ETAPAS.length} · {ETAPAS[etapa].titulo}</p>
        {anterior && (
          <p className="ficha__anterior">
            <Sol tamanho={14} />
            <span>Ficha preenchida{anterior !== 'sim' && /^\d{4}-\d{2}-\d{2}/.test(anterior) ? ` em ${anterior.slice(0, 10).split('-').reverse().join('/')}` : ''}.
            Para salvar as mudanças, marque de novo a declaração no final.</span>
          </p>
        )}

        <form ref={formRef} className="form ficha__form" onSubmit={avancar} noValidate>
          {etapa === 0 && (
            <fieldset className="bloco">
              <legend className="display-p">Contato de emergência</legend>
              <p className="bloco__ajuda">Quem devemos chamar se você passar mal durante a aula?</p>
              <label>
                Sua data de nascimento
                <input type="date" name="data_nascimento" max={new Date().toISOString().slice(0, 10)} {...campo('data_nascimento')} />
              </label>
              {aviso('data_nascimento')}
              <label>
                Nome do contato
                <input type="text" name="emergencia_nome" autoComplete="off" {...campo('emergencia_nome')} />
              </label>
              {aviso('emergencia_nome')}
              <div className="duas-colunas">
                <label>
                  Parentesco
                  <select name="emergencia_parentesco" {...campo('emergencia_parentesco')}>
                    <option value="">Escolha</option>
                    {PARENTESCO.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label>
                  Telefone
                  <input type="tel" name="emergencia_telefone" inputMode="numeric" placeholder="(85) 90000-0000" {...campo('emergencia_telefone', mascaraTelefone)} />
                </label>
              </div>
              {aviso('emergencia_parentesco', 'emergencia_telefone')}
              <label>
                Plano de saúde <span className="opcional">opcional</span>
                <input type="text" placeholder="Nome do plano" {...campo('plano_saude')} />
              </label>
            </fieldset>
          )}

          {etapa === 1 && (
            <fieldset className="bloco">
              <legend className="display-p">Prontidão para a prática</legend>
              <p className="bloco__ajuda">Questionário PAR-Q, usado em academias e estúdios. Responda com sinceridade.</p>
              <ul className="perguntas">
                {PARQ.map((q, i) => (
                  <li key={q.id} className="pergunta">
                    <span className="pergunta__num">{i + 1}</span>
                    <p id={`${q.id}-t`}>{q.texto}</p>
                    <div className="sim-nao" role="radiogroup" aria-labelledby={`${q.id}-t`}>
                      {[['sim', 'Sim'], ['nao', 'Não']].map(([v, t]) => (
                        <label key={v} className={`escolha ${f[q.id] === v ? 'marcada' : ''} ${v === 'sim' ? 'escolha--sim' : ''}`}>
                          <input type="radio" name={q.id} value={v} checked={f[q.id] === v} onChange={() => set(q.id, v)} />
                          {t}
                        </label>
                      ))}
                    </div>
                    {aviso(q.id)}
                  </li>
                ))}
              </ul>
              {algumSim && (
                <p className="aviso">Tudo bem responder “sim”. Vamos te orientar e pode ser pedida uma liberação médica antes de começar.</p>
              )}
            </fieldset>
          )}

          {etapa === 2 && (
            <>
              <fieldset className="bloco">
                <legend className="display-p">Histórico de saúde</legend>
                <p className="bloco__ajuda">Marque o que se aplica a você.</p>
                <div className="marcas">
                  {COMORBIDADES.map((c) => {
                    const ok = f.comorbidades.includes(c);
                    return (
                      <label key={c} className={`marca ${ok ? 'marcada' : ''}`}>
                        <input
                          type="checkbox"
                          checked={ok}
                          onChange={() => set('comorbidades', ok ? f.comorbidades.filter((x) => x !== c) : [...f.comorbidades, c])}
                        />
                        {c}
                      </label>
                    );
                  })}
                </div>
                <label>
                  Outra condição <span className="opcional">opcional</span>
                  <input type="text" {...campo('comorbidade_outra')} />
                </label>

                <div className="duas-colunas">
                  <div className="grupo">
                    <span className="grupo__titulo">Está gestante?</span>
                    <div className="sim-nao">
                      {[['sim', 'Sim'], ['nao', 'Não'], ['nao se aplica', 'Não se aplica']].map(([v, t]) => (
                        <label key={v} className={`escolha ${f.gestante === v ? 'marcada' : ''}`}>
                          <input type="radio" name="gestante" checked={f.gestante === v} onChange={() => set('gestante', v)} />
                          {t}
                        </label>
                      ))}
                    </div>
                    {aviso('gestante')}
                    {f.gestante === 'sim' && (
                      <label>
                        Quantas semanas?
                        <input type="number" min="1" max="42" inputMode="numeric" {...campo('gestante_semanas')} />
                      </label>
                    )}
                  </div>
                  <div className="grupo">
                    <span className="grupo__titulo">Pratica atividade física regularmente?</span>
                    <div className="sim-nao">
                      {[['sim', 'Sim'], ['nao', 'Não']].map(([v, t]) => (
                        <label key={v} className={`escolha ${f.atividade_regular === v ? 'marcada' : ''}`}>
                          <input type="radio" name="atividade" checked={f.atividade_regular === v} onChange={() => set('atividade_regular', v)} />
                          {t}
                        </label>
                      ))}
                    </div>
                    {aviso('atividade')}
                  </div>
                </div>

                <label>
                  Medicamentos de uso contínuo <span className="opcional">nome e para quê</span>
                  <textarea rows="2" {...campo('medicamentos')} />
                </label>
                <label>
                  Cirurgias nos últimos 12 meses <span className="opcional">opcional</span>
                  <textarea rows="2" {...campo('cirurgias')} />
                </label>
                <label>
                  Lesões ou dores atuais <span className="opcional">joelho, ombro, coluna…</span>
                  <textarea rows="2" {...campo('lesoes')} />
                </label>
                <label>
                  Alergias <span className="opcional">opcional</span>
                  <input type="text" {...campo('alergias')} />
                </label>
                <label>
                  Algo mais que a equipe deva saber? <span className="opcional">opcional</span>
                  <textarea rows="3" {...campo('observacoes')} />
                </label>
              </fieldset>

              <fieldset className="bloco bloco--termos">
                <label className="termo">
                  <input type="checkbox" name="declaracao" checked={f.declaracao} onChange={(e) => set('declaracao', e.target.checked)} />
                  <span>Declaro que as informações acima são verdadeiras e que avisarei a Casa Âmbar se meu estado de saúde mudar.</span>
                </label>
                {aviso('declaracao')}
                <label className="termo">
                  <input type="checkbox" name="consentimento" checked={f.consentimento} onChange={(e) => set('consentimento', e.target.checked)} />
                  <span>
                    Autorizo a Casa Âmbar a guardar estes dados de saúde apenas para a minha segurança durante as práticas, conforme a
                    Lei Geral de Proteção de Dados (LGPD). Posso pedir a exclusão a qualquer momento pelo WhatsApp {CONFIG.telefone}.
                  </span>
                </label>
                {aviso('consentimento')}
              </fieldset>
            </>
          )}

          {erro && !erroNome && <p className="erro erro--destaque" role="alert" ref={erroRef}>{erro}</p>}

          <div className="ficha__botoes">
            {etapa > 0 ? (
              <button type="button" className="botao botao--linha" onClick={() => { setErro(''); setErroNome(''); setEtapa(etapa - 1); }}>Voltar</button>
            ) : aoVoltar ? (
              <button type="button" className="botao botao--linha" onClick={aoVoltar}>Voltar</button>
            ) : null}
            <button type="submit" className="botao botao--cheio" disabled={enviando}>
              {enviando ? 'Salvando…' : etapa < ETAPAS.length - 1 ? 'Continuar' : embutida ? 'Concluir e continuar' : 'Concluir ficha'}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </Envoltorio>
  );
}

function Envoltorio({ embutida, children }) {
  return embutida ? <div className="ficha-embutida">{children}</div> : <main className="app">{children}</main>;
}
