# Guia de Contribuição – RetinaScan

## Como Contribuir

Você pode contribuir de várias formas:

- Reportando bugs
- Sugerindo novas funcionalidades
- Melhorando a documentação
- Corrigindo problemas existentes
- Enviando melhorias no código

---

## Reportando Problemas (Issues)

Se você encontrar um bug ou quiser sugerir uma funcionalidade:

1. Verifique se já existe uma issue relacionada.
2. Caso não exista, abra uma nova issue descrevendo o problema ou sugestão.
3. Forneça o máximo de detalhes possível.

Para **bugs**, inclua:

- Passos para reproduzir
- Comportamento esperado
- Comportamento atual
- Screenshots (se aplicável)
- Informações do ambiente (sistema operacional, navegador, etc.)

---

## Ambiente de Desenvolvimento

Clone o repositório:

```bash
git clone git@github.com:fga-eps-mds/2026-1-RetinaScan-Api.git
cd 2026-1-RetinaScan-Api
```

Copie o arquivo de variáveis de ambiente:

```bash
cp env/.env.example env/.env.dev
```

Inicie o ambiente de desenvolvimento utilizando Docker:

```bash
sudo docker compose -f docker-compose.dev.yml up -d --build
```

A aplicação ficará disponível em:

```
 http://localhost:9001
```

---

## Estratégia de Branch

Ao criar novas branches, utilize o seguinte padrão:

```
feature/nome-da-feature
fix/descricao-do-bug
docs/alteracao-documentacao
refactor/nome-do-componente
```

Exemplos:

```
feature/upload-preview
fix/erro-login
```

---

## Padrão de Commits

Utilize mensagens de commit claras e descritivas.

Formato recomendado:

```
tipo: descrição curta
```

Exemplos:

```
feat: adiciona preview de imagem antes do upload
fix: corrige erro de redirecionamento no login
docs: atualiza instruções do README
refactor: simplifica componente de upload
```

Tipos comuns de commit:

- **feat** – nova funcionalidade
- **fix** – correção de bug
- **docs** – alterações na documentação
- **refactor** – melhorias no código sem alterar comportamento
- **style** – alterações de formatação
- **test** – adição ou modificação de testes

---

## Processo de Pull Request

1. Faça um fork do repositório
2. Crie uma nova branch
3. Implemente suas alterações
4. Faça commits das mudanças
5. Envie para o seu fork
6. Abra um Pull Request

Antes de abrir um PR, verifique se:

- O projeto compila corretamente
- Não há erros de lint
- A mudança está bem descrita

---

## Padrão de Código

O projeto segue:

- Regras de **ESLint** definidas no repositório
- Estrutura consistente de componentes
- Código limpo e legível

Antes de enviar um PR, execute:

```bash
npm run lint
```

---

## Dúvidas

Caso tenha dúvidas sobre o projeto ou sobre como contribuir, sinta-se à vontade para abrir uma issue.

Agradecemos sua contribuição para o **RetinaScan**!