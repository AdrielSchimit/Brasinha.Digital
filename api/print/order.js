const crypto = require('crypto');
const { github, sendJson } = require('../../lib/admin-server');

const QUEUE_ISSUE = Number(process.env.PRINT_QUEUE_ISSUE || 1);
const MAX_ITEMS = 60;

function encrypt(payload, secret) {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return `BRASINHA_PRINT:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function cleanText(value, max = 220) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function normalizeOrder(body) {
  const items = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS).map(item => ({
    name: cleanText(item?.name, 120),
    detail: cleanText(item?.detail, 220),
    qty: Math.max(1, Math.min(99, Number(item?.qty) || 1)),
    price: Math.max(0, Number(item?.price) || 0)
  })).filter(item => item.name) : [];

  if (!items.length) throw Object.assign(new Error('Pedido sem itens.'), { status: 400 });

  const customer = body?.customer || {};
  const order = {
    id: cleanText(body?.id, 80) || crypto.randomUUID(),
    source: 'brasinha-web-v1',
    createdAt: new Date().toISOString(),
    customer: {
      name: cleanText(customer.name, 100),
      phone: cleanText(customer.phone, 40),
      street: cleanText(customer.street, 160),
      number: cleanText(customer.number, 40),
      neighborhood: cleanText(customer.neighborhood, 100),
      reference: cleanText(customer.reference, 180)
    },
    fulfillment: body?.fulfillment === 'Retirada' ? 'Retirada' : 'Entrega',
    payment: ['Pix', 'Cartão', 'Dinheiro'].includes(body?.payment) ? body.payment : 'Pix',
    cashChange: cleanText(body?.cashChange, 60),
    notes: cleanText(body?.notes, 350),
    items,
    subtotal: Math.max(0, Number(body?.subtotal) || 0),
    deliveryFee: body?.deliveryFee == null ? null : Math.max(0, Number(body.deliveryFee) || 0),
    total: Math.max(0, Number(body?.total) || 0)
  };

  if (!order.customer.name) throw Object.assign(new Error('Cliente sem nome.'), { status: 400 });
  return order;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método não permitido.' });

  const secret = process.env.PRINT_QUEUE_SECRET || '';
  if (!secret) return sendJson(res, 503, { error: 'Fila de impressão ainda não configurada.' });

  try {
    const order = normalizeOrder(req.body || {});
    const envelope = encrypt(order, secret);
    await github(`/issues/${QUEUE_ISSUE}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: envelope })
    });
    return sendJson(res, 202, { ok: true, id: order.id });
  } catch (error) {
    console.error('print-queue', error);
    return sendJson(res, error.status || 500, { error: error.message || 'Falha ao enfileirar impressão.' });
  }
};