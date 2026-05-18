import './dashboard.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from './QueueDashboard.js';
import { setupTouchScroll } from './setup-touch-scroll.js';

setupTouchScroll();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>
);
