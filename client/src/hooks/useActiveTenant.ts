import { useEffect, useState } from 'react';
import { fetchActiveTenant, type ActiveTenant } from '../data/account';
import { useSession } from './useSession';

// Tenant ativo da sessão para o menu de perfil (Story #70, RN005).
//
// Busca `GET /api/tenant/active` (id + nome) quando há sessão autenticada. Em
// falha ou ausência de dados, `tenant` fica `null` — o `ProfileDropdown` exibe o
// placeholder de CE002 sem quebrar o restante do menu (logout continua ativo).

export interface ActiveTenantState {
  tenant: ActiveTenant | null;
  loading: boolean;
  error: boolean;
}

export function useActiveTenant(): ActiveTenantState {
  const session = useSession();
  const [state, setState] = useState<ActiveTenantState>({
    tenant: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    if (!session.authenticated) {
      setState({ tenant: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState({ tenant: null, loading: true, error: false });

    fetchActiveTenant()
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
