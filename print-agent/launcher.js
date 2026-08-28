const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const PID_PATH = path.join(ROOT, 'agent.pid');
const LOG_DIR = path.join(ROOT, 'logs');
const LOG_PATH = path.join(LOG_DIR, 'agent.log');
const MAX_LOG_BYTES = 5 * 1024 * 1024;

let child = null;
let stopping = false;

function ensureDirs() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateLog() {
  try {
    const stat = fs.statSync(LOG_PATH);
    if (stat.size < MAX_LOG_BYTES) return;
    const old = path.join(LOG_DIR, 'agent.old.log');
    try { fs.unlinkSync(old); } catch {}
    fs.renameSync(LOG_PATH, old);
  } catch {}
}

function isPidAlive(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock() {
  let oldPid = 0;
  try { oldPid = Number(fs.readFileSync(PID_PATH, 'utf8').trim()); } catch {}
  if (isPidAlive(oldPid)) {
    process.exit(0);
  }
  fs.writeFileSync(PID_PATH, String(process.pid), 'utf8');
}

function releaseLock() {
  try {
    const current = Number(fs.readFileSync(PID_PATH, 'utf8').trim());
    if (current === process.pid) fs.unlinkSync(PID_PATH);
  } catch {}
}

function log(message) {
  ensureDirs();
  rotateLog();
  fs.appendFileSync(LOG_PATH, `[${new Date().toLocaleString('pt-BR')}] ${message}\r\n`, 'utf8');
}

function launchAgent() {
  if (stopping) return;
  ensureDirs();
  rotateLog();
  const out = fs.openSync(LOG_PATH, 'a');

  log('Iniciando Brasinha Print Agent.');
  child = spawn(process.execPath, [path.join(ROOT, 'agent.js')], {
    cwd: ROOT,
    windowsHide: true,
    stdio: ['ignore', out, out],
    env: process.env
  });

  child.once('exit', (code, signal) => {
    try { fs.closeSync(out); } catch {}
    child = null;
    if (stopping) return;
    log(`Agente encerrou (code=${code ?? '-'}, signal=${signal ?? '-'}). Reiniciando em 5 segundos.`);
    setTimeout(launchAgent, 5000);
  });

  child.once('error', err => {
    log(`Falha ao iniciar agente: ${err.message}`);
  });
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  log('Encerrando Brasinha Print Agent.');
  try { child?.kill(); } catch {}
  releaseLock();
  setTimeout(() => process.exit(0), 300);
}

ensureDirs();
acquireLock();
process.on('exit', releaseLock);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);
process.on('uncaughtException', err => {
  log(`Erro no launcher: ${err.stack || err.message}`);
  shutdown();
});

launchAgent();
