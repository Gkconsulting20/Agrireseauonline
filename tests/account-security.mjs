// Real Express routes, fake database and email sink only. Never imports db.js.
// Run: node --experimental-vm-modules tests/account-security.mjs
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import {TOGO_REGIONS} from '../public/reference-data.js';
import {mountPasswordRecovery, hashResetToken, createResetDelivery} from '../security/password-recovery.js';

const initialHash = bcrypt.hashSync('FixturePasswordOnly123', 4);
const fixtureActor = (id, owner_id) => ({
  id, owner_id, name: `Fiche ${id}`, role: 'producteur', region: 'Plateaux',
  products: '[]', certifications: '[]', verified: false
});
function fixture() {
  const state = {
    users: [
      {id:1, email:'a@example.test', phone:'+22800000001', password_hash:initialHash, status:'active'},
      {id:2, email:'b@example.test', phone:'+22800000002', password_hash:initialHash, status:'active'},
      {id:3, email:'admin@example.test', password_hash:initialHash, is_admin:true, status:'active'},
      {id:4, email:'sales@example.test', password_hash:initialHash, is_commercial:true, status:'active'},
      {id:5, email:null, phone:'+22800000005', password_hash:initialHash, status:'active'},
      {id:6, email:'blocked@example.test', password_hash:initialHash, status:'blocked'}
    ],
    actors:[fixtureActor(11,1), fixtureActor(12,2), fixtureActor(13,null)],
    tokens:[], emails:[], writes:[]
  };
  const db = {
    async getOne(sql, params) {
      if (sql.includes('FROM users WHERE email=$1')) return structuredClone(state.users.find(u=>u.email===params[0]) || null);
      if (sql.includes('FROM users WHERE phone=$1')) return structuredClone(state.users.find(u=>u.phone===params[0]) || null);
      if (sql.includes('FROM users WHERE id=$1')) return structuredClone(state.users.find(u=>u.id===params[0]) || null);
      if (sql.includes('FROM actors WHERE id=$1')) return structuredClone(state.actors.find(a=>a.id===params[0]) || null);
      if (sql.includes('FROM subscriptions')) return {plan:'free',status:'active'};
      if (sql.includes('COUNT(*) as c FROM actors')) return {c:state.actors.filter(a=>a.owner_id===params[0]).length};
      throw new Error(`Unexpected read: ${sql}`);
    },
    async insertOne(sql, params) {
      assert.match(sql, /^INSERT INTO actors/);
      const columns = sql.match(/\(([^)]+)\)/)[1].split(',');
      const actor = {id:20,...Object.fromEntries(columns.map((c,i)=>[c,params[i]]))};
      state.actors.push(actor);
      state.writes.push(sql);
      return structuredClone(actor);
    },
    async query(sql, params) {
      state.writes.push(sql);
      if (sql.startsWith('UPDATE actors SET')) {
        const columns = sql.split(' SET ')[1].split(' WHERE ')[0].split(',').map(c=>c.split('=')[0]);
        const actor = state.actors.find(a=>a.id===params.at(-1));
        columns.forEach((c,i)=>actor[c]=params[i]);
      } else if (sql.startsWith('DELETE FROM actors WHERE id=$1')) {
        state.actors = state.actors.filter(a=>a.id!==params[0]);
      } else if (sql.startsWith('DELETE FROM password_reset_tokens WHERE user_id=$1')) {
        state.tokens = state.tokens.filter(t=>t.user_id!==params[0]);
      } else if (sql.startsWith('DELETE FROM password_reset_tokens WHERE token=$1')) {
        state.tokens = state.tokens.filter(t=>t.token!==params[0]);
      } else if (sql.startsWith('INSERT INTO password_reset_tokens')) {
        state.tokens.push({user_id:params[0],token:params[1],expires_at:params[2]});
      } else if (sql.includes('WITH consumed AS')) {
        assert.match(sql, /DELETE FROM password_reset_tokens\s+WHERE token=\$1 AND expires_at > NOW\(\)/);
        assert.match(sql, /UPDATE users SET password_hash=\$2/);
        const token = state.tokens.find(t=>t.token===params[0] && t.expires_at > new Date());
        if (!token) return {rows:[]};
        state.tokens = state.tokens.filter(t=>t!==token);
        const user = state.users.find(u=>u.id===token.user_id && u.status!=='blocked');
        if (!user) return {rows:[]};
        user.password_hash = params[1];
        return {rows:[{id:user.id}]};
      } else throw new Error(`Unexpected mutation: ${sql}`);
      return {rows:[]};
    }
  };
  return {state,db};
}

const source = (await readFile(new URL('../server.js',import.meta.url),'utf8'))
  .replace(/app\.listen\(PORT, '0\.0\.0\.0',[\s\S]*?;\s*$/, 'export default app;');
assert.ok(source.endsWith('export default app;'));
async function start({delivery='sink', env={}} = {}) {
  const {state,db} = fixture();
  const deliver = delivery === 'sink' ? async message=>state.emails.push(message) : delivery;
  const context = vm.createContext({
    console, process:{env:{SESSION_SECRET:'isolated-security-test-only',...env}}, Buffer, setTimeout, clearTimeout
  });
  const main = new vm.SourceTextModule(source, {
    context, initializeImportMeta(meta) {meta.url=new URL('../server.js',import.meta.url).href;}
  });
  await main.link(async specifier=>{
    let exports;
    if (specifier === './db.js') exports = {default:db};
    else if (specifier === './public/reference-data.js') exports = {TOGO_REGIONS};
    else if (specifier === './security/password-recovery.js') exports = {
      mountPasswordRecovery:(app, database)=>mountPasswordRecovery(app,database,{deliver})
    };
    else exports = await import(specifier);
    return new vm.SyntheticModule(Object.keys(exports), function(){
      for (const key of Object.keys(exports)) this.setExport(key,exports[key]);
    }, {context});
  });
  await main.evaluate();
  const server = main.namespace.default.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(url,method='GET',body,cookie='',extraHeaders={}) {
    const response = await fetch(base+url,{method,headers:{
      'Content-Type':'application/json', Cookie:cookie,...extraHeaders
    },...(body ? {body:JSON.stringify(body)} : {})});
    const text = await response.text();
    return {status:response.status,body:text ? JSON.parse(text) : null,
      cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  async function login(email) {
    const result = await request('/api/auth/login','POST',{email,password:'FixturePasswordOnly123'});
    assert.equal(result.status,200);
    return result.cookie;
  }
  return {state,request,login,async close(){
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }};
}

const app = await start();
try {
  const {request,login,state} = app;
  const a = await login('a@example.test'), b = await login('b@example.test');
  const admin = await login('admin@example.test'), sales = await login('sales@example.test');
  const payload = {name:'Modifiée',role:'producteur',region:'Kara',owner_id:2};
  for (const method of ['PUT','DELETE']) {
    assert.equal((await request('/api/actors/11',method,payload)).status,401);
    const before = structuredClone(state.actors), writes = state.writes.length;
    assert.equal((await request('/api/actors/11',method,payload,b)).status,403);
    assert.equal((await request('/api/actors/12',method,payload,a)).status,403);
    assert.equal((await request('/api/actors/13',method,payload,a)).status,403);
    assert.equal((await request('/api/actors/11',method,payload,sales)).status,403);
    assert.deepEqual(state.actors,before);
    assert.equal(state.writes.length,writes,'Denied mutations must not execute a write');
    assert.equal((await request('/api/actors/999',method,payload,a)).status,404);
    assert.equal((await request('/api/actors/nope',method,payload,a)).status,400);
    assert.equal((await request('/api/actors/0',method,payload,a)).status,400);
  }
  assert.equal((await request('/api/actors','POST',payload)).status,401);
  const created = await request('/api/actors','POST',payload,a);
  assert.equal(created.status,201);
  assert.equal(created.body.owner_id,1,'Client cannot assign a different owner');
  assert.equal((await request('/api/actors/11','PUT',payload,a)).status,200);
  assert.equal(state.actors.find(x=>x.id===11).owner_id,1);
  assert.equal((await request('/api/actors/12','PUT',payload,b)).status,200);
  assert.equal((await request('/api/actors/12','PUT',payload,admin)).status,200);
  assert.equal((await request('/api/actors/13','PUT',payload,admin)).status,200);
  assert.equal((await request('/api/actors/13','DELETE',null,admin)).status,204);
  assert.equal((await request('/api/actors/11','DELETE',null,a)).status,204);
  assert.equal((await request('/api/actors/12','DELETE',null,b)).status,204);
  const before = state.writes.length;
  assert.equal((await request('/api/seed','POST')).status,401);
  assert.equal((await request('/api/seed','POST',{},a)).status,403);
  assert.equal((await request('/api/seed','POST',{},sales)).status,403);
  assert.equal((await request('/api/seed','POST',{},admin)).status,403);
  assert.equal(state.writes.length,before);
  state.users.find(u=>u.id===3).is_admin=false;
  assert.equal((await request('/api/admin/users','GET',null,admin)).status,403,'Revoked admin rights apply immediately');
  state.users.find(u=>u.id===1).status='blocked';
  assert.equal((await request('/api/actors/20','PUT',payload,a)).status,401);
  console.log('PASS: anonymous, two separate accounts, owner, admin, commercial, orphan, missing and invalid actor IDs');
  console.log('PASS: demo disabled without any writes; blocked accounts and revoked admin sessions denied');
} finally {await app.close();}

const recovery = await start();
try {
  const {state,request,login} = recovery;
  const oldSession = await login('a@example.test');
  const known = await request('/api/auth/forgot-password','POST',{email:' A@EXAMPLE.TEST ',destination:'attacker@example.test'},
    '',{Host:'attacker.example'});
  const missing = await request('/api/auth/forgot-password','POST',{email:'absent@example.test'});
  const phoneOnly = await request('/api/auth/forgot-password','POST',{phone:'+22800000005'});
  const blocked = await request('/api/auth/forgot-password','POST',{email:'blocked@example.test'});
  const byPhone = await request('/api/auth/forgot-password','POST',{phone:'+228 00000002',email:null});
  for (const result of [known,missing,phoneOnly,blocked,byPhone]) {
    assert.equal(result.status,200);
    assert.deepEqual(result.body,known.body);
    assert.equal(JSON.stringify(result.body).includes('token'),false);
    for(const key of ['resetLink','phone','whatsapp','email']) assert.equal(key in result.body,false);
  }
  assert.equal(state.emails.length,2);
  assert.equal(state.emails[0].email,'a@example.test');
  assert.equal(state.emails[1].email,'b@example.test');
  const token = state.emails[0].token;
  assert.match(token,/^[a-f0-9]{64}$/);
  assert.notEqual(state.tokens[0].token,token);
  assert.equal(state.tokens[0].token,hashResetToken(token));
  assert.ok(state.tokens[0].expires_at > new Date());
  assert.ok(state.tokens[0].expires_at <= new Date(Date.now()+30*60*1000));
  assert.equal((await request('/api/auth/reset-password','POST',{token,newPassword:'short'})).status,400);
  assert.equal((await request('/api/auth/reset-password','POST',{token,newPassword:'é'.repeat(37)})).status,400);
  assert.equal((await request('/api/auth/reset-password','POST',{token:{},newPassword:'NewPassword123'})).status,400);
  assert.equal((await request('/api/auth/reset-password','POST',{token:'f'.repeat(64),newPassword:'NewPassword123'})).status,400);
  const oldPublicToken = 'e'.repeat(64);
  state.tokens.push({user_id:1,token:oldPublicToken,expires_at:new Date(Date.now()+3600000)});
  assert.equal((await request('/api/auth/reset-password','POST',{token:oldPublicToken,newPassword:'NewPassword123'})).status,400);
  const expiredToken = 'd'.repeat(64);
  state.tokens.push({user_id:1,token:hashResetToken(expiredToken),expires_at:new Date(Date.now()-1)});
  assert.equal((await request('/api/auth/reset-password','POST',{token:expiredToken,newPassword:'NewPassword123'})).status,400);
  const resets = await Promise.all([1,2].map(()=>request('/api/auth/reset-password','POST',{token,newPassword:'NewPassword123'})));
  assert.deepEqual(resets.map(r=>r.status).sort(),[200,400]);
  assert.equal(await bcrypt.compare('NewPassword123',state.users[0].password_hash),true);
  assert.equal(state.users[1].password_hash,initialHash);
  assert.equal((await request('/api/actors/11','PUT',{name:'Interdit'},oldSession)).status,401);
  assert.equal((await request('/api/auth/reset-password','POST',{token,newPassword:'OtherPassword123'})).status,400);
  assert.equal((await request('/api/auth/forgot-password','POST',{email:'a@example.test'})).status,429);
  console.log('PASS: reset secrets only sent to stored email; unknown, blocked and phone-only accounts give identical responses');
  console.log('PASS: hashed, expiring, single-use tokens; old public tokens rejected; concurrent reset and session revocation');
} finally {await recovery.close();}

for (const options of [{delivery:null},{delivery:async()=>{throw new Error('Provider failure');}}]) {
  const unavailable = await start(options);
  try {
    const result = await unavailable.request('/api/auth/forgot-password','POST',{email:'a@example.test'});
    assert.equal(result.status,options.delivery===null ? 503 : 200);
    assert.equal(unavailable.state.tokens.length,0);
    assert.equal(unavailable.state.users[0].password_hash,initialHash);
    if(options.delivery===null) assert.equal(unavailable.state.writes.length,0);
    assert.equal('resetLink' in result.body,false);
  } finally {await unavailable.close();}
}
assert.equal(createResetDelivery({}),null);
assert.equal(createResetDelivery({PASSWORD_RESET_ORIGIN:'http://untrusted.example'}),null);
assert.equal(createResetDelivery({PASSWORD_RESET_ORIGIN:'https://user:pass@example.test/'}),null);
assert.equal(createResetDelivery({PASSWORD_RESET_ORIGIN:'https://example.test/path'}),null);
const transportFactory = nodemailer.createTransport;
let smtpOptions, envelope;
try {
  nodemailer.createTransport = options => {
    smtpOptions = options;
    return {async sendMail(message) {envelope=message; return {accepted:['a@example.test'],rejected:[]};}};
  };
  const deliver = createResetDelivery({
    PASSWORD_RESET_ORIGIN:'https://example.test',SMTP_HOST:'smtp.example.test',
    SMTP_USER:'fixture',SMTP_PASSWORD:'fixture-only',SMTP_FROM:'noreply@example.test'
  });
  await deliver({email:'a@example.test',token:'a'.repeat(64)});
  assert.equal(smtpOptions.secure,true);
  assert.equal(smtpOptions.requireTLS,true);
  assert.deepEqual(envelope.to,{address:'a@example.test',name:''});
  assert.ok(envelope.text.includes('https://example.test/#reset-password?token='+'a'.repeat(64)));
  assert.equal(createResetDelivery({
    PASSWORD_RESET_ORIGIN:'https://example.test',SMTP_HOST:'smtp.example.test',SMTP_PORT:'25',
    SMTP_USER:'fixture',SMTP_PASSWORD:'fixture-only',SMTP_FROM:'noreply@example.test'
  }),null);
} finally {nodemailer.createTransport=transportFactory;}
const throttled = await start();
try {
  for(let i=0; i<10; i++) {
    assert.equal((await throttled.request('/api/auth/reset-password','POST',{token:'invalid',newPassword:'FixtureOnly123'})).status,400);
  }
  assert.equal((await throttled.request('/api/auth/reset-password','POST',{token:'invalid',newPassword:'FixtureOnly123'})).status,429);
  assert.equal(throttled.state.writes.length,0);
} finally {await throttled.close();}
for(const env of [{NODE_ENV:'production',ENABLE_DEMO_SEED:'true'}, {NODE_ENV:'development'}]) {
  const demo = await start({env});
  try {
    const admin = await demo.login('admin@example.test');
    assert.equal((await demo.request('/api/seed','POST',{},admin)).status,403);
    assert.equal(demo.state.writes.length,0);
  } finally {await demo.close();}
}
console.log('PASS: absent mail configuration fails closed; failed delivery revokes token, no production database or real email used');
