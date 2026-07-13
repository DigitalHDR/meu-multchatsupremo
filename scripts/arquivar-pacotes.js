/**
 * Arquiva todos os pacotes usados pelo Meu Multichat em ./pacotes/
 * Uso: node scripts/arquivar-pacotes.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PACOTES = path.join(ROOT, 'pacotes');
const LOCK = path.join(ROOT, 'package-lock.json');
const NOW = new Date().toISOString();

function safeFolderName(pkgPath) {
  return pkgPath.replace(/^node_modules\//, '').replace(/\//g, '__');
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto
      .get(url, { headers: { 'User-Agent': 'meu-multichat-archiver/1.0' } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode} para ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', reject);
  });
}

function writePacoteMd(dir, data) {
  const lines = [
    `# ${data.nome}`,
    '',
    '| Campo | Valor |',
    '|-------|-------|',
    `| Nome | ${data.nome} |`,
    `| Versao | ${data.versao} |`,
    `| Tipo | ${data.tipo} |`,
    `| Licenca | ${data.licenca || 'Ver pacote'} |`,
    `| URL oficial | ${data.url || '-'} |`,
    `| Arquivo baixado | ${data.arquivo || '-'} |`,
    `| Integridade | ${data.integridade || '-'} |`,
    `| Baixado em | ${data.baixadoEm} |`,
    `| Uso no projeto | ${data.uso} |`,
    '',
  ];

  if (data.licencaTexto) {
    lines.push('## Termos de licenca', '', '```', data.licencaTexto.trim(), '```', '');
  }

  if (data.notas) {
    lines.push('## Notas', '', data.notas, '');
  }

  fs.writeFileSync(path.join(dir, 'PACOTE.md'), lines.join('\n'), 'utf8');
}

async function arquivarNpm() {
  const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
  const baseDir = path.join(PACOTES, 'npm');
  fs.mkdirSync(baseDir, { recursive: true });

  const entries = Object.entries(lock.packages || {}).filter(
    ([key]) => key.startsWith('node_modules/')
  );

  const index = [];
  let ok = 0;
  let fail = 0;

  for (const [pkgPath, meta] of entries) {
    const nome = pkgPath.replace(/^node_modules\//, '');
    const folder = safeFolderName(pkgPath);
    const dir = path.join(baseDir, folder);
    fs.mkdirSync(dir, { recursive: true });

    const versao = meta.version || '?';
    const resolved = meta.resolved;
    const arquivo = resolved ? path.basename(new URL(resolved).pathname) : null;
    const dest = arquivo ? path.join(dir, arquivo) : null;

    if (resolved && dest && !fs.existsSync(dest)) {
      try {
        await downloadFile(resolved, dest);
        ok++;
      } catch (err) {
        fail++;
        fs.writeFileSync(path.join(dir, 'ERRO.txt'), String(err.message), 'utf8');
      }
    } else if (dest && fs.existsSync(dest)) {
      ok++;
    }

    const uso = nome.includes('kick') || ['express', 'dotenv', 'tmi.js', 'ws', 'youtube-chat'].some((d) => nome === d || nome.startsWith(d + '@'))
      ? 'Dependencia direta ou essencial'
      : 'Dependencia transitiva (npm)';

    writePacoteMd(dir, {
      nome,
      versao,
      tipo: 'Pacote npm (Node.js)',
      licenca: meta.license || 'Consultar registry.npmjs.org',
      url: `https://www.npmjs.com/package/${nome.split('/').pop()}/v/${versao}`,
      arquivo: arquivo || '-',
      integridade: meta.integrity || '-',
      baixadoEm: NOW,
      uso,
      notas: meta.deprecated ? `DEPRECATED: ${meta.deprecated}` : undefined,
    });

    index.push({ nome, versao, licenca: meta.license || '?', pasta: `npm/${folder}` });
  }

  return { total: entries.length, ok, fail, index };
}

function arquivarPython() {
  const baseDir = path.join(PACOTES, 'python');
  fs.mkdirSync(baseDir, { recursive: true });

  const pkgs = ['PySide6', 'shiboken6', 'PySide6_Essentials', 'PySide6_Addons'];
  const index = [];

  for (const pkg of pkgs) {
    const dir = path.join(baseDir, pkg);
    fs.mkdirSync(dir, { recursive: true });

    try {
      execSync(`python -m pip download ${pkg}==6.11.1 -d "${dir}" --no-deps`, {
        cwd: ROOT,
        stdio: 'pipe',
      });
    } catch {
      try {
        execSync(`python -m pip download ${pkg} -d "${dir}" --no-deps`, {
          cwd: ROOT,
          stdio: 'pipe',
        });
      } catch (e) {
        fs.writeFileSync(path.join(dir, 'ERRO.txt'), String(e.message || e), 'utf8');
      }
    }

    let info = {};
    try {
      const out = execSync(`python -m pip show ${pkg}`, { encoding: 'utf8' });
      for (const line of out.split('\n')) {
        const [k, ...v] = line.split(':');
        if (k && v.length) info[k.trim().toLowerCase()] = v.join(':').trim();
      }
    } catch {}

    const wheels = fs.readdirSync(dir).filter((f) => f.endsWith('.whl') || f.endsWith('.tar.gz'));

    writePacoteMd(dir, {
      nome: pkg,
      versao: info.version || '6.11.1',
      tipo: 'Pacote Python (interface Qt6)',
      licenca: info.license || 'LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only',
      url: info['home-page'] || 'https://pyside.org',
      arquivo: wheels.join(', ') || '-',
      integridade: '-',
      baixadoEm: NOW,
      uso: pkg === 'PySide6' ? 'Interface grafica Qt6 (gui/multichat_app.py)' : 'Dependencia do PySide6',
      licencaTexto: fs.existsSync(path.join(ROOT, 'gui', 'requirements.txt'))
        ? 'PySide6 e LGPL v3. Uso em aplicacao proprietaria: dinamic link permitido. Ver https://www.qt.io/licensing/'
        : undefined,
    });

    index.push({ nome: pkg, versao: info.version || '6.11.1', licenca: info.license || 'LGPL', pasta: `python/${pkg}` });
  }

  return index;
}

function arquivarRuntimes() {
  const index = [];

  const nodeVer = execSync('node --version', { encoding: 'utf8' }).trim();
  const nodeDir = path.join(PACOTES, 'nodejs-runtime');
  fs.mkdirSync(nodeDir, { recursive: true });

  writePacoteMd(nodeDir, {
    nome: 'Node.js',
    versao: nodeVer,
    tipo: 'Runtime (obrigatorio)',
    licenca: 'MIT - https://github.com/nodejs/node/blob/main/LICENSE',
    url: 'https://nodejs.org/',
    arquivo: 'Instalador via winget: OpenJS.NodeJS.LTS',
    integridade: '-',
    baixadoEm: NOW,
    uso: 'Servidor local, npm, conexao Twitch/Kick/YouTube',
    licencaTexto: 'Copyright Node.js contributors. MIT License.',
    notas: 'Binario instalado no sistema em C:\\Program Files\\nodejs\\',
  });
  index.push({ nome: 'Node.js', versao: nodeVer, licenca: 'MIT', pasta: 'nodejs-runtime' });

  const pyVer = execSync('python --version', { encoding: 'utf8' }).trim();
  const pyDir = path.join(PACOTES, 'python-runtime');
  fs.mkdirSync(pyDir, { recursive: true });

  writePacoteMd(pyDir, {
    nome: 'Python',
    versao: pyVer,
    tipo: 'Runtime (interface grafica)',
    licenca: 'PSF License - https://docs.python.org/3/license.html',
    url: 'https://www.python.org/',
    arquivo: 'Instalador: python.org/downloads',
    integridade: '-',
    baixadoEm: NOW,
    uso: 'Executa interface Qt6 (PySide6)',
    notas: 'Binario instalado no sistema.',
  });
  index.push({ nome: 'Python', versao: pyVer, licenca: 'PSF', pasta: 'python-runtime' });

  const chromeDir = path.join(PACOTES, 'puppeteer-chrome');
  fs.mkdirSync(chromeDir, { recursive: true });
  const chromePath = path.join(
    process.env.USERPROFILE || '',
    '.cache',
    'puppeteer',
    'chrome',
    'win64-131.0.6778.204',
    'chrome-win64',
    'chrome.exe'
  );

  writePacoteMd(chromeDir, {
    nome: 'Chromium (Puppeteer)',
    versao: '131.0.6778.204',
    tipo: 'Binario (dependencia @retconned/kick-js)',
    licenca: 'BSD - Chromium Project',
    url: 'https://www.chromium.org/',
    arquivo: fs.existsSync(chromePath) ? chromePath : 'Baixado via: npx puppeteer browsers install chrome',
    integridade: '-',
    baixadoEm: NOW,
    uso: 'Bypass Cloudflare para chat do Kick',
    notas: 'Gerenciado pelo pacote puppeteer. Nao redistribuir sem cumprir licenca Chromium.',
  });
  index.push({ nome: 'Chromium/Puppeteer', versao: '131.0.6778.204', licenca: 'BSD', pasta: 'puppeteer-chrome' });

  return index;
}

function arquivarProjeto() {
  const dir = path.join(PACOTES, 'meu-multichat');
  fs.mkdirSync(dir, { recursive: true });

  writePacoteMd(dir, {
    nome: 'meu-multichat',
    versao: '1.0.0',
    tipo: 'Projeto proprio',
    licenca: 'Uso do autor',
    url: '-',
    arquivo: 'Codigo-fonte na raiz do repositorio',
    integridade: '-',
    baixadoEm: NOW,
    uso: 'Overlay multichat OBS - Twitch, Kick, YouTube',
  });
}

function writeIndex(sections) {
  const lines = [
    '# Indice de Pacotes - Meu Multichat',
    '',
    `Gerado em: **${NOW}**`,
    '',
    'Este diretorio contem copias arquivadas e documentacao de licencas de todos os pacotes usados pelo programa.',
    '',
    '## Estrutura',
    '',
    '| Pasta | Conteudo |',
    '|-------|----------|',
    '| `nodejs-runtime/` | Runtime Node.js |',
    '| `python-runtime/` | Runtime Python |',
    '| `python/` | PySide6 e dependencias Qt (interface) |',
    '| `npm/` | Todos os pacotes npm (package-lock.json) |',
    '| `puppeteer-chrome/` | Chromium para chat Kick |',
    '| `meu-multichat/` | Este projeto |',
    '',
    'Cada pasta contem `PACOTE.md` com versao, licenca, data do download e arquivo `.tgz` ou `.whl`.',
    '',
    'Para atualizar: `node scripts/arquivar-pacotes.js`',
    '',
  ];

  for (const { titulo, items } of sections) {
    lines.push(`## ${titulo}`, '', '| Pacote | Versao | Licenca | Pasta |', '|--------|--------|---------|-------|');
    for (const i of items) {
      lines.push(`| ${i.nome} | ${i.versao} | ${i.licenca} | ${i.pasta} |`);
    }
    lines.push('');
  }

  fs.writeFileSync(path.join(PACOTES, 'README.md'), lines.join('\n'), 'utf8');
}

async function main() {
  console.log('Arquivando pacotes em', PACOTES);
  fs.mkdirSync(PACOTES, { recursive: true });

  const runtimeIndex = arquivarRuntimes();
  arquivarProjeto();
  const pythonIndex = arquivarPython();
  console.log('Baixando pacotes npm...');
  const npmResult = await arquivarNpm();

  writeIndex([
    { titulo: 'Runtimes', items: runtimeIndex },
    { titulo: 'Python / Qt6', items: pythonIndex },
    { titulo: 'Dependencias npm (resumo)', items: npmResult.index.filter((i) => i.nome.match(/^(express|dotenv|tmi|ws|youtube|@retconned)/)) },
  ]);

  console.log(`npm: ${npmResult.ok}/${npmResult.total} baixados, ${npmResult.fail} falhas`);
  console.log('Concluido. Veja pacotes/README.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
