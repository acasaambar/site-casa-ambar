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
          {navigator.userAgent}
        </pre>
        <button
          type="button"
          className="botao botao--cheio"
          onClick={() => {
            try {
              localStorage.removeItem('ambar_sessao');
            } catch {
              /* ignora */
            }
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          Recarregar
        </button>
      </main>
    );
  }
}
