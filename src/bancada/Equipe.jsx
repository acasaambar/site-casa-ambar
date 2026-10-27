import { useState } from 'react';
import { useBancada } from './sessao.jsx';
import { useDados, Esqueleto, Erro, Cabecalho, Modal, BotaoAcao, Tag, Aviso, Vazio, plural } from './ui.jsx';
import { Avatar, BlocoForm, Interruptor, Barra } from './CatalogoPecas.jsx';
import './css/catalogo.css';

const PAPEIS = {
  admin: ['Administração', 'Vê e faz tudo: relatórios, equipe, planos, cupons e ajustes.'],
  recepcao: ['Recepção', 'Agenda, clientes, vendas no balcão, vales e bloqueios. Não vê relatórios.'],
  professora: ['Profissional', 'Só a própria agenda: aulas (presença e ficha de saúde) ou atendimentos de estética e fisioterapia.'],
};
const TOM_PAPEL = { admin: 'ambar', recepcao: 'ok', professora: 'neutro' };

export default function Equipe() {
  const { dados, erro, carregando, setDados } = useDados('equipe', {});
  const [editar, setEditar] = useState(null);
  const [aviso, setAviso] = useState('');
  const ativos = (dados || []).filter((m) => m.ativo).length;
  return (
    <>
      <Cabecalho titulo="Equipe" ajuda="Cada pessoa entra com o próprio e-mail e senha. O convite chega por e-mail." acoes={<button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ papel: 'recepcao', ativo: true })}>Novo acesso</button>}>
        Quem entra na bancada
      </Cabecalho>
      <Erro>{erro}</Erro>
      {aviso && <Aviso tom="ok">{aviso}</Aviso>}
      {carregando && !dados && <Esqueleto linhas={4} altura={56} />}
      {dados && dados.length > 0 && <Barra resumo={`${plural(dados.length, 'pessoa', 'pessoas')} · ${plural(ativos, 'com acesso', 'com acesso')}`} />}
      {dados && dados.length === 0 && <Vazio titulo="Ninguém na equipe ainda" acao={<button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ papel: 'recepcao', ativo: true })}>Novo acesso</button>} />}
      {dados && dados.length > 0 && (
        <div className="b-itens cg-equipe">
          {dados.map((m) => (
            <div key={m.email} className={`b-item cg-pessoa${m.ativo ? '' : ' cg-inativo'}`}>
              <Avatar nome={m.nome} />
              <div className="b-item__corpo">
                <span className="b-item__titulo">{m.nome}</span>
                <span className="b-suave cg-email">{m.email}</span>
              </div>
              <div className="b-item__lado b-item__lado--tira">
                <Tag tom={TOM_PAPEL[m.papel] || 'neutro'}>{PAPEIS[m.papel]?.[0]}{m.papel === 'professora' && m.professorNome ? ' · ' + m.professorNome : ''}</Tag>
                {!m.ativo && <Tag tom="apagado">sem acesso</Tag>}
                {!m.temSenha && m.ativo && <Tag tom="aviso">convite pendente</Tag>}
              </div>
              <span className="b-suave cg-ultimo">{m.ultimoAcesso ? 'Último acesso ' + m.ultimoAcesso.slice(0, 10).split('-').reverse().join('/') : 'Nunca entrou'}</span>
              <button type="button" className="botao botao--fantasma botao--p" aria-label={`Editar ${m.nome}`} onClick={() => setEditar(m)}>Editar</button>
            </div>
          ))}
        </div>
      )}
      {editar && <EditarMembro m={editar} aoFechar={() => setEditar(null)} aoSalvar={(r) => { setDados(r.equipe); setEditar(null); setAviso(r.conviteEnviado ? 'Convite enviado por e-mail.' : 'Acesso atualizado.'); }} />}
    </>
  );
}

function EditarMembro({ m, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const novo = !m.email;
  const [f, setF] = useState({ email: m.email || '', nome: m.nome || '', papel: m.papel, professorNome: m.professorNome || '', ativo: m.ativo !== false });
  const [erro, setErro] = useState('');
  const salvar = async (reenviarConvite) => {
    setErro('');
    try { aoSalvar(await chamar('salvarMembro', { membro: { ...f, reenviarConvite } })); } catch (e) { setErro(e.message); }
  };
  return (
    <Modal rotulo="Equipe" titulo={novo ? 'Novo acesso' : m.nome} aoFechar={aoFechar}>
      <div className="b-form">
        <BlocoForm titulo="Pessoa">
          <label className="b-campo"><span className="rotulo">Nome</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
          <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" value={f.email} disabled={!novo} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        </BlocoForm>
        <fieldset className="b-opcoes cg-papeis">
          <legend className="cg-bloco__titulo">Tipo de acesso</legend>
          {Object.entries(PAPEIS).map(([id, [t, d]]) => (
            <label key={id} className={f.papel === id ? 'ativo' : ''}>
              <input type="radio" checked={f.papel === id} onChange={() => setF({ ...f, papel: id })} />
              <span><strong>{t}</strong><small>{d}</small></span>
            </label>
          ))}
        </fieldset>
        {f.papel === 'professora' && (
          <BlocoForm titulo="Nome na agenda" ajuda="Exatamente como aparece na grade de aulas ou em Catálogo → Profissionais. É assim que a pessoa vê só a própria agenda.">
            <input aria-label="Nome na agenda" value={f.professorNome} onChange={(e) => setF({ ...f, professorNome: e.target.value })} placeholder="Ex.: Kalliny" />
          </BlocoForm>
        )}
        {!novo && <Interruptor checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })}>Pode acessar a bancada</Interruptor>}
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={() => salvar(false)}>{novo ? 'Criar e enviar convite' : 'Salvar'}</BotaoAcao>
        {!novo && !m.temSenha && <BotaoAcao className="botao botao--linha botao--p" acao={() => salvar(true)}>Reenviar convite</BotaoAcao>}
      </div>
    </Modal>
  );
}
