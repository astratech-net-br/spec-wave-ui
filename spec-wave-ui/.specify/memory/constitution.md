<!--
SYNC IMPACT REPORT
==================
Version change: (template / unversioned) → 1.0.0
Rationale: Initial ratification. First concrete constitution derived from RFC-001
("Processo de Gestão de Produto, Desenvolvimento e Entrega Assistido por IA", v2.0).

Principles defined (all new):
  1. Spec-Driven Development (NON-NEGOTIABLE)  — from RFC-001 §2.2, §6
  2. Complete Traceability                     — from RFC-001 §2.3, §3
  3. Pull-Based Flow                           — from RFC-001 §2.1
  4. AI Acceleration, Human Accountability     — from RFC-001 §2.4, §7
  5. Staged Quality Gates                      — from RFC-001 §4, §5

Sections defined:
  - Workflow & Tooling Constraints (GitHub-native)  — from RFC-001 §1, §4
  - Development Workflow (Kanban stages & gates)     — from RFC-001 §5, §6
  - Governance

Templates reviewed for consistency:
  ✅ .specify/templates/plan-template.md  — "Constitution Check" gate aligns; principles are
       phrased as testable gates the plan can check against. No edit required.
  ✅ .specify/templates/spec-template.md  — prioritized, independently-testable user stories +
       acceptance scenarios align with Spec-Driven Development & Traceability. No edit required.
  ✅ .specify/templates/tasks-template.md — tasks grouped by user story; tests OPTIONAL. The
       constitution deliberately does NOT mandate TDD, staying consistent. No edit required.
  ✅ .claude/skills/speckit-*/SKILL.md    — generic guidance; no outdated principle references.

Follow-up TODOs: none. Ratification date set to today as this is the original adoption.
-->
# Spec Flow Constitution

This constitution governs how work is specified, decomposed, built, and delivered in this
repository. It operationalizes RFC-001 ("Processo de Gestão de Produto, Desenvolvimento e
Entrega Assistido por IA", v2.0) as a set of non-negotiable engineering principles. RFC-001
remains the narrative source of truth; this document is its enforceable summary.

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

No implementation begins without approved documentation. Every Feature MUST have an approved
`spec.md` (requirements and acceptance criteria) and `plan.md` (technical approach) before it
enters Development. Stories and Tasks MUST trace back to an approved Feature spec.

Rationale: Specifications are the contract that makes AI generation, decomposition, and review
trustworthy. Building without them produces unverifiable work and untraceable scope (RFC-001
§2.2, §6).

### II. Complete Traceability

Every work item MUST occupy a place in the hierarchy `Epic → Feature → Story → Task`. No
orphan work: a Story MUST belong to a Feature, a Task MUST belong to a Story (or be an
explicit `[BUG]` / `[SPIKE]` linked to its parent). Type prefixes (`[EPIC]`, `[FEATURE]`,
`[STORY]`, `[TASK]`, `[BUG]`, `[SPIKE]`, `[RFC]`) MUST be used so lineage is machine-readable.

Rationale: Traceability is what lets progress roll up, lets reviews check acceptance criteria
against their spec, and lets the viewer apps reconstruct the tree from GitHub Issues
(RFC-001 §2.3, §3).

### III. Pull-Based Flow

Work is pulled, not pushed. Items are not assigned directly; each contributor pulls the next
available item from the board. An item MUST satisfy its stage's entry criteria before being
pulled into that stage.

Rationale: A pull system keeps WIP honest, surfaces bottlenecks, and ties movement to
readiness rather than to allocation (RFC-001 §2.1).

### IV. AI Acceleration, Human Accountability

AI MAY generate specs, plans, Stories, Tasks, test cases, release notes, and automated
reviews. AI-generated artifacts are drafts: a human MUST review and approve them before they
gate downstream work (e.g. before a Feature moves to Ready). Final responsibility for
correctness, security, and business fit is always human.

Rationale: AI removes operational toil so the team spends effort on decisions, architecture,
and quality — but accountability cannot be delegated to a generator (RFC-001 §2.4, §7).

### V. Staged Quality Gates

Each Kanban stage has explicit entry/exit criteria that MUST be met to advance; gates MUST NOT
be skipped. In particular: a Feature reaches **Ready** only with approved `spec.md` + `plan.md`
and identified dependencies; **Code Review** MUST verify standards, adequate tests, implemented
acceptance criteria, and security; **QA** MUST verify acceptance criteria functionally; **Done**
requires production updated with no critical incidents. Automated tests are encouraged but their
scope is decided per-feature in the spec, not mandated globally.

Rationale: Gates are where quality is enforced cheaply and early; honoring them is what makes
the flow predictable end-to-end (RFC-001 §4, §5).

## Workflow & Tooling Constraints

The process is GitHub-native and MUST stay so:

- **GitHub Projects** is the single board of record for flow and stage.
- **GitHub Issues** are the unit of work; the hierarchy is expressed via sub-issues and type
  prefixes.
- **GitHub Actions** drive automation (spec/plan generation, decomposition, validation).
- **Generated artifacts** live in the repository under `docs/features/<slug>/` (`spec.md`,
  `plan.md`) so they are versioned alongside code and readable by the viewer apps.

Adding a tool that becomes a second source of truth for work state is a governance change and
MUST be justified under the Governance section.

## Development Workflow

The canonical flow for a Feature is:

```text
Feature → spec.md → plan.md → Ready → automatic decomposition → Stories → Tasks → Development
```

The board stages and their gating intent:

```text
📥 Backlog → 🎯 Priorizado → 🔍 Refinamento → ✅ Ready → 📋 Backlog Técnico →
🚧 Desenvolvimento → 👀 Code Review → 🧪 QA → 📋 Homologação → 🚀 Deploy → 🎉 Done
```

- **Refinamento** produces the approved `spec.md` and `plan.md`.
- **Ready** triggers automatic decomposition into Stories and Tasks.
- **Development** exits on an opened Pull Request; the PR is the unit reviewed at **Code Review**.
- **Homologação** is business validation by Product Owner / stakeholders against the original need.

Pull Requests and reviews MUST verify compliance with these principles. Any deviation MUST be
recorded (e.g. in the plan's Complexity Tracking) with its justification.

## Governance

This constitution supersedes ad-hoc practice. Where this document and a habit conflict, this
document wins; where this document and RFC-001 conflict, the discrepancy MUST be resolved by
amending one of them, not by ignoring either.

- **Amendments** require a documented change (this file), human approval, and a version bump per
  the policy below. Material principle changes SHOULD reference or update RFC-001.
- **Versioning** (semantic):
  - **MAJOR** — backward-incompatible governance changes: removing or redefining a principle.
  - **MINOR** — adding a principle/section or materially expanding guidance.
  - **PATCH** — clarifications, wording, and non-semantic refinements.
- **Compliance** is checked at planning time (the plan template's "Constitution Check" gate) and
  at Code Review. Unjustified violations block advancement.

**Version**: 1.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-06-22
