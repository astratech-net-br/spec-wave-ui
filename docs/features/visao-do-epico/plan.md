# Estratégia Técnica

## Abordagem Arquitetural
Implementaremos uma solução fullstack que estende a API existente para suportar operações de CRUD em features dentro de épicos. O backend atuará como proxy para as operações no GitHub via GraphQL API, enquanto o frontend fornecerá uma interface intuitiva para gestão visual dos épicos e suas features.

**Decisões-Chave:**
1. Utilizar mutações GraphQL do GitHub para criar/remover issues (features) mantendo a consistência com a estrutura existente
2. Implementar transações lógicas no backend para garantir atomicidade nas operações de remoção em cascata
3. Manter o frontend como consumidor de API JSON, sem lógica de negócio direta com GitHub

## Matriz de Rastreabilidade

| Critério de Aceite | Componente Técnico | Endpoint/Componente |
|-------------------|-------------------|---------------------|
| Adição bem-sucedida de feature | Backend API + Frontend Component | POST /api/epics/{id}/features + EpicFeaturesManager.tsx |
| Remoção de feature com dependências | Backend Service + GitHub API | DELETE /api/features/{id} + GitHubGraphQLService |
| Tentativa de remoção com falha de rede | Error Handling Middleware | ErrorBoundary + ToastService |

# Detalhamento da Implementação

## Backend

**Novos Endpoints:**
- `POST /api/epics/{epicId}/features` - Criar nova feature no épico
  - Body: `{ name: string, description: string }`
  - Validação: nome obrigatório, limite de 20 features por épico
  - Referência: Critério "Adição bem-sucedida de feature"

- `DELETE /api/features/{featureId}` - Remover feature e dependências
  - Query Params: `?confirm=true` (para confirmação explícita)
  - Referência: Critério "Remoção de feature com dependências"

**Serviços:**
- `GitHubFeatureService` (src/lib/githubFeatureService.ts)
  - `createFeature(epicId: number, featureData: FeatureCreateDTO)`
  - `deleteFeatureWithDependencies(featureId: number)`

**DTOs:**
```typescript
interface FeatureCreateDTO {
  name: string;
  description?: string;
}

interface FeatureDeleteResponse {
  deletedFeature: boolean;
  deletedStories: number;
  deletedTasks: number;
}
```

## Banco de Dados

**Estrutura Existente (aproveitamento):**
- Utilizar tabela `repositories` para mapeamento dos repositórios GitHub
- Manter estrutura de issues do GitHub como fonte de verdade (não persistir localmente)

**Constraints Implementadas:**
- Validação de limite de 20 features por épico via contagem de issues do tipo "feature"
- Transação lógica para remoção em cascata via múltiplas mutações GraphQL

## Frontend

**Novos Componentes:**
- `EpicFeaturesManager` (src/components/EpicFeaturesManager.tsx)
  - Listagem de features do épico
  - Botões de adicionar/remover features
  - Referência: Critério "Adição bem-sucedida de feature"

- `FeatureFormModal` (src/components/FeatureFormModal.tsx)
  - Formulário para criação de nova feature
  - Validação em tempo real dos campos obrigatórios

- `DeleteConfirmationModal` (src/components/DeleteConfirmationModal.tsx)
  - Modal de confirmação com contagem de dependências
  - Referência: Fluxo Alternativo 1 - Remoção de Feature

**Serviços Frontend:**
- `featureService` (src/services/featureService.ts)
  - `createFeature(epicId, data)`
  - `deleteFeature(featureId)`
  - Tratamento de erros de rede com retentativa

## Infraestrutura

**Configurações Existentes:**
- Manter estrutura monorepo com workspaces npm
- Build estático do Vite servido pelo Express
- Rate limiting de 120 req/min por IP

**Novas Dependências:**
- Nenhuma nova dependência necessária (aproveitamento do stack existente)

# Segurança e Conformidade

**Autenticação:**
- Todas as operações usam GITHUB_TOKEN do ambiente server (nunca exposto ao frontend)
- Validação de permissões de escrita no repositório via GitHub API

**Validações:**
- Sanitização de inputs para prevenir injection attacks
- Validação de ownership: usuário só pode modificar épicos de repositórios acessíveis

**Logs de Auditoria:**
- Winston logger para registrar todas as operações de criação/remoção
- Logs incluem: timestamp, usuário (via GitHub context), ação realizada

**Conformidade WCAG AA:**
- Labels acessíveis para todos os controles de formulário
- Feedback auditível para operações críticas (remoções)
- Navegação por teclado nos modais de confirmação

# Estratégia de Testes

## Testes Unitários
- `GitHubFeatureService` - Testes de criação e remoção de features
- `FeatureFormModal` - Validação de formulário e estados de UI
- Validação de limites (máximo 20 features por épico)

## Testes de Integração
- API endpoints com mocking do GitHub GraphQL
- Testes de transação na remoção em cascata
- Cenários de erro de rede e timeout

## Testes E2E
- Fluxo completo de adição de feature (Playwright)
- Fluxo de remoção com confirmação
- Cenários de erro e retentativa
- Testes de acessibilidade com axe-core

**Cobertura Alvo:** 85% para serviços críticos, 70% para componentes UI

# Rollback e Monitoramento

## Plano de Rollback
1. **Rollback Imediato:** Reversão do deploy em caso de falhas críticas
2. **Rollback de Dados:** Script de restauração via GitHub API (reabrir issues deletadas)
3. **Procedimento:** 
   - Desativar endpoints problemáticos
   - Executar script de recuperação `recover-features.js`
   - Notificar usuários sobre interrupção temporária

## Métricas Observadas
- `feature_create_success_rate` - Taxa de sucesso na criação
- `feature_delete_cascade_time` - Tempo médio de remoção em cascata
- `epic_view_load_time` - Tempo de carregamento da visão do épico (alvo ≤1.5s)
- `api_error_rate` - Taxa de erro dos endpoints de features

## Alertas
- **Crítico:** Error rate > 5% por mais de 5 minutos
- **Warning:** Tempo de remoção > 800ms consistentemente
- **Info:** Tentativas de exceder limite de 20 features por épico