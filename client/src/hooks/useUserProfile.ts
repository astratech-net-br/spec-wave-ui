import { useSession } from './useSession';

// Dados do perfil do usuário autenticado para o menu de perfil (Story #70).
//
// Deriva da sessão já resolvida por `useSession` (claims do id token do
// Cognito): nome completo, email e avatarUrl. Mantido como hook próprio para
// isolar o `ProfileMenu` da origem dos dados (RN004 / matriz de rastreabilidade
// do plan.md: "ProfileMenu + hook useUserProfile").

export interface UserProfile {
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface UserProfileState {
  authenticated: boolean;
  profile: UserProfile | null;
}

export function useUserProfile(): UserProfileState {
  const session = useSession();

  if (!session.authenticated || !session.user) {
    return { authenticated: false, profile: null };
  }

  const { name, email, avatarUrl } = session.user;
  return { authenticated: true, profile: { name, email, avatarUrl } };
}
