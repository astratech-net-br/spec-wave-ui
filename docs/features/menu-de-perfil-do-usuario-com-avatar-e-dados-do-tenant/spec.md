# Visão Geral
- **Objetivo**: Implementar um menu de perfil no cabeçalho da aplicação que exiba informações do usuário logado e do tenant ativo, proporcionando acesso rápido à identidade da sessão e opção de logout.
- **Personas**: Usuário autenticado em contexto multi-tenant.
- **Critérios de Sucesso**: 
  - Menu de perfil visível e funcional após login
  - Exibição correta do avatar ou iniciais do usuário
  - Apresentação precisa dos dados do tenant ativo
  - Funcionamento consistente do logout

# Regras de Negócio
- RN001: O menu de perfil só deve ser exibido para usuários autenticados
- RN002: Quando o usuário possuir foto de perfil cadastrada, esta deve ser exibida como avatar
- RN003: Na ausência de foto, devem ser exibidas as iniciais do nome do usuário (primeira letra do primeiro nome + primeira letra do último nome)
- RN004: O dropdown deve conter obrigatoriamente: nome do usuário, tenant-id, tenant-name e opção de logout
- RN005: O tenant exibido deve ser sempre o tenant ativo na sessão atual
- RN006: Ao clicar em logout, a sessão deve ser encerrada e o usuário redirecionado para a tela de login

# Fluxos
## Fluxo Principal (Happy Path)
1. Usuário faz login com sucesso
2. Sistema carrega dados do usuário e tenant ativo
3. Menu de perfil é renderizado no cabeçalho com avatar do usuário
4. Usuário clica no avatar/iniciais
5. Dropdown abre exibindo: nome do usuário, tenant-id, tenant-name e opção logout
6. Usuário clica em "Logout"
7. Sessão é encerrada
8. Usuário é redirecionado para tela de login

## Fluxos Alternativos
- **FA001 - Usuário sem foto**: 
  1. Sistema detecta ausência de foto no perfil
  2. Exibe iniciais do nome em formato de avatar padrão
  3. Restante do fluxo igual ao principal

- **FA002 - Fechamento do dropdown**:
  1. Usuário clica fora do dropdown ou no avatar novamente
  2. Dropdown é fechado sem executar ações

## Cenários de Erro
- **CE001 - Dados do usuário indisponíveis**:
  1. Sistema não consegue carregar dados do usuário
  2. Exibe placeholder genérico e desabilita funcionalidades do menu

- **CE002 - Dados do tenant indisponíveis**:
  1. Sistema não consegue carregar dados do tenant ativo
  2. Exibe mensagem "Tenant não identificado" no dropdown

# Critérios de Aceite
```gherkin
Cenário: Exibição do menu de perfil para usuário autenticado com foto
  Dado que o usuário está autenticado no sistema
  E possui foto de perfil cadastrada
  Quando a página é carregada
  Então o avatar do usuário deve ser exibido no cabeçalho

Cenário: Exibição de iniciais quando usuário não tem foto
  Dado que o usuário está autenticado no sistema
  E não possui foto de perfil cadastrada
  Quando a página é carregada
  Então as iniciais do nome do usuário devem ser exibidas no cabeçalho

Cenário: Abertura do dropdown com informações do usuário e tenant
  Dado que o usuário está autenticado no sistema
  Quando clica no avatar/iniciais no cabeçalho
  Então o dropdown deve abrir exibindo:
    | Campo        | Valor esperado          |
    | Nome         | Nome completo do usuário |
    | tenant-id    | ID do tenant ativo      |
    | tenant-name  | Nome do tenant ativo    |
    | Logout       | Opção de logout         |

Cenário: Logout bem-sucedido
  Dado que o dropdown do perfil está aberto
  Quando o usuário clica na opção "Logout"
  Então a sessão deve ser encerrada
  E o usuário deve ser redirecionado para a tela de login

Cenário: Consistência em contexto multi-tenant
  Dado que o usuário está autenticado em um tenant específico
  Quando acessa o dropdown do perfil
  Então os dados exibidos devem corresponder ao tenant ativo da sessão
```

# Dependências
## Internas
- Sistema de autenticação e sessão de usuário
- API de perfil do usuário (para obter dados e foto)
- API de tenants (para obter dados do tenant ativo)
- Componente de cabeçalho da aplicação

## Externas
- [TODO: requer esclarecimento do PO] Serviço de armazenamento de imagens/avatars

# Requisitos Não-Funcionais
## Performance
- O menu deve carregar em menos de 100ms após o login
- O dropdown deve abrir/fechar com animação suave (máximo 300ms)
- As imagens de avatar devem ser otimizadas e carregadas de forma assíncrona

## Segurança
- Dados sensíveis não devem ser expostos no frontend (apenas informações básicas de perfil)
- O logout deve invalidar completamente o token de autenticação
- [TODO: requer esclarecimento do PO] Política de cache para avatares

## Usabilidade
- O avatar/iniciais devem ser claramente identificáveis como elemento clicável
- O dropdown deve ser fechado automaticamente ao clicar fora da área
- Deve ser responsivo e funcionar em dispositivos móveis
- Contraste adequado para garantia de acessibilidade