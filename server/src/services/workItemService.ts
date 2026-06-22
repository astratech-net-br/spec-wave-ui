// Serviço de work item — orquestra a busca no GitHub + adaptação para
// WorkItemView. Sempre live (sem fixture): se o GitHub não estiver configurado,
// lança NotConfiguredError (→ 503). Portado do antigo client/src/data/source.ts.

import type { Level, WorkItemView } from '@spec-flow/shared';
import {
  configFromEnv,
  fetchEpicPayload,
  fetchFileContent,
  fetchIssueTree,
} from '../github/client.ts';
import { adaptEpic, adaptFeature, adaptStory, parentFromBody } from '../github/adapter.ts';
import type { AdaptContext } from '../github/adapter.ts';
import { slugify } from '../lib/slugify.ts';
import { NotConfiguredError } from '../lib/errors.ts';

export async function loadWorkItem(level: Level, number: number): Promise<WorkItemView> {
  const config = configFromEnv();
  if (!config) {
    throw new NotConfiguredError(
      'Configure GITHUB_TOKEN, GITHUB_REPO e GITHUB_EPIC_ISSUE no servidor.',
    );
  }

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
