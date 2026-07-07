// Configurações da conta (fase 3): plano/uso + upgrade (Stripe), time/convites
// e chave OpenRouter própria. Ações de mutação só aparecem para o owner.

import { useEffect, useState, type FormEvent } from 'react';
import { DASHBOARD_HREF } from '../lib/router';
import {
  createInvite,
  fetchBilling,
  fetchTeam,
  openBilling,
  saveOpenrouterKey,
  type BillingSummary,
  type TeamInvite,
  type TeamMember,
} from '../data/account';
import { logout } from '../auth/cognito';

export function SettingsPage() {
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [orKey, setOrKey] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchBilling(), fetchTeam()])
      .then(([b, t]) => {
        setBilling(b);
        setMembers(t.members);
        setInvites(t.invites);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const isOwner = billing?.role === 'owner';

  const submitInvite = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    createInvite(inviteEmail.trim(), 'member')
      .then((invite) => {
        setInvites((prev) => [...prev, invite]);
        setInviteLink(`${window.location.origin}/#/invite/${invite.code}`);
        setInviteEmail('');
      })
      .catch((err: Error) => setError(err.message));
  };

  const submitKey = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    saveOpenrouterKey(orKey.trim())
      .then(() => {
        setNotice(orKey.trim() ? 'Chave salva — seus refinamentos não consomem mais a cota.' : 'Chave removida.');
        setOrKey('');
        return fetchBilling().then(setBilling);
      })
      .catch((err: Error) => setError(err.message));
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar__left">
          <span className="brand" aria-hidden="true" />
          <nav className="breadcrumb" aria-label="Navegação">
            <a className="breadcrumb__seg" href={DASHBOARD_HREF}>
              Dashboard
            </a>
            <span className="breadcrumb__seg breadcrumb__seg--current">Configurações</span>
          </nav>
        </div>
        <div className="topbar__right">
          <button type="button" className="btn" onClick={() => logout()}>
            Sair
          </button>
        </div>
      </header>

      <main className="page">
        <h1 className="dashboard__title">Configurações</h1>

        {error && <p role="alert" style={{ color: 'var(--danger, #c00)' }}>{error}</p>}
        {notice && <p role="status">{notice}</p>}

        <section style={{ marginTop: 24 }}>
          <h2>Plano e uso</h2>
          {!billing ? (
            <div className="skeleton skeleton-card" />
          ) : (
            <>
              <p>
                Plano <strong>{billing.plan}</strong> — refinamentos:{' '}
                <strong>
                  {billing.refinesUsed}/{billing.refinesLimit}
                </strong>{' '}
                no mês · repositórios:{' '}
                <strong>
                  {billing.reposUsed}/{billing.reposLimit}
                </strong>
                {billing.ownOpenrouterKey && ' · usando chave OpenRouter própria (sem cota)'}
              </p>
              {isOwner && billing.plan === 'free' && (
                <button
                  type="button"
                  className="btn btn--accent"
                  onClick={() => openBilling('checkout').catch((err: Error) => setError(err.message))}
                >
                  Fazer upgrade (pro)
                </button>
              )}
              {isOwner && billing.plan !== 'free' && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => openBilling('portal').catch((err: Error) => setError(err.message))}
                >
                  Gerenciar assinatura
                </button>
              )}
            </>
          )}
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Time</h2>
          <ul>
            {members.map((m) => (
              <li key={m.sub}>
                {m.email} — {m.role}
              </li>
            ))}
            {invites.map((i) => (
              <li key={i.code}>
                {i.email} — convite pendente ({i.role})
              </li>
            ))}
          </ul>
          {isOwner && (
            <form onSubmit={submitInvite}>
              <input
                type="email"
                required
                placeholder="email@exemplo.com"
                aria-label="Email do convidado"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />{' '}
              <button type="submit" className="btn btn--accent">
                Convidar
              </button>
            </form>
          )}
          {inviteLink && (
            <p>
              Envie este link ao convidado (válido por 7 dias): <code>{inviteLink}</code>
            </p>
          )}
        </section>

        {isOwner && (
          <section style={{ marginTop: 24 }}>
            <h2>Chave OpenRouter própria</h2>
            <p>
              Com a sua chave, os refinamentos usam a SUA conta OpenRouter e não consomem a cota do
              plano. A chave é cifrada (KMS) e nunca aparece de volta.
            </p>
            <form onSubmit={submitKey}>
              <input
                type="password"
                placeholder={billing?.ownOpenrouterKey ? 'chave cadastrada — cole para trocar' : 'sk-or-...'}
                aria-label="Chave OpenRouter"
                value={orKey}
                onChange={(e) => setOrKey(e.target.value)}
              />{' '}
              <button type="submit" className="btn btn--accent">
                Salvar
              </button>{' '}
              {billing?.ownOpenrouterKey && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setOrKey('');
                    saveOpenrouterKey('')
                      .then(() => {
                        setNotice('Chave removida.');
                        return fetchBilling().then(setBilling);
                      })
                      .catch((err: Error) => setError(err.message));
                  }}
                >
                  Remover
                </button>
              )}
            </form>
          </section>
        )}
      </main>
    </>
  );
}
