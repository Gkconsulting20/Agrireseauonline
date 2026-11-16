import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

const GENERIC_RESPONSE = {
  success: true,
  message: 'Si ce compte possède une adresse email, un lien de récupération lui sera envoyé. Sinon, contactez l’administration.'
};

// Never build recovery URLs from the untrusted request Host header.
export function createResetDelivery(env = process.env) {
  let origin;
  try {
    const url = new URL(env.PASSWORD_RESET_ORIGIN);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    origin = url.origin;
  } catch { return null; }
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) return null;
  const port = Number(env.SMTP_PORT || 465);
  if (![465, 587].includes(port)) return null;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port, secure: port === 465, requireTLS: true,
    auth: {user: env.SMTP_USER, pass: env.SMTP_PASSWORD},
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false, debug: false
  });
  return async ({email, token}) => {
    const link = `${origin}/#reset-password?token=${encodeURIComponent(token)}`;
    const result = await transport.sendMail({
      from: env.SMTP_FROM, to: {address: email, name: ''},
      subject: 'AgriRéseau — récupération de votre compte',
      text: `Pour choisir un nouveau mot de passe, ouvrez ce lien :\n${link}\n\nCe lien est valable 30 minutes et une seule fois. Si vous n’avez rien demandé, ignorez ce message.`
    });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('reset_email_rejected');
  };
}

export const hashResetToken = token => crypto.createHash('sha256').update(`password-reset-v2:${token}`).digest('hex');

// Small bounded process-local limiter; no account identifiers or tokens are logged.
function limiter(max, windowMs) {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || {count: 0, until: now + windowMs};
    if (entry.count >= max || (!attempts.has(key) && attempts.size >= 10000)) {
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      return res.status(429).json({error: 'too_many_requests', message: 'Trop de tentatives. Réessayez plus tard.'});
    }
    entry.count++;
    attempts.set(key, entry);
    next();
  };
}

export function mountPasswordRecovery(app, db, {deliver = createResetDelivery()} = {}) {
  app.post('/api/auth/forgot-password', limiter(5, 15 * 60 * 1000), async (req, res) => {
    const {email, phone} = req.body;
    if ((!email && !phone) || (email && typeof email !== 'string') || (phone && typeof phone !== 'string')) {
      return res.status(400).json({error: 'email_or_phone_required'});
    }
    if (!deliver) return res.status(503).json({
      error: 'recovery_unavailable',
      message: 'La récupération par email est indisponible. Contactez l’administration. Aucun lien n’a été généré.'
    });
    try {
      const user = email
        ? await db.getOne('SELECT id, email, status FROM users WHERE email=$1', [email.trim().toLowerCase()])
        : await db.getOne('SELECT id, email, status FROM users WHERE phone=$1', [phone.replace(/\s+/g, '')]);
      // Send only to the stored email, never an address supplied as a delivery destination.
      if (user?.email && user.status !== 'blocked') {
        const token = crypto.randomBytes(32).toString('hex');
        const digest = hashResetToken(token);
        await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user.id]);
        await db.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [user.id, digest, new Date(Date.now() + 30 * 60 * 1000)]);
        try {
          await deliver({email: user.email, token});
        } catch {
          await db.query('DELETE FROM password_reset_tokens WHERE token=$1', [digest]);
          // Do not expose provider errors, contact details, or whether the account exists.
          console.error('Password recovery email delivery failed');
        }
      }
      return res.json(GENERIC_RESPONSE);
    } catch {
      return res.status(503).json({error: 'recovery_unavailable', message: 'La récupération est temporairement indisponible.'});
    }
  });

  app.post('/api/auth/reset-password', limiter(10, 15 * 60 * 1000), async (req, res) => {
    const {token, newPassword} = req.body;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({error: 'invalid_or_expired_token', message: 'Lien invalide ou expiré.'});
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({error: 'invalid_password', message: 'Choisissez un mot de passe de 8 caractères minimum (72 octets maximum).'});
    }
    try {
      const newHash = await bcrypt.hash(newPassword, 10);
      // One statement: concurrent requests cannot use the same token twice.
      // Old plaintext tokens exposed by the previous API cannot match this digest.
      const result = await db.query(`
        WITH consumed AS (
          DELETE FROM password_reset_tokens
          WHERE token=$1 AND expires_at > NOW()
          RETURNING user_id
        )
        UPDATE users SET password_hash=$2
        WHERE id IN (SELECT user_id FROM consumed) AND status IS DISTINCT FROM 'blocked'
        RETURNING id`, [hashResetToken(token), newHash]);
      if (!result.rows.length) return res.status(400).json({error: 'invalid_or_expired_token', message: 'Lien invalide ou expiré.'});
      req.session.destroy(() => {});
      return res.json({success: true, message: 'Mot de passe réinitialisé. Reconnectez-vous.'});
    } catch {
      return res.status(503).json({error: 'recovery_unavailable', message: 'La récupération est temporairement indisponible.'});
    }
  });
}
