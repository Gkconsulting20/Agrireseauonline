// Execute the real Express routes with an in-memory DB double, never db.js.
// Run: node --experimental-vm-modules tests/api-priorities.mjs
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { TOGO_REGIONS } from '../public/reference-data.js';

const rows = {users:[], subscriptions:[], actors:[], activities:[]};
const db = {
  async getAll(sql) {
    if (sql.includes('FROM actors')) return structuredClone(rows.actors);
    if (sql.includes('FROM activities')) return structuredClone(rows.activities);
    throw new Error('Unexpected test query: ' + sql);
  },
  async getOne(sql, params) {
    if (sql.includes('COUNT(*) as c FROM actors')) return {c:rows.actors.length};
    if (sql.includes('AVG(rating)')) return {avg:null,count:0};
    if (sql.includes('FROM subscriptions')) return rows.subscriptions.find(s=>s.user_id===params[0]);
    if (sql.includes('FROM users')) return rows.users.find(u=>u.id===params[0]);
    if (sql.includes('FROM actors')) return structuredClone(rows.actors.find(a=>a.id===params[0]));
    throw new Error('Unexpected test query: ' + sql);
  },
  async insertOne(sql, values) {
    const match=sql.match(/INSERT INTO (\w+) \(([^)]+)\)/);
    assert.ok(match,'Test insert must declare columns');
    const table=match[1], columns=match[2].split(',');
    const row = {id:rows[table].length+1,...Object.fromEntries(columns.map((column,i)=>[column,values[i]]))};
    rows[table].push(row);
    return {...row};
  },
  async query(sql, params) {
    if(sql.startsWith('INSERT INTO subscriptions')) {
      rows.subscriptions.push({user_id:params[0],plan:params[1],status:params[2]});
    } else if(sql.startsWith('UPDATE actors SET')) {
      const columns=sql.split(' SET ')[1].split(' WHERE ')[0].split(',').map(item=>item.split('=')[0]);
      const actor=rows.actors.find(a=>a.id===params.at(-1));
      for(const [i,column] of columns.entries()) actor[column]=params[i];
    } else throw new Error('Unexpected test mutation: ' + sql);
    return {rows:[]};
  }
};
const source = (await readFile(new URL('../server.js',import.meta.url),'utf8'))
  .replace(/app\.listen\(PORT, '0\.0\.0\.0',[\s\S]*?;\s*$/, 'export default app;');
assert.ok(source.endsWith('export default app;'),'Test must replace only the server listen call');
const context=vm.createContext({console,process:{env:{SESSION_SECRET:'isolated-api-test-only'}},Buffer,setTimeout,clearTimeout});
const main=new vm.SourceTextModule(source,{
  context,
  initializeImportMeta(meta) {meta.url=new URL('../server.js',import.meta.url).href;}
});
await main.link(async specifier => {
  let exports;
  if (specifier === './db.js') exports={default:db};
  else if (specifier === './public/reference-data.js') exports={TOGO_REGIONS};
  else exports=await import(specifier);
  const names=Object.keys(exports);
  return new vm.SyntheticModule(names,function(){for(const name of names)this.setExport(name,exports[name]);},{context});
});
await main.evaluate();
const server=main.namespace.default.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
let cookie='';
async function request(path, method='GET',body) {
  const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body ? {body:JSON.stringify(body)} : {})});
  if(res.headers.get('set-cookie')) cookie=res.headers.get('set-cookie').split(';')[0];
  return {status:res.status,body:await res.json()};
}
try {
  const registration={name:'Coopérative locale', email:'fixture@example.test',password:'IsolatedTestOnly123',role:'cooperative'};
  const invalid=await request('/api/auth/register','POST',{...registration,region:'Lomé'});
  assert.equal(invalid.status,400);
  assert.equal(invalid.body.error,'invalid_region');
  assert.equal(rows.users.length,0);
  const valid=await request('/api/auth/register','POST',{...registration,region:'Plateaux'});
  assert.equal(valid.status,201);
  assert.equal(rows.users[0].role,'cooperative');
  assert.equal(valid.body.region,'Plateaux');
  console.log('PASS: région invalide refusée avant écriture, inscription coopérative enregistrée');
  const actorPayload={name:'Groupement local',role:'cooperative',region:'Plateaux',products:[{name:'Maïs'}],certifications:[]};
  const created=await request('/api/actors','POST',actorPayload);
  assert.equal(created.status,201);
  assert.equal(created.body.role,'cooperative');
  const updated=await request('/api/actors/1','PUT',{...actorPayload,name:'Groupement modifié'});
  assert.equal(updated.status,200);
  const listing=await request('/api/actors');
  assert.equal(listing.body[0].name,'Groupement modifié');
  assert.equal(listing.body[0].role,'cooperative');
  console.log('PASS: rôle coopérative conservé après création, modification et relecture');
  const budget=await request('/api/activities','POST',{
    label:'Budget local',filiere:'Maïs',periode:'Annuel',output_qty:1000,price_expected:300,actor_id:1,unit:'kg'
  });
  assert.equal(budget.status,201);
  const saved=await request('/api/activities');
  assert.equal(saved.body[0].label,'Budget local');
  assert.equal(saved.body[0].user_id,valid.body.id);
  console.log('PASS: budget enregistré et relu via les vraies routes authentifiées');
} finally {
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
