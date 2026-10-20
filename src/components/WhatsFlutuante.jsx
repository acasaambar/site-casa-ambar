import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CONFIG } from '../config.js';
import { IconeWhatsapp } from './Marca.jsx';

// Botão do WhatsApp fixo no canto inferior direito
export default function WhatsFlutuante() {
  const { pathname } = useLocation();
  const [visivel, setVisivel] = useState(false);

  // aparece com um leve atraso, para não competir com a abertura do site
  useEffect(() => {
    const t = setTimeout(() => setVisivel(true), 900);
    return () => clearTimeout(t);
  }, []);

  // na tela de reserva existe a barra de confirmar embaixo: o botão sobe
  const elevado = pathname.startsWith('/aula/');
  const naArea = ['/aulas', '/minhas-reservas', '/ficha-saude', '/meu-plano', '/pagamento', '/minha-conta'].includes(pathname);
  const texto = encodeURIComponent('Olá, Casa Âmbar! Vim pelo site e gostaria de mais informações.');

  return (
    <a
      className={`whats ${visivel ? 'whats--visivel' : ''} ${elevado ? 'whats--elevado' : ''} ${naArea ? 'whats--area' : ''}`}
      href={`https://wa.me/${CONFIG.whatsapp}?text=${texto}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`Conversar no WhatsApp ${CONFIG.telefone}`}
    >
      <span className="whats__rotulo">Fale com a gente</span>
      <span className="whats__botao">
        <span className="whats__onda" aria-hidden="true" />
        <IconeWhatsapp tamanho={28} />
      </span>
    </a>
  );
}
