const { sendJson, safeEqual, sessionValue, authCookie } = require('../../lib/admin-server');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método não permitido.' });
  const configured = process.env.ADMIN_PASSWORD || '';
  if (!configured || !process.env.GITHUB_TOKEN) {
    return sendJson(res, 503, { error: 'Admin ainda não configurado na Vercel.' });
  }
  const password = req.body?.password || '';
  if (!safeEqual(password, configured)) return sendJson(res, 401, { error: 'Senha incorreta.' });
  res.setHeader('Set-Cookie', authCookie(sessionValue()));
  return sendJson(res, 200, { ok: true });
};