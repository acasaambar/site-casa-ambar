import { Component } from 'react';

// Se alguma página quebrar, mostra o erro em vez de uma tela em branco.
export default class ErroTela extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro na página:', erro, info);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <main style={{ maxWidth: 560, margin: '80px auto', padding: '0 24px', fontFamily: 'var(--mono)', textAlign: 'center' }}>
        <h1 className="display-m">Algo não carregou</h1>
        <p>Tente recarregar a página. Se continuar, envie esta mensagem para o suporte:</p>
        <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', background: '#E9DDC5', padding: 16, borderRadius: 12, fontSize: 12 }}>
          {String(this.state.erro?.message || this.state.erro)}
          {'\n'}
          {/* a tela onde aconteceu (sem o que vem depois do "?", que pode ter código de link) */}
          {'Tela: ' + (window.location.hash.split('?')[0] || '#/').replace(/\d{6,}/g, '…').replace(/[A-Za-z0-9_.-]{20,}/g, '…')}
          {'\n'}
          {navigator.userAgent}
        </pre>
        <button
          type="button"
          className="botao botao--cheio"
          onClick={() => {
            const naBancada = window.location.hash.startsWith('#/bancada');
            try {
              // a memória das telas da bancada é refeita do zero (um dado guardado com defeito não volta a quebrar a tela)
              Object.keys(sessionStorage).filter((k) => k.startsWith('ambar_mem|')).forEach((k) => sessionStorage.removeItem(k));
              // no site, sai da área do aluno; na bancada, o login continua e só volta para a tela Hoje
              if (!naBancada) localStorage.removeItem('ambar_sessao');
            } catch {
              /* ignora */
            }
            window.location.hash = naBancada ? '#/bancada' : '#/';
            window.location.reload();
          }}
        >
          Recarregar
        </button>
      </main>
    );
  }
}
