import './dashboard.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from './QueueDashboard.js';

/** Local-only preview — run: npm run demo */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard mock />
  </StrictMode>
);
