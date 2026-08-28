const crypto = require('crypto');
const vm = require('vm');

const REPO = process.env.GITHUB_REPO || 'AdrielSchimit/Brasinha.Digital';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const [OWNER, REPO_NAME] = REPO.split('/');

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce((acc, part) => {
    const i = part.indexOf('=');
    if (i > -1) acc[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    return acc;
  }, {});
}

function sessionValue() {
  const password = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.SESSION_SECRET || '';
  if (!password || !secret) return '';
  return crypto.createHmac('sha256', secret).update(`brasinha-admin:${password}`).digest('hex');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function isAuthenticated(req) {
  const expected = sessionValue();
  if (!expected) return false;
  return safeEqual(parseCookies(req).brasinha_admin, expected);
}

function authCookie(value, maxAge = 60 * 60 * 24 * 7) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  return `brasinha_admin=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN não configurado na Vercel.');
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO_NAME}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'brasinha-digital-admin',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || `GitHub retornou ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

async function readCatalog() {
  const file = await github(`/contents/data.js?ref=${encodeURIComponent(BRANCH)}`);
  const source = Buffer.from(file.content, 'base64').toString('utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nthis.__catalog={BRASINHA_CONFIG,CATEGORY_IMAGES,MENU};`, sandbox, { timeout: 1000 });
  return {
    config: JSON.parse(JSON.stringify(sandbox.__catalog.BRASINHA_CONFIG)),
    categoryImages: JSON.parse(JSON.stringify(sandbox.__catalog.CATEGORY_IMAGES)),
    menu: JSON.parse(JSON.stringify(sandbox.__catalog.MENU)),
    sha: file.sha
  };
}

function serializeCatalog({ config, categoryImages, menu }) {
  return `const BRASINHA_CONFIG = ${JSON.stringify(config, null, 2)};\n\nconst CATEGORY_IMAGES = ${JSON.stringify(categoryImages, null, 2)};\n\nconst MENU = ${JSON.stringify(menu, null, 2)};\n\nconst BORDERS = MENU.find(x=>x.id==='bordas').items;\n`;
}

async function writeCatalog(payload, sha) {
  const content = serializeCatalog(payload);
  return github('/contents/data.js', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'admin: atualizar cardápio Brasinha',
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha,
      branch: BRANCH
    })
  });
}

function slugify(value) {
  return String(value || 'produto').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'produto';
}

module.exports = {
  sendJson,
  safeEqual,
  sessionValue,
  authCookie,
  isAuthenticated,
  github,
  readCatalog,
  writeCatalog,
  slugify,
  REPO,
  BRANCH
};