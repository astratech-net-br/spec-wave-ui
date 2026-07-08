// Cria a tabela no dynamodb-local para dev/teste manual (idempotente).
// Uso: npm -w server run db:local  (requer docker do dynamodb-local na 8000)

import { CreateTableCommand, DynamoDBClient, ResourceInUseException } from '@aws-sdk/client-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
const table = process.env.TABLE_NAME ?? 'spec-wave';

process.env.AWS_ACCESS_KEY_ID ??= 'local';
process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
process.env.AWS_REGION ??= 'us-east-1';

const client = new DynamoDBClient({ endpoint });
try {
  await client.send(
    new CreateTableCommand({
      TableName: table,
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    }),
  );
  console.log(`Tabela "${table}" criada em ${endpoint}.`);
} catch (err) {
  if (err instanceof ResourceInUseException) {
    console.log(`Tabela "${table}" já existe em ${endpoint} — ok.`);
  } else {
    throw err;
  }
}
