# Estratégia Técnica

## Abordagem Arquitetural
Implementação de um componente React no cabeçalho que consome dados de sessão e perfil via API interna. O componente será responsivo e acessível, seguindo os padrões existentes do sistema.

## Decisões-Chave
- Utilizar o contexto de autenticação existente para determinar estado do usuário
- Implementar fallback visual para avatares não disponíveis
- Cache local dos dados do usuário para performance
- Integração com sistema de roteamento para logout

## Matriz de Rastreabilidade

| Critério de Aceite | Componente Técnico |
|-------------------|-------------------|
| Exibição do menu para usuário autenticado com avatar | Componente ProfileMenu + hook useSession |
| Fallback para iniciais quando avatar não disponível | Componente UserAvatar + utilitário generateInitials |
| Dropdown com informações completas | Componente ProfileDropdown + API /api/user/profile |
| Logout bem-sucedido | Endpoint POST /api/auth/logout + redirecionamento frontend |
| Consistência multi-tenant | Middleware de sessão + API /api/tenant/active |

# Detalhamento da Implementação

## Backend

### Novos Endpoints
- `GET /api/user/profile` - Retorna dados do usuário autenticado
  - Response: `UserProfileDTO { id: string, name: string, avatarUrl: string | null }`
  - Referência: Critério "Dropdown com informações completas"

- `GET /api/tenant/active` - Retorna dados do tenant ativo
  - Response: `ActiveTenantDTO { id: string, name: string }`
  - Referência: Critério "Consistência multi-tenant"

- `POST /api/auth/logout` - Encerra sessão do usuário
  - Response: `{ success: boolean }`
  - Referência: Critério "Logout bem-sucedido"

### Middlewares
- `authMiddleware` - Valida sessão em todas as rotas protegidas
- `tenantContextMiddleware` - Injeta contexto do tenant ativo

## Banco de Dados

### Novas Tabelas
```sql
-- Tabela users (RN002, RN003)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela user_sessions (RN001, RN005)
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tenant_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

-- Índices para performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_tenant_id ON user_sessions(tenant_id);
```

## Frontend

### Novos Componentes
- `components/Header/ProfileMenu.tsx` - Componente principal do menu
  - Referência: Critério "Exibição do menu"

- `components/Header/UserAvatar.tsx` - Componente de avatar com fallback
  - Props: `{ user: UserProfile, size: number }`
  - Referência: Critério "Fallback para iniciais"

- `components/Header/ProfileDropdown.tsx` - Dropdown com informações
  - Referência: Critério "Dropdown com informações completas"

### Hooks
- `hooks/useSession.ts` - Gerencia estado da sessão
- `hooks/useUserProfile.ts` - Busca dados do perfil
- `hooks/useActiveTenant.ts` - Obtém tenant ativo

### Utilitários
- `utils/generateInitials.ts` - Gera iniciais do nome (RN003)
- `utils/avatarFallback.ts` - Handler de erro de carregamento de avatar (CE001)

## Infraestrutura

### Configurações
- Cache headers para avatares: `Cache-Control: public, max-age=86400` (1 dia)
- Rate limiting específico para endpoints de perfil: 60 req/min por IP
- Health check para endpoints críticos

### Monitoramento
- Logs de erro para falhas no carregamento de avatar
- Métricas de tempo de carregamento do menu

# Segurança e Conformidade

## Medidas de Segurança
- Validação de sessão em todas as requisições ao menu
- Sanitização de dados do usuário antes da exibição
- Proteção contra clickjacking no dropdown
- Headers CSP adequados para imagens externas

## Conformidade
- Acessibilidade: ARIA labels, keyboard navigation, screen reader support
- GDPR: Dados pessoais tratados conforme política de privacidade
- Cookies: Sessão HTTP-only, Secure flag em produção

# Estratégia de Testes

## Unitários
- `UserAvatar.test.tsx` - Testes de renderização com e sem avatar
- `generateInitials.test.ts` - Geração correta de iniciais
- `ProfileDropdown.test.tsx` - Renderização das informações

## Integração
- `ProfileMenu.integration.test.tsx` - Integração com hooks de sessão
- `API endpoints integration` - Testes dos novos endpoints

## E2E
- `profile-menu.spec.ts` - Fluxo completo de login → menu → logout
- Cenários: com avatar, sem avatar, logout, dados de tenant

# Rollback e Monitoramento

## Plano de Rollback
1. Reverter deployment do frontend para versão anterior
2. Manter compatibilidade com APIs antigas durante transição
3. Rollback automático se health checks falharem por 5min

## Métricas Observadas
- `menu_load_time` - Tempo de carregamento do menu (<100ms)
- `avatar_load_success_rate` - Taxa de sucesso no carregamento de avatares
- `logout_success_rate` - Taxa de sucesso no logout (meta: 100%)
- `tenant_switch_detection` - Detecção de mudanças de tenant

## Alertas
- 🔴 `menu_error_rate > 5%` - Erros no carregamento do menu
- 🟡 `avatar_load_time > 500ms` - Latência alta no carregamento
- 🔴 `logout_failure` - Qualquer falha no processo de logout
- 🟡 `tenant_data_unavailable` - Dados de tenant indisponíveis (CE002)