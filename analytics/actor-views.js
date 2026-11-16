import crypto from 'node:crypto';

// See CONSULTATIONS_FICHES.md for the counting and privacy contract.
export const VIEW_SCHEMA = `
  CREATE TABLE IF NOT EXISTS actor_view_totals (
    actor_id INTEGER PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
    views_count BIGINT NOT NULL DEFAULT 0 CHECK (views_count >= 0)
  );
  CREATE TABLE IF NOT EXISTS actor_view_dedup (
    actor_id INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    view_day DATE NOT NULL,
    visitor_digest TEXT NOT NULL,
    PRIMARY KEY (actor_id, view_day, visitor_digest)
  );
  CREATE INDEX IF NOT EXISTS actor_view_dedup_day_idx ON actor_view_dedup(view_day);
`;

export function createActorViews(db, { secret, now = () => new Date() } = {}) {
  let schemaReady;
  async function ready() {
    if (!secret) throw new Error('view_measurement_not_configured');
    if (!schemaReady) {
      schemaReady = db.query(VIEW_SCHEMA).catch(error => {
        schemaReady = undefined;
        throw error;
      });
    }
    await schemaReady;
  }

  async function countsForOwner(ownerId) {
    try {
      await ready();
      const rows = await db.getAll(`
        SELECT a.id, COALESCE(v.views_count, 0) AS views_count
        FROM actors a LEFT JOIN actor_view_totals v ON v.actor_id=a.id
        WHERE a.owner_id=$1
      `, [ownerId]);
      const counts = new Map();
      let total = 0;
      for (const row of rows) {
        const count = Number(row.views_count);
        if (!Number.isSafeInteger(count) || count < 0 || row.views_count == null) {
          throw new Error('invalid_view_count');
        }
        counts.set(row.id, count);
        total += count;
      }
      if (!Number.isSafeInteger(total)) throw new Error('invalid_view_total');
      return { available: true, total, counts };
    } catch {
      return { available: false, total: null, counts: new Map() };
    }
  }

  async function record(actorId, viewerId) {
    await ready();
    const day = now().toISOString().slice(0, 10);
    // Per-actor and per-day HMAC: no IP, user ID, or cross-profile visitor key stored.
    const digest = crypto.createHmac('sha256', secret)
      .update(JSON.stringify([actorId, viewerId, day])).digest('hex');
    const result = await db.query(`
      WITH expired AS (
        DELETE FROM actor_view_dedup WHERE view_day < $4::date
      ), accepted AS (
        INSERT INTO actor_view_dedup (actor_id, view_day, visitor_digest)
        SELECT id, $4::date, $3 FROM actors
        WHERE id=$1 AND owner_id IS DISTINCT FROM $2
        ON CONFLICT DO NOTHING
        RETURNING actor_id
      )
      INSERT INTO actor_view_totals (actor_id, views_count)
      SELECT actor_id, 1 FROM accepted
      ON CONFLICT (actor_id) DO UPDATE
        SET views_count=actor_view_totals.views_count+1
      RETURNING actor_id
    `, [actorId, viewerId, digest, day]);
    return result.rows.length === 1;
  }

  return { countsForOwner, record };
}

export function excludedViewRequest(req) {
  const agent = req.get('user-agent') || '';
  return !agent || /bot|crawler|spider|preview|headless|curl|wget|python|scrapy|slurp/i.test(agent)
    || req.get('dnt') === '1' || req.get('sec-gpc') === '1';
}

export function sameOriginViewRequest(req) {
  if (req.get('x-actor-view') !== 'profile' || req.get('sec-fetch-site') === 'cross-site') return false;
  const origin = req.get('origin');
  if (!origin) return true; // Non-browser clients still need a valid authenticated session.
  try {
    const url = new URL(origin);
    return ['https:', 'http:'].includes(url.protocol) && url.host === req.get('host');
  } catch {
    return false;
  }
}
