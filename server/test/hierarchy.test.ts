// Matriz de hierarquia de work items (ALLOWED_PARENTS / isAllowedParent).
// Regras decididas na inclusão plena de BUG/SPIKE/RFC:
//   cadeia: initiative → epic → feature → story → task
//   bug   ← feature | story           (folha)
//   spike ← initiative | epic | feature (folha)
//   rfc   ← initiative | epic          (aceita tasks como filhas)
//   task  ← story | rfc                (folha)

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  ALLOWED_PARENTS,
  isAllowedParent,
  WORK_ITEM_TYPES,
  type WorkItemType,
} from '@spec-flow/shared';

test('cadeia canônica é permitida', () => {
  assert.ok(isAllowedParent('initiative', 'epic'));
  assert.ok(isAllowedParent('epic', 'feature'));
  assert.ok(isAllowedParent('feature', 'story'));
  assert.ok(isAllowedParent('story', 'task'));
});

test('bug aceita feature ou story como pai — e nada mais', () => {
  assert.deepEqual(ALLOWED_PARENTS.bug, ['feature', 'story']);
  assert.ok(isAllowedParent('feature', 'bug'));
  assert.ok(isAllowedParent('story', 'bug'));
  assert.ok(!isAllowedParent('initiative', 'bug'));
  assert.ok(!isAllowedParent('epic', 'bug'));
  assert.ok(!isAllowedParent('task', 'bug'));
});

test('spike aceita initiative, epic ou feature como pai — e nada mais', () => {
  assert.deepEqual(ALLOWED_PARENTS.spike, ['initiative', 'epic', 'feature']);
  assert.ok(isAllowedParent('initiative', 'spike'));
  assert.ok(isAllowedParent('epic', 'spike'));
  assert.ok(isAllowedParent('feature', 'spike'));
  assert.ok(!isAllowedParent('story', 'spike'));
});

test('rfc aceita initiative ou epic como pai e tasks como filhas', () => {
  assert.deepEqual(ALLOWED_PARENTS.rfc, ['initiative', 'epic']);
  assert.ok(isAllowedParent('initiative', 'rfc'));
  assert.ok(isAllowedParent('epic', 'rfc'));
  assert.ok(!isAllowedParent('feature', 'rfc'));
  assert.ok(!isAllowedParent('story', 'rfc'));
  // Filhas de RFC: task (e nada mais).
  assert.ok(isAllowedParent('rfc', 'task'));
  for (const child of WORK_ITEM_TYPES.filter((t) => t !== 'task')) {
    assert.ok(!isAllowedParent('rfc', child), `rfc não pode ser pai de ${child}`);
  }
});

test('task aceita story ou rfc como pai — e nada mais', () => {
  assert.deepEqual(ALLOWED_PARENTS.task, ['story', 'rfc']);
  assert.ok(!isAllowedParent('epic', 'task'));
  assert.ok(!isAllowedParent('feature', 'task'));
});

test('folhas (task, bug, spike) não aceitam nenhum filho', () => {
  for (const leaf of ['task', 'bug', 'spike'] as WorkItemType[]) {
    for (const child of WORK_ITEM_TYPES) {
      assert.ok(!isAllowedParent(leaf, child), `${leaf} não pode ser pai de ${child}`);
    }
  }
});

test('initiative é raiz (não aceita pai) e a matriz cobre todos os tipos', () => {
  assert.deepEqual(ALLOWED_PARENTS.initiative, []);
  for (const t of WORK_ITEM_TYPES) {
    assert.ok(Array.isArray(ALLOWED_PARENTS[t]), `matriz sem entrada para ${t}`);
  }
});
