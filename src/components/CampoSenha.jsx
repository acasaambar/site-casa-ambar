import { useState } from 'react';

// Campo de senha com o botão de olho (mostrar/esconder)
export function CampoSenha({ className = '', ...props }) {
  const [ver, setVer] = useState(false);
  return (
    <span className={`senha ${className}`}>
      <input {...props} type={ver ? 'text' : 'password'} autoCapitalize="none" spellCheck={false} />
      <button type="button" className="senha__ver" aria-label={ver ? 'Esconder a senha' : 'Mostrar a senha'} aria-pressed={ver} onClick={() => setVer((v) => !v)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3" />
          {ver && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </span>
  );
}

// Regras da senha (vão ficando verdes) e se a confirmação coincide
export function ConfereSenha({ senha, confirmacao, regras = true }) {
  const itens = regras ? [['8 caracteres ou mais', String(senha).length >= 8], ['letras e números', /[A-Za-z]/.test(senha) && /\d/.test(senha)]] : [];
  if (confirmacao) itens.push([senha === confirmacao ? 'as senhas coincidem' : 'as senhas ainda não coincidem', senha === confirmacao]);
  if (!senha && !confirmacao) return null;
  return (
    <ul className="senha__regras" aria-live="polite">
      {itens.map(([t, ok]) => <li key={t} className={ok ? 'ok' : ''}><span aria-hidden="true">{ok ? '✓' : '·'}</span>{t}</li>)}
    </ul>
  );
}
