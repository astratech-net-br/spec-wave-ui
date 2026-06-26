# Graph Report - .  (2026-06-25)

## Corpus Check
- 129 files · ~61,442 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 571 nodes · 1002 edges · 34 communities (27 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.84)
- Token cost: 159,642 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Work Item & Artifact Controllers|Work Item & Artifact Controllers]]
- [[_COMMUNITY_Dashboard & Epic UI|Dashboard & Epic UI]]
- [[_COMMUNITY_Artifact Panel & UI Primitives|Artifact Panel & UI Primitives]]
- [[_COMMUNITY_GitHub→View Adapter|GitHub→View Adapter]]
- [[_COMMUNITY_Repository Service & CLI|Repository Service & CLI]]
- [[_COMMUNITY_RFC Spec-Driven Kanban|RFC: Spec-Driven Kanban]]
- [[_COMMUNITY_Spec Kit Constitution & Agent Context|Spec Kit Constitution & Agent Context]]
- [[_COMMUNITY_Server Dependencies|Server Dependencies]]
- [[_COMMUNITY_Client Dependencies|Client Dependencies]]
- [[_COMMUNITY_Item Cards & Panels|Item Cards & Panels]]
- [[_COMMUNITY_Shared Types Contract|Shared Types Contract]]
- [[_COMMUNITY_Client TS Config|Client TS Config]]
- [[_COMMUNITY_Monorepo Root Config|Monorepo Root Config]]
- [[_COMMUNITY_Spec Kit Shell Helpers|Spec Kit Shell Helpers]]
- [[_COMMUNITY_Server TS Config|Server TS Config]]
- [[_COMMUNITY_Shared TS Config|Shared TS Config]]
- [[_COMMUNITY_Shared Package Config|Shared Package Config]]
- [[_COMMUNITY_E2E TS Config|E2E TS Config]]
- [[_COMMUNITY_Feature Branch Scaffolding|Feature Branch Scaffolding]]
- [[_COMMUNITY_Repositories Seed|Repositories Seed]]
- [[_COMMUNITY_Prerequisites Check Script|Prerequisites Check Script]]
- [[_COMMUNITY_Plan Setup Script|Plan Setup Script]]
- [[_COMMUNITY_Tasks Setup Script|Tasks Setup Script]]
- [[_COMMUNITY_Agent Context (Bash)|Agent Context (Bash)]]
- [[_COMMUNITY_Default Route|Default Route]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `loadWorkItem()` - 16 edges
3. `compilerOptions` - 15 edges
4. `adaptFeature()` - 14 edges
5. `Spec Flow Constitution` - 14 edges
6. `adaptStory()` - 12 edges
7. `getRepositoryOr404()` - 12 edges
8. `configForRepository()` - 12 edges
9. `createFeatureForRepository()` - 12 edges
10. `compilerOptions` - 12 edges

## Surprising Connections (you probably didn't know these)
- `speckit-analyze skill` --semantically_similar_to--> `Tela Dashboard spec.md`  [INFERRED] [semantically similar]
  spec-wave-ui/.claude/skills/speckit-analyze/SKILL.md → docs/features/tela-dashboard/spec.md
- `Plan Template (plan.md issue template)` --conceptually_related_to--> `Spec-Driven Development`  [INFERRED]
  .github/ISSUE_TEMPLATE/plan-template.md → rfc/rfc-integrate-spec-kit-into-kanban.md
- `Spec Template (spec.md issue template)` --conceptually_related_to--> `Spec-Driven Development`  [INFERRED]
  .github/ISSUE_TEMPLATE/spec-template.md → rfc/rfc-integrate-spec-kit-into-kanban.md
- `speckit-agent-context-update skill` --conceptually_related_to--> `Spec-Driven Development`  [INFERRED]
  spec-wave-ui/.claude/skills/speckit-agent-context-update/SKILL.md → rfc/rfc-integrate-spec-kit-into-kanban.md
- `speckit-checklist skill` --conceptually_related_to--> `Spec-Driven Development`  [INFERRED]
  spec-wave-ui/.claude/skills/speckit-checklist/SKILL.md → rfc/rfc-integrate-spec-kit-into-kanban.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Spec-Wave AI Generation Pipeline** — workflows_generate_spec, workflows_generate_plan, workflows_decompose, workflows_validate, spec_wave_cli [EXTRACTED 0.90]
- **Backend GitHub Proxy Data Flow** — service_github_graphql_api, service_github_contents_api, service_spec_flow_api, concept_workitemview, concept_fullstack_proxy [INFERRED 0.85]
- **Epic-Feature-Story-Task Decomposition** — concept_work_item_hierarchy, concept_automatic_decomposition, spec_wave_implement_3, workflows_decompose [INFERRED 0.80]
- **SDD Command Pipeline (specify→plan→tasks→implement)** — speckit_specify_skill, speckit_plan_skill, speckit_tasks_skill, speckit_implement_skill, workflow_speckit_workflow [EXTRACTED 1.00]
- **Spec Flow Constitution Principles** — constitution_spec_driven_development, constitution_complete_traceability, constitution_pull_based_flow, constitution_ai_acceleration_human_accountability, constitution_staged_quality_gates [EXTRACTED 1.00]
- **agent-context Extension Components** — agent_context_extension, commands_speckit_agent_context_update, agent_context_config_agent_context_config, managed_context_section [EXTRACTED 1.00]

## Communities (34 total, 7 thin omitted)

### Community 0 - "Work Item & Artifact Controllers"
Cohesion: 0.06
Nodes (65): createFeatureArtifact(), handleError(), KINDS, parseParams(), refineFeatureArtifact(), saveFeatureArtifact(), AREAS, createRepositoryFeature() (+57 more)

### Community 1 - "Dashboard & Epic UI"
Cohesion: 0.06
Nodes (36): DashboardPage(), EpicCard(), EpicCardProps, RepoEpicsScreen(), RepoEpicsScreenProps, RepositoryCard(), RepositoryCardProps, Load (+28 more)

### Community 2 - "Artifact Panel & UI Primitives"
Cohesion: 0.08
Nodes (35): ArtifactPanel(), ArtifactPanelProps, LABEL, Phase, Avatar(), AvatarProps, Description(), DescriptionProps (+27 more)

### Community 3 - "GitHub→View Adapter"
Cohesion: 0.10
Nodes (40): adaptEpic(), adaptFeature(), adaptStory(), AREA_NAMES, areaOf(), codeOf(), countTasks(), crumbFor() (+32 more)

### Community 4 - "Repository Service & CLI"
Cohesion: 0.11
Nodes (32): getAllRepositories(), getRepositoryById(), getRepositoryEpics(), patchRepository(), postRepository(), db, __dirname, knexConfig (+24 more)

### Community 5 - "RFC: Spec-Driven Kanban"
Cohesion: 0.09
Nodes (33): Spec-Flow Views client README, Automatic Decomposition, Design Tokens (accent terracota), Backend-as-GitHub-proxy architecture, GITHUB_TOKEN backend-only secret, Pull System (fluxo puxado), Spec-Driven Development, Epic-Feature-Story-Task Hierarchy (+25 more)

### Community 6 - "Spec Kit Constitution & Agent Context"
Cohesion: 0.12
Nodes (31): agent-context Config, agent-context Extension Manifest, Agent Context Extension README, Checklist Template, speckit.agent-context.update Command, Principle: AI Acceleration, Human Accountability, Principle: Complete Traceability, Principle: Pull-Based Flow (+23 more)

### Community 7 - "Server Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, better-sqlite3, cors, express, express-rate-limit, helmet, knex, @spec-flow/shared (+20 more)

### Community 8 - "Client Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, react-markdown, remark-gfm, @spec-flow/shared, description, devDependencies (+14 more)

### Community 9 - "Item Cards & Panels"
Cohesion: 0.11
Nodes (16): ItemCard(), ItemCardProps, ItemsPanel(), ItemsPanelProps, AREAS, NewFeatureForm(), NewFeatureFormProps, PRIORITIES (+8 more)

### Community 10 - "Shared Types Contract"
Cohesion: 0.19
Nodes (19): ArtifactKind, ArtifactRefineRequest, ArtifactRefineResponse, ArtifactSaveRequest, ChildItem, CreateFeatureRequest, CreateRepositoryRequest, Crumb (+11 more)

### Community 11 - "Client TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 12 - "Monorepo Root Config"
Cohesion: 0.11
Nodes (17): description, devDependencies, concurrently, @playwright/test, name, private, scripts, build (+9 more)

### Community 13 - "Spec Kit Shell Helpers"
Cohesion: 0.13
Nodes (5): get_feature_paths(), get_repo_root(), _persist_feature_json(), resolve_specify_init_dir(), common.sh script

### Community 14 - "Server TS Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+8 more)

### Community 15 - "Shared TS Config"
Cohesion: 0.14
Nodes (13): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, noEmit, noUnusedLocals (+5 more)

### Community 16 - "Shared Package Config"
Cohesion: 0.15
Nodes (12): description, devDependencies, typescript, exports, main, name, private, scripts (+4 more)

### Community 17 - "E2E TS Config"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, noEmit, skipLibCheck, strict, target, types (+1 more)

## Knowledge Gaps
- **182 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `adaptEpic()` connect `GitHub→View Adapter` to `Work Item & Artifact Controllers`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `logger` connect `Repository Service & CLI` to `Work Item & Artifact Controllers`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _186 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Work Item & Artifact Controllers` be split into smaller, more focused modules?**
  _Cohesion score 0.0636030636030636 - nodes in this community are weakly interconnected._
- **Should `Dashboard & Epic UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06359189378057302 - nodes in this community are weakly interconnected._
- **Should `Artifact Panel & UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.07764705882352942 - nodes in this community are weakly interconnected._
- **Should `GitHub→View Adapter` be split into smaller, more focused modules?**
  _Cohesion score 0.10101010101010101 - nodes in this community are weakly interconnected._