
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
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

const db = new Database('agri_reseau.sqlite');
db.pragma('journal_mode = WAL');

const schema = `
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,name TEXT,password_hash TEXT NOT NULL,region TEXT,role TEXT,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS actors (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,role TEXT NOT NULL,region TEXT NOT NULL,localite TEXT,products TEXT,need TEXT,volume REAL,price REAL,photo_url TEXT,lat REAL,lng REAL,phone TEXT,whatsapp TEXT,email TEXT,verified INTEGER DEFAULT 0,owner_id INTEGER,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS logistics (id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL,title TEXT NOT NULL,region TEXT NOT NULL,details TEXT,contact TEXT,whatsapp TEXT,owner_id INTEGER,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS regions (name TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS products (name TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS activities (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,filiere TEXT NOT NULL,label TEXT NOT NULL,periode TEXT NOT NULL,output_qty REAL DEFAULT 0,target_margin REAL DEFAULT 0,price_expected REAL DEFAULT 0,transport REAL DEFAULT 0,autres REAL DEFAULT 0,overhead_pct REAL DEFAULT 10,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS activity_items (id INTEGER PRIMARY KEY AUTOINCREMENT,activity_id INTEGER NOT NULL,kind TEXT NOT NULL,label TEXT,qty REAL DEFAULT 0,unit TEXT,unit_price REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS budget_entries (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,activity_id INTEGER,kind TEXT NOT NULL,category TEXT,amount REAL NOT NULL,occurred_on TEXT NOT NULL,note TEXT);
`;
db.exec(schema);

// seed refs
if (!db.prepare('SELECT COUNT(*) c FROM regions').get().c) {
  for (const r of ['Maritime','Plateaux','Centrale','Kara','Savanes']) db.prepare('INSERT OR IGNORE INTO regions(name) VALUES (?)').run(r);
}
if (!db.prepare('SELECT COUNT(*) c FROM products').get().c) {
  for (const p of ['Maïs','Manioc','Riz','Soja','Légumes','Fruits','Igname','Gari','Huile de soja','Volaille','Maraîchage']) db.prepare('INSERT OR IGNORE INTO products(name) VALUES (?)').run(p);
}

function requireAuth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'auth_required'}); next(); }

app.post('/api/auth/register',(req,res)=>{ const {email,password,name,region,role}=req.body; if(!email||!password) return res.status(400).json({error:'missing_fields'}); const hash=bcrypt.hashSync(password,10); try{ const info=db.prepare('INSERT INTO users (email,name,password_hash,region,role) VALUES (?,?,?,?,?)').run(email.trim().toLowerCase(),name||'',hash,region||'',role||''); req.session.user={id:info.lastInsertRowid,email,name,region,role}; res.status(201).json(req.session.user); } catch(e){ res.status(400).json({error:'email_exists'}); } });
app.post('/api/auth/login',(req,res)=>{ const {email,password}=req.body; const u=db.prepare('SELECT * FROM users WHERE email=?').get((email||'').trim().toLowerCase()); if(!u) return res.status(400).json({error:'invalid_credentials'}); if(!bcrypt.compareSync(password||'',u.password_hash)) return res.status(400).json({error:'invalid_credentials'}); req.session.user={id:u.id,email:u.email,name:u.name,region:u.region,role:u.role}; res.json(req.session.user); });
app.post('/api/auth/logout',(req,res)=> req.session.destroy(()=>res.json({ok:true})));
app.get('/api/auth/me',(req,res)=> res.json(req.session.user||null));

app.get('/api/refs',(req,res)=>{ const regions=db.prepare('SELECT name FROM regions').all().map(r=>r.name); const products=db.prepare('SELECT name FROM products').all().map(r=>r.name); res.json({regions,products}); });

app.post('/api/seed',(req,res)=>{ db.exec('DELETE FROM actors; DELETE FROM logistics;'); const actors=[ {name:'Coopérative Agri-Plateaux',role:'producteur',region:'Plateaux',localite:'Kpalimé',products:['Maïs','Soja'],need:'Acheteurs en gros, Transport vers Lomé',volume:12000,lat:6.9006,lng:0.6323,phone:'+22890000001',whatsapp:'+22890000001',email:'coop.plateaux@example.com',verified:1}, {name:'Ferme Manioc Maritime',role:'producteur',region:'Maritime',localite:'Tsévié',products:['Manioc','Gari'],need:'Transformateurs pour gari, Transport local',volume:8000,lat:6.4261,lng:1.2135,phone:'+22890000002',whatsapp:'+22890000002',email:'manioc.maritime@example.com',verified:0}, {name:'LogiTrans Togo',role:'transporteur',region:'Maritime',localite:'Lomé',products:[],need:'Courses hebdo Lomé-Kpalimé; capacité 10T',lat:6.1319,lng:1.2224,phone:'+22890000003',whatsapp:'+22890000003',email:'logitrans@example.com',verified:1}, {name:'AgroTransfo Kara',role:'transformateur',region:'Kara',localite:'Kara',products:['Huile de soja'],need:'Approvisionnement régulier Soja 20T/mois',lat:9.5517,lng:1.1861,phone:'+22890000004',whatsapp:'+22890000004',email:'agrotransfo.kara@example.com',verified:1}, {name:"Grossiste Marché d'Adawlato",role:'grossiste',region:'Maritime',localite:'Lomé',products:['Maïs','Igname','Légumes'],need:'Producteurs certifiés; contrats saisonniers',phone:'+22890000005',whatsapp:'+22890000005',email:'grossiste.adawlato@example.com',verified:0}, {name:'Détaillant Boutique Agro Sokodé',role:'detaillant',region:'Centrale',localite:'Sokodé',products:['Légumes','Fruits'],need:'Paniers hebdo 200kg',phone:'+22890000006',whatsapp:'+22890000006',email:'det.sokode@example.com',verified:0}, {name:'ONG Appui Agricole',role:'institution',region:'Plateaux',localite:'Atakpamé',products:[],need:'Suivi data régionale, formations',phone:'+22890000007',whatsapp:'+22890000007',email:'ong.atakpame@example.com',verified:1} ]; const insA=db.prepare(`INSERT INTO actors (name,role,region,localite,products,need,volume,lat,lng,phone,whatsapp,email,verified,owner_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)`); for(const a of actors) insA.run(a.name,a.role,a.region,a.localite||'',JSON.stringify(a.products||[]),a.need||'',a.volume||null,a.lat||null,a.lng||null,a.phone||'',a.whatsapp||'',a.email||'',a.verified?1:0); const logs=[ {type:'need',title:'Transport Kpalimé → Lomé',region:'Plateaux',details:'Maïs 12T palette, ramassage sous 7 jours',contact:'+22890000001',whatsapp:'+22890000001'}, {type:'offer',title:'Camion 10T Lomé → Kpalimé (Mer/Sam)',region:'Maritime',details:'Tarif négociable, contact LogiTrans',contact:'+22890000003',whatsapp:'+22890000003'} ]; const insL=db.prepare('INSERT INTO logistics (type,title,region,details,contact,whatsapp,owner_id) VALUES (?,?,?,?,?,?,NULL)'); for(const l of logs) insL.run(l.type,l.title,l.region,l.details||'',l.contact||'',l.whatsapp||''); res.status(201).json({ok:true}); });

app.get('/api/actors',(req,res)=>{ const rows=db.prepare('SELECT * FROM actors ORDER BY id DESC').all().map(r=>({...r,products:JSON.parse(r.products||'[]')})); res.json(rows); });
app.post('/api/actors',requireAuth,(req,res)=>{ const b=req.body; const info=db.prepare(`INSERT INTO actors (name,role,region,localite,products,need,volume,price,photo_url,lat,lng,phone,whatsapp,email,verified,owner_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(b.name,b.role,b.region,b.localite||'',JSON.stringify(b.products||[]),b.need||'',b.volume||null,b.price||null,b.photo_url||'',b.lat||null,b.lng||null,b.phone||'',b.whatsapp||'',b.email||'',b.verified?1:0,req.session.user.id); const row=db.prepare('SELECT * FROM actors WHERE id=?').get(info.lastInsertRowid); row.products=JSON.parse(row.products||'[]'); res.status(201).json(row); });
app.put('/api/actors/:id',requireAuth,(req,res)=>{ const id=Number(req.params.id), b=req.body; db.prepare(`UPDATE actors SET name=?1,role=?2,region=?3,localite=?4,products=?5,need=?6,volume=?7,price=?8,photo_url=?9,lat=?10,lng=?11,phone=?12,whatsapp=?13,email=?14,verified=?15 WHERE id=?16`).run(b.name,b.role,b.region,b.localite||'',JSON.stringify(b.products||[]),b.need||'',b.volume||null,b.price||null,b.photo_url||'',b.lat||null,b.lng||null,b.phone||'',b.whatsapp||'',b.email||'',b.verified?1:0,id); const row=db.prepare('SELECT * FROM actors WHERE id=?').get(id); row.products=JSON.parse(row.products||'[]'); res.json(row); });
app.delete('/api/actors/:id',requireAuth,(req,res)=>{ db.prepare('DELETE FROM actors WHERE id=?').run(Number(req.params.id)); res.status(204).end(); });

app.get('/api/logistics',(req,res)=>{ const rows=db.prepare('SELECT * FROM logistics ORDER BY id DESC').all(); res.json(rows); });
app.post('/api/logistics',requireAuth,(req,res)=>{ const b=req.body; const info=db.prepare('INSERT INTO logistics (type,title,region,details,contact,whatsapp,owner_id) VALUES (?,?,?,?,?,?,?)').run(b.type,b.title,b.region,b.details||'',b.contact||'',b.whatsapp||'',req.session.user.id); const row=db.prepare('SELECT * FROM logistics WHERE id=?').get(info.lastInsertRowid); res.status(201).json(row); });
app.put('/api/logistics/:id',requireAuth,(req,res)=>{ const id=Number(req.params.id), b=req.body; db.prepare('UPDATE logistics SET type=?1,title=?2,region=?3,details=?4,contact=?5,whatsapp=?6 WHERE id=?7').run(b.type,b.title,b.region,b.details||'',b.contact||'',b.whatsapp||'',id); const row=db.prepare('SELECT * FROM logistics WHERE id=?').get(id); res.json(row); });
app.delete('/api/logistics/:id',requireAuth,(req,res)=>{ db.prepare('DELETE FROM logistics WHERE id=?').run(Number(req.params.id)); res.status(204).end(); });

app.get('/api/activities',requireAuth,(req,res)=>{ const acts=db.prepare('SELECT * FROM activities WHERE user_id=? ORDER BY id DESC').all(req.session.user.id); res.json(acts); });
app.post('/api/activities',requireAuth,(req,res)=>{ const b=req.body; const info=db.prepare(`INSERT INTO activities (user_id,filiere,label,periode,output_qty,target_margin,price_expected,transport,autres,overhead_pct) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(req.session.user.id,b.filiere,b.label,b.periode,b.output_qty||0,b.target_margin||0,b.price_expected||0,b.transport||0,b.autres||0,b.overhead_pct||10); const act=db.prepare('SELECT * FROM activities WHERE id=?').get(info.lastInsertRowid); res.status(201).json(act); });
app.put('/api/activities/:id',requireAuth,(req,res)=>{ const id=Number(req.params.id), b=req.body; db.prepare(`UPDATE activities SET filiere=?1,label=?2,periode=?3,output_qty=?4,target_margin=?5,price_expected=?6,transport=?7,autres=?8,overhead_pct=?9 WHERE id=?10 AND user_id=?11`).run(b.filiere,b.label,b.periode,b.output_qty||0,b.target_margin||0,b.price_expected||0,b.transport||0,b.autres||0,b.overhead_pct||10,id,req.session.user.id); const act=db.prepare('SELECT * FROM activities WHERE id=?').get(id); res.json(act); });
app.delete('/api/activities/:id',requireAuth,(req,res)=>{ const id=Number(req.params.id); db.prepare('DELETE FROM activity_items WHERE activity_id=?').run(id); db.prepare('DELETE FROM activities WHERE id=? AND user_id=?').run(id,req.session.user.id); res.status(204).end(); });

app.get('/api/activities/:id/items',requireAuth,(req,res)=>{ const rows=db.prepare('SELECT * FROM activity_items WHERE activity_id=?').all(Number(req.params.id)); res.json(rows); });
app.post('/api/activities/:id/items',requireAuth,(req,res)=>{ const id=Number(req.params.id), b=req.body; const info=db.prepare('INSERT INTO activity_items (activity_id,kind,label,qty,unit,unit_price) VALUES (?,?,?,?,?,?)').run(id,b.kind,b.label,b.qty||0,b.unit||'',b.unit_price||0); const row=db.prepare('SELECT * FROM activity_items WHERE id=?').get(info.lastInsertRowid); res.status(201).json(row); });
app.put('/api/items/:itemId',requireAuth,(req,res)=>{ const itemId=Number(req.params.itemId), b=req.body; db.prepare('UPDATE activity_items SET kind=?1,label=?2,qty=?3,unit=?4,unit_price=?5 WHERE id=?6').run(b.kind,b.label,b.qty||0,b.unit||'',b.unit_price||0,itemId); const row=db.prepare('SELECT * FROM activity_items WHERE id=?').get(itemId); res.json(row); });
app.delete('/api/items/:itemId',requireAuth,(req,res)=>{ db.prepare('DELETE FROM activity_items WHERE id=?').run(Number(req.params.itemId)); res.status(204).end(); });

app.get('/api/activities/:id/summary',requireAuth,(req,res)=>{ const id=Number(req.params.id); const act=db.prepare('SELECT * FROM activities WHERE id=? AND user_id=?').get(id,req.session.user.id); if(!act) return res.status(404).json({error:'not_found'}); const items=db.prepare('SELECT * FROM activity_items WHERE activity_id=?').all(id); const intrants=items.filter(x=>x.kind==='input').reduce((s,x)=> s + (x.qty||0)*(x.unit_price||0),0); const mo=items.filter(x=>x.kind==='labor').reduce((s,x)=> s + (x.qty||0)*(x.unit_price||0),0); const directs=intrants+mo+(act.transport||0)+(act.autres||0); const overhead=directs*((act.overhead_pct||0)/100); const total=directs+overhead; const unit= total / Math.max(1, act.output_qty||1); const pv=act.price_expected||0; const marge= pv>0 ? (pv-unit)/pv*100 : 0; const pvCible = unit / (1 - Math.max(0.0001,(act.target_margin||0)/100)); const seuil = pv>0 ? Math.ceil(total/pv):0; res.json({intrants,mo,directs,overhead,total,unit,pv,marge,pvCible,seuil}); });

app.get('/api/budget',requireAuth,(req,res)=>{ const rows=db.prepare('SELECT * FROM budget_entries WHERE user_id=? ORDER BY occurred_on DESC, id DESC').all(req.session.user.id); const inc=rows.filter(r=>r.kind==='income').reduce((s,r)=>s+r.amount,0); const exp=rows.filter(r=>r.kind==='expense').reduce((s,r)=>s+r.amount,0); res.json({rows, totals:{income:inc, expense:exp, balance:inc-exp}}); });
app.post('/api/budget',requireAuth,(req,res)=>{ const b=req.body; const info=db.prepare('INSERT INTO budget_entries (user_id,activity_id,kind,category,amount,occurred_on,note) VALUES (?,?,?,?,?,?,?)').run(req.session.user.id,b.activity_id||null,b.kind,b.category||'',b.amount,b.occurred_on,b.note||''); const row=db.prepare('SELECT * FROM budget_entries WHERE id=?').get(info.lastInsertRowid); res.status(201).json(row); });
app.put('/api/budget/:id',requireAuth,(req,res)=>{ const id=Number(req.params.id), b=req.body; db.prepare('UPDATE budget_entries SET activity_id=?1,kind=?2,category=?3,amount=?4,occurred_on=?5,note=?6 WHERE id=?7 AND user_id=?8').run(b.activity_id||null,b.kind,b.category||'',b.amount,b.occurred_on,b.note||'',id,req.session.user.id); const row=db.prepare('SELECT * FROM budget_entries WHERE id=?').get(id); res.json(row); });
app.delete('/api/budget/:id',requireAuth,(req,res)=>{ db.prepare('DELETE FROM budget_entries WHERE id=? AND user_id=?').run(Number(req.params.id), req.session.user.id); res.status(204).end(); });

app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=> res.sendFile(path.join(__dirname,'public/index.html')));

app.listen(PORT, '0.0.0.0', ()=> console.log('AgriRéseau MVP running on http://0.0.0.0:'+PORT));
