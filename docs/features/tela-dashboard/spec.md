# Visão Geral
**Objetivo:** Implementar uma Dashboard responsiva para exibição de repositórios conectados com persistência em SQLite, incluindo estados de carregamento, lista vazia e tratamento de erros, além de filtragem client-side.

**Personas:**
1. Desenvolvedor: Utiliza a dashboard para gerenciar repositórios conectados
2. Administrador: Monitora integrações e dados armazenados

**Critérios de Sucesso:**
- Usuário visualiza lista de repositórios em até 2 segundos
- Filtragem client-side responde em menos de 100ms
- Estados de UI claros em todas as condições
- Zero vulnerabilidades de segurança comprovadas

# Regras de Negócio
1. Rota `/` redireciona para `/dashboard`
2. Estrutura SQLite:
   - ID (INTEGER PRIMARY KEY AUTOINCREMENT)
   - Nome (TEXT NOT NULL)
   - URL (TEXT NOT NULL UNIQUE)
   - createdAt (DATETIME DEFAULT CURRENT_TIMESTAMP)
3. Listagem máxima: 50 itens por página (paginação futura)
4. Ordenação padrão: createdAt DESC
5. Filtragem client-side por nome (case-insensitive)
6. Estados de UI obrigatórios:
   - Carregamento (skeletons)
   - Lista vazia (com CTA)
   - Erro (com retry)
7. Validação de URL no backend (regex: `^(http|https)://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
8. Dados sensíveis via variáveis ambiente

# Fluxos
**Fluxo Principal: Carregamento do Dashboard**
1. Acesso à rota raiz (`/`)
2. Redirecionamento para `/dashboard`
3. Requisição GET `/api/repositories`
4. Backend consulta SQLite e retorna repositórios
5. Renderização de grid responsivo com shadcn components
6. Exibição de cards com nome, URL clicável e data formatada

**Fluxo Alternativo: Filtragem de Repositórios**
1. Digitação no campo de busca
2. Filtragem client-side por substring no nome
3. Atualização imediata da lista (<100ms)

**Fluxo de Erro: Falha na Requisição**
1. Detecção de erro na chamada API
2. Exibição de componente de erro do shadcn
3. Botão "Tentar novamente" refaz a requisição

# Critérios de Aceite
```gherkin
Funcionalidade: Dashboard de Repositórios

Cenário: Acesso à página inicial
  Dado que o usuário acessa a rota "/"
  Quando ocorre o redirecionamento
  Então deve carregar a rota "/dashboard"

Cenário: Exibição de repositórios
  Dado que existem repositórios cadastrados
  Quando a página é carregada
  Então exibe cards com:
    | Elemento        | Detalhes                          |
    | Título          | "Repositórios Conectados"         |
    | Grid            | 1 coluna (mobile), 3 colunas (desktop) |
    | Card            | Nome, URL clicável, data formatada (ex: "12/05/2024 14:30") |
    | Botão           | "Conectar novo repositório" visível |

Cenário: Filtragem client-side
  Dado que existem 10 repositórios
  Quando o usuário digita "api" no campo de busca
  Então exibe apenas repositórios contendo "api" no nome

Cenário: Estado de carregamento
  Dado que a requisição está em andamento
  Quando a página é carregada
  Então exibe 5 skeletons de cards

Cenário: Lista vazia
  Dado que não existem repositórios
  Quando a página é carregada
  Então exibe:
    | Componente       | Conteúdo                          |
    | Ilustração       | SVG relevante                     |
    | Mensagem         | "Nenhum repositório encontrado"   |
    | Botão            | "Adicionar repositório"           |

Cenário: Erro na requisição
  Dado que a API retorna erro 500
  Quando a página tenta carregar dados
  Então exibe:
    | Componente       | Conteúdo                          |
    | Mensagem         | "Falha ao carregar dados"         |
    | Botão            | "Tentar novamente"                |

Cenário: Formato da resposta API
  Dado que o endpoint /api/repositories é chamado
  Quando a requisição é bem-sucedida
  Então retorna 200 com schema JSON:
    """
    [{
      "id": 1,
      "name": "Meu Repositório",
      "url": "https://github.com/user/repo",
      "createdAt": "2024-05-12T14:30:00.000Z"
    }]
    """
```

# Dependências
**Internas:**
- Frontend:
  - React Router v6 (roteamento)
  - TanStack Query v4 (data fetching)
  - shadcn/ui (componentes)
  - date-fns (formatação de datas)
  - Tailwind CSS (estilização)
- Backend:
  - Express.js (servidor web)
  - Knex.js (query builder)
  - SQLite3 (driver de banco)
  - Winston (logging)

**Externas:**
- Banco de Dados:
  - Arquivo `database.db` com permissões RW
  - Backup automático diário (cron job)
- Infra:
  - Node.js v18+
  - Variáveis ambiente para:
    - Caminho do arquivo DB
    - Chaves de criptografia

# Requisitos Não-Funcionais
**Performance:**
- Carregamento inicial < 2s (página + dados)
- Filtragem client-side < 100ms (10k itens)
- TTFB < 500ms (endpoint /api/repositories)

**Segurança:**
- Sanitização de output (prevenção XSS)
- Queries parametrizadas (prevenção SQLi)
- Validação estrita de schema de entrada
- CORS restrito a origens autorizadas

**Usabilidade:**
- Responsividade: Mobile (320px) a Desktop (1920px)
- Índice de contraste AA+ (WCAG 2.1)
- Navegação por teclado (tabindex ordenado)
- Feedback visual imediato em interações
- Mensagens de erro claras e acionáveis