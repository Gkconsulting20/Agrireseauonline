const tabs=document.querySelectorAll('.tabs button'), sections=document.querySelectorAll('.tab');
tabs.forEach(b=> b.addEventListener('click',()=>{ tabs.forEach(x=>x.classList.remove('active')); sections.forEach(s=>s.classList.remove('active')); b.classList.add('active'); document.getElementById(b.dataset.tab).classList.add('active'); if(b.dataset.tab==='map') renderMap(); if(b.dataset.tab==='budget') refreshBudgetActs(); }));

const btnLogin=document.getElementById('btnLogin'), btnLogout=document.getElementById('btnLogout'), meEl=document.getElementById('me');

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

let REFS={regions:[],products:[]}, ACTORS=[], LOGS=[], ME=null, USER_LOCATION=null;

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
  <div class="links">${a.whatsapp? `<a target="_blank" href="https://wa.me/${digits(a.whatsapp)}?text=Bonjour, je suis intéressé par vos produits">WhatsApp</a>`:''}${a.email? `<a href="mailto:${a.email}">Email</a>`:''}${a.phone? `<a href="tel:${digits(a.phone)}">Appeler</a>`:''}
  ${ME? `<a href="#" data-id="${a.id}" class="rate">Noter</a> <a href="#" data-id="${a.id}" class="edit">Modifier</a> <a href="#" data-id="${a.id}" class="del">Supprimer</a>`:`<a href="#" data-id="${a.id}" class="rate">Noter</a>`}</div>`;
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

let ACTS=[], ACT_ITEMS=[], CURRENT_ACT=null;
document.getElementById('btnAddAct').onclick=()=> openActDialog();
async function loadActs(){ const r=await fetch('/api/activities'); if(r.status===401){ ACTS=[]; renderActs(); return; } ACTS=await r.json(); renderActs(); refreshBudgetActs(); }
function renderActs(){ const list=document.getElementById('actList'); list.innerHTML=''; ACTS.forEach(a=>{ const el=document.createElement('div'); el.className='card'; el.innerHTML=`<div><strong>${a.label}</strong> <span class="badge">${a.filiere}</span> <span class="badge">${a.periode}</span> <span class="right"><a href="#" data-id="${a.id}" class="open">Ouvrir</a> · <a href="#" data-id="${a.id}" class="del">Supprimer</a></span></div>
  <div class="muted">Sortie prévue: ${a.output_qty||0} unités · PV envisagé: ${a.price_expected||0} FCFA · Marge cible: ${a.target_margin||0}%</div>`;
  list.appendChild(el);
  el.querySelector('.open').onclick=(e)=>{ e.preventDefault(); openAct(a); };
  el.querySelector('.del').onclick=async(e)=>{ e.preventDefault(); if(!confirm('Supprimer ?')) return; await fetch('/api/activities/'+a.id,{method:'DELETE'}); await loadActs(); document.getElementById('actEditor').innerHTML='<p class="muted">Sélectionne une activité…</p>'; };
}); }
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
async function openAct(a){ CURRENT_ACT=a; const r=await fetch(`/api/activities/${a.id}/items`); ACT_ITEMS = await r.json(); const sumR=await fetch(`/api/activities/${a.id}/summary`); const S=await sumR.json();
  const root=document.getElementById('actEditor'); const tableRows = ACT_ITEMS.map(it=>`<tr><td><select data-k="kind"><option value="input" ${it.kind==='input'?'selected':''}>Intrant</option><option value="labor" ${it.kind==='labor'?'selected':''}>Main d'œuvre</option></select></td><td><input data-k="label" value="${it.label||''}"></td><td><input type="number" step="0.01" data-k="qty" value="${it.qty||0}"></td><td><input data-k="unit" value="${it.unit||''}"></td><td><input type="number" step="0.01" data-k="unit_price" value="${it.unit_price||0}"></td><td class="sum">${((it.qty||0)*(it.unit_price||0)).toFixed(2)}</td><td><button class="save" data-id="${it.id}">💾</button> <button class="rm" data-id="${it.id}">🗑</button></td></tr>`).join('');
  root.innerHTML=`<h4>Éditer: ${a.label} <span class="badge">${a.filiere}</span></h4>
  <table class="tbl"><thead><tr><th>Type</th><th>Libellé</th><th>Qté</th><th>Unité</th><th>Prix unitaire</th><th>Total</th><th></th></tr></thead><tbody>${tableRows}</tbody></table>
  <div class="dialog-actions"><button id="addItem">+ Ajouter ligne</button> <button id="recalc">Recalculer</button></div>
  <div class="card"><p>Total intrants: <strong>${Math.round(S.intrants)}</strong> FCFA · Total MO: <strong>${Math.round(S.mo)}</strong> FCFA · Transport & autres: <strong>${Math.round((a.transport||0)+(a.autres||0))}</strong> FCFA · Frais généraux: <strong>${Math.round(S.overhead)}</strong> FCFA</p>
  <p><strong>Coût total</strong>: <strong>${Math.round(S.total)}</strong> FCFA · <strong>Unitaire</strong>: <strong>${S.unit.toFixed(2)}</strong> FCFA</p>
  <p>PV envisagé: <strong>${S.pv.toFixed(2)}</strong> FCFA · Marge: <strong>${S.marge.toFixed(1)}%</strong> · PV pour marge cible: <strong>${S.pvCible.toFixed(2)}</strong> FCFA · Seuil de rentabilité: <strong>${S.seuil}</strong> unités</p></div>`;
  root.querySelectorAll('button.save').forEach(btn=> btn.onclick=async()=>{
    const tr=btn.closest('tr'); const payload={}; tr.querySelectorAll('input,select').forEach(inp=> payload[inp.dataset.k]= inp.type==='number'? Number(inp.value||0): inp.value);
    const r=await fetch('/api/items/'+btn.dataset.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) return alert('Erreur'); openAct(a);
  });
  root.querySelectorAll('button.rm').forEach(btn=> btn.onclick=async()=>{ if(!confirm('Supprimer cette ligne ?')) return; await fetch('/api/items/'+btn.dataset.id,{method:'DELETE'}); openAct(a); });
  root.querySelector('#addItem').onclick=async()=>{ await fetch('/api/activities/'+a.id+'/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'input',label:'',qty:0,unit:'',unit_price:0})}); openAct(a); };
  root.querySelector('#recalc').onclick=()=> openAct(a);
}

let BUDGET={rows:[], totals:{income:0,expense:0,balance:0}};
async function loadBudget(){ const r=await fetch('/api/budget'); if(r.status===401){ BUDGET={rows:[], totals:{income:0,expense:0,balance:0}}; renderBudget(); return; } BUDGET=await r.json(); renderBudget(); }
function renderBudget(){ const list=document.getElementById('bList'); const sum=document.getElementById('bSum'); list.innerHTML=''; BUDGET.rows.forEach(x=>{ const el=document.createElement('div'); el.className='card'; el.innerHTML=`<div><strong>${x.kind==='income'?'Recette':'Dépense'}</strong> · ${x.category||'-'} · ${Number(x.amount).toFixed(0)} FCFA <span class="muted right">${x.occurred_on}</span></div><div class="muted">${x.note||''}</div>`; list.appendChild(el); }); sum.innerHTML=`<p>Recettes: <strong>${Math.round(BUDGET.totals.income)}</strong> FCFA</p><p>Dépenses: <strong>${Math.round(BUDGET.totals.expense)}</strong> FCFA</p><p><strong>Solde</strong>: <strong>${Math.round(BUDGET.totals.balance)}</strong> FCFA</p>`; }
async function refreshBudgetActs(){ const sel=document.getElementById('bAct'); sel.innerHTML='<option value="">(sans activité)</option>'+ACTS.map(a=>`<option value="${a.id}">${a.label}</option>`).join(''); }
document.getElementById('bAdd').onclick=async()=>{ if(!ME) return alert('Connecte-toi d’abord.'); const payload={ kind:document.getElementById('bKind').value, occurred_on:document.getElementById('bDate').value || new Date().toISOString().slice(0,10), amount:Number(document.getElementById('bAmount').value||0), category:document.getElementById('bCat').value, activity_id: document.getElementById('bAct').value || null, note: document.getElementById('bNote').value }; const r=await fetch('/api/budget',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) return alert('Erreur'); await loadBudget(); };

async function showSubscriptionInfo(){
  if(!ME) return alert('Connectez-vous d\'abord');
  const r = await fetch('/api/subscription');
  const data = await r.json();
  const dlg = document.createElement('dialog');
  const isPremium = data.subscription.plan === 'premium';
  const planBadge = isPremium ? '<span style="background:#fbbf24;color:#000;padding:4px 12px;border-radius:4px;font-weight:bold">💎 PREMIUM</span>' : '<span style="background:#e5e7eb;color:#374151;padding:4px 12px;border-radius:4px">🆓 GRATUIT</span>';
  
  dlg.innerHTML=`<div class="dialog-body" style="min-width:400px"><h3>Mon Abonnement</h3>
    <div style="margin:20px 0">
      <p style="font-size:18px;margin-bottom:10px">Plan actuel: ${planBadge}</p>
      <p>Acteurs créés: <strong>${data.actorCount} / ${data.limit}</strong></p>
    </div>
    ${isPremium ? `
      <div style="background:#f0fdf4;padding:15px;border-radius:8px;margin:15px 0">
        <p><strong>✅ Fonctionnalités Premium actives :</strong></p>
        <ul style="margin:10px 0;padding-left:20px">
          <li>Acteurs illimités</li>
          <li>Badge Premium visible</li>
          <li>Support prioritaire</li>
        </ul>
      </div>
    ` : `
      <div style="background:#fef3c7;padding:15px;border-radius:8px;margin:15px 0">
        <p><strong>💎 Passez à Premium pour :</strong></p>
        <ul style="margin:10px 0;padding-left:20px">
          <li>Acteurs illimités (vs 2 max)</li>
          <li>Badge Premium sur vos fiches</li>
          <li>Tableau de bord analytique</li>
          <li>Messagerie interne</li>
          <li>Alertes SMS/Email</li>
          <li>Et bien plus...</li>
        </ul>
        <p style="margin-top:15px"><strong>Prix: 5 000 FCFA/mois</strong></p>
        <p style="color:#6b7280;font-size:14px;margin-top:10px">🚧 Les paiements T-Money et Flooz seront bientôt disponibles</p>
      </div>
    `}
    <div class="dialog-actions">
      <button type="button" id="closeSubDialog">Fermer</button>
    </div>
  </div>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.querySelector('#closeSubDialog').onclick = () => dlg.close();
}

async function boot(){ const me = await fetch('/api/auth/me'); ME = await me.json(); meEl.textContent = ME? `Connecté: ${ME.email}`:''; btnLogin.style.display = ME? 'none':'inline-block'; btnLogout.style.display = ME? 'inline-block':'none'; const btnSub=document.getElementById('btnSubscription'); if(btnSub) btnSub.style.display = ME? 'inline-block':'none'; await loadRefs(); await loadActors(); await loadLogistics(); await loadActs(); await loadBudget(); if(window._booted) return; window._booted=true; }
await boot();
