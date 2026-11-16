
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fedapay from 'fedapay';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOGO_REGIONS } from './public/reference-data.js';

const { FedaPay } = fedapay;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Configure FedaPay
if (process.env.FEDAPAY_SECRET_KEY) {
  FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);
  FedaPay.setEnvironment(process.env.FEDAPAY_ENVIRONMENT || 'sandbox');
}

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.json({limit:'1mb'}));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fc9e4438f21650198fa24ac20dac1b47',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000*60*60*24*7 }
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'auth_required'}); next(); }
function requireAdmin(req,res,next){ if(!req.session.user) return res.status(401).json({error:'auth_required'}); if(!req.session.user.is_admin) return res.status(403).json({error:'admin_required'}); next(); }
function blockCommercial(req,res,next){ if(req.session.user && req.session.user.is_commercial) return res.status(403).json({error:'commercial_restricted', message:'Les commerciaux ne peuvent pas effectuer cette action. Ce compte est réservé au suivi des performances.'}); next(); }
async function requirePremium(req,res,next){ 
  if(!req.session.user) return res.status(401).json({error:'auth_required'}); 
  const sub = await db.getOne('SELECT * FROM subscriptions WHERE user_id=$1', [req.session.user.id]);
  if(!sub || sub.plan !== 'premium' || sub.status !== 'active') return res.status(403).json({error:'premium_required', message:'Cette fonctionnalité est réservée aux utilisateurs Premium'}); 
  next(); 
}

app.post('/api/auth/register', async (req,res)=>{ 
  const {email,password,name,region,role,phone,whatsapp,lat,lng,commercial_code}=req.body; 
  if(!password) return res.status(400).json({error:'password_required'}); 
  if(!email && !phone) return res.status(400).json({error:'email_or_phone_required'}); 
  if(!name) return res.status(400).json({error:'name_required'}); 
  if(!TOGO_REGIONS.includes(region)) return res.status(400).json({
    error:'invalid_region',
    message:'Choisissez une région administrative du Togo : Maritime, Plateaux, Centrale, Kara ou Savanes.'
  });
  const hash=bcrypt.hashSync(password,10); 
  const normalizedPhone = phone ? phone.replace(/\s+/g, '') : null;
  const normalizedWhatsapp = whatsapp ? whatsapp.replace(/\s+/g, '') : null;
  
  let recruitedBy = null;
  if(commercial_code){
    const commercial = await db.getOne('SELECT id FROM users WHERE commercial_code=$1 AND is_commercial=true', [commercial_code.trim()]);
    if(commercial){
      recruitedBy = commercial.id;
    }
  }
  
  try{ 
    const user = await db.insertOne('INSERT INTO users (email,name,password_hash,region,role,phone,whatsapp,lat,lng,recruited_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [email?(email.trim().toLowerCase()):null,name||'',hash,region||'',role||'',normalizedPhone,normalizedWhatsapp,lat||null,lng||null,recruitedBy]); 
    const userId=user.id; 
    await db.query('INSERT INTO subscriptions (user_id,plan,status) VALUES ($1,$2,$3)', [userId,'free','active']); 
    req.session.user={id:userId,email,name,region,role,phone:normalizedPhone,whatsapp:normalizedWhatsapp,lat,lng,is_admin:user.is_admin||false,is_commercial:user.is_commercial||false,status:user.status||'active',recruited_by:recruitedBy}; 
    res.status(201).json(req.session.user); 
  } catch(e){ 
    res.status(400).json({error:'registration_failed',message:e.message}); 
  } 
});

app.post('/api/auth/login', async (req,res)=>{ 
  const {email,phone,password}=req.body; 
  if(!email && !phone) return res.status(400).json({error:'email_or_phone_required'}); 
  let u = null;
  if(email) {
    u = await db.getOne('SELECT * FROM users WHERE email=$1', [(email||'').trim().toLowerCase()]); 
  } else if(phone) {
    u = await db.getOne('SELECT * FROM users WHERE phone=$1', [phone.trim()]); 
  }
  if(!u) return res.status(400).json({error:'invalid_credentials'}); 
  if(u.status === 'blocked') return res.status(403).json({error:'account_blocked',message:'Votre compte a été bloqué'}); 
  if(!bcrypt.compareSync(password||'',u.password_hash)) return res.status(400).json({error:'invalid_credentials'}); 
  req.session.user={id:u.id,email:u.email,name:u.name,region:u.region,role:u.role,phone:u.phone,whatsapp:u.whatsapp,lat:u.lat,lng:u.lng,is_admin:u.is_admin,is_commercial:u.is_commercial,status:u.status}; 
  res.json(req.session.user); 
});

app.post('/api/auth/logout',(req,res)=> req.session.destroy(()=>res.json({ok:true})));
app.get('/api/auth/me',(req,res)=> res.json(req.session.user||null));

app.put('/api/user/profile', requireAuth, async (req,res)=>{
  const {name, email, phone, whatsapp, region, role, currentPassword, newPassword} = req.body;
  const userId = req.session.user.id;
  
  try {
    const currentUser = await db.getOne('SELECT password_hash, role FROM users WHERE id=$1', [userId]);
    
    if(newPassword) {
      if(!currentPassword) return res.status(400).json({error:'current_password_required'});
      if(!bcrypt.compareSync(currentPassword, currentUser.password_hash)) {
        return res.status(400).json({error:'invalid_current_password', message:'Mot de passe actuel incorrect'});
      }
      const newHash = bcrypt.hashSync(newPassword, 10);
      await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, userId]);
    }
    
    const normalizedPhone = phone ? phone.replace(/\s+/g, '') : null;
    const normalizedWhatsapp = whatsapp ? whatsapp.replace(/\s+/g, '') : null;
    const finalRole = role || currentUser.role || '';
    
    await db.query(
      'UPDATE users SET name=$1, email=$2, phone=$3, whatsapp=$4, region=$5, role=$6 WHERE id=$7',
      [name, email?(email.trim().toLowerCase()):null, normalizedPhone, normalizedWhatsapp, region, finalRole, userId]
    );
    
    const updated = await db.getOne('SELECT id, email, name, phone, whatsapp, region, role, lat, lng, is_admin, is_commercial, status FROM users WHERE id=$1', [userId]);
    req.session.user = updated;
    res.json(updated);
  } catch(e) {
    res.status(400).json({error:'update_failed', message: e.message});
  }
});

app.post('/api/auth/forgot-password', async (req,res)=>{
  const {email, phone} = req.body;
  if(!email && !phone) return res.status(400).json({error:'email_or_phone_required'});
  
  let user = null;
  if(email) {
    user = await db.getOne('SELECT id, email, phone, whatsapp FROM users WHERE email=$1', [(email||'').trim().toLowerCase()]);
  } else if(phone) {
    user = await db.getOne('SELECT id, email, phone, whatsapp FROM users WHERE phone=$1', [phone.trim()]);
  }
  
  if(!user) return res.status(404).json({error:'user_not_found', message:'Utilisateur non trouvé'});
  
  await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user.id]);
  
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  
  await db.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt]
  );
  
  const resetLink = `${req.protocol}://${req.get('host')}/#reset-password?token=${token}`;
  
  res.json({
    success: true,
    resetLink,
    message: user.whatsapp ? 'Lien de réinitialisation généré. Envoyez-le via WhatsApp.' : 'Lien de réinitialisation généré.',
    whatsapp: user.whatsapp,
    phone: user.phone
  });
});

app.post('/api/auth/reset-password', async (req,res)=>{
  const {token, newPassword} = req.body;
  if(!token || !newPassword) return res.status(400).json({error:'token_and_password_required'});
  
  const resetToken = await db.getOne(
    'SELECT * FROM password_reset_tokens WHERE token=$1 AND expires_at > NOW()',
    [token]
  );
  
  if(!resetToken) return res.status(400).json({error:'invalid_or_expired_token', message:'Token invalide ou expiré'});
  
  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, resetToken.user_id]);
  await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [resetToken.user_id]);
  
  res.json({success: true, message: 'Mot de passe réinitialisé avec succès'});
});

app.get('/api/refs', async (req,res)=>{ 
  const regions = await db.getAll('SELECT name FROM regions', []); 
  const products = await db.getAll('SELECT name, category FROM products ORDER BY category, name', []); 
  const categories = await db.getAll('SELECT DISTINCT category FROM products ORDER BY category', []);
  
  const units = [
    'kg',
    'unité',
    'plateau',
    'litre',
    'sac',
    'tonne',
    'tête',
    'boîte',
    'bouteille',
    'paquet'
  ];
  
  const inputCategories = [
    {category: 'Semences et plants', items: ['Semences certifiées', 'Plants', 'Boutures']},
    {category: 'Engrais et amendements', items: ['NPK', 'Urée', 'Compost', 'Fumier', 'Chaux']},
    {category: 'Produits phytosanitaires', items: ['Herbicides', 'Insecticides', 'Fongicides']},
    {category: 'Aliments pour animaux', items: ['Provende poulets', 'Provende porcs', 'Provende bovins', 'Tourteau', 'Son de maïs', 'Son de riz', 'Fourrage']},
    {category: 'Santé animale', items: ['Vaccins', 'Antibiotiques', 'Antiparasitaires', 'Vitamines', 'Désinfectants']},
    {category: 'Équipements et matériels', items: ['Abreuvoirs', 'Mangeoires', 'Cages', 'Filets', 'Outils']},
    {category: 'Autres intrants', items: ['Emballages', 'Ficelles', 'Plastiques', 'Carburant']}
  ];
  
  res.json({
    regions: regions.map(r=>r.name), 
    products: products.map(p=>({name: p.name, category: p.category})),
    productCategories: categories.map(c=>c.category),
    units,
    inputCategories
  }); 
});

app.post('/api/seed', async (req,res)=>{ 
  await db.query('DELETE FROM actors', []); 
  await db.query('DELETE FROM logistics', []); 
  await db.query('DELETE FROM ratings', []); 
  const actors=[ 
    {name:'Coopérative Agri-Plateaux',role:'producteur',region:'Plateaux',localite:'Kpalimé',products:['Maïs','Soja'],need:'Acheteurs en gros, Transport vers Lomé',volume:12000,price:450,photo_url:'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=200',certifications:['bio','quality'],lat:6.9006,lng:0.6323,phone:'+22890000001',whatsapp:'+22890000001',email:'coop.plateaux@example.com',verified:true}, 
    {name:'Ferme Manioc Maritime',role:'producteur',region:'Maritime',localite:'Tsévié',products:['Manioc','Gari'],need:'Transformateurs pour gari, Transport local',volume:8000,price:350,photo_url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200',certifications:['fair'],lat:6.4261,lng:1.2135,phone:'+22890000002',whatsapp:'+22890000002',email:'manioc.maritime@example.com',verified:false}, 
    {name:'Élevage Bovin Savanes',role:'éleveur',region:'Savanes',localite:'Dapaong',products:['Viande bovine','Lait'],need:'Vétérinaire, Acheteurs hebdomadaires',volume:3000,price:2500,photo_url:'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200',certifications:['quality'],lat:10.8636,lng:0.2034,phone:'+22890000008',whatsapp:'+22890000008',email:'elevage.savanes@example.com',verified:true},
    {name:'Ferme Avicole Kara',role:'éleveur',region:'Kara',localite:'Kara',products:['Poulets','Œufs'],need:'Aliments pour volaille, Distributeurs',volume:5000,price:1800,photo_url:'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=200',certifications:['quality','bio'],lat:9.5517,lng:1.1861,phone:'+22890000009',whatsapp:'+22890000009',email:'avicole.kara@example.com',verified:true},
    {name:'Porcins Plateaux',role:'éleveur',region:'Plateaux',localite:'Notse',products:['Porcs','Viande porcine'],need:'Abattoir partenaire, Transport réfrigéré',volume:2500,price:2200,photo_url:'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=200',certifications:[],lat:6.9503,lng:1.1650,phone:'+22890000010',whatsapp:'+22890000010',email:'porcins.notse@example.com',verified:false},
    {name:'LogiTrans Togo',role:'transporteur',region:'Maritime',localite:'Lomé',products:[],need:'Courses hebdo Lomé-Kpalimé; capacité 10T',certifications:[],lat:6.1319,lng:1.2224,phone:'+22890000003',whatsapp:'+22890000003',email:'logitrans@example.com',verified:true}, 
    {name:'AgroTransfo Kara',role:'transformateur',region:'Kara',localite:'Kara',products:['Huile de soja'],need:'Approvisionnement régulier Soja 20T/mois',volume:5000,price:800,photo_url:'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200',certifications:['bio','quality','fair'],lat:9.5517,lng:1.1861,phone:'+22890000004',whatsapp:'+22890000004',email:'agrotransfo.kara@example.com',verified:true}, 
    {name:"Grossiste Marché d'Adawlato",role:'grossiste',region:'Maritime',localite:'Lomé',products:['Maïs','Igname','Légumes'],need:'Producteurs certifiés; contrats saisonniers',volume:15000,price:420,certifications:['quality'],lat:6.1319,lng:1.2224,phone:'+22890000005',whatsapp:'+22890000005',email:'grossiste.adawlato@example.com',verified:false}, 
    {name:'Détaillant Boutique Agro Sokodé',role:'detaillant',region:'Centrale',localite:'Sokodé',products:['Légumes','Fruits'],need:'Paniers hebdo 200kg',volume:2000,price:500,certifications:[],lat:8.9834,lng:1.1426,phone:'+22890000006',whatsapp:'+22890000006',email:'det.sokode@example.com',verified:false}, 
    {name:'ONG Appui Agricole',role:'institution',region:'Plateaux',localite:'Atakpamé',products:[],need:'Suivi data régionale, formations',certifications:[],phone:'+22890000007',whatsapp:'+22890000007',email:'ong.atakpame@example.com',verified:true} 
  ]; 
  for(const a of actors) {
    await db.query(`INSERT INTO actors (name,role,region,localite,products,need,volume,price,photo_url,certifications,lat,lng,phone,whatsapp,email,verified,owner_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NULL)`, [a.name,a.role,a.region,a.localite||'',JSON.stringify(a.products||[]),a.need||'',a.volume||null,a.price||null,a.photo_url||'',JSON.stringify(a.certifications||[]),a.lat||null,a.lng||null,a.phone||'',a.whatsapp||'',a.email||'',a.verified]);
  }
  const logs=[ 
    {type:'need',title:'Transport Kpalimé → Lomé',region:'Plateaux',details:'Maïs 12T palette, ramassage sous 7 jours',contact:'+22890000001',whatsapp:'+22890000001'}, 
    {type:'offer',title:'Camion 10T Lomé → Kpalimé (Mer/Sam)',region:'Maritime',details:'Tarif négociable, contact LogiTrans',contact:'+22890000003',whatsapp:'+22890000003'} 
  ]; 
  for(const l of logs) {
    await db.query('INSERT INTO logistics (type,title,region,details,contact,whatsapp,owner_id) VALUES ($1,$2,$3,$4,$5,$6,NULL)', [l.type,l.title,l.region,l.details||'',l.contact||'',l.whatsapp||'']);
  }
  res.status(201).json({ok:true}); 
});

// Fonction pour normaliser les produits (rétrocompatibilité string → object)
function normalizeProducts(products) {
  if (!products || products.length === 0) return [];
  return products.map(p => {
    if (typeof p === 'string') return { name: p, production_site: '', image_url: '' };
    return p;
  });
}

app.get('/api/actors', async (req,res)=>{ 
  const rows = await db.getAll('SELECT * FROM actors ORDER BY id DESC', []); 
  const result = [];
  for(const r of rows) {
    const rawProducts = JSON.parse(r.products||'[]');
    const actor = {...r,products:normalizeProducts(rawProducts),certifications:JSON.parse(r.certifications||'[]')};
    const ratings = await db.getOne('SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE actor_id=$1', [r.id]);
    actor.rating_avg = ratings?.avg ? parseFloat(ratings.avg) : 0;
    actor.rating_count = ratings?.count ? parseInt(ratings.count) : 0;
    if(r.owner_id){
      const sub = await db.getOne('SELECT plan FROM subscriptions WHERE user_id=$1', [r.owner_id]);
      actor.owner_plan=sub?.plan||'free';
    }
    result.push(actor);
  }
  res.json(result); 
});

app.post('/api/actors', requireAuth, blockCommercial, async (req,res)=>{ 
  const sub = await db.getOne('SELECT * FROM subscriptions WHERE user_id=$1', [req.session.user.id]);
  const actorCountRow = await db.getOne('SELECT COUNT(*) as c FROM actors WHERE owner_id=$1', [req.session.user.id]);
  const actorCount = actorCountRow.c;
  if(sub && sub.plan==='free' && actorCount>=2) return res.status(403).json({error:'limit_reached',message:'Version gratuite limitée à 2 acteurs. Passez à Premium pour plus !'});
  
  const currentUser = await db.getOne('SELECT recruited_by FROM users WHERE id=$1', [req.session.user.id]);
  const recruitedBy = currentUser?.recruited_by || null;
  
  const b=req.body; 
  const row = await db.insertOne(`INSERT INTO actors (name,role,region,localite,products,need,volume,unit,price,photo_url,certifications,lat,lng,phone,whatsapp,email,verified,owner_id,recruited_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`, [b.name,b.role,b.region,b.localite||'',JSON.stringify(b.products||[]),b.need||'',b.volume||null,b.unit||'kg',b.price||null,b.photo_url||'',JSON.stringify(b.certifications||[]),b.lat||null,b.lng||null,b.phone||'',b.whatsapp||'',b.email||'',b.verified||false,req.session.user.id,recruitedBy]); 
  row.products=normalizeProducts(JSON.parse(row.products||'[]')); 
  row.certifications=JSON.parse(row.certifications||'[]'); 
  res.status(201).json(row); 
});

app.put('/api/actors/:id', requireAuth, blockCommercial, async (req,res)=>{ 
  const id=Number(req.params.id), b=req.body; 
  await db.query(`UPDATE actors SET name=$1,role=$2,region=$3,localite=$4,products=$5,need=$6,volume=$7,unit=$8,price=$9,photo_url=$10,certifications=$11,lat=$12,lng=$13,phone=$14,whatsapp=$15,email=$16,verified=$17 WHERE id=$18`, [b.name,b.role,b.region,b.localite||'',JSON.stringify(b.products||[]),b.need||'',b.volume||null,b.unit||'kg',b.price||null,b.photo_url||'',JSON.stringify(b.certifications||[]),b.lat||null,b.lng||null,b.phone||'',b.whatsapp||'',b.email||'',b.verified||false,id]); 
  const row = await db.getOne('SELECT * FROM actors WHERE id=$1', [id]); 
  row.products=normalizeProducts(JSON.parse(row.products||'[]')); 
  row.certifications=JSON.parse(row.certifications||'[]'); 
  res.json(row); 
});

app.delete('/api/actors/:id', requireAuth, blockCommercial, async (req,res)=>{ 
  await db.query('DELETE FROM actors WHERE id=$1', [Number(req.params.id)]); 
  res.status(204).end(); 
});

app.get('/api/actors/:id/harvests', async (req,res)=>{ 
  const actorId = Number(req.params.id);
  const harvests = await db.getAll(`SELECT harvest_product, actual_harvest, unit FROM activities WHERE actor_id=$1 AND harvest_product IS NOT NULL AND actual_harvest > 0`, [actorId]);
  const grouped = {};
  harvests.forEach(h => {
    const key = `${h.harvest_product}|${h.unit||'kg'}`;
    if (!grouped[key]) grouped[key] = {product: h.harvest_product, quantity: 0, unit: h.unit||'kg'};
    grouped[key].quantity += parseFloat(h.actual_harvest);
  });
  const result = Object.values(grouped);
  res.json(result);
});

app.get('/api/actors/:id/upcoming', async (req,res)=>{
  const actorId = Number(req.params.id);
  const upcoming = await db.getAll(
    `SELECT harvest_product, started_at, production_cycle_days, output_qty, unit 
     FROM activities 
     WHERE actor_id=$1 
       AND harvest_product IS NOT NULL 
       AND started_at IS NOT NULL 
       AND production_cycle_days IS NOT NULL 
       AND production_cycle_days > 0
       AND (actual_harvest IS NULL OR actual_harvest = 0)
     ORDER BY started_at DESC
     LIMIT 5`,
    [actorId]
  );
  
  const result = upcoming.map(a=>{
    const startDate = new Date(a.started_at);
    const availabilityDate = new Date(startDate);
    availabilityDate.setDate(availabilityDate.getDate() + Number(a.production_cycle_days));
    
    return {
      product: a.harvest_product,
      startDate: a.started_at,
      cycleDays: Number(a.production_cycle_days),
      estimatedAvailability: availabilityDate.toISOString().split('T')[0],
      estimatedQuantity: parseFloat(a.output_qty) || 0,
      unit: a.unit || 'kg',
      isAvailable: availabilityDate <= new Date()
    };
  });
  
  res.json(result);
});

app.get('/api/logistics', async (req,res)=>{ 
  const rows = await db.getAll('SELECT * FROM logistics ORDER BY id DESC', []); 
  res.json(rows); 
});

app.get('/api/market/prices', async (req,res)=>{ 
  const actors = await db.getAll('SELECT products, price, unit, volume FROM actors WHERE price IS NOT NULL AND price > 0', []);
  const productPrices = {};
  
  for(const actor of actors) {
    const products = JSON.parse(actor.products || '[]');
    products.forEach(p => {
      const productName = typeof p === 'string' ? p.trim() : (p?.name || '').trim();
      if(!productName) return;
      
      if(!productPrices[productName]) {
        productPrices[productName] = { prices: [], volumes: [], units: [] };
      }
      productPrices[productName].prices.push(Number(actor.price));
      productPrices[productName].volumes.push(Number(actor.volume) || 0);
      productPrices[productName].units.push(actor.unit || 'kg');
    });
  }
  
  const result = Object.entries(productPrices)
    .filter(([name, data]) => data.prices.length > 0)
    .map(([name, data]) => {
      const avgPrice = data.prices.reduce((a,b) => a+b, 0) / data.prices.length;
      const minPrice = Math.min(...data.prices);
      const maxPrice = Math.max(...data.prices);
      const totalVolume = data.volumes.reduce((a,b) => a+b, 0);
      const unit = data.units[0] || 'kg';
      return { name, avgPrice: Math.round(avgPrice), minPrice, maxPrice, totalVolume: Math.round(totalVolume), unit, actorCount: data.prices.length };
    })
    .sort((a,b) => b.totalVolume - a.totalVolume)
    .slice(0, 12);
  
  res.json(result);
});

app.get('/api/platform/stats', async (req,res)=>{ 
  try {
    const actorCount = await db.getOne('SELECT COUNT(*) as c FROM actors', []);
    const userCount = await db.getOne('SELECT COUNT(*) as c FROM users', []);
    const regionCount = await db.getOne('SELECT COUNT(DISTINCT region) as c FROM actors', []);
    
    // Count unique products - handles both string and object formats
    const actors = await db.getAll('SELECT products FROM actors WHERE products IS NOT NULL AND products != \'[]\'', []);
    const uniqueProducts = new Set();
    actors.forEach(a => {
      try {
        const products = JSON.parse(a.products || '[]');
        products.forEach(p => {
          const name = typeof p === 'string' ? p.trim() : (p?.name || '').trim();
          if(name) uniqueProducts.add(name.toLowerCase());
        });
      } catch(e) {}
    });
    
    res.json({
      actors: parseInt(actorCount?.c) || 0,
      users: parseInt(userCount?.c) || 0,
      regions: parseInt(regionCount?.c) || 0,
      products: uniqueProducts.size
    });
  } catch(e) {
    res.json({ actors: 0, users: 0, regions: 0, products: 0 });
  }
});

app.post('/api/logistics', requireAuth, blockCommercial, async (req,res)=>{ 
  const b=req.body; 
  const row = await db.insertOne('INSERT INTO logistics (type,title,region,details,contact,whatsapp,owner_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', [b.type,b.title,b.region,b.details||'',b.contact||'',b.whatsapp||'',req.session.user.id]); 
  res.status(201).json(row); 
});

app.put('/api/logistics/:id', requireAuth, async (req,res)=>{ 
  const id=Number(req.params.id), b=req.body;
  const existing = await db.getOne('SELECT owner_id FROM logistics WHERE id=$1', [id]);
  if(!existing) return res.status(404).json({error: 'Publication non trouvée'});
  if(existing.owner_id !== req.session.user.id && !req.session.user.is_admin) {
    return res.status(403).json({error: 'Non autorisé'});
  }
  await db.query('UPDATE logistics SET type=$1,title=$2,region=$3,details=$4,contact=$5,whatsapp=$6 WHERE id=$7', [b.type,b.title,b.region,b.details||'',b.contact||'',b.whatsapp||'',id]); 
  const row = await db.getOne('SELECT * FROM logistics WHERE id=$1', [id]); 
  res.json(row); 
});

app.delete('/api/logistics/:id', requireAuth, async (req,res)=>{
  const id = Number(req.params.id);
  const existing = await db.getOne('SELECT owner_id FROM logistics WHERE id=$1', [id]);
  if(!existing) return res.status(404).json({error: 'Publication non trouvée'});
  if(existing.owner_id !== req.session.user.id && !req.session.user.is_admin) {
    return res.status(403).json({error: 'Non autorisé'});
  }
  await db.query('DELETE FROM logistics WHERE id=$1', [id]); 
  res.status(204).end(); 
});

app.get('/api/activities', requireAuth, async (req,res)=>{ 
  const acts = await db.getAll(`
    SELECT a.*, 
           ac.name as actor_name, 
           ac.role as actor_role 
    FROM activities a 
    LEFT JOIN actors ac ON a.actor_id = ac.id 
    WHERE a.user_id=$1 
    ORDER BY a.id DESC
  `, [req.session.user.id]); 
  res.json(acts); 
});

app.post('/api/activities', requireAuth, blockCommercial, async (req,res)=>{ 
  const b=req.body; 
  const act = await db.insertOne(`INSERT INTO activities (user_id,filiere,label,periode,output_qty,target_margin,price_expected,transport,autres,overhead_pct,status,started_at,harvest_product,actor_id,production_cycle_days,unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`, [req.session.user.id,b.filiere,b.label,b.periode,b.output_qty||0,b.target_margin||0,b.price_expected||0,b.transport||0,b.autres||0,b.overhead_pct||10,b.status||'planned',b.started_at||null,b.harvest_product||null,b.actor_id||null,b.production_cycle_days||null,b.unit||'kg']); 
  res.status(201).json(act); 
});

app.put('/api/activities/:id', requireAuth, async (req,res)=>{ 
  const id=Number(req.params.id), b=req.body; 
  await db.query(`UPDATE activities SET filiere=$1,label=$2,periode=$3,output_qty=$4,target_margin=$5,price_expected=$6,transport=$7,autres=$8,overhead_pct=$9,status=$10,started_at=$11,ended_at=$12,actual_harvest=$13,harvest_product=$14,actor_id=$15,production_cycle_days=$16,unit=$17 WHERE id=$18 AND user_id=$19`, [b.filiere,b.label,b.periode,b.output_qty||0,b.target_margin||0,b.price_expected||0,b.transport||0,b.autres||0,b.overhead_pct||10,b.status||'planned',b.started_at||null,b.ended_at||null,b.actual_harvest||null,b.harvest_product||null,b.actor_id||null,b.production_cycle_days||null,b.unit||'kg',id,req.session.user.id]); 
  const act = await db.getOne('SELECT * FROM activities WHERE id=$1', [id]); 
  res.json(act); 
});

app.delete('/api/activities/:id', requireAuth, async (req,res)=>{ 
  const id=Number(req.params.id); 
  await db.query('DELETE FROM activity_items WHERE activity_id=$1', [id]); 
  await db.query('DELETE FROM activities WHERE id=$1 AND user_id=$2', [id,req.session.user.id]); 
  res.status(204).end(); 
});

app.get('/api/activities/:id/items', requireAuth, async (req,res)=>{ 
  const rows = await db.getAll('SELECT * FROM activity_items WHERE activity_id=$1', [Number(req.params.id)]); 
  res.json(rows); 
});

app.post('/api/activities/:id/items', requireAuth, blockCommercial, async (req,res)=>{ 
  const id=Number(req.params.id), b=req.body; 
  const row = await db.insertOne('INSERT INTO activity_items (activity_id,kind,label,qty,unit,unit_price) VALUES ($1,$2,$3,$4,$5,$6)', [id,b.kind,b.label,b.qty||0,b.unit||'',b.unit_price||0]); 
  res.status(201).json(row); 
});

app.put('/api/items/:itemId', requireAuth, async (req,res)=>{ 
  const itemId=Number(req.params.itemId), b=req.body; 
  await db.query('UPDATE activity_items SET kind=$1,label=$2,qty=$3,unit=$4,unit_price=$5 WHERE id=$6', [b.kind,b.label,b.qty||0,b.unit||'',b.unit_price||0,itemId]); 
  const row = await db.getOne('SELECT * FROM activity_items WHERE id=$1', [itemId]); 
  res.json(row); 
});

app.delete('/api/items/:itemId', requireAuth, async (req,res)=>{ 
  await db.query('DELETE FROM activity_items WHERE id=$1', [Number(req.params.itemId)]); 
  res.status(204).end(); 
});

app.get('/api/activities/:id/summary', requireAuth, async (req,res)=>{ 
  const id=Number(req.params.id); 
  const act = await db.getOne('SELECT * FROM activities WHERE id=$1 AND user_id=$2', [id,req.session.user.id]); 
  if(!act) return res.status(404).json({error:'not_found'}); 
  const items = await db.getAll('SELECT * FROM activity_items WHERE activity_id=$1', [id]); 
  const budgetExpenses = await db.getAll('SELECT * FROM budget_entries WHERE activity_id=$1 AND kind=$2 ORDER BY occurred_on ASC', [id, 'expense']);
  const budgetIncomes = await db.getAll('SELECT * FROM budget_entries WHERE activity_id=$1 AND kind=$2 ORDER BY occurred_on ASC', [id, 'income']);
  const intrants=items.filter(x=>x.kind==='input').reduce((s,x)=> s + (x.qty||0)*(x.unit_price||0),0); 
  const mo=items.filter(x=>x.kind==='labor').reduce((s,x)=> s + (x.qty||0)*(x.unit_price||0),0); 
  const directs=intrants+mo+(act.transport||0)+(act.autres||0); 
  const overhead=directs*((act.overhead_pct||0)/100); 
  const totalPlanned=directs+overhead; 
  const totalRealExpenses = budgetExpenses.reduce((s,e)=> s + Number(e.amount||0), 0);
  const totalRealIncomes = budgetIncomes.reduce((s,e)=> s + Number(e.amount||0), 0);
  const unitPlanned= totalPlanned / Math.max(1, act.output_qty||1); 
  const unitReal = totalRealExpenses / Math.max(1, act.actual_harvest||act.output_qty||1);
  const pv=act.price_expected||0; 
  const margePlanned= pv>0 ? (pv-unitPlanned)/pv*100 : 0; 
  const margeReal= pv>0 ? (pv-unitReal)/pv*100 : 0;
  const pvCible = unitPlanned / (1 - Math.max(0.0001,(act.target_margin||0)/100)); 
  const seuil = pv>0 ? Math.ceil(totalPlanned/pv):0; 
  const profit = totalRealIncomes - totalRealExpenses;
  res.json({intrants,mo,directs,overhead,total:totalPlanned,unit:unitPlanned,pv,marge:margePlanned,pvCible,seuil,budgetExpenses,budgetIncomes,totalRealExpenses,totalRealIncomes,unitReal,margeReal,profit,actual_harvest:act.actual_harvest,status:act.status}); 
});

app.get('/api/budget', requireAuth, async (req,res)=>{ 
  const rows = await db.getAll('SELECT * FROM budget_entries WHERE user_id=$1 ORDER BY occurred_on DESC, id DESC', [req.session.user.id]); 
  const inc=rows.filter(r=>r.kind==='income').reduce((s,r)=>s+r.amount,0); 
  const exp=rows.filter(r=>r.kind==='expense').reduce((s,r)=>s+r.amount,0); 
  res.json({rows, totals:{income:inc, expense:exp, balance:inc-exp}}); 
});

app.post('/api/budget', requireAuth, async (req,res)=>{ 
  const b=req.body; 
  const row = await db.insertOne('INSERT INTO budget_entries (user_id,activity_id,kind,category,amount,occurred_on,note) VALUES ($1,$2,$3,$4,$5,$6,$7)', [req.session.user.id,b.activity_id||null,b.kind,b.category||'',b.amount,b.occurred_on,b.note||'']); 
  res.status(201).json(row); 
});

app.put('/api/budget/:id', requireAuth, async (req,res)=>{ 
  const id=Number(req.params.id), b=req.body; 
  await db.query('UPDATE budget_entries SET activity_id=$1,kind=$2,category=$3,amount=$4,occurred_on=$5,note=$6 WHERE id=$7 AND user_id=$8', [b.activity_id||null,b.kind,b.category||'',b.amount,b.occurred_on,b.note||'',id,req.session.user.id]); 
  const row = await db.getOne('SELECT * FROM budget_entries WHERE id=$1', [id]); 
  res.json(row); 
});

app.delete('/api/budget/:id', requireAuth, async (req,res)=>{ 
  await db.query('DELETE FROM budget_entries WHERE id=$1 AND user_id=$2', [Number(req.params.id), req.session.user.id]); 
  res.status(204).end(); 
});

app.get('/api/actors/:id/ratings', async (req,res)=>{ 
  const rows = await db.getAll('SELECT r.*, u.name as user_name FROM ratings r LEFT JOIN users u ON r.user_id=u.id WHERE r.actor_id=$1 ORDER BY r.created_at DESC', [Number(req.params.id)]); 
  res.json(rows); 
});

app.post('/api/actors/:id/ratings', requireAuth, async (req,res)=>{ 
  const actorId=Number(req.params.id), b=req.body; 
  const rating=Math.max(1,Math.min(5,Number(b.rating))); 
  try{ 
    const row = await db.insertOne('INSERT INTO ratings (actor_id,user_id,rating,comment) VALUES ($1,$2,$3,$4)', [actorId,req.session.user.id,rating,b.comment||'']); 
    res.status(201).json(row); 
  } catch(e){ 
    await db.query('UPDATE ratings SET rating=$1,comment=$2 WHERE actor_id=$3 AND user_id=$4', [rating,b.comment||'',actorId,req.session.user.id]); 
    const row = await db.getOne('SELECT * FROM ratings WHERE actor_id=$1 AND user_id=$2', [actorId,req.session.user.id]); 
    res.json(row); 
  } 
});

app.get('/api/subscription', requireAuth, async (req,res)=>{ 
  const sub = await db.getOne('SELECT * FROM subscriptions WHERE user_id=$1', [req.session.user.id]); 
  const actorCountRow = await db.getOne('SELECT COUNT(*) as c FROM actors WHERE owner_id=$1', [req.session.user.id]); 
  const actorCount = actorCountRow.c;
  const limit=sub?.plan==='premium'?999:2; 
  res.json({subscription:sub||{plan:'free',status:'active'},actorCount,limit}); 
});

app.post('/api/admin/activate-premium', requireAdmin, async (req,res)=>{
  const {userEmail, transactionId, paymentMethod} = req.body;
  if(!userEmail || !transactionId) return res.status(400).json({error:'Missing userEmail or transactionId'});
  
  const targetUser = await db.getOne('SELECT id FROM users WHERE email=$1', [userEmail]);
  if(!targetUser) return res.status(404).json({error:'User not found'});
  
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  
  try{
    await db.query(
      `UPDATE subscriptions SET plan=$1, status=$2, payment_method=$3, amount=$4, transaction_id=$5, started_at=$6, expires_at=$7 WHERE user_id=$8`,
      ['premium', 'active', paymentMethod || 'manual', 1000, transactionId, new Date(), expiresAt, targetUser.id]
    );
    res.json({success:true, message:`Premium activated for ${userEmail} until ${expiresAt.toISOString().split('T')[0]}`});
  } catch(e){
    console.error('Error activating premium:', e);
    res.status(500).json({error:'Failed to activate premium'});
  }
});

// Admin endpoints - User management
app.get('/api/admin/users', requireAdmin, async (req,res)=>{
  const users = await db.getAll('SELECT id, email, name, phone, whatsapp, region, role, is_admin, status, created_at FROM users ORDER BY created_at DESC', []);
  res.json(users);
});

app.put('/api/admin/users/:id', requireAdmin, async (req,res)=>{
  const userId = Number(req.params.id);
  const {name, email, phone, whatsapp, region, role, is_admin, status} = req.body;
  await db.query(
    'UPDATE users SET name=$1, email=$2, phone=$3, whatsapp=$4, region=$5, role=$6, is_admin=$7, status=$8 WHERE id=$9',
    [name, email, phone, whatsapp, region, role, is_admin, status, userId]
  );
  const updated = await db.getOne('SELECT id, email, name, phone, whatsapp, region, role, is_admin, status, created_at FROM users WHERE id=$1', [userId]);
  res.json(updated);
});

app.delete('/api/admin/users/:id', requireAdmin, async (req,res)=>{
  const userId = Number(req.params.id);
  if(userId === req.session.user.id) return res.status(400).json({error:'Cannot delete your own account'});
  await db.query('DELETE FROM users WHERE id=$1', [userId]);
  res.status(204).end();
});

app.get('/api/admin/logistics', requireAdmin, async (req,res)=>{
  const logistics = await db.getAll(`
    SELECT l.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone 
    FROM logistics l 
    LEFT JOIN users u ON l.owner_id = u.id 
    ORDER BY l.created_at DESC
  `, []);
  res.json(logistics);
});

// Commercial endpoints - Performance tracking and management
app.get('/api/commercial/stats', requireAuth, async (req,res)=>{
  const userId = req.session.user.id;
  const user = await db.getOne('SELECT is_commercial FROM users WHERE id=$1', [userId]);
  
  if(!user || !user.is_commercial){
    return res.status(403).json({error: 'Accès réservé aux commerciaux'});
  }
  
  const totalUsers = await db.getOne('SELECT COUNT(*) as count FROM users WHERE recruited_by=$1', [userId]);
  const totalActors = await db.getOne('SELECT COUNT(*) as count FROM actors WHERE recruited_by=$1', [userId]);
  const premiumUsers = await db.getOne('SELECT COUNT(*) as count FROM users u JOIN subscriptions s ON u.id=s.user_id WHERE u.recruited_by=$1 AND s.plan=$2 AND s.status=$3', [userId, 'premium', 'active']);
  const recentUsers = await db.getAll(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
           s.plan, s.status as subscription_status,
           (SELECT COUNT(*) FROM actors WHERE owner_id=u.id) as actors_count
    FROM users u
    LEFT JOIN subscriptions s ON u.id=s.user_id
    WHERE u.recruited_by=$1
    ORDER BY u.created_at DESC
    LIMIT 10
  `, [userId]);
  const recentActors = await db.getAll('SELECT a.*, u.name as owner_name FROM actors a LEFT JOIN users u ON a.owner_id=u.id WHERE a.recruited_by=$1 ORDER BY a.created_at DESC LIMIT 10', [userId]);
  
  res.json({
    totalUsers: parseInt(totalUsers.count),
    totalActors: parseInt(totalActors.count),
    premiumUsers: parseInt(premiumUsers.count),
    recentUsers,
    recentActors
  });
});

// Fonction pour échapper les valeurs CSV et prévenir l'injection de formules
function escapeCSV(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Neutraliser les formules CSV (=, +, -, @, tab, carriage return)
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousChars.some(char => str.startsWith(char))) {
    str = "'" + str; // Préfixer avec une apostrophe pour neutraliser
  }
  // Échapper les guillemets doubles
  str = str.replace(/"/g, '""');
  // Encadrer avec des guillemets
  return `"${str}"`;
}

// Endpoint pour générer un rapport CSV de performance commercial
app.get('/api/commercial/report', requireAuth, async (req,res)=>{
  const userId = req.session.user.id;
  const user = await db.getOne('SELECT is_commercial, name, commercial_code FROM users WHERE id=$1', [userId]);
  
  if(!user || !user.is_commercial){
    return res.status(403).json({error: 'Accès réservé aux commerciaux'});
  }
  
  // Récupérer toutes les données de performance
  const recruits = await db.getAll(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.region, u.created_at,
           s.plan, s.status as subscription_status,
           COUNT(a.id) as actors_count
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN actors a ON a.owner_id = u.id
    WHERE u.recruited_by = $1
    GROUP BY u.id, u.name, u.email, u.phone, u.role, u.region, u.created_at, s.plan, s.status
    ORDER BY u.created_at DESC
  `, [userId]);
  
  // Générer le CSV avec échappement sécurisé
  const csvHeader = 'ID,Nom,Email,Téléphone,Rôle,Région,Date inscription,Plan,Statut,Nombre acteurs\n';
  const csvRows = recruits.map(r => {
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '';
    return [
      r.id,
      escapeCSV(r.name),
      escapeCSV(r.email),
      escapeCSV(r.phone),
      escapeCSV(r.role),
      escapeCSV(r.region),
      escapeCSV(date),
      escapeCSV(r.plan || 'free'),
      escapeCSV(r.subscription_status || 'active'),
      r.actors_count || 0
    ].join(',');
  }).join('\n');
  
  const csv = csvHeader + csvRows;
  const filename = `rapport_commercial_${user.commercial_code}_${new Date().toISOString().split('T')[0]}.csv`;
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv); // BOM pour Excel
});

// Endpoint admin pour rapport d'un commercial spécifique
app.get('/api/admin/commercials/:id/report', requireAdmin, async (req,res)=>{
  const commercialId = parseInt(req.params.id);
  const commercial = await db.getOne('SELECT name, commercial_code FROM users WHERE id=$1 AND is_commercial=true', [commercialId]);
  
  if(!commercial){
    return res.status(404).json({error: 'Commercial non trouvé'});
  }
  
  const recruits = await db.getAll(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.region, u.created_at,
           s.plan, s.status as subscription_status,
           COUNT(a.id) as actors_count
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN actors a ON a.owner_id = u.id
    WHERE u.recruited_by = $1
    GROUP BY u.id, u.name, u.email, u.phone, u.role, u.region, u.created_at, s.plan, s.status
    ORDER BY u.created_at DESC
  `, [commercialId]);
  
  const csvHeader = 'ID,Nom,Email,Téléphone,Rôle,Région,Date inscription,Plan,Statut,Nombre acteurs\n';
  const csvRows = recruits.map(r => {
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '';
    return [
      r.id,
      escapeCSV(r.name),
      escapeCSV(r.email),
      escapeCSV(r.phone),
      escapeCSV(r.role),
      escapeCSV(r.region),
      escapeCSV(date),
      escapeCSV(r.plan || 'free'),
      escapeCSV(r.subscription_status || 'active'),
      r.actors_count || 0
    ].join(',');
  }).join('\n');
  
  const csv = csvHeader + csvRows;
  const filename = `rapport_commercial_${commercial.commercial_code}_${new Date().toISOString().split('T')[0]}.csv`;
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
});

// Endpoint admin pour rapport consolidé de tous les commerciaux
app.get('/api/admin/commercials/reports/consolidated', requireAdmin, async (req,res)=>{
  const commercials = await db.getAll(`
    SELECT u.id, u.name, u.commercial_code, u.region, u.created_at,
           COUNT(DISTINCT ur.id) as total_recruits,
           COUNT(DISTINCT a.id) as total_actors,
           COUNT(DISTINCT CASE WHEN s.plan='premium' AND s.status='active' THEN ur.id END) as premium_recruits
    FROM users u
    LEFT JOIN users ur ON ur.recruited_by = u.id
    LEFT JOIN actors a ON a.recruited_by = u.id
    LEFT JOIN subscriptions s ON ur.id = s.user_id
    WHERE u.is_commercial = true
    GROUP BY u.id, u.name, u.commercial_code, u.region, u.created_at
    ORDER BY total_recruits DESC
  `);
  
  const csvHeader = 'ID,Nom Commercial,Code,Région,Date création,Total recrutés,Total acteurs,Clients Premium,Taux conversion Premium (%)\n';
  const csvRows = commercials.map(c => {
    const date = c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '';
    const conversionRate = c.total_recruits > 0 ? ((c.premium_recruits / c.total_recruits) * 100).toFixed(2) : '0.00';
    return [
      c.id,
      escapeCSV(c.name),
      escapeCSV(c.commercial_code),
      escapeCSV(c.region),
      escapeCSV(date),
      c.total_recruits || 0,
      c.total_actors || 0,
      c.premium_recruits || 0,
      conversionRate
    ].join(',');
  }).join('\n');
  
  const csv = csvHeader + csvRows;
  const filename = `rapport_consolidé_commerciaux_${new Date().toISOString().split('T')[0]}.csv`;
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
});

app.get('/api/commercial/recruits', requireAuth, async (req,res)=>{
  const userId = req.session.user.id;
  const user = await db.getOne('SELECT is_commercial FROM users WHERE id=$1', [userId]);
  
  if(!user || !user.is_commercial){
    return res.status(403).json({error: 'Accès réservé aux commerciaux'});
  }
  
  const users = await db.getAll(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.region, u.created_at,
           s.plan, s.status as subscription_status,
           (SELECT COUNT(*) FROM actors WHERE owner_id=u.id) as actors_count
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    WHERE u.recruited_by = $1
    ORDER BY u.created_at DESC
  `, [userId]);
  
  res.json(users);
});

app.get('/api/admin/commercials', requireAdmin, async (req,res)=>{
  const commercials = await db.getAll(`
    SELECT u.id, u.name, u.email, u.phone, u.whatsapp, u.region, u.commercial_code, 
           u.is_commercial, u.status, u.created_at,
           (SELECT COUNT(*) FROM users WHERE recruited_by=u.id) as total_recruits,
           (SELECT COUNT(*) FROM actors WHERE recruited_by=u.id) as total_actors,
           (SELECT COUNT(*) FROM users ur 
            JOIN subscriptions s ON ur.id=s.user_id 
            WHERE ur.recruited_by=u.id AND s.plan='premium' AND s.status='active') as premium_recruits
    FROM users u
    WHERE u.is_commercial = true
    ORDER BY u.created_at DESC
  `, []);
  res.json(commercials);
});

app.post('/api/admin/commercials/create', requireAdmin, async (req,res)=>{
  const {name, email, phone, whatsapp, region, password} = req.body;
  
  if(!name || !password || (!email && !phone)){
    return res.status(400).json({error: 'Nom, mot de passe et email OU téléphone requis'});
  }
  
  const existingUser = email 
    ? await db.getOne('SELECT id FROM users WHERE email=$1', [email])
    : await db.getOne('SELECT id FROM users WHERE phone=$1', [phone?.replace(/\s/g,'')]);
  
  if(existingUser){
    return res.status(400).json({error: 'Un utilisateur avec cet email/téléphone existe déjà'});
  }
  
  const commercialCode = `COM-${name.toUpperCase().replace(/\s/g,'').substring(0,6)}-${Date.now().toString().slice(-4)}`;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newCommercial = await db.insertOne(
    'INSERT INTO users (name, email, phone, whatsapp, region, password_hash, is_commercial, commercial_code, role, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [name, email||null, phone?.replace(/\s/g,'')||null, whatsapp||null, region||null, hashedPassword, true, commercialCode, 'commercial', 'active']
  );
  
  await db.query(
    'INSERT INTO subscriptions (user_id, plan, status) VALUES ($1,$2,$3)',
    [newCommercial.id, 'free', 'active']
  );
  
  res.status(201).json({
    id: newCommercial.id,
    name: newCommercial.name,
    email: newCommercial.email,
    phone: newCommercial.phone,
    commercial_code: commercialCode,
    message: 'Compte commercial créé avec succès'
  });
});

app.put('/api/admin/commercials/:id', requireAdmin, async (req,res)=>{
  const commercialId = Number(req.params.id);
  const {name, email, phone, whatsapp, region, status, is_commercial} = req.body;
  
  // Vérifier si l'email existe déjà pour un autre utilisateur
  if(email){
    const existingEmail = await db.getOne('SELECT id FROM users WHERE email=$1 AND id!=$2', [email, commercialId]);
    if(existingEmail){
      return res.status(400).json({error: 'Cet email est déjà utilisé par un autre utilisateur'});
    }
  }
  
  // Vérifier si le téléphone existe déjà pour un autre utilisateur
  if(phone){
    const normalizedPhone = phone.replace(/\s/g,'');
    const existingPhone = await db.getOne('SELECT id FROM users WHERE phone=$1 AND id!=$2', [normalizedPhone, commercialId]);
    if(existingPhone){
      return res.status(400).json({error: 'Ce téléphone est déjà utilisé par un autre utilisateur'});
    }
  }
  
  await db.query(
    'UPDATE users SET name=$1, email=$2, phone=$3, whatsapp=$4, region=$5, status=$6, is_commercial=$7 WHERE id=$8',
    [name, email||null, phone?.replace(/\s/g,'')||null, whatsapp||null, region||null, status, is_commercial, commercialId]
  );
  
  const updated = await db.getOne('SELECT id, name, email, phone, whatsapp, region, commercial_code, is_commercial, status FROM users WHERE id=$1', [commercialId]);
  res.json(updated);
});

app.delete('/api/admin/commercials/:id', requireAdmin, async (req,res)=>{
  const commercialId = Number(req.params.id);
  const adminId = req.session.user.id;
  
  // Empêcher l'admin de supprimer son propre compte
  if(commercialId === adminId){
    return res.status(400).json({error: 'Vous ne pouvez pas supprimer votre propre compte'});
  }
  
  // Vérifier que c'est bien un commercial
  const commercial = await db.getOne('SELECT is_commercial FROM users WHERE id=$1', [commercialId]);
  if(!commercial){
    return res.status(404).json({error: 'Commercial introuvable'});
  }
  
  // Supprimer le commercial et ses données associées
  await db.query('DELETE FROM users WHERE id=$1', [commercialId]);
  res.json({message: 'Commercial supprimé avec succès'});
});

// Payment endpoints - FedaPay integration for T-Money, Flooz, and Credit Cards
app.post('/api/payments/initiate', requireAuth, async (req,res)=>{
  const {amount, description} = req.body;
  const userId = req.session.user.id;
  const user = await db.getOne('SELECT * FROM users WHERE id=$1', [userId]);
  
  if(!amount || amount < 1000) return res.status(400).json({error:'Amount must be at least 1,000 FCFA'});
  
  if(!process.env.FEDAPAY_SECRET_KEY) {
    return res.status(503).json({
      error: 'Payment system not configured',
      message: 'FedaPay API keys not set. Please contact administrator.'
    });
  }
  
  const transactionId = `AGR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const callbackUrl = `${req.protocol}://${req.get('host')}/api/payments/webhook`;
  
  try {
    const transaction = await FedaPay.Transaction.create({
      description: description || 'Abonnement Premium AgriRéseau Pro - 1 mois',
      amount: amount,
      currency: { iso: 'XOF' },
      callback_url: callbackUrl,
      customer: {
        firstname: user.name || 'Client',
        lastname: 'AgriRéseau',
        email: user.email || `user${userId}@agrireseau.tg`,
        phone_number: user.phone ? {
          number: user.phone,
          country: 'tg'
        } : undefined
      },
      custom_metadata: {
        user_id: userId.toString(),
        transaction_id: transactionId,
        purpose: 'premium_subscription'
      }
    });
    
    await db.query(
      'INSERT INTO payments (user_id, amount, payment_method, provider, transaction_id, status, description, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [userId, amount, 'fedapay', 'fedapay', transaction.id, 'pending', description || 'Activation Premium AgriRéseau Pro', JSON.stringify({fedapay_id: transaction.id})]
    );
    
    const token = await transaction.generateToken();
    
    res.json({
      success: true,
      transactionId: transaction.id,
      paymentUrl: token.url,
      message: 'Transaction créée avec succès. Vous allez être redirigé vers la page de paiement.'
    });
  } catch(e) {
    console.error('FedaPay payment initiation error:', e);
    res.status(500).json({
      error: 'Payment initiation failed',
      message: e.message || 'Unable to create payment. Please try again.'
    });
  }
});

// FedaPay Webhook endpoint
app.post('/api/payments/webhook', express.raw({type: 'application/json'}), async (req,res)=>{
  try {
    const event = req.body.entity || req.body;
    const eventName = req.body.name || 'transaction.unknown';
    
    console.log('FedaPay webhook received:', eventName, event);
    
    if(eventName === 'transaction.approved') {
      const transactionId = event.id;
      const payment = await db.getOne('SELECT * FROM payments WHERE transaction_id=$1', [transactionId]);
      
      if(!payment) {
        console.error('Payment not found for transaction:', transactionId);
        return res.status(404).json({error: 'Payment not found'});
      }
      
      await db.query(
        'UPDATE payments SET status=$1, completed_at=$2 WHERE transaction_id=$3',
        ['completed', new Date(), transactionId]
      );
      
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      
      await db.query(
        'UPDATE subscriptions SET plan=$1, status=$2, payment_method=$3, amount=$4, transaction_id=$5, started_at=$6, expires_at=$7 WHERE user_id=$8',
        ['premium', 'active', 'fedapay', event.amount, transactionId, new Date(), expiresAt, payment.user_id]
      );
      
      console.log('Premium activated for user:', payment.user_id);
    }
    
    res.status(200).json({received: true});
  } catch(e) {
    console.error('FedaPay webhook error:', e);
    res.status(500).json({error: 'Webhook processing failed'});
  }
});

app.get('/api/payments/history', requireAuth, async (req,res)=>{
  const payments = await db.getAll('SELECT * FROM payments WHERE user_id=$1 ORDER BY created_at DESC', [req.session.user.id]);
  res.json(payments);
});

// Notification endpoints - Twilio integration for SMS/WhatsApp (Premium only)
app.post('/api/notifications/send', requirePremium, async (req,res)=>{
  const {type, channel, recipient, message} = req.body;
  const userId = req.session.user.id;
  
  if(!['sms', 'whatsapp', 'email'].includes(channel)) return res.status(400).json({error:'Invalid channel'});
  if(!recipient || !message) return res.status(400).json({error:'Recipient and message required'});
  
  try {
    await db.query(
      'INSERT INTO notifications (user_id, type, channel, recipient, message, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, type || 'custom', channel, recipient, message, 'pending']
    );
    
    res.json({
      success: true,
      message: 'Notification enregistrée. Envoi en cours...',
      note: 'Configuration Twilio requise pour envoi automatique'
    });
  } catch(e) {
    console.error('Notification error:', e);
    res.status(500).json({error: 'Notification failed'});
  }
});

app.get('/api/notifications/history', requirePremium, async (req,res)=>{
  const notifications = await db.getAll('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.session.user.id]);
  res.json(notifications);
});

app.get('/api/stats/overview', requireAuth, async (req,res)=>{
  const userId = req.session.user.id;
  
  const actorsCount = await db.getOne('SELECT COUNT(*) as count FROM actors WHERE owner_id=$1', [userId]);
  const budgetsCount = await db.getOne('SELECT COUNT(*) as count FROM activities WHERE user_id=$1', [userId]);
  const expenses = await db.getAll('SELECT * FROM budget_entries WHERE user_id=$1 AND kind=$2', [userId, 'expense']);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const harvests = await db.getAll('SELECT actual_harvest FROM activities WHERE user_id=$1 AND actual_harvest > 0', [userId]);
  const totalHarvests = harvests.reduce((sum, h) => sum + Number(h.actual_harvest || 0), 0);
  const ratings = await db.getAll('SELECT r.* FROM ratings r JOIN actors a ON r.actor_id=a.id WHERE a.owner_id=$1', [userId]);
  
  res.json({
    actors_count: Number(actorsCount.count || 0),
    budgets_count: Number(budgetsCount.count || 0),
    expenses_count: expenses.length,
    total_expenses: totalExpenses,
    total_harvests: totalHarvests,
    ratings_received: ratings.length,
    views_count: Math.floor(Math.random() * 500) + 100
  });
});

app.get('/api/stats/actors', requireAuth, async (req,res)=>{
  const userId = req.session.user.id;
  const actors = await db.getAll('SELECT * FROM actors WHERE owner_id=$1 ORDER BY id DESC', [userId]);
  
  const actorStats = [];
  for(const actor of actors){
    const ratings = await db.getOne('SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE actor_id=$1', [actor.id]);
    const harvests = await db.getAll('SELECT harvest_product, actual_harvest FROM activities WHERE actor_id=$1 AND harvest_product IS NOT NULL AND actual_harvest > 0', [actor.id]);
    
    const harvestsByProduct = {};
    harvests.forEach(h => {
      if (!harvestsByProduct[h.harvest_product]) harvestsByProduct[h.harvest_product] = 0;
      harvestsByProduct[h.harvest_product] += h.actual_harvest;
    });
    
    actorStats.push({
      id: actor.id,
      name: actor.name,
      role: actor.role,
      region: actor.region,
      products: JSON.parse(actor.products || '[]'),
      rating_avg: ratings?.avg ? parseFloat(ratings.avg) : 0,
      rating_count: ratings?.count ? parseInt(ratings.count) : 0,
      views: Math.floor(Math.random() * 100) + 10,
      harvests: harvestsByProduct
    });
  }
  
  res.json(actorStats);
});

app.get('/api/stats/budgets', requireAuth, async (req,res)=>{
  const userId = req.session.user.id;
  const budgets = await db.getAll('SELECT * FROM activities WHERE user_id=$1 ORDER BY id DESC', [userId]);
  
  const budgetStats = [];
  for(const budget of budgets){
    const items = await db.getAll('SELECT * FROM activity_items WHERE activity_id=$1', [budget.id]);
    const expenses = await db.getAll('SELECT * FROM budget_entries WHERE activity_id=$1 AND kind=$2 ORDER BY occurred_on ASC', [budget.id, 'expense']);
    const incomes = await db.getAll('SELECT * FROM budget_entries WHERE activity_id=$1 AND kind=$2 ORDER BY occurred_on ASC', [budget.id, 'income']);
    
    const intrants = items.filter(x=>x.kind==='input').reduce((s,x)=> s + (x.qty||0)*(x.unit_price||0),0);
    const mo = items.filter(x=>x.kind==='labor').reduce((s,x)=> s + (x.qty||0)*(x.unit_price||0),0);
    const directs = intrants + mo + (budget.transport||0) + (budget.autres||0);
    const overhead = directs * ((budget.overhead_pct||0)/100);
    const totalPlanned = directs + overhead;
    
    const totalRealExpenses = expenses.reduce((s,e)=> s + Number(e.amount||0), 0);
    const totalRealIncomes = incomes.reduce((s,e)=> s + Number(e.amount||0), 0);
    const profit = totalRealIncomes - totalRealExpenses;
    
    const variance = totalRealExpenses - totalPlanned;
    const variancePercent = totalPlanned > 0 ? (variance / totalPlanned * 100) : 0;
    
    budgetStats.push({
      id: budget.id,
      label: budget.label,
      filiere: budget.filiere,
      periode: budget.periode,
      status: budget.status,
      planned_total: totalPlanned,
      real_expenses: totalRealExpenses,
      real_incomes: totalRealIncomes,
      profit: profit,
      variance: variance,
      variance_percent: variancePercent,
      expenses_by_date: expenses,
      actual_harvest: budget.actual_harvest || 0
    });
  }
  
  res.json(budgetStats);
});

app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=> res.sendFile(path.join(__dirname,'public/index.html')));

app.listen(PORT, '0.0.0.0', ()=> console.log('AgriRéseau MVP running on http://0.0.0.0:'+PORT));
