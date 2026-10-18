import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fontes da marca, servidas pelo próprio site
import '@fontsource/italiana/400.css';
import '@fontsource/ibm-plex-mono/300.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/400-italic.css';
import '@fontsource/pinyon-script/400.css';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
