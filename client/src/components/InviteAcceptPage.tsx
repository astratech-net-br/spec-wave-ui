// Aceite de convite (fase 3): #/invite/<code>. Chama o backend e, no sucesso,
// força re-login — o claim custom:tenant_id só muda em um token novo.

import { useEffect, useState } from 'react';
import { acceptInvite } from '../data/account';
import { authEnabled, logout } from '../auth/cognito';
import { DASHBOARD_HREF } from '../lib/router';

export function InviteAcceptPage({ code }: { code: string }) {
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    acceptInvite(code)
      .then(() => setState('done'))
      .catch((err: Error) => {
        setMessage(err.message);
        setState('error');
      });
  }, [code]);

  return (
    <main className="page">
      <div className="repo-empty">
        {state === 'working' && <p className="repo-empty__title">Aceitando o convite…</p>}
        {state === 'error' && (
          <>
            <div className="repo-empty__art" aria-hidden="true">⚠️</div>
            <p className="repo-empty__title">{message}</p>
            <a className="btn" href={DASHBOARD_HREF}>Voltar ao Dashboard</a>
          </>
        )}
        {state === 'done' && (
          <>
            <div className="repo-empty__art" aria-hidden="true">🎉</div>
            <p className="repo-empty__title">
              Convite aceito! Entre novamente para acessar a conta do time.
            </p>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => (authEnabled ? logout() : window.location.assign(DASHBOARD_HREF))}
            >
              Entrar novamente
            </button>
          </>
        )}
      </div>
    </main>
  );
}
