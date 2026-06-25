// Serviço do ciclo interativo de spec.md / plan.md (só Feature):
//   create → aplica o label do spec-wave (dispara a Action que gera o arquivo) e
//            move a Feature para a etapa correspondente no Projects v2.
//   refine → registra o prompt como comentário, lê o artefato atual e pede à LLM
//            (OpenRouter) o texto ajustado — SEM salvar.
//   save   → commita o conteúdo em docs/features/<slug>/<artifact>.md (branch padrão).
//
// O artefato é um arquivo do repositório; a geração inicial fica a cargo da
// GitHub Action (decisão de produto). Aqui só orquestramos a transição e o refino.

import type { ArtifactKind, WorkItemView } from '@spec-flow/shared';
import {
  addLabel,
  createComment,
  fetchFileContent,
  fetchIssueTitle,
  fetchProjectItemId,
  moveProjectStage,
  putFileContent,
  type GitHubConfig,
} from '../github/client.ts';
import { generateArtifact } from '../llm/openrouter.ts';
import { logger } from '../lib/logger.ts';
import { configForRepository, getRepositoryOr404 } from './repositoryService.ts';
import { loadWorkItem, resolveFeaturePaths } from './workItemService.ts';

// Nome do label do spec-wave que dispara a Action de geração do artefato.
const LABEL: Record<ArtifactKind, string> = {
  spec: 'spec-wave:spec',
  plan: 'spec-wave:plan',
};

// Título da issue (para o slug de fallback). Best-effort — em falha devolve ''.
async function fetchTitleSafe(config: GitHubConfig, number: number): Promise<string> {
  try {
    return await fetchIssueTitle(config, number);
  } catch {
    return '';
  }
}

// Caminho do arquivo (spec.md / plan.md) resiliente a renomeações do título.
async function pathFor(config: GitHubConfig, number: number, kind: ArtifactKind): Promise<string> {
  const title = await fetchTitleSafe(config, number);
  const { specPath, planPath } = await resolveFeaturePaths(config, number, title);
  return kind === 'spec' ? specPath : planPath;
}

// Move a Feature para a etapa (📋 Spec / 📋 Plan) no Projects v2, se o repositório
// tiver projeto configurado e existir uma opção de etapa que case com o artefato.
// Best-effort: falha aqui não derruba o create (loga e segue).
async function moveStage(config: GitHubConfig, number: number, kind: ArtifactKind): Promise<void> {
  const project = config.project;
  if (!project) return; // repositório sem Projects v2 configurado
  const re = kind === 'spec' ? /spec/i : /plan/i;
  const entry = Object.entries(project.stageOptions).find(([name]) => re.test(name));
  if (!entry) {
    logger.warn(`Projeto ${config.owner}/${config.repo} sem opção de etapa para "${kind}".`);
    return;
  }
  const [, optionId] = entry;
  try {
    const itemId = await fetchProjectItemId(config, number, project.projectId);
    if (!itemId) {
      logger.warn(`Issue #${number} não está no Projects v2 ${project.projectId}.`);
      return;
    }
    await moveProjectStage(config, project.projectId, itemId, project.etapaFieldId, optionId);
  } catch (err) {
    logger.warn(`Falha ao mover etapa da issue #${number}: ${(err as Error).message}`);
  }
}

// create: aplica o label (dispara a Action) e move a etapa. Devolve o
// WorkItemView recarregado (o arquivo ainda não existe; o client faz o poll).
export async function createArtifact(
  id: number,
  number: number,
  kind: ArtifactKind,
): Promise<WorkItemView> {
  const config = configForRepository(await getRepositoryOr404(id));
  await addLabel(config, number, LABEL[kind]);
  await moveStage(config, number, kind);
  return loadWorkItem(config, 'feature', number);
}

// refine: registra o prompt como comentário, lê o artefato atual (e a spec, no
// caso do plan, como contexto) e pede à LLM o texto ajustado. NÃO salva.
export async function refineArtifact(
  id: number,
  number: number,
  kind: ArtifactKind,
  prompt: string,
  base?: string,
): Promise<string> {
  const config = configForRepository(await getRepositoryOr404(id));

  await createComment(config, number, `🛠️ **Refino de ${kind} (via UI)**\n\n${prompt}`);

  const title = await fetchTitleSafe(config, number);
  const { specPath, planPath } = await resolveFeaturePaths(config, number, title);
  const currentPath = kind === 'spec' ? specPath : planPath;

  // `base` (rascunho não salvo) tem precedência; senão lê o arquivo do repo.
  const currentContent =
    base !== undefined ? base : await fetchFileContent(config, currentPath).catch(() => null);
  const spec =
    kind === 'plan' ? await fetchFileContent(config, specPath).catch(() => null) : null;

  return generateArtifact({ kind, currentContent, userPrompt: prompt, spec });
}

// save: commita o conteúdo no arquivo (branch padrão) e devolve o WorkItemView
// recarregado — assim specMdx/planMdx atualizam na hora.
export async function saveArtifact(
  id: number,
  number: number,
  kind: ArtifactKind,
  content: string,
): Promise<WorkItemView> {
  const config = configForRepository(await getRepositoryOr404(id));
  const path = await pathFor(config, number, kind);
  await putFileContent(config, path, content, `docs(${kind}): atualiza ${path} via UI`);
  return loadWorkItem(config, 'feature', number);
}
