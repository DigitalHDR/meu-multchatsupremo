# Indice de Pacotes - Meu Multichat

Gerado em: **2026-07-12T17:55:09.838Z**

Este diretorio contem copias arquivadas e documentacao de licencas de todos os pacotes usados pelo programa.

## Estrutura

| Pasta | Conteudo |
|-------|----------|
| `nodejs-runtime/` | Runtime Node.js |
| `python-runtime/` | Runtime Python |
| `python/` | PySide6 e dependencias Qt (interface) |
| `npm/` | Todos os pacotes npm (package-lock.json) |
| `puppeteer-chrome/` | Chromium para chat Kick |
| `meu-multichat/` | Este projeto |

Cada pasta contem `PACOTE.md` com versao, licenca, data do download e arquivo `.tgz` ou `.whl`.

Para atualizar: `node scripts/arquivar-pacotes.js`

## Runtimes

| Pacote | Versao | Licenca | Pasta |
|--------|--------|---------|-------|
| Node.js | v24.18.0 | MIT | nodejs-runtime |
| Python | Python 3.12.10 | PSF | python-runtime |
| Chromium/Puppeteer | 131.0.6778.204 | BSD | puppeteer-chrome |

## Python / Qt6

| Pacote | Versao | Licenca | Pasta |
|--------|--------|---------|-------|
| PySide6 | 6.11.1 | LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only | python/PySide6 |
| shiboken6 | 6.11.1 | LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only | python/shiboken6 |
| PySide6_Essentials | 6.11.1 | LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only | python/PySide6_Essentials |
| PySide6_Addons | 6.11.1 | LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only | python/PySide6_Addons |

## Dependencias npm (resumo)

| Pacote | Versao | Licenca | Pasta |
|--------|--------|---------|-------|
| @retconned/kick-js | 0.5.4 | MIT | npm/@retconned__kick-js |
| dotenv | 16.6.1 | BSD-2-Clause | npm/dotenv |
| express | 4.22.2 | MIT | npm/express |
| tmi.js | 1.8.5 | MIT | npm/tmi.js |
| ws | 8.21.0 | MIT | npm/ws |
| youtube-chat | 2.2.0 | MIT | npm/youtube-chat |
