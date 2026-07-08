import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import './styles/workspace.css';
import App from './App';
import { bootstrapAuth } from './auth/bootstrap';

// Auth primeiro: conclui callbacks (login do Cognito / setup do GitHub App) e,
// sem sessão, redireciona ao Hosted UI — nesse caso nada é renderizado.
bootstrapAuth().then((ready) => {
  if (!ready) return;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
