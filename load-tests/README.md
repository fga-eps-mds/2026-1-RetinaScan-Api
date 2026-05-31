# Load tests (k6)

## Pré-requisitos

- k6 instalado (`brew install k6`).
- Admin seedado no startup (controlado por `ADMIN_*` em `env/.env.dev`).

## Fluxo

```bash
# 1. Cria N médicos + pool de N pacientes (default 50). Gera users.json e patients.json.
npm run load:seed

# 2. Garanta que existe imagem em load-tests/fixtures/eye.jpg (JPEG, ≤5MB).

# 3. Roda os cenários — sempre exporta HTML em load-tests/reports/.
npm run load:login        # POST /api/auth/sign-in/email em loop
npm run load:exam-flow    # POST /api/exams → POST /api/exams/:id/images
```

Os scripts `npm run load:*` já habilitam o `K6_WEB_DASHBOARD` e exportam o relatório HTML em `load-tests/reports/<cenário>.html`. Abra o arquivo no browser depois do run pra ver os gráficos.

Pra ver o dashboard **ao vivo durante o run**, abra `http://localhost:5665` no browser logo que o k6 começar.

## Perfil de carga (smoke + ramp-up curto)

Definido em cada script via `options.stages`:

- 30s a 1 VU (smoke / sanity).
- 2min subindo de 1 → 50 VUs (ramp-up).
- 3min em 50 VUs (steady).
- 30s descendo pra 0.

Total ~6min por cenário.

## Métricas a observar

Built-in do k6:

- `http_req_duration` (p95, p99) — latência percebida pelo cliente.
  - `http_req_waiting` — TTFB (tempo no servidor: DB + MinIO).
  - `http_req_sending` — tempo subindo o multipart (relevante no upload).
- `http_req_failed` — taxa de erro HTTP.
- `iterations` / `vus` — throughput sustentado.
- `data_sent` / `data_received` — pra confirmar que o gargalo é compute, não rede.

Filtragem por endpoint (via tags `name`):

- `http_req_duration{name:create-exam}` — só o create.
- `http_req_duration{name:upload-images}` — só o upload.
- `http_req_duration{name:login}` — só o login.

Custom metrics do `exam-flow.js`:

- `exams_created` (Counter) — quantos exames foram criados com sucesso.
- `images_uploaded` (Counter) — quantas imagens foram persistidas (2 por iteração bem-sucedida).
- `full_flow_success` (Rate) — % de iterações onde **create + upload** deram 201. KPI honesto pro relatório.
- `full_flow_duration` (Trend) — tempo total do fluxo de negócio (create + upload combinados). p95 dessa métrica = o que o usuário "sente".

## Visualização

Os scripts `npm run load:*` já habilitam o dashboard web do k6 e exportam HTML estático em `load-tests/reports/`. Pra comparar runs (ex: antes/depois de uma otimização) também dá pra exportar JSON manualmente:

```bash
k6 run --out json=load-tests/reports/exam-flow.json load-tests/exam-flow.js
```

## Limpeza

Os médicos seedados ficam no banco. Pra resetar entre runs:

```bash
docker compose -f docker-compose.dev.yml down -v
```

(derruba e remove o volume do Postgres + MinIO).

## Notas

- `exam-flow.js` usa target menor (20 VUs) que `login.js` (50 VUs) porque o fluxo é muito mais pesado: 1 insert de exame + 2 uploads de ~MBs no MinIO + 2 inserts de imagem por iteração.
- A imagem em `fixtures/eye.jpg` é reusada em todas as VUs — o tamanho dela impacta diretamente o throughput. Use uma imagem realista (~500KB–2MB) pra resultados representativos.
- Thresholds do `exam-flow.js` são por endpoint via tags: `create-exam` p95 < 800ms, `upload-images` p95 < 3000ms.
