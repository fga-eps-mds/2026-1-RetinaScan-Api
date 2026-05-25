<div align="center">

<p align="center">
  <img src="image-1.png" alt="Logo RetinaScan" width="450"/>
</p>

# RetinaScan API

A aplicação é responsável pelo processamento das retinografias enviadas pela plataforma, integração com armazenamento de arquivos via MinIO e comunicação com os serviços de Inteligência Artificial para geração de pré-relatórios automatizados.


</div>


## Equipe

<div align="center">
  <table>
    <tr>
        <td align="center">
        <a href="http://github.com/andre-maia51">
            <img src="http://github.com/andre-maia51.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>André Maia</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/artrsousa1">
            <img src="http://github.com/artrsousa1.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Arthur Ribeiro</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/cqcoding">
            <img src="http://github.com/cqcoding.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Ceci Quaresma</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/EliasOliver21">
            <img src="http://github.com/EliasOliver21.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Elias Oliveira</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/cwtshh">
            <img src="http://github.com/cwtshh.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Gustavo Costa</b></sub>
        </a>
        </td>
    </tr>
    <tr>
        <td align="center">
        <a href="https://github.com/Angelicahaas">
            <img src="https://github.com/Angelicahaas.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Harleny Angelica</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/IderlanJ">
            <img src="http://github.com/IderlanJ.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Iderlan Junio</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/Natyrodrigues">
            <img src="http://github.com/Natyrodrigues.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Natália Rodrigues</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/vnsrz">
            <img src="http://github.com/vnsrz.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Vinicius Roriz</b></sub>
        </a>
        </td>
        <td align="center">
        <a href="https://github.com/yan-luca">
            <img src="http://github.com/yan-luca.png" width="100" height="100" style="border-radius: 50%; object-fit: cover;" alt=""/>
            <br /><sub><b>Yan Luca</b></sub>
        </a>
        </td>
    </tr>
  </table>
</div> 


---
## Tecnologias Utilizadas

- Node.js
- Fastify
- TypeORM
- PostgreSQL
- Docker
- Docker Compose
- MinIO
- TypeScript
- Vitest
---

## Início

Clone o repositório:

```bash
git clone https://github.com/seu-org/retinascan.git
```

---

### Pré-requisitos

Antes de executar o projeto, é necessário possuir instalado:

- Node.js
- Docker
- Docker Compose

Verifique as instalações com:

```bash
node --version
docker --version
docker compose version
```

---

### Variáveis de ambiente

Crie o arquivo de ambiente:

```bash
cp env/.env.example env/.env.dev
```

O `DATABASE_URL` no `.env.example` já aponta para o PostgreSQL do Docker utilizando:

- Usuário: `postgres`
- Senha: `postgres`
- Banco: `retina-scan`

Você também pode alterar o `BUCKET_NAME` caso deseje utilizar outro bucket além de `retinascan`.

---

### Serviços

Suba os containers necessários:

```bash
sudo docker compose up -d
```

Caso tenha alterado o `Dockerfile` ou o `docker-compose.yml`:

```bash
sudo docker compose up -d --build
```

Caso precise remover os volumes:

```bash
sudo docker compose down -v
```

Aguarde os healthchecks do PostgreSQL e MinIO ficarem disponíveis antes de iniciar a API.

---

### Bucket no MinIO

Acesse o console do MinIO:

```txt
http://localhost:9001
```

Credenciais padrão:

```txt
Usuário: minioadmin
Senha: minioadmin
```

Crie um bucket com o mesmo nome definido em `BUCKET_NAME`.

Bucket padrão:

```txt
retinascan
```

---

### API

Instale as dependências:

```bash
npm install
```

Execute a aplicação:

```bash
npm run dev
```

A API ficará disponível na porta definida na variável `PORT`.

Porta padrão:

```txt
http://localhost:3000
```

---

## Testes

```bash
# Executa os testes em watch mode
npm run test:watch

# Executa os testes com cobertura
npm run test:coverage

# Executa um teste específico
npm run test:file <path/do/teste.test.ts>

# Executa todos os testes
npm run test

# Executa apenas testes unitários
npm run test:unit

# Executa apenas testes de integração
npm run test:integration
```

---

## Licença

Este projeto está licenciado sob a licença MIT.

Veja o arquivo [LICENSE](LICENSE) para mais detalhes.