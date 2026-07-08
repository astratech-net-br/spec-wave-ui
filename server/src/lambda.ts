// Entrypoint da Lambda "api": embrulha o app Express com serverless-http.
// O evento original do API Gateway é anexado em req.apiGatewayEvent — é de lá
// que o middleware de auth lê os claims já validados pelo JWT authorizer.

import serverlessHttp from 'serverless-http';
import { createApp } from './index.ts';

export const handler = serverlessHttp(createApp(), {
  request(req: { apiGatewayEvent?: unknown }, event: unknown) {
    req.apiGatewayEvent = event;
  },
});
