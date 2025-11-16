
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

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

app.post('/api/auth/register', async (req,res)=>{ 
  const {email,password,name,region,role}=req.body; 
  if(!email||!password) return res.status(400).json({error:'missing_fields'}); 
  const hash=bcrypt.hashSync(password,10); 
  try{ 
    const user = await db.insertOne('INSERT INTO users (email,name,password_hash,region,role) VALUES ($1,$2,$3,$4,$5)', [email.trim().toLowerCase(),name||'',hash,region||'',role||'']); 
    const userId=user.id; 
    await db.query('INSERT INTO subscriptions (user_id,plan,status) VALUES ($1,$2,$3)', [userId,'free','active']); 
    req.session.user={id:userId,email,name,region,role}; 
    res.status(201).json(req.session.user); 
  } catch(e){ 
    res.status(400).json({error:'email_exists'}); 
  } 
});

app.post('/api/auth/login', async (req,res)=>{ 
  const {email,password}=req.body; 
  const u = await db.getOne('SELECT * FROM users WHERE email=$1', [(email||'').trim().toLowerCase()]); 
  if(!u) return res.status(400).json({error:'invalid_credentials'}); 
  if(!bcrypt.compareSync(password||'',u.password_hash)) return res.status(400).json({error:'invalid_credentials'}); 
  req.session.user={id:u.id,email:u.email,name:u.name,region:u.region,role:u.role}; 
  res.json(req.session.user); 
});

app.post('/api/auth/logout',(req,res)=> req.session.destroy(()=>res.json({ok:true})));
app.get('/api/auth/me',(req,res)=> res.json(req.session.user||null));

app.get('/api/refs', async (req,res)=>{ 
  const regions = await db.getAll('SELECT name FROM regions', []); 
  const products = await db.getAll('SELECT name FROM products', []); 
  res.json({regions: regions.map(r=>r.name), products: products.map(r=>r.name)}); 
});

app.post('/api/seed', async (req,res)=>{ 
  await db.query('DELETE FROM actors', []); 
  await db.query('DELETE FROM logistics', []); 
  await db.query('DELETE FROM ratings', []); 
  const actors=[ 
    {name:'Coopérative Agri-Plateaux',role:'producteur',region:'Plateaux',localite:'Kpalimé',products:['Maïs','Soja'],need:'Acheteurs en gros, Transport vers Lomé',volume:12000,price:450,photo_url:'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=200',certifications:['bio','quality'],lat:6.9006,lng:0.6323,phone:'+22890000001',whatsapp:'+22890000001',email:'coop.plateaux@example.com',verified:true}, 
    {name:'Ferme Manioc Maritime',role:'producteur',region:'Maritime',localite:'Tsévié',products:['Manioc','Gari'],need:'Transformateurs pour gari, Transport local',volume:8000,price:350,photo_url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200',certifications:['fair'],lat:6.4261,lng:1.2135,phone:'+22890000002',whatsapp:'+22890000002',email:'manioc.maritime@example.com',verified:false}, 
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

app.get('/api/actors', async (req,res)=>{ 
  const rows = await db.getAll('SELECT * FROM actors ORDER BY id DESC', []); 
  const result = [];
  for(const r of rows) {
    const actor = {...r,products:JSON.parse(r.products||'[]'),certifications:JSON.parse(r.certifications||'[]')};
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

app.post('/api/actors', requireAuth, async (req,res)=>{ 
  const sub = await db.getOne('SELECT * FROM subscriptions WHERE user_id=$1', [req.session.user.id]);
  const actorCountRow = await db.getOne('SELECT COUNT(*) as c FROM actors WHERE owner_id=$1', [req.session.user.id]);
  const actorCount = actorCountRow.c;
  if(sub && sub.plan==='free' && actorCount>=2) return res.status(403).json({error:'limit_reached',message:'Version gratuite limitée à 2 acteurs. Passez à Premium pour plus !'});
  const b=req.body; 
  const row = await db.insertOne(`INSERT INTO actors (name,role,region,localite,products,need,volume,price,photo_url,certifications,lat,lng,phone,whatsapp,email,verified,owner_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`, [b.name,b.role,b.region,b.localite||'',JSON.stringify(b.products||[]),b.need||'',b.volume||null,b.price||null,b.photo_url||'',JSON.stringify(b.certifications||[]),b.lat||null,b.lng||null,b.phone||'',b.whatsapp||'',b.email||'',b.verified||false,req.session.user.id]); 
  row.products=JSON.parse(row.products||'[]'); 
  row.certifications=JSON.parse(row.certifications||'[]'); 
  res.status(201).json(row); 
});

app.put('/api/actors/:id', requireAuth, async (req,res)=>{ 
  const id=Number(req.params.id), b=req.body; 
  await db.query(`UPDATE actors SET name=$1,role=$2,region=$3,localite=$4,products=$5,need=$6,volume=$7,price=$8,photo_url=$9,certifications=$10,lat=$11,lng=$12,phone=$13,whatsapp=$14,email=$15,verified=$16 WHERE id=$17`, [b.name,b.role,b.region,b.localite||'',JSON.stringify(b.products||[]),b.need||'',b.volume||null,b.price||null,b.photo_url||'',JSON.stringify(b.certifications||[]),b.lat||null,b.lng||null,b.phone||'',b.whatsapp||'',b.email||'',b.verified||false,id]); 
  const row = await db.getOne('SELECT * FROM actors WHERE id=$1', [id]); 
  row.products=JSON.parse(row.products||'[]'); 
  row.certifications=JSON.parse(row.certifications||'[]'); 
  res.json(row); 
});

app.delete('/api/actors/:id', requireAuth, async (req,res)=>{ 
  await db.query('DELETE FROM actors WHERE id=$1', [Number(req.params.id)]); 
  res.status(204).end(); 
});

app.get('/api/actors/:id/harvests', async (req,res)=>{ 
  const actorId = Number(req.params.id);
  const harvests = await db.getAll(`SELECT harvest_product, actual_harvest FROM activities WHERE actor_id=$1 AND harvest_product IS NOT NULL AND actual_harvest > 0`, [actorId]);
  const grouped = {};
  harvests.forEach(h => {
    if (!grouped[h.harvest_product]) grouped[h.harvest_product] = 0;
    grouped[h.harvest_product] += h.actual_harvest;
  });
  const result = Object.keys(grouped).map(product => ({product, quantity: grouped[product]}));
  res.json(result);
});

app.get('/api/logistics', async (req,res)=>{ 
  const rows = await db.getAll('SELECT * FROM logistics ORDER BY id DESC', []); 
  res.json(rows); 
});

app.post('/api/logistics', requireAuth, async (req,res)=>{ 
  const b=req.body; 
  const row = await db.insertOne('INSERT INTO logistics (type,title,region,details,contact,whatsapp,owner_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', [b.type,b.title,b.region,b.details||'',b.contact||'',b.whatsapp||'',req.session.user.id]); 
  res.status(201).json(row); 
});

app.put('/api/logistics/:id', requireAuth, async (req,res)=>{ 
  const id=Number(req.params.id), b=req.body; 
  await db.query('UPDATE logistics SET type=$1,title=$2,region=$3,details=$4,contact=$5,whatsapp=$6 WHERE id=$7', [b.type,b.title,b.region,b.details||'',b.contact||'',b.whatsapp||'',id]); 
  const row = await db.getOne('SELECT * FROM logistics WHERE id=$1', [id]); 
  res.json(row); 
});

app.delete('/api/logistics/:id', requireAuth, async (req,res)=>{ 
  await db.query('DELETE FROM logistics WHERE id=$1', [Number(req.params.id)]); 
  res.status(204).end(); 
});

app.get('/api/activities', requireAuth, async (req,res)=>{ 
  const acts = await db.getAll('SELECT * FROM activities WHERE user_id=$1 ORDER BY id DESC', [req.session.user.id]); 
  res.json(acts); 
});

app.post('/api/activities', requireAuth, async (req,res)=>{ 
  const b=req.body; 
  const act = await db.insertOne(`INSERT INTO activities (user_id,filiere,label,periode,output_qty,target_margin,price_expected,transport,autres,overhead_pct,status,started_at,harvest_product,actor_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [req.session.user.id,b.filiere,b.label,b.periode,b.output_qty||0,b.target_margin||0,b.price_expected||0,b.transport||0,b.autres||0,b.overhead_pct||10,b.status||'planned',b.started_at||null,b.harvest_product||null,b.actor_id||null]); 
  res.status(201).json(act); 
});

app.put('/api/activities/:id', requireAuth, async (req,res)=>{ 
  const id=Number(req.params.id), b=req.body; 
  await db.query(`UPDATE activities SET filiere=$1,label=$2,periode=$3,output_qty=$4,target_margin=$5,price_expected=$6,transport=$7,autres=$8,overhead_pct=$9,status=$10,started_at=$11,ended_at=$12,actual_harvest=$13,harvest_product=$14,actor_id=$15 WHERE id=$16 AND user_id=$17`, [b.filiere,b.label,b.periode,b.output_qty||0,b.target_margin||0,b.price_expected||0,b.transport||0,b.autres||0,b.overhead_pct||10,b.status||'planned',b.started_at||null,b.ended_at||null,b.actual_harvest||null,b.harvest_product||null,b.actor_id||null,id,req.session.user.id]); 
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

app.post('/api/activities/:id/items', requireAuth, async (req,res)=>{ 
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

app.post('/api/admin/activate-premium', requireAuth, async (req,res)=>{
  const {userEmail, transactionId, paymentMethod} = req.body;
  if(!userEmail || !transactionId) return res.status(400).json({error:'Missing userEmail or transactionId'});
  
  const targetUser = await db.getOne('SELECT id FROM users WHERE email=$1', [userEmail]);
  if(!targetUser) return res.status(404).json({error:'User not found'});
  
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  
  try{
    await db.query(
      `UPDATE subscriptions SET plan=$1, status=$2, payment_method=$3, amount=$4, transaction_id=$5, started_at=$6, expires_at=$7 WHERE user_id=$8`,
      ['premium', 'active', paymentMethod || 'manual', 5000, transactionId, new Date(), expiresAt, targetUser.id]
    );
    res.json({success:true, message:`Premium activated for ${userEmail} until ${expiresAt.toISOString().split('T')[0]}`});
  } catch(e){
    console.error('Error activating premium:', e);
    res.status(500).json({error:'Failed to activate premium'});
  }
});

app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=> res.sendFile(path.join(__dirname,'public/index.html')));

app.listen(PORT, '0.0.0.0', ()=> console.log('AgriRéseau MVP running on http://0.0.0.0:'+PORT));
