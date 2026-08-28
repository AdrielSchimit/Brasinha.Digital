const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, 'config.json');
const STATE_PATH = path.join(ROOT, 'state.json');

function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

const fileConfig = readJson(CONFIG_PATH);
const config = {
  githubToken: process.env.GITHUB_TOKEN || fileConfig.githubToken || '',
  repo: process.env.GITHUB_REPO || fileConfig.repo || 'AdrielSchimit/Brasinha.Digital',
  issue: Number(process.env.PRINT_QUEUE_ISSUE || fileConfig.issue || 1),
  queueSecret: process.env.PRINT_QUEUE_SECRET || fileConfig.queueSecret || '',
  printerName: process.env.PRINTER_NAME || fileConfig.printerName || '',
  paperWidth: Number(process.env.PAPER_WIDTH || fileConfig.paperWidth || 42),
  pollSeconds: Math.max(3, Number(process.env.POLL_SECONDS || fileConfig.pollSeconds || 5)),
  sound: fileConfig.sound !== false
};

function fail(message) { console.error(`\n[ERRO] ${message}\n`); process.exit(1); }
function money(n) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0); }
function hr(char = '-') { return char.repeat(Math.max(24, config.paperWidth)); }
function center(text) { text = String(text); const pad = Math.max(0, Math.floor((config.paperWidth - text.length) / 2)); return ' '.repeat(pad) + text; }
function wrap(text, width = config.paperWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean); const lines = []; let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}
function row(left, right) {
  left = String(left); right = String(right); const gap = Math.max(1, config.paperWidth - left.length - right.length);
  if (left.length + right.length + 1 > config.paperWidth) return `${left}\n${' '.repeat(Math.max(0, config.paperWidth - right.length))}${right}`;
  return left + ' '.repeat(gap) + right;
}

function decrypt(body) {
  const parts = String(body || '').trim().split(':');
  if (parts.length !== 6 || parts[0] !== 'BRASINHA_PRINT' || parts[1] !== 'v1') return null;
  const secret = config.queueSecret;
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = Buffer.from(parts[2], 'base64');
  const tag = Buffer.from(parts[3], 'base64');
  const encrypted = Buffer.from(parts[4] + ':' + parts[5], 'base64');
  // Compatibilidade: base64 não contém dois-pontos; o join acima só protege contra parse inesperado.
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  return JSON.parse(plain);
}

function decryptEnvelope(body) {
  const prefix = 'BRASINHA_PRINT:v1:';
  if (!String(body || '').startsWith(prefix)) return null;
  const payload = String(body).slice(prefix.length).split(':');
  if (payload.length !== 3) return null;
  const [iv64, tag64, cipher64] = payload;
  const key = crypto.createHash('sha256').update(config.queueSecret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv64, 'base64'));
  decipher.setAuthTag(Buffer.from(tag64, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(cipher64, 'base64')), decipher.final()]).toString('utf8'));
}

function receipt(order) {
  const out = [];
  out.push(center('BRASINHA'));
  out.push(center('PIZZARIA & CHOPPERIA'));
  out.push(hr('='));
  out.push(center('NOVO PEDIDO'));
  out.push(hr('='));
  out.push(`Pedido: ${order.id}`);
  out.push(new Date(order.createdAt).toLocaleString('pt-BR'));
  out.push(hr());
  out.push('CLIENTE');
  out.push(order.customer?.name || '');
  if (order.customer?.phone) out.push(order.customer.phone);
  out.push(hr());
  out.push(order.fulfillment === 'Retirada' ? 'RETIRADA' : 'ENTREGA');
  if (order.fulfillment === 'Entrega') {
    out.push(...wrap(`${order.customer?.street || ''}, ${order.customer?.number || ''}`));
    if (order.customer?.neighborhood) out.push(`Bairro: ${order.customer.neighborhood}`);
    if (order.customer?.reference) out.push(...wrap(`Ref.: ${order.customer.reference}`));
  } else out.push('Retirada no balcão');
  out.push(hr());

  for (const item of order.items || []) {
    out.push(`${item.qty}x ${String(item.name || '').toUpperCase()}`);
    if (item.detail) out.push(...wrap(item.detail));
    out.push(row('', money((Number(item.price) || 0) * (Number(item.qty) || 1))));
    out.push('');
  }

  out.push(hr());
  out.push(row('Subtotal', money(order.subtotal)));
  if (order.fulfillment === 'Entrega') out.push(row('Entrega', order.deliveryFee == null ? 'A CONFIRMAR' : money(order.deliveryFee)));
  out.push(row('TOTAL', money(order.total)));
  out.push(hr());
  out.push(`Pagamento: ${order.payment || 'Não informado'}`);
  if (order.payment === 'Dinheiro' && order.cashChange) out.push(`Troco para: ${order.cashChange}`);
  if (order.notes) { out.push(hr()); out.push('OBSERVACAO'); out.push(...wrap(order.notes)); }
  out.push(hr('='));
  out.push(center('PEDIDO RECEBIDO PELO SITE'));
  out.push('\n\n\n');
  return out.join('\r\n');
}

function powershellEscape(s) { return String(s).replace(/'/g, "''"); }
function printText(text) {
  const temp = path.join(os.tmpdir(), `brasinha-${Date.now()}.txt`);
  fs.writeFileSync(temp, text, 'utf8');
  const file = powershellEscape(temp);
  const printer = powershellEscape(config.printerName);
  const cmd = config.printerName
    ? `Get-Content -Raw -Encoding UTF8 '${file}' | Out-Printer -Name '${printer}'`
    : `Get-Content -Raw -Encoding UTF8 '${file}' | Out-Printer`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { encoding: 'utf8' });
  try { fs.unlinkSync(temp); } catch {}
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'Falha ao imprimir').trim());
  if (config.sound) spawnSync('powershell.exe', ['-NoProfile', '-Command', '[console]::beep(1000,250)'], { windowsHide: true });
}

async function github(url) {
  const res = await fetch(url, { headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${config.githubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'brasinha-print-agent'
  }});
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json();
}

function saveState(state) { fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2)); }

async function pollOnce(state) {
  const since = state.lastCreatedAt ? `&since=${encodeURIComponent(state.lastCreatedAt)}` : '';
  const url = `https://api.github.com/repos/${config.repo}/issues/${config.issue}/comments?per_page=100${since}`;
  const comments = await github(url);
  if (!state.initialized) {
    const latest = comments.at(-1);
    state.initialized = true;
    state.lastId = latest?.id || 0;
    state.lastCreatedAt = latest?.created_at || new Date().toISOString();
    saveState(state);
    console.log('Fila sincronizada. Aguardando novos pedidos...');
    return;
  }

  const fresh = comments.filter(c => Number(c.id) > Number(state.lastId || 0));
  for (const comment of fresh) {
    try {
      const order = decryptEnvelope(comment.body);
      if (order) {
        console.log(`Novo pedido ${order.id} — imprimindo...`);
        printText(receipt(order));
        console.log(`OK: ${order.id}`);
      }
    } catch (err) {
      console.error(`Falha no comentário ${comment.id}:`, err.message);
    } finally {
      state.lastId = Math.max(Number(state.lastId || 0), Number(comment.id || 0));
      state.lastCreatedAt = comment.created_at || new Date().toISOString();
      saveState(state);
    }
  }
}

async function main() {
  if (process.platform !== 'win32') fail('Este MVP imprime via spooler do Windows.');
  if (!config.githubToken) fail('Informe githubToken em print-agent/config.json.');
  if (!config.queueSecret) fail('Informe queueSecret em print-agent/config.json.');

  if (process.argv.includes('--test')) {
    printText(receipt({
      id: 'TESTE-001', createdAt: new Date().toISOString(),
      customer: { name: 'Pedido de teste', phone: '(67) 99999-9999', street: 'Rua Teste', number: '123', neighborhood: 'Centro', reference: 'Portão preto' },
      fulfillment: 'Entrega', payment: 'Pix', items: [
        { name: 'Pizza meia a meia', detail: '1/2 Calabresa + 1/2 Fraldinha Supreme · Grande · Borda Catupiry', qty: 1, price: 82 },
        { name: 'Coca-Cola 2 L', detail: 'Bebidas', qty: 1, price: 15 }
      ], subtotal: 97, deliveryFee: 5, total: 102, notes: 'Sem cebola.'
    }));
    console.log('Teste enviado para a impressora.');
    return;
  }

  const state = readJson(STATE_PATH, { initialized: false, lastId: 0, lastCreatedAt: null });
  console.log('BRASINHA PRINT AGENT');
  console.log(`Impressora: ${config.printerName || 'Padrao do Windows'}`);
  console.log(`Fila: ${config.repo}#${config.issue}`);
  while (true) {
    try { await pollOnce(state); } catch (err) { console.error(new Date().toLocaleTimeString('pt-BR'), err.message); }
    await new Promise(r => setTimeout(r, config.pollSeconds * 1000));
  }
}

main().catch(err => fail(err.stack || err.message));