// Fonte de dados das telas: tenta o GitHub ao vivo (se houver config no env),
// senão fatia o fixture local. Em ambos os casos o resultado passa pelo adapter
// e vira um WorkItemView, conforme o nível (epic/feature/story) e o número da rota.

import type { Level, WorkItemView } from '../types';
import type { GhIssue } from '../github/types';
import { adaptEpic, adaptFeature, adaptStory, codeOf, teamOf, parentFromBody } from '../github/adapter';
import type { AdaptContext, ParentRef } from '../github/adapter';
import {
  configFromEnv,
  fetchEpicPayload,
  fetchFileContent,
  fetchIssueTree,
  type GitHubConfig,
} from '../github/client';
import { slugify } from '../lib/slugify';
import { fixturePayload, fixturePlans } from './fixture';

export interface LoadResult {
  view: WorkItemView;
  source: 'github' | 'fixture';
}

export async function loadWorkItem(level: Level, number: number): Promise<LoadResult> {
  const config = configFromEnv();
  if (config) {
    return { view: await loadLive(config, level, number), source: 'github' };
  }
  return { view: loadFromFixture(level, number), source: 'fixture' };
}

// ------------------------------------------------------------------- live

async function loadLive(config: GitHubConfig, level: Level, number: number): Promise<WorkItemView> {
  if (level === 'epic') {
    return adaptEpic(await fetchEpicPayload({ ...config, issueNumber: number }), { team: config.team });
  }

  const issue = await fetchIssueTree(config, number);
  const ctx: AdaptContext = { team: config.team };

  // Pai (best-effort): o fetch de issue única não traz o pai pela API; tentamos
  // extrair do corpo (spec-flow escreve "_… pai: <url>_"). Sem isso, o breadcrumb
  // do ancestral fica sem link (degradação graciosa).
  const parentNum = parentFromBody(issue.body);
  if (parentNum) {
    const parentLevel: Level = level === 'feature' ? 'epic' : 'feature';
    ctx.parent = { level: parentLevel, number: parentNum, code: `#${parentNum}` };
  }

  if (level === 'feature') {
    const slug = slugify(issue.title);
    ctx.plan = await fetchFileContent(config, `docs/features/${slug}/plan.md`).catch(() => null);
    return adaptFeature(issue, ctx);
  }
  return adaptStory(issue, ctx);
}

// ---------------------------------------------------------------- fixture

const FIXTURE_TEAM = fixturePayload.team || 'Squad';

function epicRef(): ParentRef {
  const epic = fixturePayload.epic;
  return { level: 'epic', number: epic.number, code: codeOf(epic, teamOf(epic, FIXTURE_TEAM)) };
}

function featureRef(feature: GhIssue): ParentRef {
  return { level: 'feature', number: feature.number, code: codeOf(feature, teamOf(feature, FIXTURE_TEAM)) };
}

function loadFromFixture(level: Level, number: number): WorkItemView {
  if (level === 'epic') {
    return adaptEpic(fixturePayload, { team: FIXTURE_TEAM });
  }

  if (level === 'feature') {
    const feature = fixturePayload.features.find((f) => f.number === number);
    if (!feature) throw new Error(`Feature #${number} não encontrada no fixture.`);
    return adaptFeature(feature, {
      team: FIXTURE_TEAM,
      parent: epicRef(),
      plan: fixturePlans[number] ?? null,
    });
  }

  // story: procura em todas as features e captura feature (pai) + epic (avô).
  for (const feature of fixturePayload.features) {
    const story = (feature.subIssues || []).find((s) => s.number === number);
    if (story) {
      return adaptStory(story, {
        team: FIXTURE_TEAM,
        parent: featureRef(feature),
        grandparent: epicRef(),
      });
    }
  }
  throw new Error(`Story #${number} não encontrada no fixture.`);
}
