// Chave OpenRouter própria por tenant (fase 3): cifrada com KMS (encryption
// context = tenantId, amarrando o ciphertext ao dono) e gravada no item TENANT#.
// O refino resolve a chave do tenant primeiro; sem ela, usa a da plataforma.

import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import { config } from '../config.ts';
import { getTenant, updateTenantFields } from '../db/dynamo.ts';
import { NotConfiguredError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

const kms = new KMSClient({});

export async function setTenantOpenrouterKey(tenantId: string, key: string): Promise<void> {
  if (key === '') {
    await updateTenantFields(tenantId, { openrouterKeyCiphertext: '' }); // REMOVE
    return;
  }
  if (!config.tenantKmsKeyId) {
    throw new NotConfiguredError('KMS de segredos por tenant não configurado no servidor.');
  }
  const out = await kms.send(
    new EncryptCommand({
      KeyId: config.tenantKmsKeyId,
      Plaintext: Buffer.from(key, 'utf8'),
      EncryptionContext: { tenantId },
    }),
  );
  await updateTenantFields(tenantId, {
    openrouterKeyCiphertext: Buffer.from(out.CiphertextBlob!).toString('base64'),
  });
}

// Chave do tenant (decifrada) ou null (usa a da plataforma). Falha de decrypt
// não derruba o refino — loga e cai no fallback.
export async function tenantOpenrouterKey(tenantId: string): Promise<string | null> {
  const tenant = await getTenant(tenantId);
  const ciphertext = tenant?.openrouterKeyCiphertext;
  if (!ciphertext) return null;
  try {
    const out = await kms.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertext, 'base64'),
        EncryptionContext: { tenantId },
      }),
    );
    return Buffer.from(out.Plaintext!).toString('utf8');
  } catch (err) {
    logger.warn(`Falha ao decifrar a chave OpenRouter do tenant ${tenantId}: ${(err as Error).message}`);
    return null;
  }
}

export async function hasTenantOpenrouterKey(tenantId: string): Promise<boolean> {
  const tenant = await getTenant(tenantId);
  return Boolean(tenant?.openrouterKeyCiphertext);
}
