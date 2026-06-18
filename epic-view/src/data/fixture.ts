// Fixture: um payload cru de GitHub (mesma forma de github/types.ts) descrevendo
// o épico "CHK-204 — Reformulação do fluxo de Checkout". Permite rodar o app sem
// token. O adapter trata estes dados exatamente como trataria a resposta real da
// API — provando o pipeline GitHub → modelo de domínio.

import type { GhEpicPayload, GhIssue } from '../github/types';

type GhUser = { login: string; name: string };

// Helpers para montar sub-issues (Stories/Tasks) de forma concisa.
const task = (
  number: number,
  title: string,
  closed: boolean,
  opts: { tags?: string[]; assignee?: GhUser } = {},
): GhIssue => ({
  number,
  title: `[TASK] ${title}`,
  body: '',
  state: closed ? 'closed' : 'open',
  labels: [{ name: '[TASK]' }, ...(opts.tags || []).map((t) => ({ name: t }))],
  assignees: opts.assignee ? [opts.assignee] : [],
});

interface StoryOpts {
  body?: string;
  priority?: string; // P0–P3
  assignee?: GhUser;
}

const story = (number: number, title: string, tasks: GhIssue[], opts: StoryOpts = {}): GhIssue => ({
  number,
  title: `[STORY] ${title}`,
  body: opts.body || defaultStoryBody(title),
  state: tasks.every((t) => t.state === 'closed') ? 'closed' : 'open',
  labels: [{ name: '[STORY]' }, ...(opts.priority ? [{ name: opts.priority }] : [])],
  assignees: opts.assignee ? [opts.assignee] : [],
  subIssues: tasks,
});

// Corpo padrão de uma Story (formato User Story do RFC) quando não há um explícito.
function defaultStoryBody(title: string): string {
  const obj = title.charAt(0).toLowerCase() + title.slice(1);
  return `Como **usuário da plataforma**
Quero ${obj}
Para concluir minha compra com confiança.

### Critérios de Aceite

- [ ] Comportamento principal implementado e coberto por testes
- [ ] Casos de erro tratados com feedback claro ao usuário
`;
}

const EPIC_BODY = `Reformular ponta a ponta a experiência de **checkout** para reduzir o abandono de carrinho e suportar os novos meios de pagamento (PIX e carteira digital). O foco é diminuir a fricção nas etapas finais da compra, mantendo a conformidade com as regras antifraude.

> **Contexto.** A taxa de abandono no checkout atual está em 38%. A meta desta iniciativa é reduzi-la para abaixo de 25% até o fim do trimestre.

### Objetivos

- Unificar o fluxo em uma única página de revisão e pagamento
- Habilitar **PIX** como meio de pagamento nativo, com QR Code e copia-e-cola
- Persistir o carrinho entre sessões para usuários autenticados
- Instrumentar cada etapa com eventos de telemetria

### Regras de negócio

O cálculo de frete deve ocorrer *antes* da seleção de pagamento. Cupons promocionais são validados no servidor e nunca confiados ao cliente. Pagamentos via PIX expiram em \`30min\` e liberam o estoque reservado ao expirar.

### Critérios de aceite

- [x] Página única de revisão e pagamento publicada
- [x] PIX disponível com QR Code e copia-e-cola
- [ ] Carrinho persistente entre sessões
- [ ] Telemetria completa das 4 etapas do funil

### Notas de implementação

O serviço de pagamentos expõe um endpoint idempotente para evitar cobrança duplicada:

\`\`\`http
POST /api/v2/checkout/pay
Idempotency-Key: <uuid>
\`\`\`
`;

const epic: GhIssue = {
  number: 204,
  title: '[EPIC] Reformulação do fluxo de Checkout',
  body: EPIC_BODY,
  state: 'open',
  url: 'https://github.com/acme/loja/issues/204',
  createdAt: '2026-05-12T09:00:00Z',
  labels: [{ name: '[EPIC]' }, { name: 'P1' }, { name: 'team:Squad Checkout' }],
  assignees: [{ login: 'vcardoso', name: 'Vinícius Cardoso' }],
  milestone: { title: 'Q2 2026', dueOn: '2026-06-30T00:00:00Z' },
};

const AMARTINS = { login: 'amartins', name: 'Ana Martins' };
const RSOUZA = { login: 'rsouza', name: 'Rafael Souza' };
const PDIAS = { login: 'pdias', name: 'Paula Dias' };
const LGOMES = { login: 'lgomes', name: 'Lucas Gomes' };

// Spec (corpo da issue [FEATURE]) — segue o spec-template do spec-flow.
function featureSpec(objetivo: string, regras: string[], criterios: [string, boolean][]): string {
  return `# Objetivo

${objetivo}

# Regras de Negócio

${regras.map((r) => `- ${r}`).join('\n')}

# Critérios de Aceite

${criterios.map(([c, done]) => `- [${done ? 'x' : ' '}] ${c}`).join('\n')}
`;
}

const features: GhIssue[] = [
  {
    number: 210,
    title: '[FEATURE] Página única de revisão e pagamento',
    body: featureSpec(
      'Unificar revisão do carrinho e pagamento em **uma única página**, eliminando passos intermediários e reduzindo a fricção nas etapas finais da compra.',
      [
        'O frete deve ser calculado antes da seleção de pagamento.',
        'Alterações de quantidade recalculam o total sem recarregar a página.',
      ],
      [
        ['Resumo do carrinho editável inline', true],
        ['Seleção de pagamento na mesma página', true],
      ],
    ),
    state: 'closed',
    labels: [{ name: '[FEATURE]' }, { name: 'P1' }, { name: 'Frontend' }, { name: 'v2.0' }],
    assignees: [AMARTINS],
    subIssues: [
      story(211, 'Revisar itens do carrinho', [
        task(212, 'Componente de resumo do carrinho', true, { tags: ['Frontend'], assignee: AMARTINS }),
        task(213, 'Edição inline de quantidade', true, { tags: ['Frontend'], assignee: AMARTINS }),
      ], { priority: 'P1', assignee: AMARTINS }),
      story(214, 'Selecionar pagamento na mesma página', [
        task(215, 'Acordeão de meios de pagamento', true, { tags: ['Frontend'], assignee: AMARTINS }),
        task(216, 'Validação client-side de cartão', true, { tags: ['Frontend'], assignee: AMARTINS }),
      ], { priority: 'P2', assignee: AMARTINS }),
    ],
  },
  {
    number: 220,
    title: '[FEATURE] Pagamento via PIX',
    body: featureSpec(
      'Habilitar **PIX** como meio de pagamento nativo no checkout, com QR Code e copia-e-cola, incluindo conciliação automática e expiração da cobrança.',
      [
        'A cobrança PIX expira em `30min` e libera o estoque reservado ao expirar.',
        'A confirmação do pagamento é feita exclusivamente via webhook do PSP.',
        'O endpoint de pagamento é idempotente (`Idempotency-Key`).',
      ],
      [
        ['Cobrança PIX gerada com QR Code e copia-e-cola', true],
        ['Confirmação automática via webhook', false],
        ['Liberação de estoque ao expirar', false],
      ],
    ),
    state: 'open',
    labels: [{ name: '[FEATURE]' }, { name: 'P1' }, { name: 'Backend' }, { name: 'v2.0' }],
    assignees: [RSOUZA],
    subIssues: [
      story(
        221,
        'Gerar cobrança PIX',
        [
          task(222, 'Integração com PSP', true, { tags: ['Backend'], assignee: RSOUZA }),
          task(223, 'Geração de QR Code', true, { tags: ['Backend'], assignee: RSOUZA }),
          task(224, 'Copia-e-cola', true, { tags: ['Frontend'], assignee: RSOUZA }),
        ],
        {
          priority: 'P1',
          assignee: RSOUZA,
          body: `Como **cliente no checkout**
Quero **pagar com PIX e receber um QR Code**
Para concluir a compra sem precisar de cartão.

### Critérios de Aceite

- [x] Cobrança criada no PSP com valor correto
- [x] QR Code e código copia-e-cola exibidos
- [x] Cobrança expira em \`30min\`
`,
        },
      ),
      story(225, 'Conciliar pagamento', [
        task(226, 'Webhook de confirmação', false, { tags: ['Backend'], assignee: RSOUZA }),
        task(227, 'Liberar estoque ao expirar', false, { tags: ['Backend'], assignee: RSOUZA }),
      ], { priority: 'P1', assignee: RSOUZA }),
    ],
  },
  {
    number: 230,
    title: '[FEATURE] Carrinho persistente',
    body: featureSpec(
      'Persistir o carrinho do usuário autenticado **entre sessões e dispositivos**, evitando perda de itens e reduzindo o abandono.',
      [
        'O carrinho expira após 30 dias de inatividade.',
        'A mesclagem entre dispositivos prioriza o item mais recente.',
      ],
      [
        ['Carrinho persistido por usuário', true],
        ['Sincronização entre dispositivos', false],
      ],
    ),
    state: 'open',
    labels: [{ name: '[FEATURE]' }, { name: 'P2' }, { name: 'Backend' }, { name: 'Data' }],
    assignees: [PDIAS],
    subIssues: [
      story(231, 'Persistir carrinho do usuário', [
        task(232, 'Modelo de dados do carrinho', true, { tags: ['Data'], assignee: PDIAS }),
        task(233, 'Sincronização entre dispositivos', false, { tags: ['Backend'], assignee: PDIAS }),
        task(234, 'Expiração e limpeza', false, { tags: ['Backend'], assignee: PDIAS }),
      ], { priority: 'P2', assignee: PDIAS }),
    ],
  },
  {
    number: 240,
    title: '[FEATURE] Telemetria do funil de checkout',
    body: featureSpec(
      'Instrumentar cada etapa do funil de checkout com eventos de telemetria para medir conversão e identificar pontos de abandono.',
      [
        'Eventos não podem conter dados sensíveis de pagamento.',
        'Cada etapa emite exatamente um evento por sessão.',
      ],
      [
        ['Eventos por etapa do funil', false],
        ['Dashboard de conversão', false],
      ],
    ),
    state: 'open',
    labels: [{ name: '[FEATURE]' }, { name: 'P3' }, { name: 'Frontend' }, { name: 'Data' }],
    assignees: [LGOMES],
    subIssues: [
      story(241, 'Instrumentar etapas do funil', [
        task(242, 'Evento de início de checkout', false, { tags: ['Frontend'], assignee: LGOMES }),
        task(243, 'Eventos por etapa', false, { tags: ['Frontend'], assignee: LGOMES }),
        task(244, 'Dashboard de conversão', false, { tags: ['Data'], assignee: LGOMES }),
      ], { priority: 'P3', assignee: LGOMES }),
    ],
  },
  {
    number: 250,
    title: '[FEATURE] Antifraude no pagamento',
    body: featureSpec(
      'Avaliar o risco de cada transação antes da captura, bloqueando pagamentos suspeitos e encaminhando casos limítrofes para revisão manual.',
      [
        'Transações acima do score de risco são bloqueadas automaticamente.',
        'Toda decisão antifraude é auditável.',
      ],
      [
        ['Score de risco integrado', true],
        ['Fila de revisão manual', false],
        ['Auditoria de decisões', false],
      ],
    ),
    state: 'open',
    labels: [{ name: '[FEATURE]' }, { name: 'P0' }, { name: 'Backend' }, { name: 'Infra' }],
    assignees: [RSOUZA],
    subIssues: [
      story(251, 'Avaliar risco da transação', [
        task(252, 'Integração com provedor de score', true, { tags: ['Backend'], assignee: RSOUZA }),
        task(253, 'Regras de bloqueio', false, { tags: ['Backend'], assignee: RSOUZA }),
        task(254, 'Fila de revisão manual', false, { tags: ['Backend'], assignee: RSOUZA }),
        task(255, 'Auditoria de decisões', false, { tags: ['Infra'], assignee: RSOUZA }),
      ], { priority: 'P0', assignee: RSOUZA }),
    ],
  },
];

export const fixturePayload: GhEpicPayload = {
  epic,
  features,
  team: 'Squad Checkout',
};

// plan.md de exemplo por feature (chave = número da issue). No spec-flow o plano
// vive em `docs/features/<slug>/plan.md`; aqui ele alimenta a aba "Plan" da Feature
// View quando rodando offline (sem token). No modo live, é buscado do repositório.
const PIX_PLAN = `# Frontend

- Tela de pagamento com seletor de método (cartão, PIX)
- Componente de QR Code + botão **copia-e-cola**
- Polling de status da cobrança até confirmação ou expiração

# Backend

- Endpoint \`POST /api/v2/checkout/pay\` idempotente (\`Idempotency-Key\`)
- Integração com o PSP para gerar a cobrança PIX
- Webhook de confirmação e job de expiração (libera estoque após \`30min\`)

# Banco de dados

- Tabela \`pix_charges\` (txid, status, valor, expires_at)
- Índice por \`status\` para a varredura de expiração

# Segurança

- Validar assinatura do webhook do PSP
- Nunca confiar em valor/cupom vindos do cliente

# Testes

- [ ] Cobrança gerada com QR Code válido
- [ ] Confirmação via webhook muda status para \`paid\`
- [ ] Expiração libera o estoque reservado
`;

export const fixturePlans: Record<number, string> = {
  220: PIX_PLAN,
};
