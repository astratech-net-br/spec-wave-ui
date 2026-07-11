// Invoke assíncrono (InvocationType=Event) do worker de refino. Usado pela API
// (ApiFn) para disparar o RefineWorkerFn sem esperar (foge do teto de 29s do API
// Gateway). Em dev/local (sem REFINE_WORKER_FUNCTION_NAME) o serviço roda inline.

import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

const client = new LambdaClient({});

export async function invokeAsync(functionName: string, payload: unknown): Promise<void> {
  await client.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event', // fire-and-forget; a Lambda roda até 15 min
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );
}
