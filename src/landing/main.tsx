import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './landing.css';
import { Landing } from './Landing';

// Old links to the app pointed at the site root with a hash route (/#/check): send them to /app/.
if (location.hash.startsWith('#/')) location.replace(`/app/${location.hash}`);
else
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Landing />
    </StrictMode>,
  );
