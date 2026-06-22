import { test, expect } from '@playwright/test';

// Épico usado no teste live. Deve casar com GITHUB_EPIC_ISSUE do servidor.
const EPIC = process.env.E2E_EPIC ?? '2';

test.describe('Work item (GitHub via backend)', () => {
  test('validação de rota: nível inválido → 400', async ({ request }) => {
    const res = await request.get('/api/workitems/bogus/1');
    expect(res.status()).toBe(400);
  });

  test('renderiza Epic e permite drill-down', async ({ page, request }) => {
    // Sem GITHUB_* o backend responde 503 — pula o teste live (não falha em CI).
    const probe = await request.get(`/api/workitems/epic/${EPIC}`);
    test.skip(probe.status() === 503, 'GITHUB_* não configurado no servidor — teste live ignorado');
    expect(probe.status()).toBe(200);

    const respP = page.waitForResponse((r) => r.url().includes(`/api/workitems/epic/${EPIC}`));
    await page.goto(`/#/epic/${EPIC}`);
    const resp = await respP;
    expect(resp.status()).toBe(200);

    // Renderizou a tela (TopBar com breadcrumb) e não caiu no estado de erro.
    await expect(page.locator('.state-msg--error')).toHaveCount(0);
    await expect(page.locator('.breadcrumb__seg').first()).toBeVisible();

    // Drill-down: se houver cards de filho clicáveis, navega para o nível abaixo.
    const childLinks = page.locator('a.feature-card-link');
    if ((await childLinks.count()) > 0) {
      await childLinks.first().click();
      await expect(page).toHaveURL(/#\/(feature|story)\/\d+/);
    }
  });
});
