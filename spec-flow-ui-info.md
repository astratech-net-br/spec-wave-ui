# spec-flow-ui

Plataforma de gestão de produto e engenharia assistida por IA, integrada ao GitHub.

---

## O que é

**spec-flow-ui** é uma interface web fullstack que conecta seu fluxo de produto ao GitHub Issues, GitHub Projects e GitHub Actions. Cada demanda nasce como uma issue, passa por geração automática de documentação técnica via IA e é decomposta em trabalho pronto para desenvolvimento — tudo rastreável e auditável no próprio GitHub.

---

## Funcionalidades

### Hierarquia de trabalho
Organiza demandas em quatro níveis nativos do GitHub:

```
Epic
 └── Feature
      └── Story
           └── Task
```

Cada nível é uma issue real no GitHub, com sub-issues vinculadas, campos no Projects v2 (Etapa, Prioridade, Área) e progresso calculado automaticamente a partir das Tasks filhas.

### Visualização de Epic, Feature e Story
- **Epic View**: lista todas as Features com barra de progresso, assignees e tags de área
- **Feature View**: corpo da issue + abas Spec e Plan + lista de Stories
- **Story View**: user story + lista de Tasks com status binário (done/open)

Drill-down em qualquer nível via breadcrumb. Edição de título e descrição inline com commit automático.

### Geração de documentação por IA (spec-wave)
Na aba **Spec** ou **Plan** de uma Feature:

1. Clique em **Create Spec** / **Create Plan** — aplica a label de gatilho
2. O GitHub Action dispara e a IA gera o documento (OpenRouter / Anthropic)
3. O arquivo aparece no painel em segundos (poll automático)
4. Use **Solicitar alteração** para refinar com prompt em linguagem natural

O `plan.md` é gerado com base no `spec.md` e no `tech_context.yml` do repositório (stack, serviços, banco de dados), garantindo que o plano use apenas as tecnologias reais do projeto.

### Aprovação e decomposição
- **Aprovar Plano**: valida `spec.md` e `plan.md` via GitHub Action; move a Feature para Done no board
- **Criar User Storys**: após aprovação, decompõe a Feature em Stories e Tasks automaticamente via IA, já vinculadas como sub-issues e adicionadas ao board

### Board Kanban integrado
Etapas do fluxo gerenciadas no GitHub Projects v2:

```
📥 Backlog → 🎯 Priorizado → 📋 Spec → 📋 Plan → ✅ Ready
→ 📋 Backlog Técnico → 🚧 Desenvolvimento → 👀 Code Review
→ 🧪 QA → 📋 Homologação → 🚀 Deploy → 🎉 Done
```

A UI e as GitHub Actions movem os cards automaticamente conforme o fluxo avança.

### Dashboard de repositórios
Gerencie múltiplos repositórios GitHub em uma única instância. Cada repositório tem sua própria configuração de token, épicos e board.

---

## Benefícios

### Redução de trabalho operacional
Labels de gatilho + GitHub Actions geram spec, plan e stories automaticamente. O time foca em revisão e decisão, não em escrever boilerplate.

### Rastreabilidade total
Todo artefato (spec.md, plan.md) fica no repositório, commitado e versionado. Cada Story e Task é uma issue rastreável com vínculo ao parent.

### Documentação antes do código
Nenhuma Feature entra em desenvolvimento sem `spec.md` e `plan.md` aprovados. O processo garante alinhamento entre produto e engenharia antes da primeira linha de código.

### IA contextualizada
O plano técnico usa o `tech_context.yml` do repositório como base — a IA só propõe o que o projeto realmente tem, evitando sugestões incompatíveis com a stack.

### Pull system
Nenhum trabalho é atribuído diretamente. A equipe puxa Stories e Tasks do backlog técnico conforme capacidade, eliminando gargalos de distribuição.

### Sem lock-in
Toda a informação vive no GitHub (issues, comments, arquivos, board). A UI é uma camada de conveniência — o time pode operar diretamente pelo GitHub se necessário.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite (TypeScript) |
| Backend | Node.js + Express + SQLite |
| Automação | GitHub Actions + `@spec-wave/cli` |
| IA | OpenRouter (multi-modelo) ou Anthropic |
| Gestão | GitHub Issues + Projects v2 |

---

## Fluxo resumido

```
1. Criar Feature (issue [FEATURE] + board)
2. Gerar Spec  → label spec-wave:spec  → Action gera spec.md
3. Gerar Plan  → label spec-wave:plan  → Action gera plan.md (usa spec + tech_context)
4. Aprovar     → label spec-wave:ready → Action valida ambos os documentos
5. Decompor    → label spec-wave:decompose → Action gera Stories e Tasks via IA
6. Desenvolver → equipe implementa Story por Story
```
