// Cliente LLM via OpenRouter (fetch nativo) — usado no ciclo interativo de refino
// de spec.md/plan.md disparado pela UI. O servidor envia o artefato atual + o
// prompt do usuário e devolve o markdown gerado (o usuário decide salvar/descartar).
//
// A chave vive SÓ no servidor (config.openrouter.apiKey). Sem chave → 503
// (NotConfiguredError). Falha do upstream → 502 (UpstreamError).

import { config } from '../config.ts';
import { resolveSecret } from '../lib/secrets.ts';
import { NotConfiguredError, UpstreamError } from '../lib/errors.ts';
import { stripWrappingCodeFence } from '../lib/markdown.ts';
import type { ArtifactKind } from '@spec-flow/shared';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Estrutura de seções esperada por cada artefato (espelha os templates em
// .github/ISSUE_TEMPLATE/{spec,plan}-template.md), para a LLM manter o formato
// que o restante do fluxo spec-wave consome.
const SECTIONS: Record<ArtifactKind, string> = {
  spec: [
    '# Visão Geral (Objetivo, Personas, Critérios de Sucesso)',
    '# Regras de Negócio',
    '# Fluxos (Principal, Alternativos, Cenários de Erro)',
    '# Critérios de Aceite (formato Gherkin)',
    '# Dependências (Internas, Externas)',
    '# Requisitos Não-Funcionais (Performance, Segurança, Usabilidade)',
  ].join('\n'),
  plan: [
    '# Estratégia Técnica (Abordagem, Decisões-Chave, Matriz de Rastreabilidade)',
    '# Detalhamento da Implementação (Backend, Banco de Dados, Frontend, Infraestrutura)',
    '# Segurança e Conformidade',
    '# Estratégia de Testes (Unitários, Integração, E2E)',
    '# Rollback e Monitoramento',
  ].join('\n'),
};

function systemPrompt(kind: ArtifactKind): string {
  const what = kind === 'spec' ? 'a especificação funcional (spec.md)' : 'o plano técnico (plan.md)';
  return [
    `Você é um engenheiro de software sênior que escreve ${what} de uma Feature, em português,`,
    'seguindo o workflow spec-driven (RFC-001). Responda APENAS com o markdown final do documento,',
    'sem cercas de código ao redor do documento inteiro, sem preâmbulo e sem comentários.',
    'Mantenha exatamente esta estrutura de seções (use o conteúdo existente como base e aplique o',
    'pedido do usuário):',
    '',
    SECTIONS[kind],
  ].join('\n');
}

// Chamada genérica de chat (system + user → texto). Base do refino de artefato
// e dos AI insights/summaries dos workspaces (RFC-003). `maxTokens` menor que o
// padrão encurta a resposta — importante sob o teto de 29 s do API Gateway.
export async function generateText(args: {
  system: string;
  user: string;
  apiKeyOverride?: string | null;
  maxTokens?: number;
}): Promise<string> {
  const apiKey =
    args.apiKeyOverride ||
    (await resolveSecret(config.openrouter.apiKey, config.openrouter.secretArn));
  if (!apiKey) {
    throw new NotConfiguredError('Configure a chave do OpenRouter no servidor.');
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openrouter.model,
        max_tokens: args.maxTokens ?? config.openrouter.maxTokens,
        messages: [
          { role: 'system', content: args.system },
          { role: 'user', content: args.user },
        ],
      }),
    });
  } catch (err) {
    throw new UpstreamError(`Falha ao contatar o OpenRouter: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new UpstreamError(`OpenRouter ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (json.error) {
    throw new UpstreamError(`OpenRouter: ${json.error.message ?? 'erro desconhecido'}`);
  }
  const content = json.choices?.[0]?.message?.content;
  if (!content || content.trim().length === 0) {
    throw new UpstreamError('OpenRouter devolveu uma resposta vazia.');
  }
  // Defesa: alguns modelos ignoram a instrução e embrulham tudo em ```markdown.
  return stripWrappingCodeFence(content.trim()) ?? '';
}

interface GenerateArgs {
  kind: ArtifactKind;
  currentContent: string | null; // conteúdo atual do artefato (null/'' = primeira versão)
  userPrompt: string; // instrução de ajuste do usuário
  spec?: string | null; // só para kind 'plan': a spec atual como contexto
  apiKeyOverride?: string | null; // chave OpenRouter própria do tenant (fase 3)
}

export async function generateArtifact({
  kind,
  currentContent,
  userPrompt,
  spec,
  apiKeyOverride,
}: GenerateArgs): Promise<string> {
  const userParts: string[] = [];
  if (kind === 'plan' && spec && spec.trim().length > 0) {
    userParts.push('## Especificação funcional (spec.md) de contexto\n', spec, '\n---\n');
  }
  userParts.push(
    currentContent && currentContent.trim().length > 0
      ? `## Documento atual\n\n${currentContent}\n\n---\n`
      : '## Documento atual\n\n(ainda não existe — gere a primeira versão)\n\n---\n',
  );
  userParts.push(`## Pedido de ajuste\n\n${userPrompt}`);

  return generateText({
    system: systemPrompt(kind),
    user: userParts.join('\n'),
    apiKeyOverride,
  });
}
