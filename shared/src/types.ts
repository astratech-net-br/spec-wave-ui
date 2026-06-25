// Modelo de domínio das telas (Epic / Feature / Story View) — contrato de
// EXIBIÇÃO compartilhado entre server (que o produz) e client (que o renderiza).
// A hierarquia do spec-flow (RFC-001) é uniforme — Epic → Feature → Story → Task —
// então as três telas compartilham um único modelo: WorkItemView (o item da tela)
// com uma lista de ChildItem (os filhos exibidos como cards).
//
// Importante: este pacote é livre de DOM/roteamento. Links de drill-down são
// expressos como COORDENADAS de rota (`to: { level, number }`); o frontend é quem
// converte isso em href (lib/router.hrefFor) no render.

export type Status = 'done' | 'prog' | 'todo';

export type Level = 'epic' | 'feature' | 'story';

// Coordenada de navegação para um work item — o client a converte em href.
export interface RouteCoord {
  level: Level;
  number: number;
}

// Repositório conectado, exibido no Dashboard. Schema de GET /api/repositories.
export interface Repository {
  id: number;
  name: string;
  url: string;
  createdAt: string; // ISO 8601
  projectUrl?: string | null; // Projects v2 vinculado (para mover etapas); null = não configurado
}

// Criação de um repositório conectado. POST /api/repositories.
// `projectUrl` é opcional: quando informado, o servidor introspecta o Projects v2
// (campo de etapa + opções) para permitir mover a Feature pela UI.
export interface CreateRepositoryRequest {
  url: string;
  projectUrl?: string;
}

// Edição de um repositório. PATCH /api/repositories/:id. Campos omitidos são
// mantidos; `projectUrl: ''` (vazio) desvincula o Projects v2.
export interface UpdateRepositoryRequest {
  url?: string;
  projectUrl?: string;
}

// Criação de uma Feature sob um Épico. POST /api/repositories/:id/workitems/epic/:number/features.
// O servidor cria a issue [FEATURE] (label + prefixo no título), a vincula como
// sub-issue do épico e — best-effort — a adiciona ao Projects v2 (Etapa = Backlog,
// Work Item Type = Feature, Prioridade/Área). `priority` ∈ P0–P3; `area` ∈ áreas
// do RFC (Frontend, Backend, …). Ambos viram label da issue + campo do board.
export interface CreateFeatureRequest {
  title: string;
  descriptionMdx?: string; // corpo da issue (opcional)
  priority?: string; // 'P0' | 'P1' | 'P2' | 'P3'
  area?: string; // 'Frontend' | 'Backend' | 'Mobile' | 'Infra' | 'DevOps' | 'Data'
}

// Resumo de um épico na lista de épicos de um repositório (issues com label
// [EPIC]). Leve — sem subárvore/progresso. Schema de GET /api/repositories/:id/epics.
export interface EpicSummary {
  number: number;
  title: string;
  code: string; // ex.: "CHK-204"
  state: 'open' | 'closed';
  url: string; // link da issue no GitHub
}

export interface RepositoryEpics {
  repository: Repository;
  epics: EpicSummary[];
}

export interface Person {
  name: string;
  initials: string;
  avatarColor: string; // CSS var, ex.: 'var(--av-blue)'
}

// Filho exibido como card no painel direito. Features e Stories têm progresso
// próprio (barra); Tasks são folhas (leaf) — checkbox/status, sem barra.
export interface ChildItem {
  name: string;
  status: Status;
  pct: number; // 0–100 (progresso próprio)
  doneTasks: number;
  totalTasks: number;
  tags: string[];
  assignee: { initials: string; avatarColor: string };
  leaf?: boolean; // Task: renderiza checkbox/status, sem barra nem contagem
  to?: RouteCoord; // destino de drill-down (folhas não têm)
}

// Campo de metadado do hero. `kind` decide a renderização especial.
export interface MetaField {
  label: string;
  value: string;
  kind?: 'text' | 'priority' | 'person';
  person?: Person; // quando kind === 'person'
}

// Segmento do breadcrumb. Sem `to` = segmento atual (não clicável).
export interface Crumb {
  label: string;
  to?: RouteCoord;
}

// Modelo único renderizado por qualquer uma das três telas.
export interface WorkItemView {
  level: Level;
  code: string; // "CHK-204" / "CHK-210" / "CHK-211"
  title: string;
  status: string; // texto da pill do hero
  owner: Person;
  breadcrumb: Crumb[];
  meta: MetaField[];
  descriptionMdx: string; // Feature (corpo da issue)
  specMdx?: string | null; // só Feature: docs/features/<slug>/spec.md; null = sem aba Spec
  planMdx?: string | null; // só Feature: docs/features/<slug>/plan.md; null = sem aba Plan
  headerPct: number; // % grande do painel de progresso
  progressLabel: string; // "Progresso do épico" / "da feature" / "da story"
  childrenLabel: string; // "Features" | "Stories" | "Tasks"
  children: ChildItem[];
}

// Edição parcial de um work item (issue do GitHub). Campos espelham WorkItemView
// para o client falar um vocabulário só; o server mapeia descriptionMdx → body.
// PATCH /api/repositories/:id/workitems/:level/:number. Ao menos um campo.
export interface WorkItemPatch {
  title?: string; // novo título da issue
  descriptionMdx?: string; // novo corpo da issue (aba Feature)
}

// --- Geração/refino interativo de spec.md / plan.md (só Feature) ---
// O artefato é um arquivo `docs/features/<slug>/{spec,plan}.md` no repositório.
export type ArtifactKind = 'spec' | 'plan';

// POST .../workitems/feature/:number/:artifact/refine — registra o prompt como
// comentário na issue, envia o artefato atual + o prompt à LLM (OpenRouter) e
// devolve o texto gerado SEM salvar (o usuário decide salvar/descartar).
export interface ArtifactRefineRequest {
  prompt: string;
  // Base sobre a qual ajustar. Ausente → o servidor lê o arquivo atual do repo.
  // Presente → permite iterar sobre um rascunho ainda não salvo ("solicitar alteração").
  base?: string;
}
export interface ArtifactRefineResponse {
  content: string; // markdown gerado pela LLM
}

// POST .../workitems/feature/:number/:artifact/save — commita o conteúdo no
// arquivo (branch padrão) e devolve o WorkItemView recarregado.
export interface ArtifactSaveRequest {
  content: string;
}
