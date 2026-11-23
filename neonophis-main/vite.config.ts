import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Plugin de proteção: aborta `vite build` se algo de src/lab/ ou lab.html
// for puxado pelo grafo de produção. O lab é dev-only — qualquer tentativa
// de empacotar é um bug de configuração que precisa estourar alto.
//
// `apply: 'build'` faz o plugin rodar SOMENTE em `vite build`. No
// `vite dev` ele fica inativo e o lab funciona normalmente.
function devOnlyLabProtection(): Plugin {
  const BANNED_FRAGMENTS = ['/src/lab/', '\\src\\lab\\', '/lab.html', '\\lab.html'];
  const isBanned = (id: string): boolean =>
    BANNED_FRAGMENTS.some((fragment) => id.includes(fragment));

  return {
    name: 'neonophis-dev-only-lab',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (isBanned(source)) {
        throw new Error(
          `[neonophis-lab] proteção dev-only: import de "${source}"` +
            (importer ? ` por "${importer}"` : '') +
            ' não é permitido em build de produção. O Audio Lab é dev-only.'
        );
      }
      return null;
    },
    load(id) {
      if (isBanned(id)) {
        throw new Error(
          `[neonophis-lab] proteção dev-only: arquivo "${id}" entrou no ` +
            'grafo de produção. O Audio Lab é dev-only.'
        );
      }
      return null;
    },
  };
}

// Plugin serve: endpoints GET/POST /__api/scores para ler/gravar highscores.json
// na raiz do projeto. Segue o mesmo padrão do labConfigSaver.
function highscoreServer(): Plugin {
  const ENDPOINT = '/__api/scores';
  return {
    name: 'neonophis-highscore-server',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root;
      const scoresFile = path.resolve(root, 'highscores.json');
      console.log('[neonophis] highscores endpoint registrado:', scoresFile);

      server.middlewares.use(ENDPOINT, (req, res) => {
        if (req.method === 'GET') {
          void (async (): Promise<void> => {
            try {
              const raw = await readFile(scoresFile, 'utf8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(raw);
            } catch {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end('{"classic":[],"chaos":[],"timeattack":[],"relax":[]}');
            }
          })();
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            void (async (): Promise<void> => {
              try {
                const parsed = JSON.parse(body) as unknown;
                const json = JSON.stringify(parsed, null, 2) + '\n';
                await writeFile(scoresFile, json, 'utf8');
                console.log('[neonophis] highscores gravado em', scoresFile);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
              } catch (err) {
                console.error('[neonophis] erro ao gravar highscores:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: String(err) }));
              }
            })();
          });
          return;
        }
        res.statusCode = 405;
        res.end('Method Not Allowed');
      });
    },
    configurePreviewServer(server) {
      const root = server.config.root;
      const scoresFile = path.resolve(root, 'highscores.json');
      console.log('[neonophis] highscores endpoint registrado (preview):', scoresFile);

      server.middlewares.use(ENDPOINT, (req, res) => {
        if (req.method === 'GET') {
          void (async (): Promise<void> => {
            try {
              const raw = await readFile(scoresFile, 'utf8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(raw);
            } catch {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end('{"classic":[],"chaos":[],"timeattack":[],"relax":[]}');
            }
          })();
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            void (async (): Promise<void> => {
              try {
                const parsed = JSON.parse(body) as unknown;
                const json = JSON.stringify(parsed, null, 2) + '\n';
                await writeFile(scoresFile, json, 'utf8');
                console.log('[neonophis] highscores gravado em', scoresFile);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
              } catch (err) {
                console.error('[neonophis] erro ao gravar highscores:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: String(err) }));
              }
            })();
          });
          return;
        }
        res.statusCode = 405;
        res.end('Method Not Allowed');
      });
    },
  };
}


// Plugin DEV-ONLY: endpoint que persiste o MusicConfig editado no lab para
// src/audio/musicConfig.override.json. O jogo importa esse JSON no boot
// (via import.meta.glob — ver musicConfig.ts) e o usa no lugar do
// DEFAULT_MUSIC_CONFIG hardcoded.
//
// `apply: 'serve'` + configureServer => só existe no dev server. Nunca entra
// no build de produção (configureServer não roda em `vite build`).
function labConfigSaver(): Plugin {
  const ENDPOINT = '/__lab/save-music-config';
  return {
    name: 'neonophis-lab-config-saver',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root;
      const target = path.resolve(root, 'src/audio/musicConfig.override.json');

      server.middlewares.use(ENDPOINT, (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          void (async (): Promise<void> => {
            try {
              // Valida que é JSON parseável antes de gravar.
              const parsed = JSON.parse(body) as unknown;
              const json = JSON.stringify(parsed, null, 2) + '\n';
              await writeFile(target, json, 'utf8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, bytes: json.length, path: 'src/audio/musicConfig.override.json' }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          })();
        });
      });
    },
  };
}

// Em DEV, Vite serve qualquer .html da raiz automaticamente, então
// /lab.html já é acessível em http://localhost:5173/lab.html.
//
// Em PROD, o input default é apenas `index.html`. Logo, lab.html não é
// processado nem copiado para dist/. Combinado com o plugin acima,
// isso garante zero bytes do lab no bundle de produção.
export default defineConfig({
  base: './',
  plugins: [highscoreServer(), devOnlyLabProtection(), labConfigSaver()],
  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
      },
    },
    cssMinify: 'esbuild',
    reportCompressedSize: true,
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
    '.ngrok-free.dev'
    ]
  },
});
