# Meu Multichat — Overlay OBS

Agrega mensagens do chat do **Twitch**, **Kick** e **YouTube** em um único overlay para usar no OBS Studio.

## Requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- OBS Studio

## Instalação

```bash
npm install
```

Copie o arquivo de configuração:

```bash
copy .env.example .env
```

Edite o `.env` com seus canais:

```env
TWITCH_CHANNEL=seu_canal
KICK_CHANNEL=seu_canal
YOUTUBE_VIDEO_ID=id_do_video_ao_vivo
```

### Como encontrar o ID do vídeo do YouTube

Na URL da live: `https://www.youtube.com/watch?v=XXXXXXXXXXX` — o valor depois de `v=` é o ID.

## Executar

**Opção mais fácil:** dê duplo clique em `iniciar.bat` ou `start.bat`

No terminal:

```bash
node server.js
```

Ou, se preferir npm no PowerShell (use `.cmd` para evitar erro de política de execução):

```bash
npm.cmd start
```

> **Erro no PowerShell?** Se aparecer *"a execução de scripts foi desabilitada"*, use `npm.cmd start` em vez de `npm start`, ou rode `node server.js` diretamente.

Abra o painel em: **http://localhost:3847**

## Configurar no OBS Studio

1. No OBS, clique em **Fontes → + → Navegador (Browser Source)**
2. Nomeie como "Multichat" e confirme
3. Na URL, cole: `http://localhost:3847/overlay`
4. Largura: **400** | Altura: **600** (ajuste ao seu gosto)
5. Marque **"Desativar origem quando não visível"**
6. O fundo é transparente — posicione o overlay na sua cena

## Plataformas

| Plataforma | Variável | Observação |
|------------|----------|------------|
| Twitch | `TWITCH_CHANNEL` | Funciona sem token; opcionalmente use `TWITCH_OAUTH` |
| Kick | `KICK_CHANNEL` | Nome do canal (slug da URL) |
| YouTube | `YOUTUBE_VIDEO_ID` | Só funciona com live ativa |

Deixe a variável vazia para desativar uma plataforma.

## Token Twitch (opcional)

Para maior estabilidade, gere um token em [twitchtokengenerator.com](https://twitchtokengenerator.com/) com escopo `chat:read` e coloque em `TWITCH_OAUTH`.

## Personalização

Edite `public/overlay.css` para mudar cores, fonte e tamanho das mensagens.

Em `public/overlay.js`:
- `MAX_MESSAGES` — quantas mensagens aparecem na tela
- `MESSAGE_LIFETIME_MS` — tempo até a mensagem sumir (0 = permanece)
