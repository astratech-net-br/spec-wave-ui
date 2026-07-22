// Regressão do normalizeStage contra os NOMES REAIS das colunas do board
// padrão do spec-wave (com emoji). Bug histórico: "🚧 Desenvolvimento" não
// casava com /dev/ ("desenvolvimento" não contém a substring "dev") e a etapa
// Development era inalcançável via app.

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeStage } from '../src/lib/status.ts';

test('todas as colunas padrão do board spec-wave normalizam para o canônico', () => {
  const expected: Record<string, string | null> = {
    '📥 Backlog': 'Backlog',
    '🎯 Priorizado': 'Priorizado',
    '📋 Spec': 'Spec',
    '📋 Plan': 'Plan',
    '✅ Ready': 'Ready',
    '🚧 Desenvolvimento': 'Development',
    '👀 Code Review': 'Code Review',
    '🧪 QA': 'QA',
    '📋 Homologação': 'UAT',
    '🎉 Done': 'Done',
  };
  for (const [raw, canonical] of Object.entries(expected)) {
    assert.equal(normalizeStage(raw), canonical, `"${raw}" deveria normalizar para ${canonical}`);
  }
});

test('variações comuns em inglês/português', () => {
  assert.equal(normalizeStage('Development'), 'Development');
  assert.equal(normalizeStage('In Progress'), 'Development');
  assert.equal(normalizeStage('Em desenvolvimento'), 'Development');
  assert.equal(normalizeStage('Em andamento'), 'Development');
  assert.equal(normalizeStage('Todo'), 'Backlog');
  assert.equal(normalizeStage('Concluído'), 'Done');
});

test('nomes desconhecidos → null', () => {
  assert.equal(normalizeStage('🚀 Deploy'), null); // Deploy não é etapa canônica
  assert.equal(normalizeStage(''), null);
  assert.equal(normalizeStage(null), null);
});
