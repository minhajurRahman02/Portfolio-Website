/* Vercel serverless function: validates a contact message and hands it to
   Brevo's transactional-email API. The API key only ever exists here — it is
   never shipped to the browser. */

const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* Memory-only rate limit. Vercel may run several instances, so this is a
   speed bump against a single noisy client, not a real quota — Brevo's own
   limits are the backstop. */
const hits = new Map();
const WINDOW = 10 * 60 * 1000;
const MAX = 5;

function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // crude ceiling, a cold start resets it anyway
  return list.length > MAX;
}

/* Only this site's own pages may post here. A browser always sends Origin on
   a cross-site POST, so a page on another domain (or a bare script that
   omits it) cannot use this endpoint to spam the inbox. Extra origins — a
   custom domain behind a proxy, say — can be listed in ALLOWED_ORIGINS,
   comma-separated. */
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  let host;
  try { host = new URL(origin).host; } catch { return false; }
  const self = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  if (host === self) return true;
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return extra.includes(origin);
}

/* Vercel sets these itself and overwrites anything the client sent, unlike
   the first hop of x-forwarded-for, which a client can pre-fill. */
function clientIp(req) {
  const h = req.headers;
  return (
    (h['x-vercel-forwarded-for'] || h['x-real-ip'] || h['x-forwarded-for'] || '')
      .toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

const MAX_BYTES = 16 * 1024;

const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!originAllowed(req)) return res.status(403).json({ error: 'Forbidden' });
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) {
    return res.status(415).json({ error: 'Expected JSON' });
  }
  if (Number(req.headers['content-length'] || 0) > MAX_BYTES) {
    return res.status(413).json({ error: 'Message is too long' });
  }

  const key = process.env.BREVO_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!key || !to || !from) {
    return res.status(500).json({ error: 'Mail is not configured on this deployment' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Malformed JSON' }); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Empty request' });

  // the honeypot field is invisible to a real visitor, so anything in it is a bot
  if (clean(body.company, 80)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 180);
  const message = String(body.message ?? '').trim().slice(0, 5000);

  if (name.length < 2) return res.status(400).json({ error: 'Name is too short' });
  if (!MAIL.test(email)) return res.status(400).json({ error: 'That email address looks wrong' });
  if (message.length < 6) return res.status(400).json({ error: 'Message is too short' });

  const ip = clientIp(req);
  if (tooMany(ip)) return res.status(429).json({ error: 'Too many messages — try again later' });

  const payload = {
    sender: { email: from, name: process.env.CONTACT_FROM_NAME || 'Portfolio' },
    to: [{ email: to }],
    replyTo: { email, name },
    subject: `Portfolio message from ${name}`,
    textContent: `From: ${name} <${email}>\nIP: ${ip}\n\n${message}`,
    htmlContent:
      `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt;</p>` +
      `<p style="white-space:pre-wrap">${esc(message)}</p>` +
      `<hr><p style="color:#888;font-size:12px">via the portfolio contact form · ${esc(ip)}</p>`,
  };

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    clearTimeout(timer);

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('brevo rejected the message', r.status, detail);
      return res.status(502).json({ error: 'The mail provider rejected the message' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('brevo request failed', err);
    const aborted = err?.name === 'AbortError';
    return res.status(504).json({ error: aborted ? 'The mail provider timed out' : 'Could not reach the mail provider' });
  }
}
