// Rotas REST de repositórios.

import { Router } from 'express';
import { getAllRepositories } from '../controllers/RepositoryController.ts';

export const repositoryRoutes = Router();

// GET /api/repositories → lista todos os repositórios conectados.
repositoryRoutes.get('/repositories', (req, res, next) => {
  getAllRepositories(req, res).catch(next);
});
