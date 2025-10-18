import pkg from 'pg';
const { Client } = pkg;
import Database from 'better-sqlite3';

const sqliteDb = new Database('agri_reseau.sqlite');

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');

    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        password_hash TEXT NOT NULL,
        region TEXT,
        role TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        plan TEXT DEFAULT 'free',
        status TEXT DEFAULT 'active',
        payment_method TEXT,
        amount INTEGER,
        transaction_id TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS actors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        region TEXT NOT NULL,
        localite TEXT,
        products TEXT,
        need TEXT,
        volume REAL,
        price REAL,
        photo_url TEXT,
        certifications TEXT,
        lat REAL,
        lng REAL,
        phone TEXT,
        whatsapp TEXT,
        email TEXT,
        verified BOOLEAN DEFAULT FALSE,
        owner_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        actor_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(actor_id, user_id),
        FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS logistics (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        region TEXT NOT NULL,
        details TEXT,
        contact TEXT,
        whatsapp TEXT,
        owner_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS regions (
        name TEXT PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS products (
        name TEXT PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        filiere TEXT NOT NULL,
        label TEXT NOT NULL,
        periode TEXT NOT NULL,
        output_qty REAL DEFAULT 0,
        target_margin REAL DEFAULT 0,
        price_expected REAL DEFAULT 0,
        transport REAL DEFAULT 0,
        autres REAL DEFAULT 0,
        overhead_pct REAL DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS activity_items (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL,
        kind TEXT NOT NULL,
        label TEXT,
        qty REAL DEFAULT 0,
        unit TEXT,
        unit_price REAL DEFAULT 0,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS budget_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        activity_id INTEGER,
        kind TEXT NOT NULL,
        category TEXT,
        amount REAL NOT NULL,
        occurred_on DATE NOT NULL,
        note TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL
      );
    `;

    await pgClient.query(schema);
    console.log('✅ PostgreSQL schema created');

    const regions = sqliteDb.prepare('SELECT * FROM regions').all();
    for (const r of regions) {
      await pgClient.query('INSERT INTO regions (name) VALUES ($1) ON CONFLICT DO NOTHING', [r.name]);
    }
    console.log(`✅ Migrated ${regions.length} regions`);

    const products = sqliteDb.prepare('SELECT * FROM products').all();
    for (const p of products) {
      await pgClient.query('INSERT INTO products (name) VALUES ($1) ON CONFLICT DO NOTHING', [p.name]);
    }
    console.log(`✅ Migrated ${products.length} products`);

    const users = sqliteDb.prepare('SELECT * FROM users').all();
    for (const u of users) {
      await pgClient.query(
        'INSERT INTO users (id, email, name, password_hash, region, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
        [u.id, u.email, u.name, u.password_hash, u.region, u.role, u.created_at]
      );
    }
    console.log(`✅ Migrated ${users.length} users`);

    const subscriptions = sqliteDb.prepare('SELECT * FROM subscriptions').all();
    for (const s of subscriptions) {
      await pgClient.query(
        'INSERT INTO subscriptions (id, user_id, plan, status, payment_method, amount, transaction_id, started_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING',
        [s.id, s.user_id, s.plan, s.status, s.payment_method, s.amount, s.transaction_id, s.started_at, s.expires_at]
      );
    }
    console.log(`✅ Migrated ${subscriptions.length} subscriptions`);

    const actors = sqliteDb.prepare('SELECT * FROM actors').all();
    for (const a of actors) {
      await pgClient.query(
        'INSERT INTO actors (id, name, role, region, localite, products, need, volume, price, photo_url, certifications, lat, lng, phone, whatsapp, email, verified, owner_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) ON CONFLICT DO NOTHING',
        [a.id, a.name, a.role, a.region, a.localite, a.products, a.need, a.volume, a.price, a.photo_url, a.certifications, a.lat, a.lng, a.phone, a.whatsapp, a.email, a.verified === 1, a.owner_id, a.created_at]
      );
    }
    console.log(`✅ Migrated ${actors.length} actors`);

    const ratings = sqliteDb.prepare('SELECT * FROM ratings').all();
    for (const r of ratings) {
      await pgClient.query(
        'INSERT INTO ratings (id, actor_id, user_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [r.id, r.actor_id, r.user_id, r.rating, r.comment, r.created_at]
      );
    }
    console.log(`✅ Migrated ${ratings.length} ratings`);

    const logistics = sqliteDb.prepare('SELECT * FROM logistics').all();
    for (const l of logistics) {
      await pgClient.query(
        'INSERT INTO logistics (id, type, title, region, details, contact, whatsapp, owner_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING',
        [l.id, l.type, l.title, l.region, l.details, l.contact, l.whatsapp, l.owner_id, l.created_at]
      );
    }
    console.log(`✅ Migrated ${logistics.length} logistics`);

    const activities = sqliteDb.prepare('SELECT * FROM activities').all();
    for (const a of activities) {
      await pgClient.query(
        'INSERT INTO activities (id, user_id, filiere, label, periode, output_qty, target_margin, price_expected, transport, autres, overhead_pct, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT DO NOTHING',
        [a.id, a.user_id, a.filiere, a.label, a.periode, a.output_qty, a.target_margin, a.price_expected, a.transport, a.autres, a.overhead_pct, a.created_at]
      );
    }
    console.log(`✅ Migrated ${activities.length} activities`);

    const activityItems = sqliteDb.prepare('SELECT * FROM activity_items').all();
    for (const i of activityItems) {
      await pgClient.query(
        'INSERT INTO activity_items (id, activity_id, kind, label, qty, unit, unit_price) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
        [i.id, i.activity_id, i.kind, i.label, i.qty, i.unit, i.unit_price]
      );
    }
    console.log(`✅ Migrated ${activityItems.length} activity items`);

    const budgetEntries = sqliteDb.prepare('SELECT * FROM budget_entries').all();
    for (const b of budgetEntries) {
      await pgClient.query(
        'INSERT INTO budget_entries (id, user_id, activity_id, kind, category, amount, occurred_on, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
        [b.id, b.user_id, b.activity_id, b.kind, b.category, b.amount, b.occurred_on, b.note]
      );
    }
    console.log(`✅ Migrated ${budgetEntries.length} budget entries`);

    await pgClient.query("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false)");
    await pgClient.query("SELECT setval('subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM subscriptions), 0) + 1, false)");
    await pgClient.query("SELECT setval('actors_id_seq', COALESCE((SELECT MAX(id) FROM actors), 0) + 1, false)");
    await pgClient.query("SELECT setval('ratings_id_seq', COALESCE((SELECT MAX(id) FROM ratings), 0) + 1, false)");
    await pgClient.query("SELECT setval('logistics_id_seq', COALESCE((SELECT MAX(id) FROM logistics), 0) + 1, false)");
    await pgClient.query("SELECT setval('activities_id_seq', COALESCE((SELECT MAX(id) FROM activities), 0) + 1, false)");
    await pgClient.query("SELECT setval('activity_items_id_seq', COALESCE((SELECT MAX(id) FROM activity_items), 0) + 1, false)");
    await pgClient.query("SELECT setval('budget_entries_id_seq', COALESCE((SELECT MAX(id) FROM budget_entries), 0) + 1, false)");
    console.log('✅ Reset sequences');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await pgClient.end();
    sqliteDb.close();
  }
}

migrate();
