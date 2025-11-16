const tabs=document.querySelectorAll('.tabs button'), sections=document.querySelectorAll('.tab');
tabs.forEach(b=> b.addEventListener('click',()=>{ 
  tabs.forEach(x=>x.classList.remove('active')); 
  sections.forEach(s=>s.classList.remove('active')); 
  b.classList.add('active'); 
  document.getElementById(b.dataset.tab).classList.add('active'); 
  if(b.dataset.tab==='map') renderMap(); 
  if(b.dataset.tab==='budget'){ loadBudgets(); refreshCostBudgets(); }
  if(b.dataset.tab==='costing'){ loadCosts(); refreshCostBudgets(); }
}));

const btnLogin=document.getElementById('btnLogin'), btnLogout=document.getElementById('btnLogout'), meEl=document.getElementById('me');

// Variables globales
let ME=null, ACTORS=[], LOGISTICS=[], PRODUCTS=[], REGIONS=[], BUDGETS=[], CURRENT_BUDGET=null, COSTS=[], CURRENT_COST_BUDGET=null;

async function openLogin(){
  const dlg=document.createElement('dialog');
  dlg.innerHTML=`<form id="frmLogin" class="dialog-body"><h3>Connexion / Inscription</h3>
  <div class="grid2"><label>Email <input name="email" type="email" required></label>
  <label>Mot de passe <input name="password" type="password" required></label>
  <label>Nom <input name="name" placeholder="(pour inscription)"></label>
  <label>Région <input name="region" placeholder="ex: Plateaux"></label>
  <label>Rôle <select name="role"><option></option>${['producteur','transporteur','transformateur','grossiste','detaillant','institution'].map(r=>`<option>${r}</option>`).join('')}</select></label>
  </div>
  <div class="dialog-actions"><button type="button" id="btnDoLogin">Se connecter</button><button type="button" id="btnDoRegister">Créer un compte</button><button type="button" id="cancelL">Annuler</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal(); 
  dlg.querySelector('#cancelL').onclick=()=> dlg.close();
  
  dlg.querySelector('#btnDoLogin').onclick=async()=>{
    const form = dlg.querySelector('#frmLogin');
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    if(!email || !password) return alert('Email et mot de passe requis');
    const r = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email, password}),credentials:'include'});
    if(r.ok){ dlg.close(); await boot(); } else { alert('Email ou mot de passe incorrect'); }
  };
  
  dlg.querySelector('#btnDoRegister').onclick=async()=>{
    const form = dlg.querySelector('#frmLogin');
    const data = Object.fromEntries(new FormData(form).entries());
    if(!data.email || !data.password) return alert('Email et mot de passe requis');
    const r = await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'include'});
    if(r.ok){ dlg.close(); await boot(); } else { alert('Erreur: Email déjà utilisé ou données invalides'); }
  };
}

btnLogin.onclick=openLogin;
btnLogout.onclick=async()=>{ await fetch('/api/auth/logout',{method:'POST'}); await boot(); };

const btnLocateMe = document.getElementById('btnLocateMe');
if(btnLocateMe) {
  btnLocateMe.onclick = async () => {
    btnLocateMe.disabled = true;
    btnLocateMe.textContent = '⏳ Localisation...';
    try {
      const loc = await getUserLocation();
      await renderMap();
      btnLocateMe.textContent = '✓ Localisé';
      setTimeout(() => { btnLocateMe.disabled = false; btnLocateMe.textContent = '📍 Me localiser'; }, 2000);
    } catch(err) {
      alert(err.message);
      btnLocateMe.disabled = false;
      btnLocateMe.textContent = '📍 Me localiser';
    }
  };
}

document.getElementById('btnSeed').onclick=async()=>{ if(!confirm('Réinitialiser et charger des données de démo ?')) return; const r=await fetch('/api/seed',{method:'POST'}); if(r.ok){ await loadActors(); await loadLogistics(); renderMap(); renderStockSummary(); } };

let REFS={regions:[],products:[]}, LOGS=[], USER_LOCATION=null;

async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation non supportée par ce navigateur'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        USER_LOCATION = loc;
        resolve(loc);
      },
      (error) => {
        let msg = 'Erreur de géolocalisation';
        if (error.code === 1) msg = 'Permission de géolocalisation refusée';
        else if (error.code === 2) msg = 'Position indisponible';
        else if (error.code === 3) msg = 'Délai de géolocalisation dépassé';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

const aRole=document.getElementById('aRole'), aRegion=document.getElementById('aRegion'), aQ=document.getElementById('aQ');
[aRole,aRegion,aQ].forEach(el=> el.addEventListener('input', renderActors));
document.getElementById('btnAddActor').onclick=()=> openActorDialog();
async function loadRefs(){ const r=await fetch('/api/refs'); REFS=await r.json(); document.getElementById('aRegion').innerHTML='<option value=\"\">Toutes régions</option>'+REFS.regions.map(r=>`<option>${r}</option>`).join(''); }
async function loadActors(){ const r=await fetch('/api/actors'); ACTORS=await r.json(); renderActors(); renderStockSummary(); }
function renderActors(){ const list=document.getElementById('actorList'); list.innerHTML=''; const role=aRole.value.toLowerCase(), reg=aRegion.value.toLowerCase(), q=aQ.value.toLowerCase();
  ACTORS.filter(a=>{ const okRole=role? (a.role||'').toLowerCase()===role:true; const okReg=reg? (a.region||'').toLowerCase()===reg:true; const txt=(a.name+' '+(a.products||[]).join(';')+' '+(a.need||'')+' '+(a.localite||'')).toLowerCase(); const okQ=q? txt.includes(q):true; return okRole&&okReg&&okQ; })
  .forEach(a=> list.appendChild(actorCard(a))); }
function actorCard(a){ 
  const el=document.createElement('div'); 
  el.className='card'; 
  const digits=s=>(s||'').replace(/\D/g,''); 
  
  // Calculate distance if user location available
  let distanceText = '';
  if(USER_LOCATION && a.lat && a.lng){
    const dist = calculateDistance(USER_LOCATION.lat, USER_LOCATION.lng, a.lat, a.lng);
    distanceText = ` <span class="badge" style="background:#3b82f6;color:white">📍 ${dist.toFixed(1)} km</span>`;
  }
  
  // Photo thumbnail
  const photoHtml = a.photo_url ? `<img src="${a.photo_url}" alt="${a.name}" style="max-width:100px;max-height:80px;border-radius:8px;margin-bottom:8px;">` : '';
  
  // Price display
  const priceText = a.price ? `<div><strong>Prix:</strong> ${Number(a.price).toFixed(0)} FCFA/kg</div>` : '';
  
  // Rating display
  const stars = a.rating_avg > 0 ? '⭐'.repeat(Math.round(a.rating_avg)) : '';
  const ratingText = a.rating_avg > 0 ? `<span class="badge" style="background:#fbbf24;color:#000">${stars} ${a.rating_avg.toFixed(1)} (${a.rating_count})</span>` : '';
  
  // Certifications display
  const certBadges = (a.certifications||[]).map(c => {
    const icons = {bio:'🌿',quality:'✅',fair:'🤝'};
    const labels = {bio:'Bio',quality:'Qualité',fair:'Équitable'};
    return `<span class="badge" style="background:#10b981;color:white">${icons[c]||''} ${labels[c]||c}</span>`;
  }).join(' ');
  
  const premiumBadge = a.owner_plan === 'premium' ? '<span class="badge" style="background:#fbbf24;color:#000">💎 PREMIUM</span>' : '';
  el.innerHTML=`${photoHtml}<div class="name"><strong>${a.name}</strong> ${a.verified?'<span class="badge">✔︎ vérifié</span>':''} ${premiumBadge} ${ratingText}${distanceText}</div>
  <div><span class="badge">${a.role}</span> <span class="badge">${a.region}</span> ${a.localite? '· '+a.localite:''} ${certBadges}</div><div>${(a.products||[]).join('; ')}</div>${priceText}<div>${a.need||''}</div>
  <div id="harvests-${a.id}" style="margin-top:8px;font-size:0.9em;color:#059669;"></div>
  <div class="links">${a.whatsapp? `<a target="_blank" href="https://wa.me/${digits(a.whatsapp)}?text=Bonjour, je suis intéressé par vos produits">WhatsApp</a>`:''}${a.email? `<a href="mailto:${a.email}">Email</a>`:''}${a.phone? `<a href="tel:${digits(a.phone)}">Appeler</a>`:''}
  ${ME? `<a href="#" data-id="${a.id}" class="rate">Noter</a> <a href="#" data-id="${a.id}" class="edit">Modifier</a> <a href="#" data-id="${a.id}" class="del">Supprimer</a>`:`<a href="#" data-id="${a.id}" class="rate">Noter</a>`}</div>`;
  
  // Load and display harvests (real quantities available)
  fetch('/api/actors/'+a.id+'/harvests')
    .then(r=>r.json())
    .then(harvests=>{
      const harvestDiv = el.querySelector('#harvests-'+a.id);
      if(harvests && harvests.length > 0){
        const harvestText = harvests.map(h=>`${h.product}: ${h.quantity} kg`).join(', ');
        harvestDiv.innerHTML = `<strong>📦 Disponible:</strong> ${harvestText}`;
      }
    })
    .catch(()=>{});
  if(ME){ 
    el.querySelector('.edit').onclick=(e)=>{e.preventDefault(); openActorDialog(a);};
    el.querySelector('.del').onclick=async(e)=>{e.preventDefault(); if(!confirm('Supprimer ?')) return; await fetch('/api/actors/'+a.id,{method:'DELETE'}); await loadActors(); renderMap();}; 
  }
  el.querySelector('.rate').onclick=(e)=>{e.preventDefault(); openRatingDialog(a);};
  return el; 
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function openActorDialog(a){ if(!ME) return alert('Connecte-toi d’abord.'); const dlg=document.createElement('dialog'); dlg.innerHTML=`<form id="frmActor" class="dialog-body"><h3>${a?'Modifier':'Nouvel'} acteur</h3>
  <div class="grid2"><label>Nom <input name="name" required value="${a?.name||''}"></label>
  <label>Rôle <select name="role" required>${['producteur','transporteur','transformateur','grossiste','detaillant','institution'].map(r=>`<option ${a?.role===r?'selected':''}>${r}</option>`).join('')}</select></label>
  <label>Région <select name="region" required>${(REFS.regions||[]).map(r=>`<option ${a?.region===r?'selected':''}>${r}</option>`).join('')}</select></label>
  <label>Localité <input name="localite" value="${a?.localite||''}"></label>
  <label>Produits (séparés par ;) <input name="products" value="${(a?.products||[]).join(';')}"></label>
  <label>Besoin <input name="need" value="${a?.need||''}"></label>
  <label>Volume (kg) <input name="volume" type="number" min="0" value="${a?.volume||''}"></label>
  <label>Prix (FCFA/kg) <input name="price" type="number" min="0" step="1" value="${a?.price||''}"></label>
  <label>Photo URL <input name="photo_url" type="url" placeholder="https://..." value="${a?.photo_url||''}"></label>
  <label style="grid-column:1/-1"><strong>Certifications:</strong> 
    <label style="display:inline-block;margin-right:15px"><input type="checkbox" name="cert_bio" ${(a?.certifications||[]).includes('bio')?'checked':''}> 🌿 Bio</label>
    <label style="display:inline-block;margin-right:15px"><input type="checkbox" name="cert_quality" ${(a?.certifications||[]).includes('quality')?'checked':''}> ✅ Qualité</label>
    <label style="display:inline-block"><input type="checkbox" name="cert_fair" ${(a?.certifications||[]).includes('fair')?'checked':''}> 🤝 Commerce Équitable</label>
  </label>
  <label>Latitude <input name="lat" type="number" step="0.0001" value="${a?.lat??''}"></label>
  <label>Longitude <input name="lng" type="number" step="0.0001" value="${a?.lng??''}"></label>
  <label>Téléphone <input name="phone" value="${a?.phone||''}"></label>
  <label>WhatsApp <input name="whatsapp" value="${a?.whatsapp||''}"></label>
  <label>Email <input name="email" type="email" value="${a?.email||''}"></label>
  <label>Vérifié ? <select name="verified"><option value="false" ${!a?.verified?'selected':''}>Non</option><option value="true" ${a?.verified?'selected':''}>Oui</option></select></label></div>
  <div class="dialog-actions"><button type="button" id="btnUseLocation">📍 Utiliser ma position</button><button type="submit">Enregistrer</button><button type="button" id="cancelActor">Annuler</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal(); dlg.querySelector('#cancelActor').onclick=()=> dlg.close();
  dlg.querySelector('#btnUseLocation').onclick=async()=>{ 
    const btn = dlg.querySelector('#btnUseLocation');
    btn.disabled = true;
    btn.textContent = '⏳ Récupération...';
    try {
      const loc = await getUserLocation();
      dlg.querySelector('input[name="lat"]').value = loc.lat.toFixed(4);
      dlg.querySelector('input[name="lng"]').value = loc.lng.toFixed(4);
      btn.textContent = '✓ Position obtenue';
      setTimeout(() => { btn.disabled = false; btn.textContent = '📍 Utiliser ma position'; }, 2000);
    } catch(err) {
      alert(err.message);
      btn.disabled = false;
      btn.textContent = '📍 Utiliser ma position';
    }
  };
  dlg.querySelector('#frmActor').onsubmit=async(e)=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries());
    const certifications = [];
    if(data.cert_bio) certifications.push('bio');
    if(data.cert_quality) certifications.push('quality');
    if(data.cert_fair) certifications.push('fair');
    const payload={name:data.name.trim(), role:data.role, region:data.region, localite:(data.localite||'').trim(), products:(data.products||'').split(';').map(s=>s.trim()).filter(Boolean), need:(data.need||'').trim(), volume:data.volume?Number(data.volume):null, price:data.price?Number(data.price):null, photo_url:(data.photo_url||'').trim(), certifications, lat:data.lat?Number(data.lat):null, lng:data.lng?Number(data.lng):null, phone:(data.phone||'').trim(), whatsapp:(data.whatsapp||'').trim(), email:(data.email||'').trim(), verified:data.verified==='true'};
    let r;
    if(a&&a.id) r = await fetch('/api/actors/'+a.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    else r = await fetch('/api/actors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(r.status===403){ const err=await r.json(); alert(err.message||'Limite atteinte'); dlg.close(); return; }
    dlg.close(); await loadActors(); renderMap(); }; }

function openRatingDialog(actor){ 
  if(!ME) return alert('Connectez-vous pour noter cet acteur');
  const dlg=document.createElement('dialog'); 
  dlg.innerHTML=`<form id="frmRating" class="dialog-body"><h3>Noter ${actor.name}</h3>
    <div class="grid2">
      <label>Note (1-5 étoiles) <select name="rating" required>
        <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
        <option value="4">⭐⭐⭐⭐ Très bien</option>
        <option value="3">⭐⭐⭐ Bien</option>
        <option value="2">⭐⭐ Passable</option>
        <option value="1">⭐ Mauvais</option>
      </select></label>
      <label>Commentaire (optionnel) <textarea name="comment" placeholder="Votre expérience..."></textarea></label>
    </div>
    <div class="dialog-actions"><button type="submit">Envoyer ma note</button><button type="button" id="cancelRating">Annuler</button></div>
  </form>`;
  document.body.appendChild(dlg); 
  dlg.showModal(); 
  dlg.querySelector('#cancelRating').onclick=()=> dlg.close();
  dlg.querySelector('#frmRating').onsubmit=async(e)=>{ 
    e.preventDefault(); 
    const data=Object.fromEntries(new FormData(e.target).entries());
    const r = await fetch(`/api/actors/${actor.id}/ratings`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({rating:Number(data.rating), comment:data.comment||''})
    });
    if(r.ok){ 
      dlg.close(); 
      await loadActors(); 
      alert('Merci pour votre évaluation !'); 
    } else { 
      alert('Erreur lors de l\'enregistrement'); 
    }
  };
}

function renderStockSummary(){
  const summaryEl=document.getElementById('stockSummarySimple');
  if(!summaryEl) return;
  
  // Aggregate products by name with prices
  const productMap = new Map();
  
  ACTORS.forEach(actor => {
    const products = actor.products || [];
    const volume = Number(actor.volume) || 0;
    const price = Number(actor.price) || 0;
    
    products.forEach(product => {
      const productName = product.trim();
      if(!productName) return;
      
      if(!productMap.has(productName)){
        productMap.set(productName, {volume: 0, prices: []});
      }
      
      const data = productMap.get(productName);
      data.volume += (volume / products.length);
      if(price > 0) data.prices.push(price);
    });
  });
  
  // Sort products by total volume (descending)
  const sortedProducts = Array.from(productMap.entries())
    .sort((a,b) => b[1].volume - a[1].volume)
    .filter(([name, data]) => data.volume > 0);
  
  // Render simple summary with prices
  if(sortedProducts.length === 0){
    summaryEl.innerHTML = '<p class="muted">Aucun stock disponible pour le moment</p>';
    return;
  }
  
  const stockText = sortedProducts.map(([name, data]) => {
    const avgPrice = data.prices.length > 0 
      ? (data.prices.reduce((a,b)=>a+b,0) / data.prices.length).toFixed(0)
      : null;
    return `<strong>${name}</strong> ${data.volume.toFixed(0)} kg${avgPrice ? ` <span class="badge" style="background:#10b981;color:white">${avgPrice} FCFA/kg</span>` : ''}`;
  }).join(', ');
  
  summaryEl.innerHTML = stockText;
}

document.getElementById('btnAddLog').onclick=()=> openLogDialog();
async function loadLogistics(){ const r=await fetch('/api/logistics'); LOGS=await r.json(); renderLogistics(); }
function renderLogistics(){ const list=document.getElementById('logList'); list.innerHTML=''; LOGS.forEach(l=>{ const el=document.createElement('div'); el.className='card'; const digits=s=>(s||'').replace(/\D/g,'');
  el.innerHTML=`<div><strong>${l.title}</strong> <span class="badge">${l.type==='need'?'BESOIN':'OFFRE'}</span> <span class="badge">${l.region}</span></div>
  <div>${l.details||''}</div><div class="links">${l.whatsapp? `<a target="_blank" href="https://wa.me/${digits(l.whatsapp)}">WhatsApp</a>`:''}${l.contact? `<a href="tel:${digits(l.contact)}">Appeler</a>`:''}${ME? ` <a href="#" data-id="${l.id}" class="del">Supprimer</a>`:''}</div>`;
  if(ME){ el.querySelector('.del').onclick=async(e)=>{e.preventDefault(); if(!confirm('Supprimer ?')) return; await fetch('/api/logistics/'+l.id,{method:'DELETE'}); await loadLogistics(); }; }
  list.appendChild(el);
}); }
function openLogDialog(item){ if(!ME) return alert('Connecte-toi d’abord.'); const dlg=document.createElement('dialog'); dlg.innerHTML=`<form id="frmLog" class="dialog-body"><h3>${item?'Modifier':'Nouvelle'} demande/offre logistique</h3><div class="grid2">
  <label>Titre <input name="title" required value="${item?.title||''}"></label>
  <label>Type <select name="type"><option value="need" ${item?.type==='need'?'selected':''}>Besoin</option><option value="offer" ${item?.type==='offer'?'selected':''}>Offre</option></select></label>
  <label>Région <input name="region" value="${item?.region||''}"></label>
  <label>Détails <textarea name="details">${item?.details||''}</textarea></label>
  <label>Téléphone <input name="contact" value="${item?.contact||''}"></label>
  <label>WhatsApp <input name="whatsapp" value="${item?.whatsapp||''}"></label></div>
  <div class="dialog-actions"><button type="submit">Enregistrer</button><button type="button" id="cancelLog">Annuler</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal(); dlg.querySelector('#cancelLog').onclick=()=> dlg.close();
  dlg.querySelector('#frmLog').onsubmit=async(e)=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries());
    const payload={title:data.title.trim(), type:data.type, region:data.region, details:(data.details||'').trim(), contact:(data.contact||'').trim(), whatsapp:(data.whatsapp||'').trim()};
    if(item&&item.id) await fetch('/api/logistics/'+item.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    else await fetch('/api/logistics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    dlg.close(); await loadLogistics(); }; }

let MAP, USER_MARKER; 
async function renderMap(){ 
  if(!MAP){ 
    MAP=L.map('leaflet').setView([8.65,1.05],7); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(MAP);
  } 
  (window._markers||[]).forEach(m=>MAP.removeLayer(m)); 
  window._markers=[]; 
  ACTORS.forEach(a=>{ 
    if(a.lat&&a.lng){ 
      const m=L.marker([a.lat,a.lng]).addTo(MAP).bindPopup(`<b>${a.name}</b><br>${a.role} – ${a.region}<br><small>${a.need||''}</small>`); 
      window._markers.push(m);
    } 
  });
  if(USER_LOCATION){
    if(USER_MARKER) MAP.removeLayer(USER_MARKER);
    const userIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNDI4NWY0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjNDI4NWY0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    USER_MARKER = L.marker([USER_LOCATION.lat, USER_LOCATION.lng], {icon: userIcon}).addTo(MAP).bindPopup('<b>📍 Ma position</b>');
    MAP.setView([USER_LOCATION.lat, USER_LOCATION.lng], 12);
  }
}

const CROP_TEMPLATES = {
  'Maïs': {
    label: 'Production de Maïs 1ha',
    output_qty: 2000,
    price_expected: 250,
    target_margin: 20,
    transport: 50000,
    autres: 30000,
    items: [
      {kind:'input',label:'Semences hybrides',qty:25,unit:'kg',unit_price:2500},
      {kind:'input',label:'Engrais NPK 15-15-15',qty:200,unit:'kg',unit_price:400},
      {kind:'input',label:'Urée 46%',qty:100,unit:'kg',unit_price:350},
      {kind:'input',label:'Herbicide pré-levée',qty:4,unit:'L',unit_price:8000},
      {kind:'input',label:'Herbicide post-levée',qty:3,unit:'L',unit_price:7500},
      {kind:'input',label:'Insecticide',qty:2,unit:'L',unit_price:6000},
      {kind:'labor',label:'Labour/Billonnage',qty:1,unit:'ha',unit_price:80000},
      {kind:'labor',label:'Semis',qty:8,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Sarclage (2 passages)',qty:16,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Épandage engrais',qty:6,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Récolte et égrenage',qty:20,unit:'h-j',unit_price:3000}
    ]
  },
  'Soja': {
    label: 'Production de Soja 1ha',
    output_qty: 1500,
    price_expected: 350,
    target_margin: 25,
    transport: 40000,
    autres: 25000,
    items: [
      {kind:'input',label:'Semences certifiées',qty:60,unit:'kg',unit_price:1200},
      {kind:'input',label:'Engrais NPK 14-23-14',qty:150,unit:'kg',unit_price:450},
      {kind:'input',label:'Inoculant (rhizobium)',qty:1,unit:'sachet',unit_price:5000},
      {kind:'input',label:'Herbicide',qty:3,unit:'L',unit_price:8000},
      {kind:'input',label:'Insecticide',qty:2,unit:'L',unit_price:7000},
      {kind:'labor',label:'Labour',qty:1,unit:'ha',unit_price:75000},
      {kind:'labor',label:'Semis',qty:6,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Sarclage',qty:12,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Récolte et battage',qty:15,unit:'h-j',unit_price:3000}
    ]
  },
  'Manioc': {
    label: 'Production de Manioc 1ha',
    output_qty: 15000,
    price_expected: 100,
    target_margin: 30,
    transport: 60000,
    autres: 20000,
    items: [
      {kind:'input',label:'Boutures (20000 tiges)',qty:20000,unit:'pièce',unit_price:20},
      {kind:'input',label:'Engrais NPK',qty:100,unit:'kg',unit_price:400},
      {kind:'input',label:'Herbicide',qty:2,unit:'L',unit_price:7000},
      {kind:'labor',label:'Débroussaillage',qty:10,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Billonnage',qty:1,unit:'ha',unit_price:70000},
      {kind:'labor',label:'Bouturage',qty:20,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Sarclage (2 passages)',qty:20,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Récolte',qty:25,unit:'h-j',unit_price:3000}
    ]
  },
  'Riz': {
    label: 'Production de Riz irrigué 1ha',
    output_qty: 5000,
    price_expected: 350,
    target_margin: 20,
    transport: 70000,
    autres: 40000,
    items: [
      {kind:'input',label:'Semences améliorées',qty:80,unit:'kg',unit_price:600},
      {kind:'input',label:'Engrais NPK 15-15-15',qty:250,unit:'kg',unit_price:400},
      {kind:'input',label:'Urée 46%',qty:150,unit:'kg',unit_price:350},
      {kind:'input',label:'Herbicide',qty:4,unit:'L',unit_price:8000},
      {kind:'input',label:'Insecticide (riz)',qty:2,unit:'L',unit_price:9000},
      {kind:'labor',label:'Labour et aménagement',qty:1,unit:'ha',unit_price:90000},
      {kind:'labor',label:'Repiquage',qty:25,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Sarclage',qty:15,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Récolte et battage',qty:30,unit:'h-j',unit_price:3000}
    ]
  },
  'Maraîchage': {
    label: 'Maraîchage (Tomate) 0.25ha',
    output_qty: 8000,
    price_expected: 200,
    target_margin: 35,
    transport: 25000,
    autres: 15000,
    items: [
      {kind:'input',label:'Plants de tomate',qty:5000,unit:'pièce',unit_price:50},
      {kind:'input',label:'Engrais NPK',qty:100,unit:'kg',unit_price:450},
      {kind:'input',label:'Fumure organique',qty:2000,unit:'kg',unit_price:50},
      {kind:'input',label:'Pesticides (fongicide)',qty:3,unit:'L',unit_price:8000},
      {kind:'input',label:'Insecticide bio',qty:2,unit:'L',unit_price:6000},
      {kind:'input',label:'Tuteurs',qty:500,unit:'pièce',unit_price:100},
      {kind:'labor',label:'Préparation terrain',qty:8,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Repiquage',qty:10,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Arrosage (90 jours)',qty:45,unit:'h-j',unit_price:2500},
      {kind:'labor',label:'Tuteurage',qty:5,unit:'h-j',unit_price:3000},
      {kind:'labor',label:'Récolte (étalée)',qty:30,unit:'h-j',unit_price:3000}
    ]
  }
};

document.getElementById('btnAddBudget').onclick=()=> openBudgetDialog();
async function loadBudgets(){ 
  const r=await fetch('/api/activities'); 
  if(r.status===401){ BUDGETS=[]; renderBudgets(); return; } 
  BUDGETS=await r.json(); 
  // Charger les totaux réels pour chaque budget
  for(let b of BUDGETS){
    const sumR = await fetch(`/api/activities/${b.id}/summary`);
    if(sumR.ok){
      const summary = await sumR.json();
      b.realTotal = summary.totalRealExpenses || 0;
      b.realIncomes = summary.totalRealIncomes || 0;
      b.actualHarvest = summary.actual_harvest || 0;
    }
  }
  renderBudgets(); 
  refreshCostBudgets(); 
}
function renderBudgets(){ 
  const list=document.getElementById('budgetList'); 
  list.innerHTML=''; 
  BUDGETS.forEach(b=>{
    const prevuDep = (b.transport||0) + (b.autres||0) + (b.overhead_pct||0);
    const prevuCA = (b.output_qty||0) * (b.price_expected||0);
    const prevuProfit = prevuCA - prevuDep;
    const realTotal = b.realTotal || 0;
    const realIncomes = b.realIncomes || 0;
    const realProfit = realIncomes - realTotal;
    const variance = realTotal - prevuDep;
    const varianceColor = variance > 0 ? '#dc2626' : '#059669';
    
    const el=document.createElement('div'); 
    el.className='card'; 
    el.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${b.label}</strong> 
          <span class="badge">${b.filiere}</span> 
          <span class="badge">${b.periode}</span>
        </div>
        <div>
          <a href="#" data-id="${b.id}" class="open" style="margin-right:10px;">📊 Voir détails</a>
          <a href="#" data-id="${b.id}" class="del">🗑 Supprimer</a>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-top:10px;">
        <div style="background:#f0fdf4;padding:10px;border-radius:6px;">
          <p style="margin:0;font-size:12px;color:#6b7280;">📊 BUDGET PRÉVISIONNEL</p>
          <p style="margin:5px 0;font-weight:bold;color:#059669;">${prevuDep.toLocaleString()} FCFA</p>
          <p style="margin:0;font-size:11px;color:#6b7280;">CA prévu: ${prevuCA.toLocaleString()} FCFA</p>
          <p style="margin:0;font-size:11px;color:#6b7280;">Profit prévu: ${prevuProfit.toLocaleString()} FCFA</p>
        </div>
        <div style="background:#fee2e2;padding:10px;border-radius:6px;">
          <p style="margin:0;font-size:12px;color:#6b7280;">💰 SUIVI COÛTS RÉELS</p>
          <p style="margin:5px 0;font-weight:bold;color:#dc2626;">${realTotal.toLocaleString()} FCFA</p>
          <p style="margin:0;font-size:11px;color:#6b7280;">Recettes: ${realIncomes.toLocaleString()} FCFA</p>
          <p style="margin:0;font-size:11px;color:#6b7280;">Profit réel: ${realProfit.toLocaleString()} FCFA</p>
        </div>
        <div style="background:#fef3c7;padding:10px;border-radius:6px;">
          <p style="margin:0;font-size:12px;color:#6b7280;">📈 ÉCART</p>
          <p style="margin:5px 0;font-weight:bold;color:${varianceColor};">${variance > 0 ? '+' : ''}${variance.toLocaleString()} FCFA</p>
          <p style="margin:0;font-size:11px;color:#6b7280;">Récolte: ${b.actualHarvest || 0} / ${b.output_qty || 0} kg</p>
        </div>
      </div>
    `;
    list.appendChild(el);
    el.querySelector('.open').onclick=(e)=>{ e.preventDefault(); openBudget(b); };
    el.querySelector('.del').onclick=async(e)=>{ 
      e.preventDefault(); 
      if(!confirm('Supprimer ce budget et tous ses coûts réels ?')) return; 
      await fetch('/api/activities/'+b.id,{method:'DELETE'}); 
      await loadBudgets(); 
      document.getElementById('budgetEditor').innerHTML='<p class="muted">Sélectionnez un budget…</p>'; 
    };
  }); 
}
function openActDialog(){ if(!ME) return alert('Connecte-toi d’abord.'); const dlg=document.createElement('dialog'); dlg.innerHTML=`<form id="frmAct" class="dialog-body"><h3>Nouvelle activité</h3><div class="grid2">
  <label>Filière <select name="filiere"><option>Maïs</option><option>Manioc</option><option>Riz</option><option>Maraîchage</option><option>Soja</option><option>Volailles</option></select></label>
  <label>Libellé <input name="label" required></label>
  <label>Période <select name="periode"><option>Mensuel</option><option>Trimestriel</option><option>Annuel</option></select></label>
  <label>Production totale (unités) <input name="output_qty" type="number" min="1" value="1000"></label>
  <label>Prix de vente envisagé (FCFA) <input name="price_expected" type="number" value="300"></label>
  <label>Marge cible (%) <input name="target_margin" type="number" value="15"></label>
  <label>Transport (FCFA) <input name="transport" type="number" value="0"></label>
  <label>Autres coûts (FCFA) <input name="autres" type="number" value="0"></label>
  <label>Frais généraux (%) <input name="overhead_pct" type="number" value="10"></label>
</div><div class="dialog-actions"><button type="submit">Créer</button><button type="button" id="cancelAct">Annuler</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal(); dlg.querySelector('#cancelAct').onclick=()=> dlg.close();
  dlg.querySelector('#frmAct').onsubmit=async(e)=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries()); data.output_qty=Number(data.output_qty||0); data.price_expected=Number(data.price_expected||0); data.target_margin=Number(data.target_margin||0); data.transport=Number(data.transport||0); data.autres=Number(data.autres||0); data.overhead_pct=Number(data.overhead_pct||0);
    const r=await fetch('/api/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); if(!r.ok){ alert('Erreur'); return; } dlg.close(); await loadActs(); };
}
async function openAct(a){ 
  CURRENT_ACT=a; 
  const r=await fetch(`/api/activities/${a.id}/items`); 
  ACT_ITEMS = await r.json(); 
  const sumR=await fetch(`/api/activities/${a.id}/summary`); 
  const S=await sumR.json();
  
  const statusBadge = {
    'planned': '<span class="badge" style="background:#fbbf24;color:#000;">📋 Planifié</span>',
    'in_progress': '<span class="badge" style="background:#3b82f6;color:#fff;">🚜 En cours</span>',
    'completed': '<span class="badge" style="background:#10b981;color:#fff;">✅ Terminé</span>'
  }[S.status||'planned'] || '<span class="badge">📋 Planifié</span>';
  
  const expensesList = (S.budgetExpenses||[]).map(e=>`<tr><td>${e.occurred_on}</td><td>${e.category||'-'}</td><td style="text-align:right;">${Number(e.amount).toLocaleString()} FCFA</td><td>${e.note||'-'}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Aucune dépense enregistrée</td></tr>';
  
  const root=document.getElementById('actEditor');
  root.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
      <h4 style="margin:0;">${a.label} <span class="badge">${a.filiere}</span> ${statusBadge}</h4>
      <button id="btnEditStatus" style="padding:6px 12px;font-size:13px;">✏️ Modifier statut/récolte</button>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
      <div class="card" style="background:#f0fdf4;">
        <h5 style="margin:0 0 10px 0;color:#059669;">📊 BUDGET PRÉVISIONNEL</h5>
        <div style="font-size:14px;line-height:1.8;">
          <p style="margin:5px 0;">Intrants: <strong>${Math.round(S.intrants).toLocaleString()} FCFA</strong></p>
          <p style="margin:5px 0;">Main d'œuvre: <strong>${Math.round(S.mo).toLocaleString()} FCFA</strong></p>
          <p style="margin:5px 0;">Transport & autres: <strong>${Math.round((a.transport||0)+(a.autres||0)).toLocaleString()} FCFA</strong></p>
          <p style="margin:5px 0;">Frais généraux (${a.overhead_pct||0}%): <strong>${Math.round(S.overhead).toLocaleString()} FCFA</strong></p>
          <hr style="margin:10px 0;border:0;border-top:2px solid #059669;">
          <p style="margin:5px 0;font-size:16px;"><strong>Total prévisionnel: ${Math.round(S.total).toLocaleString()} FCFA</strong></p>
          <p style="margin:5px 0;">Quantité prévue: <strong>${(a.output_qty||0).toLocaleString()} kg</strong></p>
          <p style="margin:5px 0;">Coût unitaire prévu: <strong>${S.unit.toFixed(2)} FCFA/kg</strong></p>
          <p style="margin:5px 0;">PV envisagé: <strong>${(a.price_expected||0).toFixed(2)} FCFA/kg</strong></p>
          <p style="margin:5px 0;color:#059669;">Marge prévue: <strong>${S.marge.toFixed(1)}%</strong></p>
        </div>
      </div>
      
      <div class="card" style="background:#fee2e2;">
        <h5 style="margin:0 0 10px 0;color:#dc2626;">💰 COÛTS RÉELS (Accumulés)</h5>
        <div style="font-size:14px;line-height:1.8;">
          <p style="margin:5px 0;">Total dépenses: <strong>${(S.totalRealExpenses||0).toLocaleString()} FCFA</strong></p>
          <p style="margin:5px 0;">Total recettes: <strong>${(S.totalRealIncomes||0).toLocaleString()} FCFA</strong></p>
          <hr style="margin:10px 0;border:0;border-top:2px solid #dc2626;">
          <p style="margin:5px 0;font-size:16px;"><strong>Profit réel: ${(S.profit||0).toLocaleString()} FCFA</strong></p>
          <p style="margin:5px 0;">Quantité récoltée: <strong>${(S.actual_harvest||0).toLocaleString()} kg</strong></p>
          <p style="margin:5px 0;">Coût unitaire réel: <strong>${(S.unitReal||0).toFixed(2)} FCFA/kg</strong></p>
          ${S.actual_harvest>0 ? `<p style="margin:5px 0;color:#dc2626;">Marge réelle: <strong>${S.margeReal.toFixed(1)}%</strong></p>` : '<p style="margin:5px 0;color:#9ca3af;font-style:italic;">Renseignez la récolte réelle</p>'}
        </div>
      </div>
    </div>
    
    <div class="card" style="margin-bottom:15px;">
      <h5 style="margin:0 0 10px 0;">📈 Accumulation chronologique des dépenses</h5>
      <table class="tbl" style="width:100%;"><thead><tr><th>Date</th><th>Catégorie</th><th>Montant</th><th>Note</th></tr></thead><tbody>${expensesList}</tbody></table>
      <p style="margin:10px 0 0 0;font-size:13px;color:#6b7280;">💡 Ajoutez vos dépenses réelles dans l'onglet <strong>Budget</strong> en sélectionnant cette activité</p>
    </div>
    
    <div class="card">
      <h5 style="margin:0 0 10px 0;">⚙️ Détail des postes prévisionnels</h5>
      <table class="tbl"><thead><tr><th>Type</th><th>Libellé</th><th>Qté</th><th>Unité</th><th>Prix unitaire</th><th>Total</th><th></th></tr></thead><tbody>${ACT_ITEMS.map(it=>`<tr><td><select data-k="kind"><option value="input" ${it.kind==='input'?'selected':''}>Intrant</option><option value="labor" ${it.kind==='labor'?'selected':''}>Main d'œuvre</option></select></td><td><input data-k="label" value="${it.label||''}"></td><td><input type="number" step="0.01" data-k="qty" value="${it.qty||0}"></td><td><input data-k="unit" value="${it.unit||''}"></td><td><input type="number" step="0.01" data-k="unit_price" value="${it.unit_price||0}"></td><td class="sum">${((it.qty||0)*(it.unit_price||0)).toFixed(2)}</td><td><button class="save" data-id="${it.id}">💾</button> <button class="rm" data-id="${it.id}">🗑</button></td></tr>`).join('')}</tbody></table>
      <div class="dialog-actions"><button id="addItem">+ Ajouter ligne</button> <button id="recalc">🔄 Recalculer</button></div>
    </div>
  `;
  
  root.querySelector('#btnEditStatus').onclick = ()=> editActivityStatus(a);
  root.querySelectorAll('button.save').forEach(btn=> btn.onclick=async()=>{
    const tr=btn.closest('tr'); const payload={}; tr.querySelectorAll('input,select').forEach(inp=> payload[inp.dataset.k]= inp.type==='number'? Number(inp.value||0): inp.value);
    const r=await fetch('/api/items/'+btn.dataset.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) return alert('Erreur'); openAct(a);
  });
  root.querySelectorAll('button.rm').forEach(btn=> btn.onclick=async()=>{ if(!confirm('Supprimer cette ligne ?')) return; await fetch('/api/items/'+btn.dataset.id,{method:'DELETE'}); openAct(a); });
  root.querySelector('#addItem').onclick=async()=>{ await fetch('/api/activities/'+a.id+'/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'input',label:'',qty:0,unit:'',unit_price:0})}); openAct(a); };
  root.querySelector('#recalc').onclick=()=> openAct(a);
}

function editActivityStatus(a){
  const dlg=document.createElement('dialog');
  dlg.innerHTML=`<form id="frmStatus" class="dialog-body" style="max-width:500px;"><h3>✏️ Modifier l'activité</h3>
    <div class="grid2">
      <label>Statut <select name="status">
        <option value="planned" ${a.status==='planned'?'selected':''}>📋 Planifié</option>
        <option value="in_progress" ${a.status==='in_progress'?'selected':''}>🚜 En cours</option>
        <option value="completed" ${a.status==='completed'?'selected':''}>✅ Terminé</option>
      </select></label>
      <label>Date de début <input name="started_at" type="date" value="${a.started_at?new Date(a.started_at).toISOString().slice(0,10):''}"></label>
      <label>Date de fin <input name="ended_at" type="date" value="${a.ended_at?new Date(a.ended_at).toISOString().slice(0,10):''}"></label>
      <label>Récolte réelle (kg) <input name="actual_harvest" type="number" step="0.01" value="${a.actual_harvest||''}"></label>
    </div>
    <div class="dialog-actions"><button type="submit">💾 Enregistrer</button><button type="button" id="cancelStatus">Annuler</button></div>
  </form>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.querySelector('#cancelStatus').onclick=()=> dlg.close();
  dlg.querySelector('#frmStatus').onsubmit=async(e)=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.target).entries());
    data.actual_harvest = data.actual_harvest ? Number(data.actual_harvest) : null;
    const payload = {...a, ...data};
    const r=await fetch(`/api/activities/${a.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok){ alert('Erreur'); return; }
    const updated = await r.json();
    dlg.close();
    await loadActs();
    openAct(updated);
  };
}

let BUDGET={rows:[], totals:{income:0,expense:0,balance:0}};
async function loadBudget(){ const r=await fetch('/api/budget'); if(r.status===401){ BUDGET={rows:[], totals:{income:0,expense:0,balance:0}}; renderBudget(); return; } BUDGET=await r.json(); renderBudget(); }
function renderBudget(){ const list=document.getElementById('bList'); const sum=document.getElementById('bSum'); list.innerHTML=''; BUDGET.rows.forEach(x=>{ const el=document.createElement('div'); el.className='card'; el.innerHTML=`<div><strong>${x.kind==='income'?'Recette':'Dépense'}</strong> · ${x.category||'-'} · ${Number(x.amount).toFixed(0)} FCFA <span class="muted right">${x.occurred_on}</span></div><div class="muted">${x.note||''}</div>`; list.appendChild(el); }); sum.innerHTML=`<p>Recettes: <strong>${Math.round(BUDGET.totals.income)}</strong> FCFA</p><p>Dépenses: <strong>${Math.round(BUDGET.totals.expense)}</strong> FCFA</p><p><strong>Solde</strong>: <strong>${Math.round(BUDGET.totals.balance)}</strong> FCFA</p>`; }
async function refreshBudgetActs(){ const sel=document.getElementById('bAct'); sel.innerHTML='<option value="">(sans activité)</option>'+ACTS.map(a=>`<option value="${a.id}">${a.label}</option>`).join(''); }
document.getElementById('bAdd').onclick=async()=>{ if(!ME) return alert('Connecte-toi d’abord.'); const payload={ kind:document.getElementById('bKind').value, occurred_on:document.getElementById('bDate').value || new Date().toISOString().slice(0,10), amount:Number(document.getElementById('bAmount').value||0), category:document.getElementById('bCat').value, activity_id: document.getElementById('bAct').value || null, note: document.getElementById('bNote').value }; const r=await fetch('/api/budget',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) return alert('Erreur'); await loadBudget(); };

window.showSubscriptionInfo = async function(){
  if(!ME) return alert('Connectez-vous d\'abord');
  try {
    const r = await fetch('/api/subscription');
    if(!r.ok) {
      alert('Erreur lors du chargement des informations d\'abonnement');
      return;
    }
    const data = await r.json();
    const isPremium = data.subscription.plan === 'premium';
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background:white;padding:30px;border-radius:12px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;';
    
    modal.innerHTML = `
      <h2 style="margin:0 0 20px 0;color:#059669;">📊 Mon Abonnement</h2>
      <div style="background:${isPremium?'#f0fdf4':'#fef3c7'};padding:15px;border-radius:8px;margin-bottom:20px;">
        <p style="font-size:18px;margin:0 0 10px 0;font-weight:bold;">
          ${isPremium?'💎 PREMIUM':'🆓 GRATUIT'}
        </p>
        <p style="margin:0;">Acteurs créés: <strong>${data.actorCount} / ${isPremium?'∞':data.limit}</strong></p>
      </div>
      
      ${isPremium ? `
        <div style="background:#f0fdf4;padding:15px;border-radius:8px;">
          <p style="font-weight:bold;margin:0 0 10px 0;">✅ Fonctionnalités Premium actives :</p>
          <ul style="margin:10px 0;padding-left:20px;">
            <li>Acteurs illimités</li>
            <li>Badge Premium visible</li>
            <li>Support prioritaire</li>
            <li>Analytics et statistiques</li>
          </ul>
          <p style="margin:10px 0 0 0;color:#6b7280;font-size:14px;">
            Prochain renouvellement : ${new Date(data.subscription.expires_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      ` : `
        <div style="background:#fef9e7;padding:15px;border-radius:8px;margin-bottom:15px;">
          <p style="font-weight:bold;margin:0 0 10px 0;">💎 Passez à Premium pour :</p>
          <ul style="margin:10px 0;padding-left:20px;line-height:1.8;">
            <li>✨ Acteurs illimités (vs 2 max)</li>
            <li>🏆 Badge Premium sur vos fiches</li>
            <li>📊 Tableau de bord analytique</li>
            <li>💬 Messagerie interne</li>
            <li>🔔 Alertes SMS/Email</li>
            <li>📈 Historique et statistiques</li>
          </ul>
          <p style="margin:15px 0 0 0;font-size:20px;font-weight:bold;color:#059669;">
            Prix: 5 000 FCFA/mois
          </p>
        </div>
        <button id="btnUpgradePremium" style="width:100%;padding:15px;background:#fbbf24;color:#000;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;margin-bottom:10px;">
          💎 Passer à Premium maintenant
        </button>
      `}
      
      <button id="btnCloseSubscription" style="width:100%;padding:12px;background:#6b7280;color:white;border:none;border-radius:8px;cursor:pointer;">
        Fermer
      </button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    overlay.querySelector('#btnCloseSubscription').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
    
    if(!isPremium) {
      overlay.querySelector('#btnUpgradePremium').onclick = () => {
        overlay.remove();
        showPaymentInstructions();
      };
    }
  } catch(e) {
    console.error('Erreur:', e);
    alert('Erreur lors du chargement des informations d\'abonnement');
  }
}

window.showPaymentInstructions = function(){
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background:white;padding:30px;border-radius:12px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;';
  
  modal.innerHTML = `
    <h2 style="margin:0 0 20px 0;color:#059669;">💎 Passer à Premium</h2>
    
    <div style="background:#fef3c7;padding:15px;border-radius:8px;margin-bottom:20px;">
      <p style="font-weight:bold;margin:0 0 10px 0;">📱 Paiement par Mobile Money</p>
      <p style="margin:0;font-size:20px;color:#059669;font-weight:bold;">5 000 FCFA / mois</p>
    </div>
    
    <div style="background:#f0fdf4;padding:20px;border-radius:8px;margin-bottom:20px;">
      <p style="font-weight:bold;margin:0 0 15px 0;">🔹 Instructions de paiement :</p>
      
      <div style="background:white;padding:15px;border-radius:8px;margin-bottom:15px;border:2px solid #059669;">
        <p style="font-weight:bold;margin:0 0 10px 0;color:#059669;">💰 T-Money (Togocom)</p>
        <p style="margin:5px 0;">1. Composez <strong>*145#</strong></p>
        <p style="margin:5px 0;">2. Choisissez "Transfert d'argent"</p>
        <p style="margin:5px 0;">3. Envoyez <strong>5 000 FCFA</strong> au numéro :</p>
        <p style="margin:10px 0;font-size:24px;font-weight:bold;color:#059669;">XX XX XX XX XX</p>
        <p style="margin:5px 0;font-size:14px;color:#6b7280;">Nom: AgriRéseau Pro</p>
      </div>
      
      <div style="background:white;padding:15px;border-radius:8px;margin-bottom:15px;border:2px solid #059669;">
        <p style="font-weight:bold;margin:0 0 10px 0;color:#059669;">💰 Flooz (Moov Africa)</p>
        <p style="margin:5px 0;">1. Composez <strong>*155#</strong></p>
        <p style="margin:5px 0;">2. Choisissez "Transfert"</p>
        <p style="margin:5px 0;">3. Envoyez <strong>5 000 FCFA</strong> au numéro :</p>
        <p style="margin:10px 0;font-size:24px;font-weight:bold;color:#059669;">XX XX XX XX XX</p>
        <p style="margin:5px 0;font-size:14px;color:#6b7280;">Nom: AgriRéseau Pro</p>
      </div>
    </div>
    
    <div style="background:#fee2e2;padding:15px;border-radius:8px;margin-bottom:20px;">
      <p style="font-weight:bold;margin:0 0 10px 0;">⚠️ Après le paiement :</p>
      <p style="margin:5px 0;">1. Notez votre <strong>code de transaction</strong> (ex: TM123456789)</p>
      <p style="margin:5px 0;">2. Contactez-nous par WhatsApp au <strong>XX XX XX XX XX</strong></p>
      <p style="margin:5px 0;">3. Envoyez le code + votre email (${ME?.email || 'votre email'})</p>
      <p style="margin:10px 0 0 0;font-size:14px;color:#6b7280;">
        ⏱️ Activation sous 24h maximum
      </p>
    </div>
    
    <div style="background:#eff6ff;padding:15px;border-radius:8px;margin-bottom:20px;">
      <p style="font-weight:bold;margin:0 0 10px 0;">🚀 Paiement automatique bientôt disponible</p>
      <p style="margin:0;font-size:14px;color:#6b7280;">
        Nous travaillons sur l'intégration PayGate pour des paiements automatiques 
        T-Money et Flooz. Activation prévue dans les prochaines semaines !
      </p>
    </div>
    
    <button id="btnClosePayment" style="width:100%;padding:12px;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">
      J'ai compris
    </button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  overlay.querySelector('#btnClosePayment').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
}

// Nouvelles fonctions pour Budget (module prévisionnel)
function openBudgetDialog(){ 
  if(!ME) return alert("Connecte-toi d'abord.");
  const dlg=document.createElement('dialog');
  const productsOptions = PRODUCTS.map(p=>`<option value="${p.name}">${p.name}</option>`).join('');
  dlg.innerHTML=`<form id="frmBudget" class="dialog-body"><h3>📋 Créer un Budget Prévisionnel</h3>
    <p class="muted">Créez une activité et définissez vos prévisions</p>
    <div class="grid2">
      <label>Activité <input name="label" required placeholder="Ex: Production de maïs 2025"></label>
      <label>Filière <select name="filiere"><option>Maïs</option><option>Manioc</option><option>Riz</option><option>Maraîchage</option><option>Soja</option><option>Volailles</option></select></label>
      <label>Produit récolté <select name="harvest_product">${productsOptions}</select></label>
      <label>Période <select name="periode"><option>Annuel</option><option>Trimestriel</option><option>Mensuel</option></select></label>
      <label>Quantité prévue (kg) <input name="output_qty" type="number" value="1000"></label>
      <label>Prix de vente prévu (FCFA/kg) <input name="price_expected" type="number" value="300"></label>
      <label>Dépenses prévues (FCFA) <input name="transport" type="number" value="0"></label>
    </div>
    <div class="card" style="background:#f0fdf4;margin:15px 0;"><p style="margin:0;">CA prévu: <span id="previewCA">0</span> FCFA · Profit: <span id="previewProfit">0</span> FCFA</p></div>
    <div class="dialog-actions"><button type="submit">💾 Créer</button><button type="button" id="cancelB">Annuler</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal(); dlg.querySelector('#cancelB').onclick=()=> dlg.close();
  const f=dlg.querySelector('#frmBudget'); const up=()=>{const qty=Number(f.output_qty.value||0),price=Number(f.price_expected.value||0),dep=Number(f.transport.value||0);dlg.querySelector('#previewCA').textContent=(qty*price).toLocaleString();dlg.querySelector('#previewProfit').textContent=(qty*price-dep).toLocaleString();};
  f.output_qty.oninput=up;f.price_expected.oninput=up;f.transport.oninput=up;up();
  f.onsubmit=async(e)=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());d.output_qty=Number(d.output_qty||0);d.price_expected=Number(d.price_expected||0);d.transport=Number(d.transport||0);d.target_margin=0;d.autres=0;d.overhead_pct=0;
    const r=await fetch('/api/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});if(!r.ok){alert('Erreur');return;}dlg.close();await loadBudgets();};
}
async function openBudget(b){
  CURRENT_BUDGET=b;const sumR=await fetch(`/api/activities/${b.id}/summary`);const S=await sumR.json();const expenses=S.budgetExpenses||[];const incomes=S.budgetIncomes||[];
  const root=document.getElementById('budgetEditor');
  root.innerHTML=`<h4>${b.label} <span class="badge">${b.filiere}</span></h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
      <div class="card" style="background:#f0fdf4;"><h5 style="color:#059669;">📊 Budget Prévisionnel</h5>
        <p>Quantité: <strong>${b.output_qty||0} kg</strong></p><p>Prix: <strong>${b.price_expected||0} FCFA/kg</strong></p>
        <p>CA prévu: <strong>${((b.output_qty||0)*(b.price_expected||0)).toLocaleString()} FCFA</strong></p>
        <p>Dépenses prévues: <strong>${(b.transport||0).toLocaleString()} FCFA</strong></p>
        <p style="color:#059669;"><strong>Profit prévu: ${(((b.output_qty||0)*(b.price_expected||0))-(b.transport||0)).toLocaleString()} FCFA</strong></p></div>
      <div class="card" style="background:#fee2e2;"><h5 style="color:#dc2626;">💰 Coûts Réels</h5>
        <p>Dépenses: <strong>${(S.totalRealExpenses||0).toLocaleString()} FCFA</strong></p>
        <p>Recettes: <strong>${(S.totalRealIncomes||0).toLocaleString()} FCFA</strong></p>
        <p>Récolte: <strong>${S.actual_harvest||0} kg</strong> <button id="btnEditH" style="font-size:11px;">✏️</button></p>
        <p style="color:#dc2626;"><strong>Profit réel: ${((S.totalRealIncomes||0)-(S.totalRealExpenses||0)).toLocaleString()} FCFA</strong></p></div>
    </div>
    <div class="card" style="margin-top:15px;"><h5>📈 Détail (du Coût de revient)</h5>
      <table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Montant</th><th>Note</th></tr></thead><tbody>
        ${expenses.map(e=>`<tr><td>${e.occurred_on}</td><td>💸 Dépense</td><td>${e.category||'-'}</td><td>${Number(e.amount).toLocaleString()} FCFA</td><td>${e.note||'-'}</td></tr>`).join('')}
        ${incomes.map(i=>`<tr><td>${i.occurred_on}</td><td>💰 Recette</td><td>${i.category||'-'}</td><td style="color:#059669;">${Number(i.amount).toLocaleString()} FCFA</td><td>${i.note||'-'}</td></tr>`).join('')}
        ${expenses.length===0&&incomes.length===0?'<tr><td colspan="5" style="text-align:center;color:#9ca3af;">Aucun coût. Allez dans "Coût de revient".</td></tr>':''}
      </tbody></table></div>`;
  root.querySelector('#btnEditH').onclick=()=>editHarvest(b);
}
function editHarvest(b){
  const dlg=document.createElement('dialog');
  dlg.innerHTML=`<form id="fH"><h3>Récolte réelle</h3><label>Quantité (kg) <input name="h" type="number" step="0.01" value="${b.actual_harvest||''}" required></label><div class="dialog-actions"><button type="submit">💾 OK</button><button type="button" id="cH">Annuler</button></div></form>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.querySelector('#cH').onclick=()=>dlg.close();
  dlg.querySelector('#fH').onsubmit=async(e)=>{
    e.preventDefault();
    const h=Number(e.target.h.value);
    const payload = {label:b.label,filiere:b.filiere,periode:b.periode,output_qty:b.output_qty,price_expected:b.price_expected,transport:b.transport,target_margin:b.target_margin,autres:b.autres,overhead_pct:b.overhead_pct,actual_harvest:h};
    const r=await fetch(`/api/activities/${b.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok){alert('Erreur');return;}
    dlg.close();
    await loadBudgets();
    const u=await r.json();
    openBudget(u);
  };
}

// Nouvelles fonctions pour Coût de revient (module réel)
async function loadCosts(){
  const r=await fetch('/api/budget');
  if(r.status===401){COSTS=[];renderCosts();return;}
  const data=await r.json();
  COSTS=data.rows||[];
  renderCosts();
  if(CURRENT_COST_BUDGET) await showCostSummary(CURRENT_COST_BUDGET);
}
function renderCosts(){
  const list=document.getElementById('costList');
  if(!list) return;
  const budgetId=document.getElementById('costBudget')?.value;
  const filtered = budgetId ? COSTS.filter(c=>c.activity_id==budgetId) : COSTS;
  list.innerHTML='';
  if(filtered.length===0){
    list.innerHTML='<p class="muted">Aucune dépense enregistrée</p>';
    return;
  }
  filtered.forEach(c=>{
    const el=document.createElement('div');
    el.className='card';
    el.innerHTML=`<div><strong>${c.kind==='income'?'💰 Recette':'💸 Dépense'}</strong> · ${c.category||'-'} · <strong>${Number(c.amount).toLocaleString()} FCFA</strong> <span class="muted right">${c.occurred_on}</span></div>
      <div class="muted">${c.note||''}</div>`;
    list.appendChild(el);
  });
}
async function showCostSummary(budgetId){
  if(!budgetId) {
    document.getElementById('costSummary').innerHTML='<p class="muted">Sélectionnez un budget pour voir le calcul du coût de revient</p>';
    return;
  }
  CURRENT_COST_BUDGET=budgetId;
  const budget = BUDGETS.find(b=>b.id==budgetId);
  if(!budget) return;
  
  const sumR=await fetch(`/api/activities/${budgetId}/summary`);
  const S=await sumR.json();
  const totalCost = S.totalRealExpenses || 0;
  const actualHarvest = S.actual_harvest || 0;
  const targetMargin = budget.target_margin || 0;
  const unitCost = actualHarvest > 0 ? totalCost / actualHarvest : 0;
  const suggestedPrice = unitCost * (1 + targetMargin / 100);
  
  const root=document.getElementById('costSummary');
  root.innerHTML=`
    <div style="background:#f0fdf4;padding:15px;border-radius:8px;margin-bottom:15px;">
      <h4 style="margin:0 0 10px 0;color:#059669;">${budget.label}</h4>
      <p style="margin:5px 0;"><strong>Filière:</strong> ${budget.filiere}</p>
      <p style="margin:5px 0;"><strong>Période:</strong> ${budget.periode}</p>
    </div>
    
    <div style="background:#fee2e2;padding:15px;border-radius:8px;margin-bottom:15px;">
      <h5 style="margin:0 0 10px 0;color:#dc2626;">💰 Dépenses totales</h5>
      <p style="margin:0;font-size:24px;font-weight:bold;color:#dc2626;">${totalCost.toLocaleString()} FCFA</p>
    </div>
    
    <div style="background:#fef3c7;padding:15px;border-radius:8px;margin-bottom:15px;">
      <h5 style="margin:0 0 10px 0;color:#92400e;">🌾 Quantité récoltée</h5>
      <div style="display:flex;gap:10px;align-items:center;">
        <input type="number" id="harvestQty" value="${actualHarvest}" min="0" step="0.01" style="flex:1;padding:8px;border:2px solid #fbbf24;border-radius:4px;font-size:16px;font-weight:bold;">
        <span>kg</span>
        <button id="btnUpdateHarvest" style="padding:8px 15px;background:#fbbf24;border:none;border-radius:4px;cursor:pointer;">✏️ Modifier</button>
      </div>
    </div>
    
    <div style="background:#eff6ff;padding:15px;border-radius:8px;margin-bottom:15px;">
      <h5 style="margin:0 0 10px 0;color:#1e40af;">📊 Coût de revient unitaire</h5>
      <p style="margin:0;font-size:24px;font-weight:bold;color:#1e40af;">${unitCost.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})} FCFA/kg</p>
      <p style="margin:5px 0 0 0;font-size:12px;color:#6b7280;">Calcul: ${totalCost.toLocaleString()} FCFA ÷ ${actualHarvest} kg</p>
    </div>
    
    <div style="background:#f3e8ff;padding:15px;border-radius:8px;margin-bottom:15px;">
      <h5 style="margin:0 0 10px 0;color:#6b21a8;">💵 Marge bénéficiaire souhaitée</h5>
      <div style="display:flex;gap:10px;align-items:center;">
        <input type="number" id="marginPct" value="${targetMargin}" min="0" max="200" step="5" style="flex:1;padding:8px;border:2px solid #a855f7;border-radius:4px;font-size:16px;font-weight:bold;">
        <span>%</span>
        <button id="btnUpdateMargin" style="padding:8px 15px;background:#a855f7;color:white;border:none;border-radius:4px;cursor:pointer;">✏️ Modifier</button>
      </div>
    </div>
    
    <div style="background:#dcfce7;padding:15px;border-radius:8px;border:2px solid #059669;">
      <h5 style="margin:0 0 10px 0;color:#059669;">💎 Prix de vente suggéré</h5>
      <p style="margin:0;font-size:28px;font-weight:bold;color:#059669;">${suggestedPrice.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})} FCFA/kg</p>
      <p style="margin:5px 0 0 0;font-size:12px;color:#6b7280;">Calcul: ${unitCost.toFixed(2)} FCFA × (1 + ${targetMargin}%) = ${suggestedPrice.toFixed(2)} FCFA/kg</p>
      <p style="margin:10px 0 0 0;font-size:11px;color:#6b7280;font-style:italic;">💡 Ce prix est indicatif. Le prix final sera négociable avec les acheteurs.</p>
    </div>
  `;
  
  root.querySelector('#btnUpdateHarvest').onclick=async()=>{
    const newHarvest = Number(document.getElementById('harvestQty').value);
    const payload = {label:budget.label,filiere:budget.filiere,periode:budget.periode,output_qty:budget.output_qty,price_expected:budget.price_expected,transport:budget.transport,target_margin:budget.target_margin,autres:budget.autres,overhead_pct:budget.overhead_pct,actual_harvest:newHarvest};
    const r=await fetch(`/api/activities/${budgetId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok){alert('Erreur');return;}
    await loadBudgets();
    await showCostSummary(budgetId);
  };
  
  root.querySelector('#btnUpdateMargin').onclick=async()=>{
    const newMargin = Number(document.getElementById('marginPct').value);
    const payload = {label:budget.label,filiere:budget.filiere,periode:budget.periode,output_qty:budget.output_qty,price_expected:budget.price_expected,transport:budget.transport,target_margin:newMargin,autres:budget.autres,overhead_pct:budget.overhead_pct,actual_harvest:budget.actual_harvest};
    const r=await fetch(`/api/activities/${budgetId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok){alert('Erreur');return;}
    await loadBudgets();
    await showCostSummary(budgetId);
  };
}
async function refreshCostBudgets(){
  const sel=document.getElementById('costBudget');
  if(!sel)return;
  sel.innerHTML='<option value="">Sélectionner un budget...</option>'+BUDGETS.map(b=>`<option value="${b.id}">${b.label}</option>`).join('');
  sel.onchange=async()=>{
    await showCostSummary(sel.value);
    renderCosts();
  };
}
document.getElementById('costAdd')?.addEventListener('click',async()=>{
  if(!ME)return alert("Connecte-toi d'abord.");
  const budgetId=document.getElementById('costBudget').value;
  if(!budgetId)return alert("Sélectionnez un budget d'abord.");
  const payload={kind:'expense',occurred_on:document.getElementById('costDate').value||new Date().toISOString().slice(0,10),amount:Number(document.getElementById('costAmount').value||0),category:document.getElementById('costCat').value,activity_id:budgetId,note:document.getElementById('costNote').value};
  const r=await fetch('/api/budget',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok)return alert('Erreur');
  document.getElementById('costAmount').value='';document.getElementById('costNote').value='';
  await loadCosts();await loadBudgets();
});

async function boot(){ const me = await fetch('/api/auth/me'); ME = await me.json(); meEl.textContent = ME? `Connecté: ${ME.email}`:''; btnLogin.style.display = ME? 'none':'inline-block'; btnLogout.style.display = ME? 'inline-block':'none'; const btnSub=document.getElementById('btnSubscription'); if(btnSub) btnSub.style.display = ME? 'inline-block':'none'; await loadRefs(); await loadActors(); await loadLogistics(); await loadBudgets(); await loadCosts(); if(window._booted) return; window._booted=true; }
await boot();
