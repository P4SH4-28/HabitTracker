const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3100;
const DB = path.join(__dirname, 'data-test.db');
for (const f of [DB, DB + '-wal', DB + '-shm']) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const server = spawn(process.execPath, ['index.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(PORT), TURSO_URL: 'file:' + DB },
  stdio: 'ignore',
});

const waitFor = (fn, tries = 50) =>
  new Promise((resolve) => {
    let n = 0;
    const tick = async () => {
      if (await fn()) return resolve(true);
      if (++n > tries) return resolve(false);
      setTimeout(tick, 200);
    };
    tick();
  });

(async () => {
  const up = await waitFor(async () => {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/health`);
      return r.status === 200;
    } catch (e) {
      return false;
    }
  });
  if (!up) {
    console.error('Sunucu açılmadı');
    process.exit(1);
  }
  const test = spawn(process.execPath, ['test.mjs'], {
    cwd: __dirname,
    env: { ...process.env, BASE: `http://localhost:${PORT}` },
    stdio: 'inherit',
  });
  test.on('exit', (code) => {
    server.kill();
    const cleanup = () => {
      for (const f of [DB, DB + '-wal', DB + '-shm']) {
        try {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        } catch (e) {
          // Windows'ta dosya kilidi bir an daha sürebilir; kilit açılınca silinir.
        }
      }
    };
    server.on('exit', cleanup);
    setTimeout(cleanup, 500);
    process.exit(code ?? 1);
  });
})();
