const { sendJson, isAuthenticated, readCatalog, writeCatalog } = require('./_lib');

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return sendJson(res, 401, { error: 'Não autorizado.' });

  try {
    if (req.method === 'GET') {
      const catalog = await readCatalog();
      return sendJson(res, 200, catalog);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      if (!Array.isArray(body.menu) || !body.config || !body.categoryImages) {
        return sendJson(res, 400, { error: 'Cardápio inválido.' });
      }
      const current = await readCatalog();
      const result = await writeCatalog({
        config: body.config,
        categoryImages: body.categoryImages,
        menu: body.menu
      }, body.sha || current.sha);
      return sendJson(res, 200, { ok: true, sha: result.content?.sha || null, commit: result.commit?.sha || null });
    }

    return sendJson(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error(error);
    return sendJson(res, error.status || 500, { error: error.message || 'Falha ao acessar o cardápio.' });
  }
};