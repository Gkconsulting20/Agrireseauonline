// Real Express routes, isolated data only. Never imports db.js.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import * as viewsModule from '../analytics/actor-views.js';

const hash = bcrypt.hashSync('TestOnly123!', 4);
const users = [1,2,3].map(id=>({id,email:`${id}@example.test`,password_hash:hash,status:'active'}));
const actors = [
  {id:11,owner_id:1,products:'[]'}, {id:12,owner_id:1,products:'[]'},
  {id:21,owner_id:2,products:'[]'}, {id:31,owner_id:null,products:'[]'}
];
const totals = new Map(), dedup = new Set();
let fail = false, day = '2026-11-16', writes = 0;
const db = {
  async getOne(sql, p) {
    if (sql.includes('FROM users')) return users.find(u=>sql.includes('email=$1') ? u.email===p[0] : u.id===p[0]);
    if (sql.includes('COUNT(*) as count FROM actors')) return {count:actors.filter(a=>a.owner_id===p[0]).length};
    if (sql.includes('COUNT(*) as count FROM activities')) return {count:0};
    if (sql.includes('AVG(rating)')) return {avg:null,count:0};
    if (sql.includes('FROM subscriptions')) return {plan:'free'};
    if (sql.includes('FROM actors WHERE id=$1')) return actors.find(a=>a.id===p[0]);
    throw Error('Unexpected read: '+sql);
  },
  async getAll(sql, p) {
    if (sql.includes('LEFT JOIN actor_view_totals')) {
      if (fail) throw Error('measurement unavailable');
      assert.match(sql, /WHERE a.owner_id=\$1/);
      return actors.filter(a=>a.owner_id===p[0]).map(a=>({id:a.id,views_count:totals.get(a.id)||0}));
    }
    if (sql.includes('FROM actors WHERE owner_id=$1')) return actors.filter(a=>a.owner_id===p[0]);
    if (sql.includes('SELECT * FROM actors ORDER BY')) return actors.map(a=>({...a,certifications:'[]'}));
    if (sql.includes('FROM subscriptions')) return [];
    if (/FROM (budget_entries|ratings|activities)/.test(sql)) return [];
    throw Error('Unexpected read: '+sql);
  },
  async query(sql, p) {
    if (fail) throw Error('measurement unavailable');
    if (sql === viewsModule.VIEW_SCHEMA) return {rows:[]};
    assert.match(sql, /WITH expired AS/);
    writes++;
    const [id,viewer,digest,date] = p;
    assert.match(digest,/^[a-f0-9]{64}$/);
    const key = [id,date,digest].join(':');
    const actor = actors.find(a=>a.id===id && a.owner_id!==viewer);
    if (!actor || dedup.has(key)) return {rows:[]};
    dedup.add(key); totals.set(id,(totals.get(id)||0)+1);
    return {rows:[{actor_id:id}]};
  }
};
const source = (await readFile(new URL('../server.js',import.meta.url),'utf8'))
  .replace(/app\.listen\(PORT, '0\.0\.0\.0',[\s\S]*?;\s*$/, 'export default app;');
assert.ok(source.endsWith('export default app;'));
async function start() {
  const context = vm.createContext({console,process:{env:{SESSION_SECRET:'isolated-views-test'}},Buffer,setTimeout,clearTimeout});
  const main = new vm.SourceTextModule(source,{context,initializeImportMeta(meta){meta.url=new URL('../server.js',import.meta.url).href;}});
  await main.link(async specifier=>{
    const exports = specifier==='./db.js' ? {default:db}
      : specifier==='./analytics/actor-views.js' ? {...viewsModule,
        createActorViews:(database,options)=>viewsModule.createActorViews(database,{...options,now:()=>new Date(day+'T12:00:00Z')})}
      : specifier.startsWith('./') ? await import(new URL('../'+specifier.slice(2),import.meta.url))
      : await import(specifier);
    return new vm.SyntheticModule(Object.keys(exports),function(){
      for (const key of Object.keys(exports)) this.setExport(key,exports[key]);
    },{context});
  });
  await main.evaluate();
  const server = main.namespace.default.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  return server;
}
let server = await start();
const close = () => new Promise(resolve=>{server.closeAllConnections();server.close(resolve);});
async function request(url, cookie='', method='GET', headers={}, body) {
  const res = await fetch(`http://127.0.0.1:${server.address().port}`+url,{
    method,headers:{Cookie:cookie,'User-Agent':'Test Browser','Content-Type':'application/json',...headers},
    ...(body ? {body:JSON.stringify(body)} : {})
  });
  return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
const login = async id => (await request('/api/auth/login','','POST',{},{
  email:`${id}@example.test`,password:'TestOnly123!'
})).cookie;
const view = (id,cookie,headers={},body) => request(`/api/actors/${id}/views`,cookie,'POST',{'X-Actor-View':'profile',...headers},body);
async function stats(cookie, expected) {
  const overview = await request('/api/stats/overview?owner_id=999',cookie);
  const cards = await request('/api/stats/actors?owner_id=999',cookie);
  assert.equal(overview.status,200);
  assert.equal(overview.body.views_available,true);
  assert.equal(overview.body.views_count,expected);
  assert.equal(cards.body.reduce((n,a)=>n+a.views,0),expected);
  assert.ok(cards.body.every(a=>a.views_available));
  return cards.body;
}
try {
  const owner = await login(1), visitor = await login(2), other = await login(3);
  assert.equal((await view(11,'')).status,401);
  assert.equal((await request('/api/stats/overview')).status,401);
  assert.equal((await request('/api/stats/actors')).status,401);
  assert.equal((await view('bad',visitor)).status,400);
  assert.equal((await view(999,visitor)).status,404);
  assert.equal((await view(11,owner)).body.counted,false);
  for (const headers of [{'User-Agent':'Googlebot'},{'User-Agent':''},{DNT:'1'},{'Sec-GPC':'1'}]) {
    assert.equal((await view(11,visitor,headers)).body.counted,false);
  }
  assert.equal((await view(11,visitor,{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await view(11,visitor,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await request('/api/actors/11/views',visitor,'POST')).status,403);
  assert.equal(writes,0);
  await stats(owner,0);
  await request('/api/actors',visitor);
  assert.equal(writes,0);
  assert.equal((await view(11,visitor,{}, {viewer_id:1,owner_id:999})).body.counted,true);
  const repeats = await Promise.all(Array.from({length:8},()=>view(11,visitor)));
  assert.ok(repeats.every(r=>r.body.counted===false));
  assert.equal((await view(11,await login(2))).body.counted,false);
  assert.equal((await view(12,visitor)).body.counted,true);
  assert.equal((await view(11,other)).body.counted,true);
  assert.deepEqual((await stats(owner,3)).map(a=>a.id),[11,12]);
  await stats(visitor,0);
  assert.equal((await view(21,owner)).body.counted,true);
  await stats(visitor,1);
  await stats(owner,3);
  users[2].is_commercial=true;
  assert.equal((await view(12,other)).status,403);
  users[2].is_commercial=false;
  users[2].status='blocked';
  assert.equal((await view(12,other)).status,401);
  users[2].status='active';
  await close();
  server = await start();
  const reconnected = await login(2), reconnectedOwner = await login(1);
  assert.equal((await view(11,reconnected)).body.counted,false);
  await stats(reconnectedOwner,3);
  day='2026-11-17';
  assert.equal((await view(11,reconnected)).body.counted,true);
  await stats(reconnectedOwner,4);
  fail=true;
  assert.equal((await view(12,reconnected)).status,503);
  const unavailable = await request('/api/stats/overview',reconnectedOwner);
  assert.equal(unavailable.body.views_count,null);
  assert.equal(unavailable.body.views_available,false);
  assert.ok((await request('/api/stats/actors',reconnectedOwner)).body.every(a=>a.views===null && a.views_available===false));
  fail=false;
  await stats(reconnectedOwner,4);
  assert.equal((await viewsModule.createActorViews(db).countsForOwner(1)).available,false);
  console.log('PASS: ouvertures dédupliquées, exclusions, isolation des comptes, redémarrage, lendemain et indisponibilité');
} finally { await close(); }

// Exercise the exact browser instrumentation and profile-opening hook without a database.
const frontend = await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const browserSource = frontend.slice(frontend.indexOf('function openActorProfile('),frontend.indexOf('function calculateDistance('));
const calls = [], elements = {onclick:null};
let shown = false;
const browser = vm.createContext({
  ME:{id:2},navigator:{},document:{
    visibilityState:'visible',body:{appendChild(){}},
    createElement(){return {innerHTML:'',showModal(){shown=true;},querySelector(){return elements;}};}
  },
  roleLabel:()=>'',console,
  fetch:async (...args)=>{assert.equal(shown,true);calls.push(args);return {ok:true};}
});
vm.runInContext(browserSource,browser);
await vm.runInContext('openActorProfile({id:11,products:[],certifications:[]})',browser);
assert.equal(calls.length,1);
assert.equal(calls[0][0],'/api/actors/11/views');
assert.equal(calls[0][1].method,'POST');
for (const setup of ["ME=null", "ME={is_commercial:true}", "ME={id:2};navigator.doNotTrack='1'",
  "navigator.doNotTrack='0';navigator.globalPrivacyControl=true",
  "navigator.globalPrivacyControl=false;document.visibilityState='hidden'"]) {
  vm.runInContext(setup,browser);
  await vm.runInContext('recordActorProfileView(11)',browser);
}
assert.equal(calls.length,1);
browser.fetch=async()=>{throw Error('offline');};
vm.runInContext("document.visibilityState='visible'",browser);
await vm.runInContext('recordActorProfileView(11)',browser);
console.log('PASS: mesure après affichage du profil uniquement, refus de suivi, onglet masqué et panne réseau');
