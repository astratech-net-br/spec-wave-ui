# Contexto de implementação — Story #3

**Story:** [STORY] Como usuário, quero acessar a página inicial e visualizar meus repositórios em um layout responsivo, para gerenciar meus projetos de forma eficiente

Ao acessar a aplicação, o usuário deve ser redirecionado para /dashboard e ver uma listagem de repositórios em cards responsivos. Cada card deve exibir nome, URL clicável e data de criação formatada. Layout deve adaptar-se entre 1 coluna (mobile) e 3 colunas (desktop).

## Tasks a implementar (4)

### #4 [TASK] Configurar roteamento para redirecionar '/' para '/dashboard'
Implementar redirecionamento automático no React Router ao acessar a raiz da aplicação

_Story pai: https://github.com/moacsjr/spec-flow-ui/issues/3_

### #5 [TASK] Criar componente DashboardPage com título e estrutura de grid
Desenvolver componente principal usando Material-UI/ChakraUI com Grid responsivo (1 col mobile, 3 col desktop) e título 'Repositórios Conectados'

_Story pai: https://github.com/moacsjr/spec-flow-ui/issues/3_

### #6 [TASK] Implementar hook useRepositories com React Query
Criar custom hook para fetch GET /api/repositories, gerenciando estados de loading, error e dados

_Story pai: https://github.com/moacsjr/spec-flow-ui/issues/3_

### #7 [TASK] Criar componente RepositoryCard para exibição individual
Desenvolver card com props: name (texto), url (link), createdAt (formatado com date-fns)

_Story pai: https://github.com/moacsjr/spec-flow-ui/issues/3_

## spec.md (docs/features/tela-dashboard/spec.md)
# Objetivo
Implementar a tela inicial (Dashboard) do sistema, exibindo uma lista de repositórios conectados com persistência local em SQLite. A tela deve ser responsiva, com estados de carregamento, lista vazia e tratamento de erros, além de permitir filtragem client-side dos repositórios.

# Regras de Negócio
1. A rota `/dashboard` é a página inicial do sistema
2. Repositórios devem ser armazenados em banco SQLite com estrutura:
   - ID (auto-incremento)
   - Nome (obrigatório, texto)
   - URL (obrigatório, único, formato válido)
   - Data de criação (automática, formato DATETIME)
3. A listagem deve mostrar até 50 repositórios por página (paginação futura)
4. Ordenação padrão: mais recentes primeiro
5. Filtragem client-side por nome do repositório
6. Estados obrigatórios de UI:
   - Carregamento (skeletons)
   - Lista vazia (com call-to-action)
   - Erro na requisição (com retry)
7. Validação de URL no backend (regex padrão)
8. Dados sensíveis (como chaves DB) devem vir de variáveis ambiente

# Fluxos
**Fluxo Principal: Carregamento do Dashboard**
1. Usuário acessa a aplicação (rota raiz)
2. Sistema redireciona para `/dashboard`
3. Frontend inicia requisição GET `/api/repositories`
4. Backend consulta SQLite e retorna lista de repositórios
5. Frontend renderiza lista em grid responsivo
6. Usuário visualiza repositórios com nome, URL e data de conexão

**Fluxo Alternativo: Filtragem de Repositórios**
1. Usuário digita no campo de busca
2. Frontend filtra lista existente (client-side) por correspondência no nome
3. Sistema atualiza a exibição em tempo real

**Fluxo de Erro: Falha na Requisição**
1. Frontend detecta erro na chamada API
2. Exibe mensagem de erro + botão "Tentar novamente"
3. Ao clicar, refaz a requisição GET

# Critérios de Aceite
- [ ] Acessar rota `/` redireciona para `/dashboard`
- [ ] Título "Repositórios Conectados" visível no topo da página
- [ ] Exibição em grid/cards responsivo (mínimo 1 coluna mobile, 3 desktop)
- [ ] Cada card mostra: nome, URL clicável, data formatada (ex: "12/05/2024 14:30")
- [ ] Campo de busca que filtra repositórios por nome (client-side)
- [ ] Botão "Conectar novo repositório" visível (roteia para rota futura)
- [ ] Durante loading: exibir 5 skeletons de cards
- [ ] Lista vazia: exibir ilustração + "Nenhum repositório encontrado" + botão "Adicionar repositório"
- [ ] Estado de erro: exibir "Falha ao carregar dados" + botão "Tentar novamente"
- [ ] Endpoint `GET /api/repositories` retorna status 200 com schema:
  ```json
  [{
    "id": 1,
    "name": "Meu Repositório",
    "url": "https://github.com/user/repo",
    "createdAt": "2024-05-12T14:30:00.000Z"
  }]
  ```
- [ ] Banco SQLite com tabela `repositories` conforme schema
- [ ] Backup automático diário do arquivo `database.db`
- [ ] Validação de URL no backend (regex padrão HTTP/HTTPS)
- [ ] Queries SQL parametrizadas (prevenção SQLi)
- [ ] Frontend sanitiza exibição de URLs (prevenção XSS)

# Casos de Erro
- **Erro 500 no backend:** 
  - Causa: Falha de conexão com SQLite
  - Ação Frontend: Exibir estado de erro com retry
- **Resposta API vazia:**
  - Causa: Tabela de repositórios vazia
  - Ação Frontend: Exibir estado de lista vazia
- **URL inválida no banco:**
  - Causa: Dados corrompidos ou migração falha
  - Ação Frontend: Exibir "URL inválida" no campo afetado
- **Timeout de requisição:**
  - Causa: Backend não responde em 10s
  - Ação Frontend: Cancelar requisição e exibir erro
- **Violação de UNIQUE constraint:**
  - Causa: URL duplicada (deverá ser tratada na feature de criação)
  - Ação Backend: Logar erro mas não bloquear listagem

# Dependências
- **Frontend:**
  - React Router (roteamento)
  - React Query/SWR (data fetching)
  - Material-UI/ChakraUI (componentes)
  - date-fns (formatação de datas)
- **Backend:**
  - Express.js (servidor)
  - Knex.js/TypeORM (ORM)
  - SQLite3 (driver do banco)
  - Winston (logging)
- **Banco de Dados:**
  - Arquivo `database.db` com permissões de escrita
  - Git LFS para backup (se incluído no repositório)
- **Infra:**
  - Node.js v18+
  - Script de backup diário (cron job)
  - Variáveis ambiente para configuração do DB

## plan.md (docs/features/tela-dashboard/plan.md)
# Frontend
- Criar rota `/dashboard` como página inicial
- Desenvolver componente `DashboardPage` com:
  - Título "Repositórios Conectados"
  - Listagem responsiva em cards/grid
  - Cada item mostra: nome do repositório, URL, data de conexão
- Implementar busca/filtro client-side para repositórios
- Usar React Query ou SWR para data fetching
- Criar hook `useRepositories` para:
  - GET `/api/repositories`
  - Gerenciar estados (loading, error, empty)
- Adicionar botão "Conectar novo repositório" (roteamento para futura feature)
- UI Components:
  - Skeletons durante loading
  - Empty state com call-to-action
  - Tratamento de erros com retry
- Biblioteca de UI: Material-UI ou ChakraUI
- Responsividade: Mobile-first (grid adaptativo)

# Backend
- Criar endpoint REST:
  - `GET /api/repositories` → Retorna todos repositórios
  - `POST /api/repositories` → (Para futura integração)
- Implementar controller `RepositoryController` com:
  - `getAllRepositories()`: Busca todos registros no DB
  - Retorna JSON: `{ id, name, url, createdAt }`
- Configurar SQLite connection pool
- Setup inicial:
  - Migrations para criação da tabela
  - Seed básico para desenvolvimento
- Estrutura de pastas:
  - `src/controllers/RepositoryController.ts`
  - `src/routes/repositoryRoutes.ts`

# Banco de dados
- Schema SQLite:
  ```sql
  CREATE TABLE repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- Indexes:
  - `CREATE INDEX idx_repositories_name ON repositories(name);`
- Configuração:
  - Arquivo DB local: `./data/database.db`
  - Use Knex.js ou TypeORM:
    - Migrations inicial
    - Model `Repository` com validações
- Backup automático diário (scripts/cron)

# Infraestrutura
- Ambiente local:
  - Frontend: Vite (porta 5173)
  - Backend: Node.js (Express, porta 3001)
- SQLite:
  - Armazenamento local (arquivo `database.db`)
  - Backup incluído no repositório (git-lfs)
- Dockerização (opcional para MVP):
  - `docker-compose.yml` com serviços front/back
- Monitoramento:
  - Logging básico com Winston
  - Health check endpoint `/status`

# Segurança
- Frontend:
  - Sanitização de output (react-dom purify)
  - Validação de URLs na exibição
- Backend:
  - Helmet middleware
  - Rate limiting (express-rate-limit)
  - CORS restrito ao domínio do front
- SQLite:
  - Parameterized queries (prevenir SQLi)
  - Validação de input: regex para URLs
- Dados sensíveis:
  - .env no .gitignore
  - Chaves em variáveis ambiente

# Testes
**Frontend:**
- Testes de componente (Jest + React Testing Library):
  - Renderização do Dashboard
  - Estados (loading, empty, error)
  - Interação de filtro
- Testes E2E (Cypress):
  - Fluxo completo de carregamento
  - Mock de API response

**Backend:**
- Testes de integração (Jest/Supertest):
  - `GET /api/repositories` (200, 404, 500)
  - Validação de schema de resposta
- Testes unitários:
  - Repository controller
  - SQLite queries (mocking)

**Banco de dados:**
- Testes de migração
- Testes de consistência:
  - UNIQUE constraint na URL
  - Valores padrão (created_at)

# Estimativa (Story Points)
**5**  
*(Complexidade média: integração front-back-db, múltiplos estados UI, persistência local, mas sem autenticação)*
