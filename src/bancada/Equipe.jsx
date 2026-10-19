import { useState } from 'react';
import { useBancada } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Modal, BotaoAcao, Tag } from './ui.jsx';

const PAPEIS = {
  admin: ['Administração', 'Vê e faz tudo: relatórios, equipe, planos, cupons e ajustes.'],
  recepcao: ['Recepção', 'Agenda, alunos, vendas no balcão, vales e bloqueios. Não vê relatórios.'],
  professora: ['Professora', 'Só as próprias aulas: lista de presença e ficha de saúde das alunas.'],
};

export default function Equipe() {
  const { dados, erro, carregando, setDados } = useDados('equipe', {});
  const [editar, setEditar] = useState(null);
  const [aviso, setAviso] = useState('');
  return (
    <>
      <Cabecalho rotulo="Equipe" titulo="Quem acessa a bancada" acoes={<button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ papel: 'recepcao', ativo: true })}>+ Novo acesso</button>}>
        Cada pessoa entra com o próprio e-mail e senha. O convite chega por e-mail.
      </Cabecalho>
      <Erro>{erro}</Erro>
      {aviso && <p className="aviso">{aviso}</p>}
      {carregando && !dados && <Carregando />}
      <ul className="b-equipe">
        {(dados || []).map((m) => (
          <li key={m.email} className={m.ativo ? '' : 'inativo'}>
            <div className="b-equipe__ini" aria-hidden="true">{m.nome.slice(0, 1)}</div>
            <div>
              <strong>{m.nome}</strong>
              <span className="b-suave">{m.email}</span>
            </div>
            <span className="b-reserva__tags">
              <Tag tom={m.papel === 'admin' ? 'ambar' : 'neutro'}>{PAPEIS[m.papel]?.[0]}{m.papel === 'professora' && m.professorNome ? ' · ' + m.professorNome : ''}</Tag>
              {!m.ativo && <Tag tom="apagado">sem acesso</Tag>}
              {!m.temSenha && m.ativo && <Tag tom="aviso">convite pendente</Tag>}
            </span>
            <span className="b-suave">{m.ultimoAcesso ? 'último acesso ' + m.ultimoAcesso.slice(0, 10).split('-').reverse().join('/') : 'nunca entrou'}</span>
            <button type="button" className="link-acao" onClick={() => setEditar(m)}>editar</button>
          </li>
        ))}
      </ul>
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
        <label className="b-campo"><span className="rotulo">Nome</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
        <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" value={f.email} disabled={!novo} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <fieldset className="b-opcoes">
          <legend className="rotulo">Tipo de acesso</legend>
          {Object.entries(PAPEIS).map(([id, [t, d]]) => (
            <label key={id} className={f.papel === id ? 'ativo' : ''}>
              <input type="radio" checked={f.papel === id} onChange={() => setF({ ...f, papel: id })} />
              <span><strong>{t}</strong><small>{d}</small></span>
            </label>
          ))}
        </fieldset>
        {f.papel === 'professora' && (
          <label className="b-campo"><span className="rotulo">Nome na grade de aulas</span><input value={f.professorNome} onChange={(e) => setF({ ...f, professorNome: e.target.value })} placeholder="Ex.: Kalliny" />
            <span className="b-suave">Igual ao nome que aparece na grade. É assim que ela vê só as aulas dela.</span></label>
        )}
        {!novo && <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Pode acessar a bancada</label>}
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={() => salvar(false)}>{novo ? 'Criar e enviar convite' : 'Salvar'}</BotaoAcao>
        {!novo && !m.temSenha && <BotaoAcao className="link-acao" acao={() => salvar(true)}>reenviar convite</BotaoAcao>}
      </div>
    </Modal>
  );
}
