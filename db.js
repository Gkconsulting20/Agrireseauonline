import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export async function getOne(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

export async function getAll(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function insertOne(text, params) {
  const result = await pool.query(text + ' RETURNING *', params);
  return result.rows[0];
}

async function initDb() {
  const regionsCount = await getOne('SELECT COUNT(*) as count FROM regions');
  if (regionsCount.count == 0) {
    const regions = ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes'];
    for (const r of regions) {
      await query('INSERT INTO regions (name) VALUES ($1) ON CONFLICT DO NOTHING', [r]);
    }
  }

  const productsCount = await getOne('SELECT COUNT(*) as count FROM products');
  if (productsCount.count == 0) {
    const products = ['Maïs', 'Manioc', 'Riz', 'Soja', 'Légumes', 'Fruits', 'Igname', 'Gari', 'Huile de soja', 'Volaille', 'Maraîchage'];
    for (const p of products) {
      await query('INSERT INTO products (name) VALUES ($1) ON CONFLICT DO NOTHING', [p]);
    }
  }
}

initDb().catch(console.error);

export default { query, getOne, getAll, insertOne };
