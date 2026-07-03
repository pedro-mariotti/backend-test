# Guia Completo — Conteinerização, CI/CD e Deploy em Nuvem

Este guia cobre o conhecimento necessário e o passo a passo prático para cada etapa da atividade. A ordem sugerida é a mesma do enunciado, pois cada etapa depende da anterior.

---

## Visão geral do que você vai aprender

| Etapa | Tecnologias-chave |
|---|---|
| 1. Conteinerização | Docker, Dockerfile, variáveis de ambiente |
| 2. CI/CD | Testes unitários, GitHub Actions, Docker Hub |
| 3. Orquestração local | Docker Compose, redes, volumes |
| 4. Deploy em nuvem | AWS (EC2, ECS/EKS, RDS, VPC) ou Azure |
| 5. Monitoramento | Prometheus + Grafana ou CloudWatch |
| 6. Demonstração | Gravação de vídeo mostrando tudo funcionando |

---

## Etapa 1 — Conteinerização do projeto

### O que você precisa entender

- **O que é um container**: um processo isolado que empacota a aplicação junto com suas dependências (bibliotecas, runtime, etc.), garantindo que rode igual em qualquer máquina.
- **Dockerfile**: um arquivo de texto com instruções sequenciais que o Docker usa para construir uma imagem. As instruções mais comuns:
  - `FROM` — imagem base (ex: `node:20-alpine`, `python:3.12-slim`)
  - `WORKDIR` — diretório de trabalho dentro do container
  - `COPY` / `ADD` — copia arquivos do host para a imagem
  - `RUN` — executa comandos durante o build (ex: instalar dependências)
  - `ENV` — define variáveis de ambiente
  - `EXPOSE` — documenta a porta que o container usa
  - `CMD` / `ENTRYPOINT` — comando executado quando o container inicia
- **Multi-stage build**: técnica para separar a fase de build da fase de execução, gerando uma imagem final menor (muito usada em frontend com React/Vue/Angular, e em backends compilados como Go/Java).
- **Variáveis de ambiente**: usadas para configurar coisas que mudam entre ambientes (URL do backend, credenciais de banco, portas), sem hardcode no código.

### Passo a passo

**1.1. Dockerfile do backend** (exemplo genérico, adapte à linguagem):

```dockerfile
# Exemplo Node.js
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
```

Se for Python (Flask/Django/FastAPI):
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8000
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**1.2. Dockerfile do frontend** (exemplo com React + build estático servido por Nginx):

```dockerfile
# Estágio 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio 2: servir com Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**1.3. Variáveis de ambiente de integração**

- O frontend precisa saber o endereço do backend. Normalmente isso é feito via variável em tempo de **build** (ex: `VITE_API_URL`, `REACT_APP_API_URL`) ou, melhor ainda para produção, via um arquivo `.env` lido em runtime ou um proxy reverso no Nginx.
- O backend precisa de variáveis como `DATABASE_URL`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`, `CORS_ORIGIN` (para liberar o domínio do frontend).
- **Nunca coloque senhas direto no Dockerfile.** Use `ENV` só para valores não sensíveis, e para os sensíveis use variáveis passadas em runtime (`docker run -e`, `docker-compose.yml`, ou secrets do GitHub Actions/AWS).

**1.4. Testar localmente antes de seguir**

```bash
docker build -t meu-backend ./backend
docker build -t meu-frontend ./frontend
docker run -p 3000:3000 --env-file backend/.env meu-backend
docker run -p 8080:80 meu-frontend
```

Confirme que consegue acessar `http://localhost:8080` e que o frontend consegue chamar a API do backend.

---

## Etapa 2 — Automação de testes e publicação de imagens (CI/CD)

### O que você precisa entender

- **Testes unitários**: testam uma unidade isolada de código (uma função, uma rota, um serviço), normalmente com mocks para dependências externas (banco, APIs). Frameworks comuns: Jest/Vitest (Node), Pytest (Python), JUnit (Java).
- **GitHub Actions**: sistema de CI/CD nativo do GitHub. Um **workflow** é um arquivo YAML em `.github/workflows/` que define **jobs** (unidades de execução) compostos por **steps** (comandos), disparados por **triggers** (eventos como push, pull_request).
- **Docker Hub**: registro de imagens Docker público. Você precisa de uma conta, e de um **Access Token** (não a senha) para autenticar via CI.
- **GitHub Secrets**: local seguro para guardar credenciais (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`) usadas no workflow, sem expô-las no código.
- **Conceito de pipeline condicional**: só publicar a imagem se os testes passarem — isso é natural no GitHub Actions porque, por padrão, um job para se um step falha (a menos que configurado `continue-on-error`).

### Passo a passo

**2.1. Escrever testes unitários no backend**

Exemplo com Jest (Node.js):
```javascript
// soma.test.js
const soma = require('./soma');

test('soma 2 + 3 deve ser 5', () => {
  expect(soma(2, 3)).toBe(5);
});
```

Exemplo com Pytest (Python):
```python
def test_soma():
    assert soma(2, 3) == 5
```

Configure o `package.json` (Node) com `"test": "jest"` ou tenha o `pytest` instalado (Python), para que o comando de teste rode via CLI.

**2.2. Criar conta e token no Docker Hub**

1. Crie conta em https://hub.docker.com
2. Vá em **Account Settings > Security > New Access Token**
3. Copie o token gerado (só aparece uma vez)

**2.3. Configurar Secrets no GitHub**

No repositório: **Settings > Secrets and variables > Actions > New repository secret**
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

**2.4. Criar o workflow do backend** (`.github/workflows/backend.yml`):

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
        working-directory: ./backend
      - run: npm test
        working-directory: ./backend

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/meu-backend:latest
```

**2.5. Criar o workflow do frontend** (`.github/workflows/frontend.yml`) — sem etapa de testes:

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/meu-frontend:latest
```

**2.6. Validar**

Faça um `git push` na `main` e acompanhe em **Actions** no GitHub se o pipeline roda e as imagens aparecem no seu Docker Hub.

> Observação: o trigger `on: push branches: [main]` já cobre "sempre que houver merge na main", já que um merge de PR resulta em um push/commit na main.

---

## Etapa 3 — Configuração do Docker Compose

### O que você precisa entender

- **Docker Compose**: ferramenta para definir e orquestrar múltiplos containers (serviços) em um único arquivo YAML, com um comando único para subir tudo.
- **Redes internas**: por padrão, o Compose cria uma rede bridge onde os serviços se enxergam pelo **nome do serviço** (ex: backend acessa banco via `db:5432`, não `localhost:5432`).
- **Volumes**: usados para persistir dados fora do ciclo de vida do container (ex: dados do banco não podem sumir quando o container reinicia).
- **depends_on**: define ordem de inicialização (não garante que o serviço "esteja pronto", apenas que "já iniciou" — para isso, use healthchecks se precisar de mais robustez).

### Passo a passo

**3.1. Escrever o `docker-compose.yml`** (exemplo com Postgres):

```yaml
version: '3.9'

services:
  frontend:
    image: seuusuario/meu-frontend:latest
    ports:
      - "8080:80"
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    image: seuusuario/meu-backend:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://usuario:senha@db:5432/meubanco
      - PORT=3000
    depends_on:
      - db
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=usuario
      - POSTGRES_PASSWORD=senha
      - POSTGRES_DB=meubanco
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  db-data:
```

**3.2. Testar**

```bash
docker compose up -d
docker compose ps
docker compose logs -f backend
```

Verifique se todos os serviços sobem (`docker compose ps` deve mostrar status "Up" / "healthy").

**3.3. Encerrar / limpar (para testes)**

```bash
docker compose down          # para os containers
docker compose down -v       # remove também os volumes (cuidado, apaga dados)
```

---

## Etapa 4 — Implantação em nuvem

### O que você precisa entender

**Conceitos de rede AWS:**
- **VPC (Virtual Private Cloud)**: sua rede privada isolada na AWS.
- **Sub-rede (subnet)**: divisão da VPC, pode ser pública (com rota para internet via Internet Gateway) ou privada.
- **Security Group**: firewall virtual por instância — controla portas/IPs de entrada e saída.
- **EC2**: máquina virtual genérica, você instala o que quiser nela (inclusive Docker).
- **ECS (Elastic Container Service)**: serviço gerenciado da AWS para rodar containers, sem precisar gerenciar VMs diretamente (pode usar Fargate, serverless).
- **EKS**: Kubernetes gerenciado da AWS — mais complexo, geralmente desnecessário para um projeto deste porte.
- **RDS**: banco de dados relacional gerenciado (Postgres, MySQL, etc.) — a AWS cuida de backups, updates, alta disponibilidade.

**Recomendação para o seu caso (mais simples de operar):** EC2 para frontend + EC2 para backend (rodando os containers via Docker/Compose) + RDS para o banco. ECS/EKS têm curva de aprendizado maior e o roteiro já sugere EC2 como opção válida para backend também.

### Passo a passo (via EC2 + RDS)

**4.1. Criar a VPC e sub-redes** (ou usar a VPC default da AWS, o que é aceitável para o projeto)
1. Console AWS > VPC > criar VPC com pelo menos 2 sub-redes públicas (frontend e backend podem ficar na mesma sub-rede pública se optar por simplicidade).

**4.2. Criar o Security Group**
- Para o frontend: liberar porta 80 (HTTP) e 22 (SSH, restrito ao seu IP) de entrada.
- Para o backend: liberar a porta da API (ex: 3000) apenas para o Security Group do frontend (ou 0.0.0.0/0 se quiser acesso público direto para testes), e 22 para seu IP.
- Para o RDS: liberar a porta do banco (ex: 5432) **apenas** para o Security Group do backend — nunca exponha o banco publicamente.

**4.3. Criar o RDS**
1. Console AWS > RDS > Create database > escolha o engine (Postgres/MySQL)
2. Defina usuário/senha mestre, nome do banco
3. Vincule à VPC/subnets criadas, e ao Security Group do banco
4. Anote o **endpoint** gerado — será usado como `DB_HOST` no backend

**4.4. Criar as instâncias EC2**
1. Console AWS > EC2 > Launch Instance
2. Escolha AMI Ubuntu (ou Amazon Linux)
3. Tipo `t2.micro`/`t3.micro` (elegível free tier)
4. Associe o Security Group correspondente
5. Crie/baixe o par de chaves `.pem` para SSH

**4.5. Instalar Docker nas instâncias**

```bash
ssh -i sua-chave.pem ubuntu@<IP_PUBLICO>
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# reconecte a sessão SSH para aplicar o grupo
```

**4.6. Subir os containers**

No backend, você pode rodar direto:
```bash
docker run -d -p 3000:3000 \
  -e DATABASE_URL=postgres://usuario:senha@<endpoint-rds>:5432/meubanco \
  seuusuario/meu-backend:latest
```

No frontend:
```bash
docker run -d -p 80:80 seuusuario/meu-frontend:latest
```

> Dica: como você já configurou variáveis de ambiente de build no frontend (etapa 1), lembre de gerar/buildar o frontend apontando para o **IP público do backend**, e não `localhost`.

**4.7. Testar**

Acesse `http://<IP_PUBLICO_FRONTEND>` no navegador e confirme que consegue interagir com o backend e o banco.

---

## Etapa 5 — Monitoramento

### O que você precisa entender

- **Objetivo**: coletar métricas de uso de CPU e RAM do backend e visualizá-las em um gráfico.
- **Opção A — Prometheus + Grafana** (mais didático, mostra domínio de ferramentas open-source):
  - **Prometheus**: coleta métricas periodicamente (scrape) de "exporters".
  - **cAdvisor** ou **node-exporter**: expõe métricas de containers/host para o Prometheus.
  - **Grafana**: cria dashboards visuais a partir dos dados do Prometheus.
- **Opção B — CloudWatch** (mais simples se já está na AWS): serviço nativo que já coleta métricas básicas de EC2 automaticamente (CPU) — para métricas de memória, é necessário instalar o **CloudWatch Agent** na instância.

### Passo a passo (opção CloudWatch — mais rápida)

**5.1.** No console AWS, vá em **CloudWatch > Metrics > EC2** — CPU já aparece automaticamente por instância.

**5.2.** Para RAM, instale o CloudWatch Agent na instância do backend:
```bash
sudo apt install -y amazon-cloudwatch-agent
sudo amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c default -s
```
(configure o agente para reportar mem_used_percent — há um wizard interativo: `amazon-cloudwatch-agent-config-wizard`)

**5.3.** Gere carga na aplicação (algumas requisições, testes) para ter dados no gráfico.

**5.4.** Vá em **CloudWatch > Dashboards > criar dashboard**, adicione os widgets de CPU e memória, e tire o **print da tela** exigido no enunciado.

### Passo a passo (opção Prometheus + Grafana, via Docker)

**5.1.** Adicione ao `docker-compose.yml` (ou rode direto no EC2 do backend):
```yaml
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8081:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
```

**5.2.** Crie `prometheus.yml` apontando para o cAdvisor:
```yaml
scrape_configs:
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

**5.3.** Acesse Grafana em `http://<IP>:3001` (login padrão admin/admin), adicione o Prometheus como data source (`http://prometheus:9090`) e importe um dashboard pronto de Docker (ex: dashboard ID 193 ou 179 do Grafana.com).

**5.4.** Tire o print do gráfico de CPU/RAM.

---

## Etapa 6 — Vídeo demonstrativo

### O que você precisa entender

O vídeo é a **prova final** de que tudo está integrado e rodando na nuvem (não localmente). Precisa mostrar, em 1-3 minutos:
1. Acesso via navegador ao **IP público** do frontend
2. A aba **Network** do DevTools do navegador (F12) mostrando requisições reais indo para o **IP público do backend** (não localhost)
3. Uma ação que grava/atualiza dado no banco, e a confirmação disso abrindo o **DBeaver** (ou MongoDB Compass, se for NoSQL) conectado ao RDS, mostrando a linha inserida/atualizada

### Passo a passo

**6.1.** Antes de gravar, teste o fluxo manualmente para garantir que não vai travar durante a gravação.

**6.2.** Configure o DBeaver com uma nova conexão apontando para o endpoint do RDS (host, porta, usuário, senha, nome do banco) — teste a conexão antes.

**6.3.** Use um gravador de tela (OBS Studio, Loom, ou gravação nativa do SO).

**6.4.** Roteiro sugerido de gravação:
   - Abra o navegador, acesse o IP público do frontend, abra o DevTools (F12) na aba Network
   - Realize uma ação na interface (ex: cadastrar um item) — mostre a requisição aparecendo na aba Network com o IP público do backend na URL
   - Abra o DBeaver, rode um `SELECT` na tabela afetada, mostre o novo dado

**6.5.** Exporte o vídeo em MP4 e verifique se está dentro de 1-3 minutos.

---

## Checklist final antes de entregar

- [ ] Dockerfiles de frontend e backend funcionando localmente
- [ ] Testes unitários no backend passando
- [ ] Workflows do GitHub Actions publicando imagens no Docker Hub a cada push na main
- [ ] `docker-compose.yml` sobe tudo com `docker compose up -d`
- [ ] Frontend, backend e banco rodando na nuvem, acessíveis via IP público
- [ ] VPC, subnets e Security Groups configurados corretamente (banco não exposto publicamente)
- [ ] Print do gráfico de CPU/RAM do backend
- [ ] Vídeo de 1-3 min mostrando IP público, requisições de rede e dado no banco via DBeaver/Compass

---

### Observação importante sobre segurança
Nunca commite senhas, chaves `.pem` ou tokens no repositório Git. Use `.gitignore` para arquivos `.env` e chaves, e sempre prefira GitHub Secrets / variáveis de ambiente para credenciais.