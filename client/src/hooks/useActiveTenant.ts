import { useEffect, useState } from 'react';
import { fetchActiveTenant, type ActiveTenant } from '../data/account';
import { useSession } from './useSession';

// Tenant ativo da sessão para o menu de perfil (Story #70 / #78, RN005).
//
// Busca `GET /api/tenant/active` (id + nome) quando há sessão autenticada. O
// tenant ativo é o do claim `custom:tenant_id` da sessão corrente — logo, os
// dados exibidos no dropdown sempre correspondem ao tenant em que o usuário
// está operando.
//
// Em falha ou ausência de dados, `tenant` fica `null` e `error` vira `true` — o
// `ProfileDropdown` distingue os dois casos (carregando x indisponível) e exibe
// o placeholder de CE002 sem quebrar o menu (logout continua ativo).

export interface ActiveTenantState {
  /** Tenant ativo, ou `null` enquanto carrega / em caso de erro. */
  tenant: ActiveTenant | null;
  loading: boolean;
  error: boolean;
}

// Cache em memória do tenant ativo (Task #79.4). O tenant só muda junto com a
// sessão, então uma única requisição serve a todas as montagens do menu — o
// dropdown reabre sem novo GET e sem piscar o estado de carregamento (RNF de
// performance: menu em <100ms). Requisições concorrentes compartilham a mesma
// promise (`inFlight`), evitando chamadas duplicadas em StrictMode.
let cached: ActiveTenant | null = null;
let inFlight: Promise<ActiveTenant> | null = null;

function loadActiveTenant(): Promise<ActiveTenant> {
  if (cached) return Promise.resolve(cached);

  if (!inFlight) {
    inFlight = fetchActiveTenant()
      .then((tenant) => {
        cached = tenant;
        return tenant;
      })
      .finally(() => {
        // Erro não é cacheado: a próxima montagem do menu tenta de novo.
        inFlight = null;
      });
  }
  return inFlight;
}

// Descarta o tenant cacheado — a próxima sessão busca o seu próprio. Chamado ao
// detectar sessão encerrada (logout, Story #74) para que o tenant de um usuário
// nunca vaze para a sessão seguinte.
export function clearActiveTenantCache(): void {
  cached = null;
  inFlight = null;
}

export function useActiveTenant(): ActiveTenantState {
  const session = useSession();
  // Sessão já resolvida antes (cache quente): entrega o tenant no 1º render.
  const [state, setState] = useState<ActiveTenantState>(() =>
    cached ? { tenant: cached, loading: false, error: false } : { tenant: null, loading: true, error: false },
  );

  useEffect(() => {
    if (!session.authenticated) {
      clearActiveTenantCache();
      setState({ tenant: null, loading: false, error: false });
      return;
    }

    if (cached) {
      setState({ tenant: cached, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState({ tenant: null, loading: true, error: false });

    loadActiveTenant()
      .then((tenant) => {
        if (!cancelled) setState({ tenant, loading: false, error: false });
      })
      .catch((err) => {
        // CE002: registra para debugging e cai no placeholder de tenant.
        console.error('useActiveTenant: falha ao carregar o tenant ativo', err);
        if (!cancelled) setState({ tenant: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [session.authenticated]);

  return state;
}
