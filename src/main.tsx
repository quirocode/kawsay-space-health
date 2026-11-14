import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './app/styles.css';
import { App } from './app/App';

// Offline-first: cache the app, and reload once when a new version is deployed
// (otherwise a returning device keeps showing the previous build for one visit).
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
