// Cliente GitHub GraphQL — busca um Epic e sua hierarquia de sub-issues.
//
// Usa a API de sub-issues do GitHub (feature `sub_issues`, header de preview).
// O épico é uma issue [EPIC]; suas Features são as sub-issues; cada Feature
// traz suas Stories, que trazem suas Tasks — o suficiente para o adapter
// calcular o progresso a partir das Tasks fechadas.

import type { GhEpicPayload, GhIssue } from './types';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  issueNumber: number; // número da issue do Epic
  team?: string;
}

const ENDPOINT = 'https://api.github.com/graphql';

// Campos completos de uma issue — usados no item atual (nível 0) e nos seus
// filhos diretos (nível 1), que são os cards exibidos na tela.
const ISSUE_FIELDS = `
  number
  title
  body
  state
  url
  createdAt
  labels(first: 20) { nodes { name } }
  assignees(first: 5) { nodes { login name } }
  milestone { title dueOn createdAt }
`;

// Campos enxutos para os níveis profundos (2+). Eles nunca são exibidos —
// só alimentam countTasks (adapter), que precisa apenas de `state` e da
// estrutura de sub-issues. Omitir labels/assignees aqui é essencial: o GraphQL
// do GitHub multiplica os limites das conexões aninhadas, e um `labels(first:20)`
// sob 3 níveis de `subIssues(first:50)` estouraria o teto de 500.000 nós
// (50³ × 20 = 2.500.000). Sem essas conexões, o pior caso cai para 50³ = 125.000.
const COUNT_FIELDS = `
  number
  state
`;

// 3 níveis de sub-issues: Feature → Story → Task.
const QUERY = `
query EpicView($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      ${ISSUE_FIELDS}
      subIssues(first: 50) {
        nodes {
          ${ISSUE_FIELDS}
          subIssues(first: 50) {
            nodes {
              ${COUNT_FIELDS}
              subIssues(first: 50) {
                nodes { ${COUNT_FIELDS} }
              }
            }
          }
        }
      }
    }
  }
}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalize(node: any): GhIssue {
  return {
    number: node.number,
    title: node.title,
    body: node.body ?? '',
    state: node.state,
    url: node.url,
    createdAt: node.createdAt,
    labels: (node.labels?.nodes ?? []).map((l: any) => ({ name: l.name })),
    assignees: (node.assignees?.nodes ?? []).map((u: any) => ({ login: u.login, name: u.name })),
    milestone: node.milestone
      ? { title: node.milestone.title, dueOn: node.milestone.dueOn, createdAt: node.milestone.createdAt }
      : null,
    subIssues: (node.subIssues?.nodes ?? []).map(normalize),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Busca uma issue e sua subárvore (3 níveis de sub-issues) já normalizada.
export async function fetchIssueTree(config: GitHubConfig, number: number): Promise<GhIssue> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${config.token}`,
      'Content-Type': 'application/json',
      'GraphQL-Features': 'sub_issues',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { owner: config.owner, repo: config.repo, number },
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GitHub GraphQL: ${json.errors.map((e: { message: string }) => e.message).join('; ')}`);
  }

  const issueNode = json.data?.repository?.issue;
  if (!issueNode) {
    throw new Error(`Issue #${number} não encontrada em ${config.owner}/${config.repo}.`);
  }
  return normalize(issueNode);
}

export async function fetchEpicPayload(config: GitHubConfig): Promise<GhEpicPayload> {
  const epic = await fetchIssueTree(config, config.issueNumber);
  const features = epic.subIssues ?? [];
  return { epic: { ...epic, subIssues: [] }, features, team: config.team };
}

// Lê um arquivo do repositório (Contents API, conteúdo cru). 404 → null.
// Usado para buscar `docs/features/<slug>/plan.md` na Feature View.
export async function fetchFileContent(config: GitHubConfig, path: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `bearer ${config.token}`,
      Accept: 'application/vnd.github.raw+json',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub Contents API ${res.status}: ${await res.text()}`);
  return res.text();
}

// Lê a configuração do GitHub a partir das variáveis de ambiente do Vite.
// Se ausente, retorna null e o app cai no fixture local.
export function configFromEnv(): GitHubConfig | null {
  const env = import.meta.env;
  const token = env.VITE_GITHUB_TOKEN;
  const repo = env.VITE_GITHUB_REPO; // "owner/repo"
  const issue = env.VITE_GITHUB_EPIC_ISSUE;
  if (!token || !repo || !issue) return null;
  const [owner, name] = String(repo).split('/');
  if (!owner || !name) return null;
  return {
    token: String(token),
    owner,
    repo: name,
    issueNumber: parseInt(String(issue), 10),
    team: env.VITE_GITHUB_TEAM ? String(env.VITE_GITHUB_TEAM) : undefined,
  };
}
