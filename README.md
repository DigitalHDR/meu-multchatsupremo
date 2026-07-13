# Meu Multichat — Overlay OBS

Agrega mensagens do chat do **Twitch**, **Kick** e **YouTube** em um único overlay transparente para usar no OBS Studio. Inclui interface gráfica em **Qt 6 (PySide6)** para configurar canais, porta e URLs sem editar arquivos manualmente.

## Funcionalidades

- Chat unificado das três plataformas em tempo real (WebSocket)
- Overlay com fundo transparente para o OBS
- Emotes do Twitch, Kick e YouTube
- Mensagens somem automaticamente após **1 minuto** (padrão) ou **10 minutos** (modo chat fixo)
- Som de notificação (`notification-som/notification.mp3`) a cada mensagem nova no overlay (desative com `?sound=0` na URL)
- Interface desktop **Qt 6** (`gui/multichat_app.py`) com tema escuro, escolha do **tamanho da fonte** (10–36 px) e botões **▲▼** para ajuste fino
- Painel web alternativo em `http://localhost:PORTA`
- Três portas fixas disponíveis: **3847**, **3857**, **3867**
- Histórico de mensagens com TTL de 60 segundos no servidor

---

## Requisitos

| Componente | Versão mínima | Uso |
|------------|---------------|-----|
| [Node.js](https://nodejs.org/) | 18+ (testado com v24.18.0) | Servidor, conexões de chat, overlay |
| [Python](https://www.python.org/downloads/) | 3.10+ (testado com 3.12.10) | Interface gráfica Qt 6 |
| [PySide6](https://pypi.org/project/PySide6/) | 6.6+ (testado com 6.11.1) | Bindings Qt 6 para Python |
| OBS Studio | Qualquer versão recente | Exibir o overlay na transmissão |

> **Kick:** usa Puppeteer/Chromium em modo **headless** (invisível) para contornar o Cloudflare. Não abre janela de navegador na tela. O Chromium fica em `%USERPROFILE%\.cache\puppeteer\`.

---

## Instalação rápida (Windows)

1. Instale **Node.js** e **Python** (marque *Add python.exe to PATH*).
2. Dê duplo clique em **`iniciar.bat`** — ele instala dependências automaticamente na primeira execução.

Ou manualmente:

```bash
npm install
npm.cmd approve-builds   # se o Puppeteer pedir aprovação de scripts
copy .env.example .env
python -m pip install -r gui\requirements.txt
```

---

## Como executar

| Arquivo | O que faz |
|---------|-----------|
| **`iniciar.bat`** / **`iniciar.vbs`** | Para servidores antigos, inicia o Node em segundo plano e abre a interface Qt |
| **`configurar.bat`** | Abre só a interface de configuração (sem iniciar o servidor) |
| **`parar.bat`** / **`parar.vbs`** | Encerra processos nas portas 3847, 3857 e 3867 |
| **`gui\instalar-gui.bat`** | Instala apenas o PySide6 |

No terminal (sem interface gráfica):

```bash
node server.js
```

> **Erro no PowerShell com npm?** Use `npm.cmd start` em vez de `npm start`, ou rode `node server.js` diretamente.

---

## Interface gráfica (Qt 6)

A pasta **`gui/`** contém a interface desktop principal:

| Arquivo | Descrição |
|---------|-----------|
| `multichat_app.py` | Janela Qt 6 — canais, porta, URLs do OBS, tamanho da fonte, Salvar/Iniciar/Parar |
| `requirements.txt` | Dependência: `PySide6>=6.6.0` |
| `abrir-interface.vbs` | Abre a GUI sem console (`pythonw.exe`) |
| `config-gui.ps1` | Interface legada em PowerShell (substituída pelo Qt) |

### Campos da interface

- **Twitch**, **Kick**, **YouTube canal**, **YouTube vídeo ID**
- **Tamanho da fonte — overlay público** (`/overlaypublico`) — padrão 22 px — botões **▲** (aumentar) e **▼** (diminuir)
- **Tamanho da fonte — chat fixo** (`/chatfixostremer`) — padrão 16 px — mesmos controles
- **Porta do servidor:** 3847, 3857 ou 3867 (status: Livre / Em uso / Ativa)
- **URLs para o OBS** (com botão Copiar):

| Modo | URL | Descrição |
|------|-----|-----------|
| Overlay transparente | `http://localhost:PORTA/overlaypublico` | Fica sobre a tela do jogo; os espectadores veem as mensagens |
| Chat fixo | `http://localhost:PORTA/chatfixostremer` | Somente o streamer vê; textos somem após **10 minutos** |

O tamanho da fonte é aplicado **automaticamente** ao mudar na interface (via WebSocket) — não é preciso alterar a URL no OBS.

A interface usa **tema escuro** (fundo `#282c34`, texto claro) para combinar com o OBS e reduzir cansaço visual.

- **Salvar** — grava no `.env`
- **Iniciar** — salva, reinicia o servidor Node na porta escolhida
- **Parar** — encerra o servidor
- **Abrir Overlay** — abre preview no navegador (opcional; no OBS use a URL diretamente)

> Ao **fechar a janela** da interface, o servidor Node e processos filhos (incluindo Chromium do Kick) são encerrados automaticamente.

---

## Painel web (alternativa)

Com o servidor rodando, acesse:

- **Configuração:** `http://localhost:3847` (ou a porta configurada)
- **Overlay:** `http://localhost:3847/overlaypublico`

Arquivos: `public/index.html`, `public/panel.js`, `public/panel.css`

---

## API REST (painel web e integrações)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/config` | Lê `.env`, status das portas e portas disponíveis |
| `POST` | `/api/config` | Salva canais, porta e tamanhos de fonte |
| `PATCH` | `/api/overlay-appearance` | Atualiza só `OVERLAY_FONT_SIZE` e `OVERLAY_FONT_SIZE_FIXO` |
| `GET` | `/api/status` | Status das conexões Twitch, Kick e YouTube |

Rotas do overlay:

| Rota | Descrição |
|------|-----------|
| `/overlaypublico` | Overlay transparente para os espectadores |
| `/chatfixostremer` | Chat fixo do streamer (mensagens por 10 min) |
| `/overlay` | Redireciona para `/overlaypublico` (compatibilidade) |

---

## Configuração (`.env`)

Copie `.env.example` para `.env`:

```env
# Porta — opções fixas: 3847, 3857 ou 3867
PORT=3847

# Canais (nome ou URL completa)
TWITCH_CHANNEL=seu_canal
KICK_CHANNEL=seu_canal

# YouTube: canal (@canal busca live) OU ID do vídeo ao vivo
YOUTUBE_CHANNEL=@seu_canal
YOUTUBE_VIDEO_ID=

# Opcional: token OAuth do Twitch
TWITCH_OAUTH=

# Tamanho da fonte das mensagens no overlay (10 a 36)
OVERLAY_FONT_SIZE=22
OVERLAY_FONT_SIZE_FIXO=16
```

Deixe uma variável vazia para desativar a plataforma.

### Como encontrar o ID do vídeo do YouTube

Na URL da live: `https://www.youtube.com/watch?v=XXXXXXXXXXX` — o valor depois de `v=` é o ID.

---

## Configurar no OBS Studio

### Overlay para os espectadores (transparente)

1. **Fontes → + → Navegador (Browser Source)**
2. URL: `http://localhost:3847/overlaypublico` (troque a porta se necessário)
3. Largura: **400** | Altura: **600** (ajuste ao gosto)
4. Marque **"Desativar origem quando não visível"**
5. Posicione sobre a cena do jogo — fundo transparente, mensagens visíveis para todos

### Chat fixo (só para o streamer)

1. Crie outra fonte Navegador com a URL:
   `http://localhost:3847/chatfixostremer`
2. Coloque em um monitor ou cena que **não** vai ao ar
3. Mensagens permanecem até **10 minutos** na tela

---

## Plataformas

| Plataforma | Variável | Observação |
|------------|----------|------------|
| Twitch | `TWITCH_CHANNEL` | Funciona sem token; opcional `TWITCH_OAUTH` |
| Kick | `KICK_CHANNEL` | Slug da URL (`kick.com/nome`). Usa Puppeteer headless |
| YouTube | `YOUTUBE_CHANNEL` ou `YOUTUBE_VIDEO_ID` | Canal busca live ativa; vídeo exige live no ar |

### Token Twitch (opcional)

Gere em [twitchtokengenerator.com](https://twitchtokengenerator.com/) com escopo `chat:read` e coloque em `TWITCH_OAUTH`.

---

## Estrutura do projeto

```
meu-multichat/
├── server.js              # Servidor Express + WebSocket
├── services/              # Conexões Twitch, Kick, YouTube
│   ├── twitch.js
│   ├── kick.js
│   └── youtube.js
├── utils/                 # Parse de canais, emotes, config
├── public/                # Overlay OBS + painel web
│   ├── overlay.html
│   ├── overlay.js
│   ├── overlay.css
│   └── index.html
├── notification-som/      # Som de alerta por mensagem nova
│   └── notification.mp3
├── gui/                   # Interface Qt 6 (PySide6)
│   └── multichat_app.py
├── scripts/
│   └── arquivar-pacotes.js
├── pacotes/               # Arquivo de dependências e licenças
├── iniciar.bat / iniciar.vbs / configurar.bat / parar.bat
├── .env.example
└── package.json
```

---

## Personalização do overlay

Edite `public/overlay.css` para cores, fonte e tamanho.

Em `public/overlay.js`:

| Constante | Padrão | Descrição |
|-----------|--------|-----------|
| `OVERLAY_FONT_SIZE` (`.env`) | 22 | Fonte do overlay público (`/overlaypublico`) |
| `OVERLAY_FONT_SIZE_FIXO` (`.env`) | 16 | Fonte do chat fixo do streamer (`/chatfixostremer`) |
| `MAX_MESSAGES` | 30 | Máximo de mensagens na tela |
| `MESSAGE_LIFETIME_MS` | 60000 (1 min) | Tempo até sumir; 600000 (10 min) no `/chatfixostremer` |
| `FADE_DURATION_MS` | 500 | Duração do fade ao remover |

Parâmetros de URL do overlay:

| Parâmetro | Efeito |
|-----------|--------|
| `preview=1` | Modo preview (barra de status visível) — só em `/overlaypublico` |
| `demo=1` | Mensagens de demonstração |
| `sound=0` | Desativa o som de notificação por mensagem |

A rota `/chatfixostremer` já ativa preview, mensagens de 10 minutos e fonte do chat fixo.

---

## Pasta `pacotes/` — dependências arquivadas

A pasta **`pacotes/`** documenta e arquiva todas as dependências usadas pelo programa (versão, licença, data do download). Cada pacote tem sua subpasta com `PACOTE.md` e o arquivo baixado (`.tgz` ou `.whl`).

| Pasta | Conteúdo |
|-------|----------|
| `nodejs-runtime/` | Node.js |
| `python-runtime/` | Python |
| `python/` | PySide6, shiboken6, PySide6_Essentials, PySide6_Addons (Qt 6) |
| `npm/` | 267 pacotes npm do `package-lock.json` |
| `puppeteer-chrome/` | Chromium para chat Kick (documentação) |
| `meu-multichat/` | Este projeto |

### Dependências npm diretas

| Pacote | Versão | Licença | Função |
|--------|--------|---------|--------|
| `tmi.js` | 1.8.5 | MIT | Chat Twitch |
| `@retconned/kick-js` | 0.5.4 | MIT | Chat Kick (+ Puppeteer) |
| `youtube-chat` | 2.2.0 | MIT | Chat YouTube |
| `express` | 4.22.2 | MIT | Servidor HTTP |
| `ws` | 8.21.0 | MIT | WebSocket para overlay |
| `dotenv` | 16.6.1 | BSD-2-Clause | Leitura do `.env` |

Índice completo: [`pacotes/README.md`](pacotes/README.md)

### Atualizar o arquivo de pacotes

Após `npm install` ou instalar novos pacotes Python:

```bash
npm run arquivar-pacotes
```

ou:

```bash
node scripts/arquivar-pacotes.js
```

> Os arquivos `.tgz` e `.whl` são grandes e estão no `.gitignore`. A documentação (`PACOTE.md`, `README.md`) pode ir para o git.

---

## Solução de problemas

| Problema | Solução |
|----------|---------|
| Porta em uso (`EADDRINUSE`) | Execute `parar.bat` ou escolha outra porta (3857/3867) |
| Kick não conecta (403) | Confirme Puppeteer instalado: `npm.cmd approve-builds` |
| Overlay em branco | Verifique se o servidor está rodando; use `?preview=1` para testar |
| `npm` bloqueado no PowerShell | Use `npm.cmd` ou `node server.js` |
| Interface travando ao arrastar | Corrigido: verificação de portas sem PowerShell no timer |
| Python/PySide6 não encontrado | Rode `gui\instalar-gui.bat` ou `pip install -r gui\requirements.txt` |

---

## Licenças

- **Este projeto:** código próprio do Meu Multichat
- **PySide6 / Qt 6:** LGPL-3.0 — [qt.io/licensing](https://www.qt.io/licensing/)
- **Node.js:** MIT
- **Pacotes npm:** ver `PACOTE.md` em cada pasta em `pacotes/npm/`
- **Chromium (Puppeteer):** BSD — não redistribuir sem cumprir a licença Chromium

---

## Scripts npm

```bash
npm start              # Inicia o servidor
npm run dev            # Servidor com --watch
npm run arquivar-pacotes   # Baixa e documenta todas as dependências
```
