// Rotas REST de repositórios (e dos work items escopados por repositório).

import { Router } from 'express';
import {
  getAllRepositories,
  getRepositoryById,
  getRepositoryEpics,
  patchRepository,
  postRepository,
} from '../controllers/RepositoryController.ts';
import {
  createRepositoryFeature,
  getRepositoryWorkItem,
  updateRepositoryWorkItem,
} from '../controllers/WorkItemController.ts';
import {
  createFeatureArtifact,
  refineFeatureArtifact,
  saveFeatureArtifact,
} from '../controllers/ArtifactController.ts';

export const repositoryRoutes = Router();

// GET /api/repositories → lista todos os repositórios conectados.
repositoryRoutes.get('/repositories', (req, res, next) => {
  getAllRepositories(req, res).catch(next);
});

// POST /api/repositories → cadastra um repositório (e Projects v2 opcional).
repositoryRoutes.post('/repositories', postRepository);

// GET /api/repositories/:id → um repositório (pré-preenche a edição).
repositoryRoutes.get('/repositories/:id', getRepositoryById);

// PATCH /api/repositories/:id → edita url e/ou vínculo com o Projects v2.
repositoryRoutes.patch('/repositories/:id', patchRepository);

// GET /api/repositories/:id/epics → épicos (issues [EPIC]) do repositório.
repositoryRoutes.get('/repositories/:id/epics', getRepositoryEpics);

// GET /api/repositories/:id/workitems/:level/:number → WorkItemView do repo.
repositoryRoutes.get('/repositories/:id/workitems/:level/:number', getRepositoryWorkItem);

// PATCH /api/repositories/:id/workitems/:level/:number → edita título/corpo da issue.
repositoryRoutes.patch('/repositories/:id/workitems/:level/:number', updateRepositoryWorkItem);

// POST /api/repositories/:id/workitems/epic/:number/features → cria uma Feature
// sob o épico (issue [FEATURE] + vínculo de sub-issue + entrada no Projects v2).
repositoryRoutes.post('/repositories/:id/workitems/epic/:number/features', createRepositoryFeature);

// Ciclo de spec.md / plan.md de uma Feature (:artifact ∈ {spec, plan}):
//   create → label do spec-wave + move etapa (a Action gera o arquivo)
//   refine → registra prompt como comentário + gera texto via LLM (sem salvar)
//   save   → commita o conteúdo no arquivo (branch padrão)
repositoryRoutes.post(
  '/repositories/:id/workitems/feature/:number/:artifact/create',
  createFeatureArtifact,
);
repositoryRoutes.post(
  '/repositories/:id/workitems/feature/:number/:artifact/refine',
  refineFeatureArtifact,
);
repositoryRoutes.post(
  '/repositories/:id/workitems/feature/:number/:artifact/save',
  saveFeatureArtifact,
);
