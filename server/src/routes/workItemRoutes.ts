// Rotas REST de work items (Epic / Feature / Story).

import { Router } from 'express';
import { getWorkItem } from '../controllers/WorkItemController.ts';

export const workItemRoutes = Router();

// GET /api/workitems/:level/:number → WorkItemView pronto para exibição.
workItemRoutes.get('/workitems/:level/:number', getWorkItem);
