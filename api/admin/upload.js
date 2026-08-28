const { sendJson, isAuthenticated, github, slugify, BRANCH } = require('../../lib/admin-server');

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return sendJson(res, 401, { error: 'Não autorizado.' });
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método não permitido.' });

  try {
    const { dataUrl, name } = req.body || {};
    const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(dataUrl || '');
    if (!match) return sendJson(res, 400, { error: 'Imagem inválida. Use JPG, PNG ou WebP.' });

    const ext = match[1].toLowerCase().replace('jpeg', 'jpg');
    const base64 = match[2];
    const bytes = Buffer.byteLength(base64, 'base64');
    if (bytes > 2.5 * 1024 * 1024) return sendJson(res, 413, { error: 'Imagem muito grande. Escolha uma foto menor.' });

    const fileName = `${slugify(name)}-${Date.now()}.${ext}`;
    const path = `assets/products/${fileName}`;
    await github(`/contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `admin: atualizar foto de ${name || 'produto'}`,
        content: base64,
        branch: BRANCH
      })
    });

    return sendJson(res, 200, { ok: true, path });
  } catch (error) {
    console.error(error);
    return sendJson(res, error.status || 500, { error: error.message || 'Falha ao enviar imagem.' });
  }
};