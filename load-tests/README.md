# Load tests (k6)

Testes de carga da API com [k6](https://k6.io).

## Pré-requisitos

- k6 (`brew install k6`)
- API rodando com admin seedado (`ADMIN_*` em `env/.env.dev`)
- Imagem em `fixtures/eye.jpg` (JPEG, ≤5MB) para o fluxo de upload

## Uso

```bash
# 1. Seeda médicos + pacientes
npm run load:seed

# 2. Roda os cenários
npm run load:login       # login em loop
npm run load:exam-flow   # cria exame + upload de imagens
```

Cada run exporta um relatório HTML em `reports/`. Dashboard ao vivo em `http://localhost:5665` durante a execução.

## Cenários

- **login.js** — `POST /api/auth/sign-in/email`. Sobe até 50 VUs.
- **exam-flow.js** — `POST /api/exams` + `POST /api/exams/:id/images`. Sobe até 20 VUs (fluxo mais pesado: insert + 2 uploads no MinIO).

Perfil de carga (em `options.stages`): smoke 30s → ramp-up 2min → steady 3min → ramp-down 30s (~6min total).

## Métricas

- `http_req_duration` (p95/p99) — latência. Filtra por endpoint com tags: `{name:login}`, `{name:create-exam}`, `{name:upload-images}`.
- `http_req_failed` — taxa de erro.
- `full_flow_success` / `full_flow_duration` (exam-flow) — KPI do fluxo completo create + upload.

## Limpeza

```bash
docker compose -f docker-compose.dev.yml down -v
```

Remove o volume do Postgres + MinIO (os médicos seedados ficam no banco entre runs).
