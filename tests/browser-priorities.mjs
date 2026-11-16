// Isolated browser regression checks: no requests reach the application database.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const actor = { id: 1, owner_id: 42, name: 'Coopérative de test', role: 'cooperative',
  region: 'Plateaux', products: [{name:'Maïs'}], certifications: [], lat: null, lng: null };
let user = {id:42, name:'Utilisateur test', role:'producteur', region:'Plateaux'};
let actors = [actor], budgets = [], failure = '', actorFailure = false, requests = [], plan = 'free';
let recoveryStatus = 503;
let viewsAvailable = false, viewsCount = 0;
const server = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    requests.push({url:req.url, method:req.method, body});
    res.setHeader('Content-Type', 'application/json');
    let result = [];
    if (req.url === '/api/auth/me') result = user;
    else if (req.url === '/api/auth/login') { user = {id:42, name:'Utilisateur test'}; result = user; }
    else if (req.url === '/api/auth/logout') { user = null; result = {ok:true}; }
    else if (req.url === '/api/auth/forgot-password') {
      res.statusCode = recoveryStatus;
      result = recoveryStatus === 503
        ? {error:'recovery_unavailable',message:'La récupération par email est indisponible. Contactez l’administration.'}
        : {success:true,message:'Si ce compte possède une adresse email, un lien de récupération lui sera envoyé.'};
    }
    else if (req.url === '/api/auth/register') {
      user = {id:42, ...body}; result = user;
    }
    else if (req.url === '/api/refs') result = {
      regions:['Maritime','Plateaux','Centrale','Kara','Savanes'], products:[], productCategories:[], units:['kg']
    };
    else if (req.url === '/api/actors') {
      if (actorFailure) { res.statusCode = 503; result = {message:'Indisponible'}; }
      else if (req.method === 'POST') { actors.push({...actor, ...body, id:2}); result = actors.at(-1); }
      else result = actors;
    }
    else if (req.url === '/api/actors/1' && req.method === 'PUT') {
      actors[0] = {...actors[0], ...body}; result = actors[0];
    }
    else if (req.url === '/api/activities') {
      if (req.method === 'POST') {
        if (failure) { res.statusCode = 400; result = {message:failure}; }
        else { budgets.push({...body, id:1}); result = budgets.at(-1); res.statusCode=201; }
      } else result = budgets;
    }
    else if (req.url.endsWith('/summary')) result = {totalRealExpenses:0,totalRealIncomes:0};
    else if (req.url === '/api/budget') result = {rows:[],totals:{income:0,expense:0,balance:0}};
    else if (req.url === '/api/subscription') result = {subscription:{plan},limit:plan==='free'?2:999,count:actors.length};
    else if (req.url === '/api/stats/overview') result = {
      actors_count:1,budgets_count:0,total_expenses:1500,total_harvests:25,ratings_received:1,
      views_count:viewsAvailable ? viewsCount : null,views_available:viewsAvailable
    };
    else if (req.url === '/api/stats/actors') result = [{
      ...actor,views:viewsAvailable ? viewsCount : null,views_available:viewsAvailable,harvests:{'Maïs':25},rating_avg:4,rating_count:1,products:['Maïs']
    }];
    else if (req.url === '/api/stats/budgets') result = [];
    else if (req.url === '/api/notifications/history') {
      if(plan==='free') {res.statusCode=403;result={error:'premium_required'};}
      else result=[{id:1,status:'pending',message:'Ancienne demande',created_at:'2026-01-01'}];
    }
    else if (req.url === '/api/platform/stats') result = {actors:1,users:1,products:1,regions:1};
    else if (req.url === '/api/user/profile') { user = {...user,...body}; result = user; }
    res.end(JSON.stringify(result));
    return;
  }
  try {
    const pathname = req.url.split('?')[0];
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!['index.html','app.js','reference-data.js','style.css'].includes(file)) {res.writeHead(404).end();return;}
    const content = await readFile(root + file);
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(content);
  } catch {res.writeHead(500).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const chrome = spawn(process.env.CHROMIUM_PATH || 'chromium', [
  '--headless','--no-sandbox','--disable-gpu','--remote-debugging-pipe',
  '--no-first-run','--no-default-browser-check',`--user-data-dir=/tmp/agrireseau-browser-${process.pid}`
], {stdio:['ignore','ignore','ignore','pipe','pipe']});
let id = 0, buffer = '', session;
const pending = new Map(), errors = [];
function cdp(method, params = {}, sessionId = session) {
  return new Promise((resolve,reject) => {
    const key = ++id; pending.set(key,{resolve,reject});
    chrome.stdio[3].write(JSON.stringify({id:key,method,params,...(sessionId ? {sessionId}: {})}) + '\0');
  });
}
chrome.stdio[4].on('data', chunk => {
  buffer += chunk;
  let end;
  while ((end=buffer.indexOf('\0')) >= 0) {
    const event=JSON.parse(buffer.slice(0,end)); buffer=buffer.slice(end+1);
    if (event.id) {
      const waiter=pending.get(event.id); pending.delete(event.id);
      if (event.error) waiter.reject(new Error(JSON.stringify(event.error)));
      else waiter.resolve(event.result);
    } else if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.text + ': ' + event.params.exceptionDetails.exception?.description);
    else if (event.method === 'Page.javascriptDialogOpening') {
      errors.push('Unexpected browser dialog: ' + event.params.message);
      cdp('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
    }
  }
});
async function evaluate(expression) {
  const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for(let attempt=0; attempt<100; attempt++) {
    if(await evaluate(expression)) return;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error(`Timed out: ${expression}; browser errors: ${errors.join('; ')}`);
}
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const fill = (selector,value) => evaluate(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)}`);
try {
  const {targetId}=await cdp('Target.createTarget',{url:'about:blank'},null);
  ({sessionId:session}=await cdp('Target.attachToTarget',{targetId,flatten:true},null));
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Page.navigate',{url});
  await wait('window._booted');
  assert.equal(await evaluate('document.querySelector("#btnSeed").style.display'), 'none');
  const originalUser = user;
  for (const identity of [{id:99,is_admin:false}, {id:99,is_admin:true}, originalUser]) {
    user = identity;
    await cdp('Page.reload');
    await wait('window._booted && !!document.querySelector("#actorList .card")');
    assert.equal(await evaluate('!!document.querySelector("#actorList .edit")'),identity.id===42 || !!identity.is_admin);
    assert.equal(await evaluate('!!document.querySelector("#actorList .del")'),identity.id===42 || !!identity.is_admin);
  }
  for(const status of [503,200]) {
    recoveryStatus = status;
    await click('#btnLogin');
    await click('#forgotPasswordLink');
    await fill('#frmForgotPassword [name="email"]','fixture@example.test');
    await evaluate('document.querySelector("#frmForgotPassword").requestSubmit()');
    await wait(`document.querySelector("#recoveryMessage").textContent.includes(${JSON.stringify(status===503 ? 'indisponible' : 'Si ce compte')})`);
    assert.equal(await evaluate('!!document.querySelector("#resetLinkInput, #btnWhatsAppReset, #btnCopyResetLink")'),false);
    await evaluate('document.querySelector("#frmForgotPassword").closest("dialog").remove()');
    await evaluate('document.querySelector("#frmLogin").closest("dialog").remove()');
  }
  console.log('PASS: droits de gestion des fiches, démonstration masquée et récupération sans lien ni contact exposés');
  for (const currentPlan of ['free','premium']) {
    plan=currentPlan;
    viewsAvailable=false;
    await click('[data-tab="stats"]');
    await wait('document.querySelector("#statsOverview").textContent.includes("Indisponible")');
    assert.ok((await evaluate('document.querySelector("#actorStatsContent").textContent')).includes('Indisponible'));
    await wait(currentPlan==='free'
      ? 'document.querySelector("#notificationsContainer").textContent.includes("même avec Premium")'
      : 'document.querySelector("#notificationsContainer").textContent.includes("Non envoyée")');
    assert.equal(await evaluate('document.querySelector("#btnSendTestNotification").disabled'),true);
    assert.equal(await evaluate('!!document.querySelector("#notificationsContainer button")'),false);
    viewsAvailable=true;
    for (const value of [0,7]) {
      viewsCount=value;
      await click('[data-tab="stats"]');
      await wait(`document.querySelectorAll("#statsOverview .card")[2]?.children[1]?.textContent === "${value}"`);
      assert.equal(await evaluate('document.querySelector("#statsOverview").textContent.includes("Indisponible")'),false);
      assert.equal(await evaluate('document.querySelector("#actorStatsContent").textContent.includes("Indisponible")'),false);
      assert.equal(await evaluate('Number(document.querySelectorAll("#statsOverview .card")[2].children[1].textContent)'),value);
      assert.equal(await evaluate('Number(document.querySelector("#actorStatsContent > div > div > div:last-child > div").textContent)'),value);
      assert.ok((await evaluate('document.querySelector("#statsOverview").textContent')).includes('Consultations mesurées'));
      assert.ok((await evaluate('document.querySelector("#actorStatsContent").textContent')).includes('consultations mesurées'));
    }
  }
  await evaluate('showPaymentDialog()');
  await wait('!!document.querySelector("#frmPayment")');
  const offer=await evaluate('document.querySelector("#frmPayment").textContent');
  assert.ok(offer.includes('1 000 FCFA / mois'));
  assert.ok(offer.includes('Badge Premium'));
  assert.ok(offer.includes('aussi accessibles en gratuit'));
  assert.ok(offer.includes('Non disponibles'));
  assert.ok(!offer.includes('statistiques avancées'));
  await click('#cancelPayment');
  assert.equal(requests.some(r=>r.url==='/api/notifications/send'||r.url.startsWith('/api/payments/')),false);
  plan='free';
  console.log('PASS: consultations nulles, zéro et positives, offre et notifications honnêtes, gratuit et Premium');
  assert.equal(requests.some(r=>r.url.endsWith('/views')),false);
  await click('#actorList .card .name');
  await wait('!!document.querySelector("#closeProfile")');
  for(let attempt=0; attempt<100 && !requests.some(r=>r.url.endsWith('/views')); attempt++) {
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  const recorded = requests.filter(r=>r.url.endsWith('/views'));
  assert.equal(recorded.length,1);
  assert.equal(recorded[0].method,'POST');
  await click('#closeProfile');
  console.log('PASS: aucune mesure au chargement ; une demande après ouverture volontaire du profil');
  await click('[data-tab="budget"]');
  await click('#btnAddBudget');
  await wait('!!document.querySelector("#frmBudget")');
  assert.equal(await evaluate('document.querySelector("#frmBudget").closest("dialog").open'),true);
  await fill('#frmBudget [name="label"]','Budget test');
  await fill('#frmBudget [name="filiere"]','Maïs');
  await fill('#frmBudget [name="harvest_product"]','Maïs');
  await fill('#frmBudget [name="production_cycle_days"]','90');
  await evaluate('document.querySelector("#frmBudget").requestSubmit()');
  await wait('document.querySelector("#budgetList").textContent.includes("Budget test")');
  assert.equal(budgets.length,1);
  console.log('PASS: nouveau budget ouvert et enregistré');

  // Failure must stay visible in the open form, and retry must not duplicate.
  await click('#btnAddBudget');
  await wait('!!document.querySelector("#frmBudget")');
  for (const [name,value] of Object.entries({label:'Budget réessayé',filiere:'Maïs',harvest_product:'Maïs',production_cycle_days:'60'})) {
    await fill(`#frmBudget [name="${name}"]`,value);
  }
  failure = 'Le budget est invalide pour ce test';
  await evaluate('document.querySelector("#frmBudget").requestSubmit()');
  await wait('document.querySelector("#budgetSaveStatus").textContent.includes("invalide")');
  assert.equal(await evaluate('document.querySelector("#frmBudget").closest("dialog").open'),true);
  failure = '';
  await evaluate('document.querySelector("#frmBudget").requestSubmit()');
  await wait('document.querySelector("#budgetList").textContent.includes("Budget réessayé")');
  assert.equal(budgets.length,2);
  console.log('PASS: échec de sauvegarde expliqué et nouvel essai réussi');

  actors = [{...actor,id:'1',owner_id:'42'}];
  await click('#btnAddBudget');
  await wait('!!document.querySelector("#frmBudget")');
  assert.equal(await evaluate('document.querySelector("#productList").textContent.includes("Maïs")'),true);
  await click('#cancelB');
  actors = [];
  await click('#btnAddBudget');
  await wait('document.querySelector("#budgetActionStatus").textContent.includes("Créez d’abord")');
  assert.equal(await evaluate('!!document.querySelector("#frmBudget")'),false);
  actorFailure = true;
  await click('#btnAddBudget');
  await wait('document.querySelector("#budgetActionStatus").textContent.includes("Impossible")');
  actorFailure = false;
  actors = [actor];
  console.log('PASS: identifiants numériques/texte, absence d’acteur et erreur de chargement');

  await click('[data-tab="actors"]');
  // Render actors after the fresh list loaded by the budget button.
  await click('#btnAddBudget');
  await wait('!!document.querySelector("#frmBudget")');
  await click('#cancelB');
  await fill('#aRole','cooperative');
  await evaluate('document.querySelector("#aRole").dispatchEvent(new Event("input"))');
  await wait('document.querySelector("#actorList").textContent.includes("Coopérative / groupement")');
  await click('#btnAddActor');
  await fill('#frmActor [name="name"]','Groupement test');
  await fill('#frmActor [name="role"]','cooperative');
  await evaluate('document.querySelector("#frmActor").requestSubmit()');
  await wait('!document.querySelector("#frmActor").closest("dialog").open');
  assert.equal(requests.findLast(r=>r.url==='/api/actors' && r.method==='POST').body.role,'cooperative');
  await click('#actorList .edit');
  assert.equal(await evaluate('document.querySelector("dialog[open] [name=role]").value'),'cooperative');
  await evaluate('document.querySelector("dialog[open]").close()');
  await click('[data-tab="settings"]');
  await wait('document.querySelector("#frmProfile [name=name]").value === "Utilisateur test"');
  await fill('#frmProfile [name="role"]','cooperative');
  await evaluate('document.querySelector("#frmProfile").requestSubmit()');
  await wait('document.querySelector("#profileMessage").textContent.includes("succès")');
  assert.equal(user.role,'cooperative');
  console.log('PASS: coopérative dans filtre, création/modification acteur et profil');

  await wait('!!window.L');
  await evaluate(`(() => {
    const original=L.Map.prototype.setView;
    L.Map.prototype.setView=function(...args){window.__testMap=this;return original.apply(this,args)};
  })()`);
  await cdp('Browser.grantPermissions',{origin:url,permissions:['geolocation']},null);
  await cdp('Emulation.setGeolocationOverride',{latitude:7.4,longitude:1.2,accuracy:30});
  await click('[data-tab="map"]');
  await click('#btnLocateMe');
  await wait('document.querySelector("#mapLocationStatus").textContent.includes("Position trouvée")');
  const center = await evaluate('({lat:window.__testMap.getCenter().lat,lng:window.__testMap.getCenter().lng,zoom:window.__testMap.getZoom()})');
  assert.ok(Math.abs(center.lat - 7.4) < 0.01);
  assert.ok(Math.abs(center.lng - 1.2) < 0.01);
  assert.equal(center.zoom,12);
  assert.equal(await evaluate('document.querySelector("#map").textContent.includes("Ma position")'),true);
  // Confirm button is positioned inside the map, not over the page header.
  assert.equal(await evaluate(`(() => {
    const button=document.querySelector('#btnLocateMe').getBoundingClientRect();
    const map=document.querySelector('#leaflet').getBoundingClientRect();
    return button.top >= map.top && button.right <= map.right;
  })()`),true);
  await cdp('Browser.setPermission',{origin:url,permission:{name:'geolocation'},setting:'denied'},null);
  await click('#btnLocateMe');
  await wait('document.querySelector("#mapLocationStatus").textContent.includes("refusée")');
  assert.equal(await evaluate('document.querySelector("#btnLocateMe").disabled'),false);
  console.log('PASS: géolocalisation autorisée, repère, recentrage et refus explicite');

  await click('#btnLogout');
  await wait('document.querySelector("#btnLogin").style.display !== "none"');
  await click('#btnLogin');
  assert.deepEqual(await evaluate('Array.from(document.querySelector("#frmLogin [name=region]").options).map(o=>o.value)'),['','Maritime','Plateaux','Centrale','Kara','Savanes']);
  await fill('#frmLogin [name="name"]','Nouvelle coopérative');
  await fill('#frmLogin [name="email"]','fixture@example.test');
  await fill('#frmLogin [name="password"]','OnlyForLocalFixture123');
  await fill('#frmLogin [name="role"]','cooperative');
  await fill('#frmLogin [name="region"]','Kara');
  await evaluate('document.querySelector("#acceptTerms").checked=true');
  await click('#btnDoRegister');
  await wait('document.querySelector("#me").textContent.includes("fixture@example.test")');
  const registration = requests.findLast(r=>r.url==='/api/auth/register');
  assert.equal(registration.body.role,'cooperative');
  assert.equal(registration.body.region,'Kara');
  console.log('PASS: inscription coopérative et sélection des cinq régions');

  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await click('[data-tab="budget"]');
  await click('#btnAddBudget');
  await wait('!!document.querySelector("#frmBudget")');
  assert.equal(await evaluate(`(() => {
    const box=document.querySelector('#frmBudget').closest('dialog').getBoundingClientRect();
    return box.width <= window.innerWidth;
  })()`),true);
  await click('#cancelB');
  await click('[data-tab="map"]');
  for (const code of [2,3]) {
    await evaluate(`Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
      getCurrentPosition(success,error){error({code:${code}})}
    }})`);
    await click('#btnLocateMe');
    await wait('!document.querySelector("#btnLocateMe").disabled');
    const message=await evaluate('document.querySelector("#mapLocationStatus").textContent');
    assert.ok(message.includes(code === 2 ? 'indisponible' : 'délai'));
  }
  assert.equal(await evaluate(`(() => {
    const button=document.querySelector('#btnLocateMe').getBoundingClientRect();
    const map=document.querySelector('#leaflet').getBoundingClientRect();
    return button.top >= map.top && button.right <= map.right;
  })()`),true);
  console.log('PASS: budget et bouton GPS sur mobile, position indisponible et délai dépassé');
  assert.deepEqual(errors,[]);
} finally {
  chrome.kill();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
