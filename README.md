# RetinaScan API

API em Node.js com Fastify, TypeORM e PostgreSQL. O ambiente local sobe Postgres e MinIO via Docker.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Sumário

- [Equipe](#equipe)
- [Início](#início)
  - [Pré-requisitos](#pré-requisitos)
  - [Variáveis de ambiente](#variáveis-de-ambiente)
  - [Serviços](#serviços)
  - [Bucket no MinIO](#bucket-no-minio)
  - [API](#api)
- [Testes](#testes)

## Equipe

| Nome | GitHub |
| :--- | :----: |
| ... | [@usuario](https://github.com/usuario) |

## Início

Clone o repositório:

```bash
git clone https://github.com/seu-org/retinascan.git
```

### Pré-requisitos

- Node.js
- Docker e Docker Compose

### Variáveis de ambiente

```bash
cp env/.env.example env/.env.dev
```

O `DATABASE_URL` no `.env.example` já aponta pro Postgres do Docker (usuário `postgres`, senha `postgres`, banco `retina-scan`). Ajuste `BUCKET_NAME` se quiser usar um nome diferente de `retinascan`.

### Serviços

```bash
docker compose up -d
```

Aguarde os healthchecks do Postgres e do MinIO ficarem verdes antes de continuar.

```bash
# Se alterações foram feitas no Dockerfile ou no docker-compose.yml
docker compose up --build

# Se for necessário deletar os volumes
docker compose down -v
```

### Bucket no MinIO

Acesse o console em [http://localhost:9001](http://localhost:9001) com as credenciais `minioadmin` / `minioadmin` e crie um bucket com o mesmo nome definido em `BUCKET_NAME` (padrão: `retinascan`).

### API

```bash
npm install
npm run dev
```

A API sobe na porta definida em `PORT` (padrão: `3000`).

## Testes

```bash
# Executa os testes em watch mode
npm run test:watch

# Executa os testes em modo de cobertura
npm run test:coverage

# Execução única de um teste específico
npm run test:file <path/do/teste.test.ts>

# Executa todos os testes
npm run test

# Executa os testes unitários
npm run test:unit

# Executa os testes de integração
npm run test:integration
```