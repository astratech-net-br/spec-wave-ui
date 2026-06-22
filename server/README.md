# spec-flow-server

Backend do Dashboard (Story #3) — Express + Knex + SQLite (`better-sqlite3`).
Expõe a lista de repositórios conectados consumida pelo frontend `epic-view`.

## Endpoints

| Método | Rota                 | Descrição                                   |
|--------|----------------------|---------------------------------------------|
| GET    | `/api/repositories`  | Lista repositórios (até 50, recentes 1º)    |
| GET    | `/status`            | Health check (`{ status: "ok", uptime }`)   |

Schema de `GET /api/repositories`:

```json
[{ "id": 1, "name": "Meu Repositório", "url": "https://github.com/user/repo", "createdAt": "2024-05-12T14:30:00.000Z" }]
```

## Rodando

```bash
cd server
npm install
cp .env.example .env      # opcional; defaults servem para dev
npm run dev               # migra + faz seed + sobe na porta 3001
```

O frontend (`epic-view`, porta 5173) faz proxy de `/api` para esta porta — veja `epic-view/vite.config.ts`.

## Scripts

- `npm run dev` — sobe com hot-reload (aplica migrações e seed no boot).
- `npm run migrate` — aplica migrações pendentes.
- `npm run seed` — popula dados de exemplo (idempotente).
- `npm run backup` — copia `data/database.db` para `backups/database-<data>.db`.
- `npm run typecheck` — checagem de tipos.

## Backup diário

`npm run backup` gera uma cópia datada. Para automatizar, agende via cron:

```cron
0 3 * * *  cd /caminho/para/server && npm run backup
```

## Segurança

- Queries parametrizadas (Knex) — prevenção de SQL injection.
- `helmet`, CORS restrito à origem do frontend, `express-rate-limit`.
- URLs validadas por regex (`src/lib/validation.ts`); segredos só via env.
