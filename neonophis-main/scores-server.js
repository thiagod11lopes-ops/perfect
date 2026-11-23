// Servidor de hi-scores para produção — Node.js puro, sem dependências.
// Roda na VPS com pm2, Apache faz proxy de /neonophis/__api/ para ele.
//
// Setup:
//   pm2 start scores-server.js --name neonophis-scores
//   pm2 save && pm2 startup
//
// Apache VirtualHost (adicionar dentro do <VirtualHost>):
//   ProxyPass        /neonophis/__api/ http://127.0.0.1:3001/
//   ProxyPassReverse /neonophis/__api/ http://127.0.0.1:3001/
//
// Variáveis de ambiente opcionais:
//   PORT        — porta TCP (padrão: 3001)
//   SCORES_FILE — caminho absoluto do highscores.json
//                 (padrão: highscores.json na mesma pasta deste script)

const http = require('node:http');
const {
  readFile,
  writeFile
} = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3001;
const SCORES_FILE = (() => {
  const env = process.env.SCORES_FILE || path.resolve(__dirname, 'highscores.json');
  const resolved = path.resolve(env); // canonicalizar
  const allowed = path.resolve(__dirname, 'highscores.json').split(path.sep)[0]; // raiz permitida
  if (!resolved.startsWith(allowed)) {
    throw new Error(`SCORES_FILE must be within ${allowed}`);
  }
  return resolved;
})();
const EMPTY = '{"classic":[],"chaos":[],"timeattack":[],"relax":[]}\n';

// Controle de taxa simples em memória
const rateLimit = {};
const LIMIT = 10; // 10 req por IP por minuto
const WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => now - t < WINDOW);
  if (rateLimit[ip].length >= LIMIT) return false;
  rateLimit[ip].push(now);
  return true;
}

const server = http.createServer((req, res) => {
  // Apache ProxyPass tira o prefixo /neonophis/__api/ e envia /scores
  if (req.url !== '/scores' && req.url !== '/scores/') {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    res.statusCode = 429;
    res.end(JSON.stringify({ ok: false, error: 'Too Many Requests' }));
    return;
  }

  if (req.method === 'GET') {
    readFile(SCORES_FILE, 'utf8')
      .then(data => res.end(data))
      .catch(() => res.end(EMPTY));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    let tooLarge = false;
    const MAX_BODY_SIZE = 1024 * 100; // 100 KB

    req.on('data', chunk => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        tooLarge = true;
        res.statusCode = 413;
        res.end(JSON.stringify({ ok: false, error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (tooLarge) return;
      void (async () => {
        try {
          const { mode, entry } = JSON.parse(body);
          if (!mode || !entry) throw new Error('Payload inválido: esperado {mode, entry}');

          let current = {};
          try {
            const data = await readFile(SCORES_FILE, 'utf8');
            current = JSON.parse(data);
          } catch {
            current = JSON.parse(EMPTY);
          }

          if (!current[mode]) current[mode] = [];
          current[mode].push(entry);
          current[mode].sort((a, b) => b.score - a.score);
          current[mode] = current[mode].slice(0, 5);

          const json = JSON.stringify(current, null, 2) + '\n';
          await writeFile(SCORES_FILE, json, 'utf8');
          console.log(`[scores] novo score para ${mode}: ${entry.playerName} (${entry.score})`);
          res.end(json);
        } catch (err) {
          console.error('[scores] erro:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: String(err) }));
        }
      })();
    });
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ ok: false }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[scores] http://127.0.0.1:${PORT}  →  ${SCORES_FILE}`);
});
