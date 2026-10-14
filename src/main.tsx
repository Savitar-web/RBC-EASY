import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';
import './styles/theme.css';
import { cacheForOffline, registerServiceWorker } from './pwa/offline';

registerServiceWorker();
cacheForOffline().catch(() => {
  /* se reintenta en la siguiente visita; no se avisa al usuario */
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);