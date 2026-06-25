// Repo-awareness: resolve a identidade do repositório (owner/repo) a partir da
// linha do SQLite (parseando a url) e monta a GitHubConfig usando o token do env.
// O token vive só no servidor; nunca é exposto ao cliente.

import type { Repository } from '@spec-flow/shared';
import { db } from '../db/index.ts';
import { config } from '../config.ts';
import {
  fetchProjectFields,
  parseProjectUrl,
  type GitHubConfig,
  type ProjectConfig,
} from '../github/client.ts';
import { isValidHttpUrl } from '../lib/validation.ts';
import { HttpError, NotConfiguredError, NotFoundError } from '../lib/errors.ts';

export interface RepositoryRow {
  id: number;
  name: string;
  url: string;
  created_at: string;
  // Config do Projects v2 (nullable; ausente = sem mover etapa). Ver migração
  // 20260625000000_add_project_config.
  project_url?: string | null;
  project_id?: string | null;
  project_number?: number | null;
  etapa_field_id?: string | null;
  stage_options?: string | null; // JSON { "<nome da opção>": "<optionId>" }
}

// "https://github.com/owner/name(.git)(/issues/1)" → { owner, repo }. Não-GitHub
// ou não parseável → null.
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!isValidHttpUrl(url)) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return null;
  const [owner, repoRaw] = parsed.pathname.replace(/^\/+/, '').split('/');
  if (!owner || !repoRaw) return null;
  const repo = repoRaw.replace(/\.git$/i, '');
  return repo ? { owner, repo } : null;
}

// SQLite guarda CURRENT_TIMESTAMP como "YYYY-MM-DD HH:MM:SS" em UTC, sem fuso.
function toIso(raw: string): string {
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z';
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? raw : d.toISOString();
}

export function toRepositoryDTO(row: RepositoryRow): Repository {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    createdAt: toIso(row.created_at),
    projectUrl: row.project_url ?? null,
  };
}

// Reconstrói o ProjectConfig a partir das colunas do SQLite. Só retorna config
// quando todos os campos essenciais existem (projeto introspectado no cadastro);
// caso contrário undefined → o fluxo segue sem mover etapa.
function projectConfigFromRow(row: RepositoryRow): ProjectConfig | undefined {
  if (!row.project_id || !row.etapa_field_id || row.project_number == null) return undefined;
  let stageOptions: Record<string, string> = {};
  try {
    stageOptions = row.stage_options ? (JSON.parse(row.stage_options) as Record<string, string>) : {};
  } catch {
    stageOptions = {};
  }
  return {
    projectId: row.project_id,
    projectNumber: row.project_number,
    etapaFieldId: row.etapa_field_id,
    stageOptions,
  };
}

// Introspecta o Projects v2 informado (campo de etapa + opções), validando a URL.
// `owner`/`repo` definem o token/escopo da consulta (qualquer um do owner serve).
async function introspectProject(
  owner: string,
  repo: string,
  projectUrl: string,
): Promise<ProjectConfig> {
  const ref = parseProjectUrl(projectUrl);
  if (!ref) {
    throw new HttpError(
      400,
      `URL de Projects v2 inválida: "${projectUrl}". Use https://github.com/orgs/<org>/projects/<n> ou .../users/<user>/projects/<n>.`,
    );
  }
  const ghConfig: GitHubConfig = { token: config.github.token, owner, repo, issueNumber: 0 };
  return fetchProjectFields(ghConfig, ref);
}

// Colunas de projeto correspondentes a um ProjectConfig (ou tudo null = limpo).
function projectColumns(
  projectUrl: string | null,
  project: ProjectConfig | null,
): Pick<
  RepositoryRow,
  'project_url' | 'project_id' | 'project_number' | 'etapa_field_id' | 'stage_options'
> {
  return {
    project_url: projectUrl,
    project_id: project?.projectId ?? null,
    project_number: project?.projectNumber ?? null,
    etapa_field_id: project?.etapaFieldId ?? null,
    stage_options: project ? JSON.stringify(project.stageOptions) : null,
  };
}

// Cadastra um repositório. Quando `projectUrl` é informado, introspecta o
// Projects v2 (campo de etapa + opções) e persiste os ids — habilitando mover a
// Feature de etapa pela UI. Sem `projectUrl`, cadastra só o repositório.
export async function createRepository(input: {
  url: string;
  projectUrl?: string;
}): Promise<Repository> {
  const url = input.url.trim();
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new HttpError(400, `URL de repositório do GitHub inválida: "${input.url}".`);
  }
  if (!config.github.token) {
    throw new NotConfiguredError('Configure GITHUB_TOKEN no servidor.');
  }

  // Introspecção do Projects v2 (opcional).
  const projectUrl = input.projectUrl?.trim() || undefined;
  const project = projectUrl ? await introspectProject(parsed.owner, parsed.repo, projectUrl) : null;

  // Nome derivado de owner/repo (a tabela exige `name`; url é única).
  const name = `${parsed.owner}/${parsed.repo}`;

  const existing = await db<RepositoryRow>('repositories').where({ url }).first();
  if (existing) {
    throw new HttpError(409, `Repositório já cadastrado: ${url}.`);
  }

  const [row] = await db<RepositoryRow>('repositories')
    .insert({ name, url, ...projectColumns(projectUrl ?? null, project) })
    .returning(['id', 'name', 'url', 'created_at', 'project_url']);

  // better-sqlite3 suporta returning; se vier vazio (defensivo), relê pela url.
  const created = row ?? (await db<RepositoryRow>('repositories').where({ url }).first());
  if (!created) throw new HttpError(500, 'Falha ao cadastrar o repositório.');
  return toRepositoryDTO(created as RepositoryRow);
}

// Edita um repositório. `url` e `projectUrl` são opcionais (omitido = mantém):
//   • url novo → re-deriva o nome e valida unicidade.
//   • projectUrl '' (vazio) → desvincula o Projects v2 (limpa a config).
//   • projectUrl não-vazio e diferente do atual (ou ainda não introspectado) →
//     re-introspecta e persiste os novos ids.
export async function updateRepository(
  id: number,
  input: { url?: string; projectUrl?: string },
): Promise<Repository> {
  const row = await getRepositoryOr404(id);
  if (!config.github.token) {
    throw new NotConfiguredError('Configure GITHUB_TOKEN no servidor.');
  }

  const update: Partial<RepositoryRow> = {};

  // owner/repo efetivos (após eventual troca de url) — usados na introspecção.
  let owner: string;
  let repo: string;
  if (input.url !== undefined) {
    const url = input.url.trim();
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      throw new HttpError(400, `URL de repositório do GitHub inválida: "${input.url}".`);
    }
    if (url !== row.url) {
      const dup = await db<RepositoryRow>('repositories').where({ url }).whereNot({ id }).first();
      if (dup) throw new HttpError(409, `Repositório já cadastrado: ${url}.`);
    }
    update.url = url;
    update.name = `${parsed.owner}/${parsed.repo}`;
    owner = parsed.owner;
    repo = parsed.repo;
  } else {
    const parsed = parseGitHubUrl(row.url);
    owner = parsed?.owner ?? '';
    repo = parsed?.repo ?? '';
  }

  if (input.projectUrl !== undefined) {
    const projectUrl = input.projectUrl.trim();
    if (projectUrl === '') {
      Object.assign(update, projectColumns(null, null)); // desvincula
    } else if (projectUrl !== (row.project_url ?? '') || !row.project_id) {
      const project = await introspectProject(owner, repo, projectUrl);
      Object.assign(update, projectColumns(projectUrl, project));
    }
  }

  if (Object.keys(update).length > 0) {
    await db<RepositoryRow>('repositories').where({ id }).update(update);
  }
  return toRepositoryDTO(await getRepositoryOr404(id));
}

// Busca um repositório pelo id (DTO). Ausente → 404.
export async function getRepository(id: number): Promise<Repository> {
  return toRepositoryDTO(await getRepositoryOr404(id));
}

// Busca o repositório por id; ausente → 404.
export async function getRepositoryOr404(id: number): Promise<RepositoryRow> {
  const row = await db<RepositoryRow>('repositories').where({ id }).first();
  if (!row) throw new NotFoundError(`Repositório #${id} não encontrado.`);
  return row;
}

// Monta a GitHubConfig de um repositório: owner/repo da url, token/team do env.
export function configForRepository(row: RepositoryRow): GitHubConfig {
  const parsed = parseGitHubUrl(row.url);
  if (!parsed) {
    throw new NotFoundError(`Repositório #${row.id} não tem uma URL de GitHub válida: ${row.url}`);
  }
  if (!config.github.token) {
    throw new NotConfiguredError('Configure GITHUB_TOKEN no servidor.');
  }
  return {
    token: config.github.token,
    owner: parsed.owner,
    repo: parsed.repo,
    issueNumber: 0, // sobrescrito por chamada (epic view)
    team: config.github.team || undefined,
    project: projectConfigFromRow(row),
  };
}
