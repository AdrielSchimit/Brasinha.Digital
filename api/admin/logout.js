const { sendJson, authCookie } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método não permitido.' });
  res.setHeader('Set-Cookie', authCookie('', 0));
  return sendJson(res, 200, { ok: true });
};