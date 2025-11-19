const tabs=document.querySelectorAll('.tabs button'), sections=document.querySelectorAll('.tab');
tabs.forEach(b=> b.addEventListener('click',()=>{ 
  tabs.forEach(x=>x.classList.remove('active')); 
  sections.forEach(s=>s.classList.remove('active')); 
  b.classList.add('active'); 
  document.getElementById(b.dataset.tab).classList.add('active'); 
  if(b.dataset.tab==='map') renderMap(); 
  if(b.dataset.tab==='budget'){ loadBudgets(); refreshCostBudgets(); }
  if(b.dataset.tab==='costing'){ loadCosts(); refreshCostBudgets(); }
  if(b.dataset.tab==='admin'){ loadAdminUsers(); loadAdminLogistics(); loadAdminCommercials(); }
  if(b.dataset.tab==='commercial'){ loadCommercialStats(); }
  if(b.dataset.tab==='settings'){ loadUserSettings(); loadPaymentHistory(); }
  if(b.dataset.tab==='stats'){ loadStats(); loadNotifications(); }
}));

const btnLogin=document.getElementById('btnLogin'), btnLogout=document.getElementById('btnLogout'), meEl=document.getElementById('me');

// Variables globales
let ME=null, ACTORS=[], LOGISTICS=[], PRODUCTS=[], REGIONS=[], BUDGETS=[], CURRENT_BUDGET=null, COSTS=[], CURRENT_COST_BUDGET=null, ADMIN_USERS=[], ADMIN_LOGISTICS=[], STATS_DATA={};

async function openLogin(){
  const dlg=document.createElement('dialog');
  dlg.innerHTML=`<form id="frmLogin" class="dialog-body"><h3>Connexion / Inscription</h3>
  <p class="muted" style="margin-bottom:15px;">Pour vous connecter : Email + Mot de passe<br>Pour créer un compte : Remplissez tous les champs (email OU téléphone requis)</p>
  <div class="grid2">
    <label>Email <input name="email" type="email" placeholder="exemple@email.com"></label>
    <label>Mot de passe <input name="password" type="password" required></label>
    <label>Nom complet <input name="name" placeholder="(pour inscription)"></label>
    <label>Téléphone <input name="phone" type="tel" placeholder="+228 XX XX XX XX"></label>
    <label>WhatsApp <input name="whatsapp" type="tel" placeholder="+228 XX XX XX XX"></label>
    <label>Région <input name="region" placeholder="ex: Plateaux"></label>
    <label>Rôle <select name="role"><option></option>${['producteur','éleveur','transporteur','transformateur','grossiste','detaillant','institution'].map(r=>`<option>${r}</option>`).join('')}</select></label>
    <label>Code commercial <input name="commercial_code" placeholder="Ex: COM-JOHN-1234 (optionnel)"></label>
    <label>Latitude <input name="lat" type="number" step="0.0001" placeholder="Ex: 6.1375"></label>
    <label>Longitude <input name="lng" type="number" step="0.0001" placeholder="Ex: 1.2123"></label>
  </div>
  <div style="margin:10px 0;"><button type="button" id="btnUseLocationReg" style="width:100%;">📍 Utiliser ma position actuelle</button></div>
  <div style="text-align:center;margin:10px 0;"><a href="#" id="forgotPasswordLink" style="color:#0a7c2f;font-size:14px;">🔑 Mot de passe oublié ?</a></div>
  <div class="dialog-actions"><button type="button" id="btnDoLogin">Se connecter</button><button type="button" id="btnDoRegister">Créer un compte</button><button type="button" id="cancelL">Annuler</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal(); 
  dlg.querySelector('#cancelL').onclick=()=> dlg.close();
  
  // Géolocalisation pour inscription
  dlg.querySelector('#btnUseLocationReg').onclick=async()=>{
    const btn = dlg.querySelector('#btnUseLocationReg');
    btn.disabled = true;
    btn.textContent = '⏳ Récupération...';
    try {
      const loc = await getUserLocation();
      dlg.querySelector('[name="lat"]').value = loc.lat.toFixed(4);
      dlg.querySelector('[name="lng"]').value = loc.lng.toFixed(4);
      btn.textContent = '✓ Position obtenue';
      setTimeout(() => { btn.disabled = false; btn.textContent = '📍 Utiliser ma position actuelle'; }, 2000);
    } catch(err) {
      alert(err.message);
      btn.disabled = false;
      btn.textContent = '📍 Utiliser ma position actuelle';
    }
  };
  
  dlg.querySelector('#btnDoLogin').onclick=async()=>{
    const form = dlg.querySelector('#frmLogin');
    const email = form.querySelector('[name="email"]').value;
    const phone = form.querySelector('[name="phone"]').value;
    const password = form.querySelector('[name="password"]').value;
    if((!email && !phone) || !password) return alert('Email OU Téléphone + Mot de passe requis');
    const r = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email: email||null, phone: phone||null, password}),credentials:'include'});
    if(r.ok){ dlg.close(); await boot(); } else { alert('Identifiants incorrects'); }
  };
  
  dlg.querySelector('#btnDoRegister').onclick=async()=>{
    const form = dlg.querySelector('#frmLogin');
    const data = Object.fromEntries(new FormData(form).entries());
    if(!data.password) return alert('Mot de passe requis');
    if(!data.email && !data.phone) return alert('Email OU Téléphone requis');
    if(!data.name) return alert('Nom requis');
    // Convertir lat/lng en nombres
    if(data.lat) data.lat = Number(data.lat);
    if(data.lng) data.lng = Number(data.lng);
    const r = await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'include'});
    if(r.ok){ dlg.close(); await boot(); } else { const err = await r.json(); alert(err.error || 'Erreur lors de l\'inscription'); }
  };
  
  dlg.querySelector('#forgotPasswordLink').onclick=(e)=>{
    e.preventDefault();
    dlg.close();
    showForgotPasswordDialog();
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

const btnSeed = document.getElementById('btnSeed');
if(btnSeed) btnSeed.onclick=async()=>{ if(!confirm('Réinitialiser et charger des données de démo ?')) return; const r=await fetch('/api/seed',{method:'POST'}); if(r.ok){ await loadActors(); await loadLogistics(); renderMap(); renderStockSummary(); } };

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

const aRole=document.getElementById('aRole'), aRegion=document.getElementById('aRegion'), aCategory=document.getElementById('aCategory'), aQ=document.getElementById('aQ');
[aRole,aRegion,aCategory,aQ].forEach(el=> { if(el) el.addEventListener('input', renderActors); });
const btnAddActor = document.getElementById('btnAddActor');
if(btnAddActor) btnAddActor.onclick=()=> openActorDialog();
async function loadRefs(){ 
  const r=await fetch('/api/refs'); 
  REFS=await r.json(); 
  const aRegionEl = document.getElementById('aRegion');
  if(aRegionEl) aRegionEl.innerHTML='<option value=\"\">Toutes régions</option>'+REFS.regions.map(r=>`<option>${r}</option>`).join('');
  const aCategoryEl = document.getElementById('aCategory');
  if(aCategoryEl && REFS.productCategories) {
    aCategoryEl.innerHTML='<option value=\"\">Toutes catégories</option>'+REFS.productCategories.map(c=>`<option>${c}</option>`).join('');
  }
}
async function loadActors(){ const r=await fetch('/api/actors'); ACTORS=await r.json(); renderActors(); renderStockSummary(); }
function renderActors(){ 
  const list=document.getElementById('actorList'); 
  if(!list) return;
  list.innerHTML=''; 
  const role=aRole?.value?.toLowerCase() || '', reg=aRegion?.value?.toLowerCase() || '', cat=aCategory?.value || '', q=aQ?.value?.toLowerCase() || '';
  ACTORS.filter(a=>{ 
    const okRole=role? (a.role||'').toLowerCase()===role:true; 
    const okReg=reg? (a.region||'').toLowerCase()===reg:true; 
    const okCat=cat? (a.products||[]).some(p=> {
      const productName = typeof p === 'string' ? p : p.name;
      const product = REFS.products?.find(prod=> prod.name === productName);
      return product?.category === cat;
    }):true;
    const productNames = (a.products||[]).map(p => typeof p === 'string' ? p : p.name).join(';');
    const txt=(a.name+' '+productNames+' '+(a.need||'')+' '+(a.localite||'')).toLowerCase(); 
    const okQ=q? txt.includes(q):true; 
    return okRole&&okReg&&okCat&&okQ; 
  })
  .forEach(a=> list.appendChild(actorCard(a))); 
}
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
  
  // Afficher les produits avec images si disponibles
  const productsHtml = (a.products||[]).map(p => {
    const productName = typeof p === 'string' ? p : p.name;
    const productImage = (typeof p === 'object' && p.image_url) ? p.image_url : '';
    const productSite = (typeof p === 'object' && p.production_site) ? p.production_site : '';
    
    if(productImage){
      return `<div style="display:inline-block;margin:5px;text-align:center;">
        <img src="${productImage}" alt="${productName}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;display:block;">
        <div style="font-size:0.85em;margin-top:3px;"><strong>${productName}</strong></div>
        ${productSite ? `<div style="font-size:0.75em;color:#6b7280;">📍 ${productSite}</div>` : ''}
      </div>`;
    } else {
      return `<span style="margin-right:5px;"><strong>${productName}</strong>${productSite ? ` <span style="font-size:0.85em;color:#6b7280;">(${productSite})</span>` : ''}</span>`;
    }
  }).join('');
  
  el.innerHTML=`${photoHtml}<div class="name"><strong>${a.name}</strong> ${a.verified?'<span class="badge">✔︎ vérifié</span>':''} ${premiumBadge} ${ratingText}${distanceText}</div>
  <div><span class="badge">${a.role}</span> <span class="badge">${a.region}</span> ${a.localite? '· '+a.localite:''} ${certBadges}</div>
  <div style="margin-top:8px;">${productsHtml}</div>
  <div>${a.need||''}</div>
  <div id="harvests-${a.id}" style="margin-top:8px;font-size:0.9em;color:#059669;"></div>
  <div id="upcoming-${a.id}" style="margin-top:8px;font-size:0.9em;color:#0369a1;"></div>
  <div class="links">${a.whatsapp? `<a target="_blank" href="https://wa.me/${digits(a.whatsapp)}?text=Bonjour, je suis intéressé par vos produits">WhatsApp</a>`:''}${a.email? `<a href="mailto:${a.email}">Email</a>`:''}${a.phone? `<a href="tel:${digits(a.phone)}">Appeler</a>`:''}
  ${ME? `<a href="#" data-id="${a.id}" class="rate">Noter</a> <a href="#" data-id="${a.id}" class="edit">Modifier</a> <a href="#" data-id="${a.id}" class="del">Supprimer</a>`:`<a href="#" data-id="${a.id}" class="rate">Noter</a>`}</div>`;
  
  // Load and display harvests (real quantities available)
  fetch('/api/actors/'+a.id+'/harvests')
    .then(r=>{
      if(!r.ok) return [];
      return r.json();
    })
    .then(harvests=>{
      const harvestDiv = el.querySelector('#harvests-'+a.id);
      if(harvests && harvests.length > 0){
        const harvestText = harvests.map(h=>`${h.product}: ${h.quantity} ${h.unit||'kg'}`).join(', ');
        harvestDiv.innerHTML = `<strong>📦 Disponible:</strong> ${harvestText}`;
      }
    })
    .catch(()=>{});
  
  // Load and display upcoming harvests (estimated availability)
  fetch('/api/actors/'+a.id+'/upcoming')
    .then(r=>{
      if(!r.ok) return [];
      return r.json();
    })
    .then(upcoming=>{
      const upcomingDiv = el.querySelector('#upcoming-'+a.id);
      if(upcoming && upcoming.length > 0){
        const upcomingText = upcoming.map(u=>{
          const date = new Date(u.estimatedAvailability);
          const dateStr = date.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'});
          const isReady = u.isAvailable;
          return isReady ? 
            `<strong>${u.product}: Bientôt disponible (${u.estimatedQuantity} ${u.unit||'kg'})</strong>` :
            `${u.product}: Dispo. estimée ${dateStr} (${u.estimatedQuantity} ${u.unit||'kg'})`;
        }).join(', ');
        upcomingDiv.innerHTML = `<strong>📅 En production:</strong> ${upcomingText}`;
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
function openActorDialog(a){ 
  if(!ME) return alert('Connecte-toi d\'abord.'); 
  
  // Normaliser les produits : string → object
  const normalizeProducts = (products) => {
    if(!products || products.length === 0) return [];
    return products.map(p => {
      if(typeof p === 'string') return {name: p, production_site: '', image_url: ''};
      return p;
    });
  };
  
  const actorProducts = normalizeProducts(a?.products||[]);
  
  const dlg=document.createElement('dialog'); 
  dlg.innerHTML=`<form id="frmActor" class="dialog-body" style="max-width:800px;"><h3>${a?'Modifier':'Nouvel'} acteur</h3>
  <div class="grid2">
    <label>Nom <input name="name" required value="${a?.name||''}"></label>
    <label>Rôle <select name="role" required>${['producteur','éleveur','transporteur','transformateur','grossiste','detaillant','institution'].map(r=>`<option ${a?.role===r?'selected':''}>${r}</option>`).join('')}</select></label>
    <label>Région <select name="region" required>${(REFS.regions||[]).map(r=>`<option ${a?.region===r?'selected':''}>${r}</option>`).join('')}</select></label>
    <label>Localité <input name="localite" value="${a?.localite||''}"></label>
    
    <label style="grid-column:1/-1;margin-top:15px;">
      <strong>📦 Produits</strong>
      <div id="productsList" style="margin-top:10px;"></div>
      <button type="button" id="btnAddProduct" style="margin-top:10px;padding:8px 12px;background:#059669;color:white;border:none;border-radius:4px;cursor:pointer;">+ Ajouter un produit</button>
    </label>
    
    <label>Besoin <input name="need" value="${a?.need||''}"></label>
    <label>Volume <input name="volume" type="number" min="0" value="${a?.volume||''}" placeholder="Quantité disponible"></label>
    <label>Unité de mesure <select name="unit">
      <option value="kg" ${a?.unit==='kg'?'selected':''}>kg (kilogramme)</option>
      <option value="tonne" ${a?.unit==='tonne'?'selected':''}>tonne</option>
      <option value="sac" ${a?.unit==='sac'?'selected':''}>sac</option>
      <option value="unité" ${a?.unit==='unité'?'selected':''}>unité</option>
      <option value="plateau" ${a?.unit==='plateau'?'selected':''}>plateau</option>
      <option value="litre" ${a?.unit==='litre'?'selected':''}>litre</option>
      <option value="tête" ${a?.unit==='tête'?'selected':''}>tête (bétail)</option>
      <option value="boîte" ${a?.unit==='boîte'?'selected':''}>boîte</option>
      <option value="bouteille" ${a?.unit==='bouteille'?'selected':''}>bouteille</option>
      <option value="paquet" ${a?.unit==='paquet'?'selected':''}>paquet</option>
    </select></label>
    <label>Prix unitaire (FCFA) - Optionnel <input name="price" type="number" min="0" step="1" value="${a?.price||''}" placeholder="Laissez vide si pas encore fixé"></label>
    <label style="grid-column:1/-1;">Photo de l'acteur (URL) - Optionnel
      <input name="photo_url" type="url" placeholder="https://exemple.com/ma-photo.jpg" value="${a?.photo_url||''}">
      <small style="color:#6b7280;display:block;margin-top:4px;">💡 Hébergez votre photo sur imgur.com, imgbb.com ou Google Photos puis collez le lien ici</small>
    </label>
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
    <label>Vérifié ? <select name="verified"><option value="false" ${!a?.verified?'selected':''}>Non</option><option value="true" ${a?.verified?'selected':''}>Oui</option></select></label>
  </div>
  <div class="dialog-actions"><button type="button" id="btnUseLocation">📍 Utiliser ma position</button><button type="submit">Enregistrer</button><button type="button" id="cancelActor">Annuler</button></div></form>`;
  document.body.appendChild(dlg); 
  dlg.showModal(); 
  dlg.querySelector('#cancelActor').onclick=()=> dlg.close();
  
  // Gestion des produits dynamiques
  const productsList = dlg.querySelector('#productsList');
  let products = [...actorProducts];
  
  const renderProducts = () => {
    productsList.innerHTML = products.map((p, idx) => `
      <div class="card" style="padding:12px;margin-bottom:10px;background:#f9fafb;">
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:start;">
          <label style="margin:0;">
            Nom du produit *
            <input type="text" class="product-name" data-idx="${idx}" value="${p.name}" required placeholder="Ex: Maïs" style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:4px;">
          </label>
          <label style="margin:0;">
            Site de production
            <input type="text" class="product-site" data-idx="${idx}" value="${p.production_site||''}" placeholder="Ex: Sokodé, Centrale" style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:4px;">
          </label>
          <button type="button" class="btn-remove-product" data-idx="${idx}" style="margin-top:20px;padding:6px 12px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;">🗑️</button>
        </div>
        <label style="margin:10px 0 0 0;display:block;">
          Image du produit (URL)
          <input type="url" class="product-image" data-idx="${idx}" value="${p.image_url||''}" placeholder="https://..." style="width:100%;padding:6px;border:1px solid #d1d5db;border-radius:4px;">
        </label>
      </div>
    `).join('');
    
    // Événements pour mise à jour
    productsList.querySelectorAll('.product-name').forEach(input => {
      input.oninput = (e) => {
        const idx = Number(e.target.dataset.idx);
        products[idx].name = e.target.value;
      };
    });
    productsList.querySelectorAll('.product-site').forEach(input => {
      input.oninput = (e) => {
        const idx = Number(e.target.dataset.idx);
        products[idx].production_site = e.target.value;
      };
    });
    productsList.querySelectorAll('.product-image').forEach(input => {
      input.oninput = (e) => {
        const idx = Number(e.target.dataset.idx);
        products[idx].image_url = e.target.value;
      };
    });
    productsList.querySelectorAll('.btn-remove-product').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        products.splice(idx, 1);
        renderProducts();
      };
    });
  };
  
  dlg.querySelector('#btnAddProduct').onclick = () => {
    products.push({name: '', production_site: '', image_url: ''});
    renderProducts();
  };
  
  renderProducts();
  
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
  
  dlg.querySelector('#frmActor').onsubmit=async(e)=>{ 
    e.preventDefault(); 
    const data=Object.fromEntries(new FormData(e.target).entries());
    const certifications = [];
    if(data.cert_bio) certifications.push('bio');
    if(data.cert_quality) certifications.push('quality');
    if(data.cert_fair) certifications.push('fair');
    
    // Filtrer les produits vides
    const validProducts = products.filter(p => p.name && p.name.trim());
    
    const payload={
      name:data.name.trim(), 
      role:data.role, 
      region:data.region, 
      localite:(data.localite||'').trim(), 
      products: validProducts,
      need:(data.need||'').trim(), 
      volume:data.volume?Number(data.volume):null, 
      price:data.price?Number(data.price):null, 
      photo_url:(data.photo_url||'').trim(), 
      certifications, 
      lat:data.lat?Number(data.lat):null, 
      lng:data.lng?Number(data.lng):null, 
      phone:(data.phone||'').trim(), 
      whatsapp:(data.whatsapp||'').trim(), 
      email:(data.email||'').trim(), 
      verified:data.verified==='true'
    };
    
    let r;
    if(a&&a.id) r = await fetch('/api/actors/'+a.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    else r = await fetch('/api/actors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(r.status===403){ const err=await r.json(); alert(err.message||'Limite atteinte'); dlg.close(); return; }
    dlg.close(); 
    await loadActors(); 
    await loadMyActors();
    renderMap(); 
  }; 
}

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
  
  // Aggregate products by name with category
  const productMap = new Map();
  
  ACTORS.forEach(actor => {
    const products = actor.products || [];
    const volume = Number(actor.volume) || 0;
    
    products.forEach(product => {
      // Normaliser le produit : peut être un string ou un objet {name, production_site, image_url}
      const productName = typeof product === 'string' ? product.trim() : (product?.name || '').trim();
      if(!productName) return;
      
      const productInfo = REFS.products?.find(p => p.name === productName);
      const category = productInfo?.category || 'Agriculture';
      
      if(!productMap.has(productName)){
        productMap.set(productName, {volume: 0, category: category});
      }
      
      const data = productMap.get(productName);
      data.volume += (volume / products.length);
    });
  });
  
  // Group by category
  const categoryMap = new Map();
  productMap.forEach((data, name) => {
    if(data.volume === 0) return;
    if(!categoryMap.has(data.category)){
      categoryMap.set(data.category, []);
    }
    categoryMap.get(data.category).push({name, volume: data.volume});
  });
  
  if(categoryMap.size === 0){
    summaryEl.innerHTML = '<p class="muted">Aucun stock disponible pour le moment</p>';
    return;
  }
  
  // Render by category
  const categoryOrder = ['Agriculture', 'Bovins', 'Ovins', 'Caprins', 'Volaille', 'Porcins', 'Aquaculture'];
  let html = '';
  categoryOrder.forEach(cat => {
    const products = categoryMap.get(cat);
    if(!products || products.length === 0) return;
    
    const categoryEmoji = {
      'Agriculture': '🌾',
      'Bovins': '🐄',
      'Ovins': '🐑',
      'Caprins': '🐐',
      'Volaille': '🐔',
      'Porcins': '🐷',
      'Aquaculture': '🐟'
    };
    
    products.sort((a,b) => b.volume - a.volume);
    const productList = products.map(p => `<strong>${p.name}</strong> ${p.volume.toFixed(0)} kg`).join(', ');
    html += `<div style="margin-bottom:10px;"><strong style="color:#059669;">${categoryEmoji[cat] || '📦'} ${cat}:</strong> ${productList}</div>`;
  });
  
  summaryEl.innerHTML = html;
}

const btnAddLog = document.getElementById('btnAddLog');
if(btnAddLog) btnAddLog.onclick=()=> openLogDialog();
async function loadLogistics(){ const r=await fetch('/api/logistics'); LOGS=await r.json(); renderLogistics(); }
function renderLogistics(){ const list=document.getElementById('logList'); list.innerHTML=''; LOGS.forEach(l=>{ const el=document.createElement('div'); el.className='card'; const digits=s=>(s||'').replace(/\D/g,'');
  const isMine = ME && l.owner_id === ME.id;
  el.innerHTML=`<div><strong>${l.title}</strong> <span class="badge">${l.type==='need'?'BESOIN':'OFFRE'}</span> <span class="badge">${l.region}</span></div>
  <div>${l.details||''}</div><div class="links">${l.whatsapp? `<a target="_blank" href="https://wa.me/${digits(l.whatsapp)}">WhatsApp</a>`:''}${l.contact? `<a href="tel:${digits(l.contact)}">Appeler</a>`:''}${isMine? ` <a href="#" data-id="${l.id}" class="edit">✏️ Modifier</a> <a href="#" data-id="${l.id}" class="del">🗑️ Supprimer</a>`:''}</div>`;
  if(isMine){
    el.querySelector('.edit').onclick=async(e)=>{e.preventDefault(); openLogDialog(l); };
    el.querySelector('.del').onclick=async(e)=>{e.preventDefault(); if(!confirm('Supprimer cette publication ?')) return; await fetch('/api/logistics/'+l.id,{method:'DELETE'}); await loadLogistics(); await loadMyLogistics(); }; 
  }
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
    dlg.close(); await loadLogistics(); await loadMyLogistics(); }; }

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

const btnAddBudget = document.getElementById('btnAddBudget');
if(btnAddBudget) btnAddBudget.onclick=()=> openBudgetDialog();
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
  if(!list) return;
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
      const editorEl = document.getElementById('budgetEditor');
      if(editorEl) editorEl.innerHTML='<p class="muted">Sélectionnez un budget…</p>'; 
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
function renderBudget(){ 
  const list=document.getElementById('bList'); 
  const sum=document.getElementById('bSum'); 
  if(!list || !sum) return; 
  list.innerHTML=''; 
  BUDGET.rows.forEach(x=>{ 
    const el=document.createElement('div'); 
    el.className='card'; 
    el.innerHTML=`<div><strong>${x.kind==='income'?'Recette':'Dépense'}</strong> · ${x.category||'-'} · ${Number(x.amount).toFixed(0)} FCFA <span class="muted right">${x.occurred_on}</span></div><div class="muted">${x.note||''}</div>`; 
    list.appendChild(el); 
  }); 
  sum.innerHTML=`<p>Recettes: <strong>${Math.round(BUDGET.totals.income)}</strong> FCFA</p><p>Dépenses: <strong>${Math.round(BUDGET.totals.expense)}</strong> FCFA</p><p><strong>Solde</strong>: <strong>${Math.round(BUDGET.totals.balance)}</strong> FCFA</p>`; 
}
async function refreshBudgetActs(){ 
  const sel=document.getElementById('bAct'); 
  if(!sel) return; 
  sel.innerHTML='<option value="">(sans activité)</option>'+ACTS.map(a=>`<option value="${a.id}">${a.label}</option>`).join(''); 
}
const bAdd = document.getElementById('bAdd');
if(bAdd) bAdd.onclick=async()=>{ if(!ME) return alert('Connecte-toi d’abord.'); const payload={ kind:document.getElementById('bKind').value, occurred_on:document.getElementById('bDate').value || new Date().toISOString().slice(0,10), amount:Number(document.getElementById('bAmount').value||0), category:document.getElementById('bCat').value, activity_id: document.getElementById('bAct').value || null, note: document.getElementById('bNote').value }; const r=await fetch('/api/budget',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) return alert('Erreur'); await loadBudget(); };

window.showPaymentDialog = async function(){
  if(!ME) return alert('Connectez-vous d\'abord');
  
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <form id="frmPayment" class="dialog-body">
      <h3 style="color:#fbbf24;">💎 Passer à Premium</h3>
      
      <div style="background:linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);padding:20px;border-radius:12px;margin-bottom:20px;color:#000;">
        <p style="font-size:24px;font-weight:bold;margin:0 0 10px 0;text-align:center;">1 000 FCFA / mois</p>
      </div>
      
      <div style="background:#f0fdf4;padding:15px;border-radius:8px;margin-bottom:20px;border:2px solid #10b981;">
        <p style="font-weight:bold;margin:0 0 10px 0;color:#059669;">✨ Bénéfices Premium :</p>
        <ul style="margin:0;padding-left:20px;line-height:1.8;">
          <li>✨ <strong>Acteurs illimités</strong> (vs 2 max gratuit)</li>
          <li>💎 <strong>Badge Premium</strong> visible sur vos fiches</li>
          <li>📊 <strong>Tableau de bord</strong> et statistiques avancées</li>
          <li>🏆 <strong>Priorité</strong> dans les résultats de recherche</li>
          <li>📱 <strong>Notifications SMS</strong> pour les opportunités</li>
          <li>💬 <strong>Support prioritaire</strong> par WhatsApp</li>
        </ul>
      </div>
      
      <div style="background:#eff6ff;padding:20px;border-radius:12px;margin-bottom:20px;">
        <p style="font-weight:bold;margin:0 0 15px 0;color:#1e40af;">💳 Méthodes de paiement acceptées :</p>
        <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;">
          <div style="padding:12px;background:white;border-radius:8px;border:2px solid #dbeafe;text-align:center;">
            <div style="font-size:28px;margin-bottom:5px;">📱</div>
            <div style="font-weight:bold;color:#fbbf24;">T-Money</div>
            <div style="font-size:11px;color:#6b7280;">Togocom</div>
          </div>
          <div style="padding:12px;background:white;border-radius:8px;border:2px solid #dbeafe;text-align:center;">
            <div style="font-size:28px;margin-bottom:5px;">💰</div>
            <div style="font-weight:bold;color:#10b981;">Flooz</div>
            <div style="font-size:11px;color:#6b7280;">Moov Africa</div>
          </div>
          <div style="padding:12px;background:white;border-radius:8px;border:2px solid #dbeafe;text-align:center;grid-column:1/-1;">
            <div style="font-size:28px;margin-bottom:5px;">💳</div>
            <div style="font-weight:bold;color:#3b82f6;">Visa / MasterCard</div>
            <div style="font-size:11px;color:#6b7280;">Paiement international</div>
          </div>
        </div>
        <p style="margin:15px 0 0 0;font-size:13px;color:#6b7280;text-align:center;">
          ✅ Paiement sécurisé par <strong>FedaPay</strong>
        </p>
      </div>
      
      <div class="dialog-actions">
        <button type="submit" style="background:#fbbf24;color:#000;font-weight:bold;flex:1;">💎 Payer 1 000 FCFA</button>
        <button type="button" id="cancelPayment">Annuler</button>
      </div>
    </form>
  `;
  
  document.body.appendChild(dlg);
  dlg.showModal();
  
  dlg.querySelector('#cancelPayment').onclick = () => dlg.close();
  
  dlg.querySelector('#frmPayment').onsubmit = async (e) => {
    e.preventDefault();
    dlg.close();
    await initiatePayment();
  };
}

async function initiatePayment(){
  try {
    const r = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        amount: 1000,
        description: 'Abonnement Premium AgriRéseau Pro - 1 mois'
      })
    });
    
    if(!r.ok){
      const err = await r.json();
      alert(err.message || err.error || 'Erreur lors de l\'initiation du paiement');
      return;
    }
    
    const data = await r.json();
    
    if(data.paymentUrl){
      const confirmed = confirm('Vous allez être redirigé vers la page de paiement sécurisée FedaPay.\n\nVous pourrez payer avec T-Money, Flooz ou Carte bancaire.\n\nContinuer ?');
      if(confirmed){
        window.location.href = data.paymentUrl;
      }
    } else {
      alert('Erreur: URL de paiement non reçue');
    }
  } catch(e) {
    console.error('Erreur:', e);
    alert('Erreur lors de l\'initiation du paiement');
  }
}


// Nouvelles fonctions pour Budget (module prévisionnel)
function openBudgetDialog(){ 
  if(!ME) return alert("Connecte-toi d'abord.");
  const myActors = ACTORS.filter(a=>a.owner_id===ME.id);
  if(myActors.length === 0) return alert("Vous devez d'abord créer un acteur avant de créer un budget.");
  
  const dlg=document.createElement('dialog');
  const actorsOptions = myActors.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
  const unitsOptions = (REFS.units||['kg','unité','plateau','litre','sac','tonne','tête']).map(u=>`<option value="${u}">${u}</option>`).join('');
  const today = new Date().toISOString().split('T')[0];
  dlg.innerHTML=`<form id="frmBudget" class="dialog-body"><h3>📋 Créer un Budget Prévisionnel</h3>
    <p class="muted">Créez une activité et définissez vos prévisions</p>
    <div class="grid2">
      <label>Activité <input name="label" required placeholder="Ex: Production de maïs 2025"></label>
      <label>Acteur concerné <select name="actor_id" id="budgetActorSelect" required>${actorsOptions}</select></label>
      <label>Filière <select name="filiere"><option>Maïs</option><option>Manioc</option><option>Riz</option><option>Maraîchage</option><option>Soja</option><option>Volailles</option><option>Élevage bovin</option><option>Aviculture</option><option>Porcins</option></select></label>
      <label>Produit récolté <select name="harvest_product" id="budgetProductSelect" required><option value="">Choisir un produit...</option></select></label>
      <label>Date de début <input name="started_at" type="date" value="${today}" required></label>
      <label>Cycle de production (jours) <input name="production_cycle_days" type="number" placeholder="Ex: 90" min="1" required></label>
      <label>Période <select name="periode"><option>Annuel</option><option>Trimestriel</option><option>Mensuel</option></select></label>
      <label>Unité <select name="unit">${unitsOptions}</select></label>
      <label>Quantité prévue <input name="output_qty" type="number" value="1000"></label>
      <label>Prix de vente prévu (FCFA/unité) <input name="price_expected" type="number" value="300"></label>
      <label>Dépenses prévues (FCFA) <input name="transport" type="number" value="0"></label>
    </div>
    <div class="card" style="background:#f0fdf4;margin:15px 0;">
      <p style="margin:0;">CA prévu: <span id="previewCA">0</span> FCFA · Profit: <span id="previewProfit">0</span> FCFA</p>
      <p style="margin:5px 0 0 0;color:#059669;" id="previewAvailability"></p>
    </div>
    <div class="dialog-actions"><button type="submit">💾 Créer</button><button type="button" id="cancelB">Annuler</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal(); dlg.querySelector('#cancelB').onclick=()=> dlg.close();
  const f=dlg.querySelector('#frmBudget'); 
  
  // Fonction pour charger les produits de l'acteur sélectionné
  const loadActorProducts = () => {
    const actorId = Number(f.actor_id.value);
    const actor = myActors.find(a => a.id === actorId);
    const productSelect = dlg.querySelector('#budgetProductSelect');
    
    if(actor && actor.products && actor.products.length > 0){
      productSelect.innerHTML = '<option value="">Choisir un produit...</option>' + 
        actor.products.map(p => {
          const productName = typeof p === 'string' ? p : p.name;
          const productSite = (typeof p === 'object' && p.production_site) ? ` (${p.production_site})` : '';
          return `<option value="${productName}">${productName}${productSite}</option>`;
        }).join('');
    } else {
      productSelect.innerHTML = '<option value="">Aucun produit défini pour cet acteur</option>';
    }
  };
  
  // Charger les produits de l'acteur initial
  loadActorProducts();
  
  // Recharger les produits quand l'acteur change
  f.actor_id.onchange = loadActorProducts;
  
  const up=()=>{
    const qty=Number(f.output_qty.value||0),price=Number(f.price_expected.value||0),dep=Number(f.transport.value||0);
    dlg.querySelector('#previewCA').textContent=(qty*price).toLocaleString();
    dlg.querySelector('#previewProfit').textContent=(qty*price-dep).toLocaleString();
    
    const startDate = f.started_at.value;
    const cycleDays = Number(f.production_cycle_days.value||0);
    if(startDate && cycleDays > 0){
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + cycleDays);
      const availText = `📅 Disponibilité estimée: ${end.toLocaleDateString('fr-FR')} (${cycleDays} jours)`;
      dlg.querySelector('#previewAvailability').textContent = availText;
    } else {
      dlg.querySelector('#previewAvailability').textContent = '';
    }
  };
  f.output_qty.oninput=up;f.price_expected.oninput=up;f.transport.oninput=up;f.started_at.oninput=up;f.production_cycle_days.oninput=up;up();
  f.onsubmit=async(e)=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target).entries());
    d.output_qty=Number(d.output_qty||0);
    d.price_expected=Number(d.price_expected||0);
    d.transport=Number(d.transport||0);
    d.target_margin=0;
    d.autres=0;
    d.overhead_pct=0;
    d.actor_id=d.actor_id?Number(d.actor_id):null;
    d.production_cycle_days=Number(d.production_cycle_days||0);
    const r=await fetch('/api/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
    if(!r.ok){alert('Erreur');return;}
    dlg.close();
    await loadBudgets();
  };
}
async function openBudget(b){
  CURRENT_BUDGET=b;const sumR=await fetch(`/api/activities/${b.id}/summary`);const S=await sumR.json();const expenses=S.budgetExpenses||[];const incomes=S.budgetIncomes||[];
  const root=document.getElementById('budgetEditor');
  const unit = b.unit || 'kg';
  root.innerHTML=`<h4>${b.label} <span class="badge">${b.filiere}</span></h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
      <div class="card" style="background:#f0fdf4;"><h5 style="color:#059669;">📊 Budget Prévisionnel</h5>
        <p>Quantité: <strong>${b.output_qty||0} ${unit}</strong></p><p>Prix: <strong>${b.price_expected||0} FCFA/${unit}</strong></p>
        <p>CA prévu: <strong>${((b.output_qty||0)*(b.price_expected||0)).toLocaleString()} FCFA</strong></p>
        <p>Dépenses prévues: <strong>${(b.transport||0).toLocaleString()} FCFA</strong></p>
        <p style="color:#059669;"><strong>Profit prévu: ${(((b.output_qty||0)*(b.price_expected||0))-(b.transport||0)).toLocaleString()} FCFA</strong></p></div>
      <div class="card" style="background:#fee2e2;"><h5 style="color:#dc2626;">💰 Coûts Réels</h5>
        <p>Dépenses: <strong>${(S.totalRealExpenses||0).toLocaleString()} FCFA</strong></p>
        <p>Recettes: <strong>${(S.totalRealIncomes||0).toLocaleString()} FCFA</strong></p>
        <p>Récolte: <strong>${S.actual_harvest||0} ${unit}</strong> <button id="btnEditH" style="font-size:11px;">✏️</button></p>
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
  const unit = b.unit || 'kg';
  dlg.innerHTML=`<form id="fH"><h3>Récolte réelle</h3><label>Quantité (${unit}) <input name="h" type="number" step="0.01" value="${b.actual_harvest||''}" required></label><div class="dialog-actions"><button type="submit">💾 OK</button><button type="button" id="cH">Annuler</button></div></form>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.querySelector('#cH').onclick=()=>dlg.close();
  dlg.querySelector('#fH').onsubmit=async(e)=>{
    e.preventDefault();
    const h=Number(e.target.h.value);
    const payload = {label:b.label,filiere:b.filiere,periode:b.periode,output_qty:b.output_qty,price_expected:b.price_expected,transport:b.transport,target_margin:b.target_margin,autres:b.autres,overhead_pct:b.overhead_pct,actual_harvest:h,unit:b.unit};
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
  if(r.status===401){COSTS=[];renderCosts();renderEvaluationTable();return;}
  const data=await r.json();
  COSTS=data.rows||[];
  renderCosts();
  renderEvaluationTable();
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
  const root=document.getElementById('costSummary');
  if(!root) return;
  
  if(!budgetId) {
    root.innerHTML='<p class="muted">Sélectionnez un budget pour voir le calcul du coût de revient</p>';
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

async function renderEvaluationTable(){
  const root = document.getElementById('evaluationTable');
  if(!root) return;
  
  if(!ME || BUDGETS.length === 0) {
    root.innerHTML='<p class="muted">Aucun budget créé. Créez un budget pour voir le suivi-évaluation.</p>';
    return;
  }
  
  const tableData = await Promise.all(BUDGETS.map(async(b)=>{
    const sumR = await fetch(`/api/activities/${b.id}/summary`);
    const S = await sumR.json();
    const prevuDep = (b.transport||0);
    const prevuCA = (b.output_qty||0) * (b.price_expected||0);
    const prevuProfit = prevuCA - prevuDep;
    const realDep = S.totalRealExpenses || 0;
    const realRecettes = S.totalRealIncomes || 0;
    const realProfit = realRecettes - realDep;
    const variance = realDep - prevuDep;
    const variancePct = prevuDep > 0 ? ((variance / prevuDep) * 100).toFixed(1) : 0;
    const unit = b.unit || 'kg';
    
    return {
      id: b.id,
      label: b.label,
      filiere: b.filiere,
      prevuDep,
      prevuCA,
      prevuProfit,
      realDep,
      realRecettes,
      realProfit,
      variance,
      variancePct,
      actualHarvest: S.actual_harvest || 0,
      prevuQty: b.output_qty || 0,
      unit,
      status: realDep > 0 ? (variance < 0 ? '✅ Économie' : '⚠️ Dépassement') : '⏳ En cours'
    };
  }));
  
  root.innerHTML=`
    <table class="tbl">
      <thead>
        <tr>
          <th>Budget</th>
          <th>Filière</th>
          <th>Dépenses Prévues</th>
          <th>Dépenses Réelles</th>
          <th>Écart</th>
          <th>CA Prévu</th>
          <th>Recettes Réelles</th>
          <th>Profit Prévu</th>
          <th>Profit Réel</th>
          <th>Récolte</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        ${tableData.map(d=>{
          const varColor = d.variance < 0 ? '#059669' : (d.variance > 0 ? '#dc2626' : '#6b7280');
          const profitColor = d.realProfit > d.prevuProfit ? '#059669' : '#dc2626';
          return `
            <tr>
              <td><strong>${d.label}</strong></td>
              <td><span class="badge">${d.filiere}</span></td>
              <td>${d.prevuDep.toLocaleString()} FCFA</td>
              <td><strong>${d.realDep.toLocaleString()} FCFA</strong></td>
              <td style="color:${varColor};font-weight:bold;">${d.variance > 0 ? '+' : ''}${d.variance.toLocaleString()} FCFA<br><small>(${d.variance > 0 ? '+' : ''}${d.variancePct}%)</small></td>
              <td>${d.prevuCA.toLocaleString()} FCFA</td>
              <td><strong>${d.realRecettes.toLocaleString()} FCFA</strong></td>
              <td>${d.prevuProfit.toLocaleString()} FCFA</td>
              <td style="color:${profitColor};font-weight:bold;">${d.realProfit.toLocaleString()} FCFA</td>
              <td>${d.actualHarvest} / ${d.prevuQty} ${d.unit}</td>
              <td>${d.status}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
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

async function loadAdminUsers(){
  if(!ME || !ME.is_admin) return;
  try {
    const r = await fetch('/api/admin/users');
    if(r.ok){
      ADMIN_USERS = await r.json();
      renderAdminUsers();
    }
  } catch(e) {
    console.error('Error loading admin users:', e);
  }
}

function renderAdminUsers(){
  const tbody = document.getElementById('adminUserList');
  if(!tbody) return;
  
  if(ADMIN_USERS.length === 0){
    tbody.innerHTML = '<tr><td colspan="9" class="muted" style="text-align:center;padding:20px;">Aucun utilisateur</td></tr>';
    return;
  }
  
  tbody.innerHTML = ADMIN_USERS.map(u => {
    const statusBadge = u.status === 'active' ? '<span class="badge" style="background:#10b981;color:white">✓ Active</span>' :
                        u.status === 'blocked' ? '<span class="badge" style="background:#ef4444;color:white">✖ Bloqué</span>' :
                        '<span class="badge" style="background:#fbbf24;color:#000">⏳ En attente</span>';
    
    const adminBadge = u.is_admin ? '<span class="badge" style="background:#fbbf24;color:#000">💎 ADMIN</span>' : '-';
    
    const blockBtn = u.status === 'blocked' 
      ? `<button onclick="toggleBlockUser(${u.id}, '${u.status}')" style="background:#10b981;color:white;padding:4px 8px;font-size:12px;">Débloquer</button>`
      : `<button onclick="toggleBlockUser(${u.id}, '${u.status}')" style="background:#ef4444;color:white;padding:4px 8px;font-size:12px;">Bloquer</button>`;
    
    const deleteBtn = u.id === ME.id 
      ? '<button disabled style="opacity:0.5;padding:4px 8px;font-size:12px;">Supprimer</button>'
      : `<button onclick="deleteAdminUser(${u.id})" style="background:#dc2626;color:white;padding:4px 8px;font-size:12px;">Supprimer</button>`;
    
    return `<tr>
      <td>${u.id}</td>
      <td><strong>${u.name || '-'}</strong></td>
      <td>${u.email || '-'}</td>
      <td>${u.phone || '-'}</td>
      <td>${u.region || '-'}</td>
      <td><span class="badge">${u.role || '-'}</span></td>
      <td>${statusBadge}</td>
      <td>${adminBadge}</td>
      <td>
        <button onclick="openEditUserDialog(${u.id})" style="background:#3b82f6;color:white;padding:4px 8px;font-size:12px;margin-right:4px;">Modifier</button>
        ${blockBtn}
        ${deleteBtn}
      </td>
    </tr>`;
  }).join('');
}

async function openEditUserDialog(userId){
  if(!ME || !ME.is_admin) return alert('Accès refusé');
  
  const user = ADMIN_USERS.find(u => u.id === userId);
  if(!user) return alert('Utilisateur non trouvé');
  
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<form id="frmEditUser" class="dialog-body">
    <h3>Modifier l'utilisateur #${user.id}</h3>
    <div class="grid2">
      <label>Nom <input name="name" value="${user.name || ''}" required></label>
      <label>Email <input name="email" type="email" value="${user.email || ''}"></label>
      <label>Téléphone <input name="phone" value="${user.phone || ''}"></label>
      <label>WhatsApp <input name="whatsapp" value="${user.whatsapp || ''}"></label>
      <label>Région <input name="region" value="${user.region || ''}"></label>
      <label>Rôle <select name="role">
        <option value="">-</option>
        ${['producteur','transporteur','transformateur','grossiste','detaillant','institution'].map(r => 
          `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r}</option>`
        ).join('')}
      </select></label>
      <label>Statut <select name="status" required>
        <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
        <option value="blocked" ${user.status === 'blocked' ? 'selected' : ''}>Bloqué</option>
        <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>En attente</option>
      </select></label>
      <label>Administrateur <select name="is_admin" required>
        <option value="false" ${!user.is_admin ? 'selected' : ''}>Non</option>
        <option value="true" ${user.is_admin ? 'selected' : ''}>Oui</option>
      </select></label>
    </div>
    <div class="dialog-actions">
      <button type="submit">Enregistrer</button>
      <button type="button" id="cancelEdit">Annuler</button>
    </div>
  </form>`;
  
  document.body.appendChild(dlg);
  dlg.showModal();
  
  dlg.querySelector('#cancelEdit').onclick = () => dlg.close();
  
  dlg.querySelector('#frmEditUser').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    const payload = {
      name: data.name.trim(),
      email: data.email ? data.email.trim() : null,
      phone: data.phone ? data.phone.trim() : null,
      whatsapp: data.whatsapp ? data.whatsapp.trim() : null,
      region: data.region ? data.region.trim() : null,
      role: data.role || null,
      status: data.status,
      is_admin: data.is_admin === 'true'
    };
    
    const r = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    if(r.ok){
      dlg.close();
      await loadAdminUsers();
      alert('Utilisateur mis à jour avec succès');
    } else {
      alert('Erreur lors de la mise à jour');
    }
  };
}

async function toggleBlockUser(userId, currentStatus){
  if(!ME || !ME.is_admin) return alert('Accès refusé');
  
  const user = ADMIN_USERS.find(u => u.id === userId);
  if(!user) return;
  
  const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
  const action = newStatus === 'blocked' ? 'bloquer' : 'débloquer';
  
  if(!confirm(`Voulez-vous vraiment ${action} l'utilisateur "${user.name}" ?`)) return;
  
  const payload = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp,
    region: user.region,
    role: user.role,
    status: newStatus,
    is_admin: user.is_admin
  };
  
  const r = await fetch(`/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  
  if(r.ok){
    await loadAdminUsers();
    alert(`Utilisateur ${action === 'bloquer' ? 'bloqué' : 'débloqué'} avec succès`);
  } else {
    alert('Erreur lors de la mise à jour');
  }
}

async function deleteAdminUser(userId){
  if(!ME || !ME.is_admin) return alert('Accès refusé');
  if(userId === ME.id) return alert('Vous ne pouvez pas supprimer votre propre compte');
  
  const user = ADMIN_USERS.find(u => u.id === userId);
  if(!user) return;
  
  if(!confirm(`⚠️ ATTENTION ⚠️\n\nVoulez-vous vraiment supprimer définitivement l'utilisateur "${user.name}" ?\n\nCette action est irréversible et supprimera toutes les données associées à cet utilisateur.`)) return;
  
  const r = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE'
  });
  
  if(r.ok){
    await loadAdminUsers();
    alert('Utilisateur supprimé avec succès');
  } else {
    const err = await r.json();
    alert(err.error || 'Erreur lors de la suppression');
  }
}

window.openEditUserDialog = openEditUserDialog;
window.toggleBlockUser = toggleBlockUser;
window.deleteAdminUser = deleteAdminUser;

async function loadAdminLogistics(){
  if(!ME || !ME.is_admin) return;
  try {
    const r = await fetch('/api/admin/logistics');
    if(r.ok){
      ADMIN_LOGISTICS = await r.json();
      renderAdminLogistics();
    }
  } catch(e) {
    console.error('Error loading admin logistics:', e);
  }
}

function renderAdminLogistics(){
  const tbody = document.getElementById('adminLogisticsList');
  if(!tbody) return;
  
  if(ADMIN_LOGISTICS.length === 0){
    tbody.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:20px;">Aucune publication logistique</td></tr>';
    return;
  }
  
  tbody.innerHTML = ADMIN_LOGISTICS.map(log => {
    const typeBadge = log.type === 'offre' 
      ? '<span class="badge" style="background:#10b981;color:white">📦 Offre</span>'
      : '<span class="badge" style="background:#3b82f6;color:white">🔍 Demande</span>';
    
    const date = log.created_at ? new Date(log.created_at).toLocaleDateString('fr-FR') : '-';
    
    return `<tr>
      <td>${log.id}</td>
      <td>${typeBadge}</td>
      <td><strong>${log.title || '-'}</strong></td>
      <td>${log.region || '-'}</td>
      <td>
        <div>${log.owner_name || 'Utilisateur inconnu'}</div>
        <div class="muted" style="font-size:11px;">${log.owner_email || log.owner_phone || ''}</div>
      </td>
      <td>
        <div>${log.contact || '-'}</div>
        ${log.whatsapp ? `<div class="muted" style="font-size:11px;">WhatsApp: ${log.whatsapp}</div>` : ''}
      </td>
      <td>${date}</td>
      <td>
        <button onclick="openEditLogisticDialog(${log.id})" style="background:#3b82f6;color:white;padding:4px 8px;font-size:12px;margin-right:4px;">Modifier</button>
        <button onclick="deleteAdminLogistic(${log.id})" style="background:#dc2626;color:white;padding:4px 8px;font-size:12px;">Supprimer</button>
      </td>
    </tr>`;
  }).join('');
}

async function openEditLogisticDialog(logId){
  if(!ME || !ME.is_admin) return alert('Accès refusé');
  
  const log = ADMIN_LOGISTICS.find(l => l.id === logId);
  if(!log) return;
  
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<form id="frmEditLogistic" class="dialog-body">
    <h3>✏️ Modifier la publication logistique</h3>
    <div class="grid2">
      <label>Type
        <select name="type" required>
          <option value="offre" ${log.type === 'offre' ? 'selected' : ''}>📦 Offre</option>
          <option value="demande" ${log.type === 'demande' ? 'selected' : ''}>🔍 Demande</option>
        </select>
      </label>
      <label>Région <input name="region" value="${log.region || ''}" required></label>
    </div>
    <label>Titre <input name="title" value="${log.title || ''}" required></label>
    <label>Détails <textarea name="details" rows="3">${log.details || ''}</textarea></label>
    <div class="grid2">
      <label>Contact <input name="contact" value="${log.contact || ''}"></label>
      <label>WhatsApp <input name="whatsapp" value="${log.whatsapp || ''}"></label>
    </div>
    <div class="muted" style="margin-top:10px;padding:10px;background:#f3f4f6;border-radius:4px;">
      <strong>Propriétaire:</strong> ${log.owner_name || 'Inconnu'} (${log.owner_email || log.owner_phone || 'N/A'})
    </div>
    <div class="dialog-actions">
      <button type="submit">✓ Enregistrer</button>
      <button type="button" id="cancelEdit">Annuler</button>
    </div>
  </form>`;
  
  document.body.appendChild(dlg);
  dlg.showModal();
  
  dlg.querySelector('#cancelEdit').onclick = () => dlg.close();
  
  dlg.querySelector('#frmEditLogistic').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      type: form.querySelector('[name="type"]').value,
      title: form.querySelector('[name="title"]').value,
      region: form.querySelector('[name="region"]').value,
      details: form.querySelector('[name="details"]').value,
      contact: form.querySelector('[name="contact"]').value,
      whatsapp: form.querySelector('[name="whatsapp"]').value
    };
    
    const r = await fetch(`/api/logistics/${logId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    
    if(r.ok){
      dlg.close();
      await loadAdminLogistics();
      alert('Publication mise à jour avec succès');
    } else {
      const err = await r.json();
      alert(err.error || 'Erreur lors de la mise à jour');
    }
  };
}

async function deleteAdminLogistic(logId){
  if(!ME || !ME.is_admin) return alert('Accès refusé');
  
  const log = ADMIN_LOGISTICS.find(l => l.id === logId);
  if(!log) return;
  
  if(!confirm(`Voulez-vous vraiment supprimer la publication "${log.title}" ?\n\nCette action est irréversible.`)) return;
  
  const r = await fetch(`/api/logistics/${logId}`, {
    method: 'DELETE'
  });
  
  if(r.ok){
    await loadAdminLogistics();
    alert('Publication supprimée avec succès');
  } else {
    const err = await r.json();
    alert(err.error || 'Erreur lors de la suppression');
  }
}

window.openEditLogisticDialog = openEditLogisticDialog;
window.deleteAdminLogistic = deleteAdminLogistic;

function showForgotPasswordDialog(){
  const dlg=document.createElement('dialog');
  dlg.innerHTML=`<form id="frmForgotPassword" class="dialog-body"><h3>🔑 Mot de passe oublié</h3>
  <p class="muted" style="margin-bottom:15px;">Entrez votre email OU numéro de téléphone pour recevoir un lien de réinitialisation</p>
  <div class="grid2">
    <label>Email <input name="email" type="email" placeholder="exemple@email.com"></label>
    <label>Téléphone <input name="phone" type="tel" placeholder="+228 XX XX XX XX"></label>
  </div>
  <div id="resetLinkDisplay" style="display:none;margin-top:15px;padding:15px;background:#f0fdf4;border:1px solid #10b981;border-radius:8px;">
    <p style="margin-bottom:10px;font-weight:500;color:#059669;">✅ Lien de réinitialisation généré :</p>
    <input id="resetLinkInput" type="text" readonly style="width:100%;padding:8px;margin-bottom:10px;font-size:12px;border:1px solid #d1d5db;border-radius:4px;">
    <div style="display:flex;gap:10px;">
      <button type="button" id="btnCopyResetLink" style="flex:1;background:#10b981;color:#fff;">📋 Copier le lien</button>
      <button type="button" id="btnWhatsAppReset" style="flex:1;background:#25D366;color:#fff;display:none;">📱 Envoyer via WhatsApp</button>
    </div>
  </div>
  <div class="dialog-actions"><button type="submit">🔗 Générer le lien</button><button type="button" id="cancelForgot">Annuler</button></div></form>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.querySelector('#cancelForgot').onclick=()=>dlg.close();
  
  dlg.querySelector('#frmForgotPassword').onsubmit=async(e)=>{
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('[name="email"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();
    
    if(!email && !phone){
      return alert('Veuillez entrer votre email OU numéro de téléphone');
    }
    
    await requestPasswordReset(email, phone, dlg);
  };
}

async function requestPasswordReset(email, phone, dlg){
  const r = await fetch('/api/auth/forgot-password',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email: email||null, phone: phone||null})
  });
  
  if(r.ok){
    const data = await r.json();
    const resetLinkDisplay = dlg.querySelector('#resetLinkDisplay');
    const resetLinkInput = dlg.querySelector('#resetLinkInput');
    const btnWhatsAppReset = dlg.querySelector('#btnWhatsAppReset');
    
    resetLinkInput.value = data.resetLink;
    resetLinkDisplay.style.display = 'block';
    
    dlg.querySelector('#btnCopyResetLink').onclick=()=>{
      resetLinkInput.select();
      document.execCommand('copy');
      alert('Lien copié dans le presse-papiers !');
    };
    
    if(data.whatsapp){
      btnWhatsAppReset.style.display = 'block';
      const digits = data.whatsapp.replace(/\D/g,'');
      const message = encodeURIComponent(`Voici votre lien de réinitialisation de mot de passe : ${data.resetLink}`);
      btnWhatsAppReset.onclick=()=>{
        window.open(`https://wa.me/${digits}?text=${message}`, '_blank');
      };
    }
  } else {
    const err = await r.json();
    alert(err.error || 'Utilisateur non trouvé');
  }
}

async function loadUserSettings(){
  if(!ME) return;
  
  const frmProfile = document.getElementById('frmProfile');
  if(!frmProfile) return;
  
  frmProfile.querySelector('[name="name"]').value = ME.name || '';
  frmProfile.querySelector('[name="email"]').value = ME.email || '';
  frmProfile.querySelector('[name="phone"]').value = ME.phone || '';
  frmProfile.querySelector('[name="whatsapp"]').value = ME.whatsapp || '';
  frmProfile.querySelector('[name="region"]').value = ME.region || '';
  frmProfile.querySelector('[name="role"]').value = ME.role || '';
}

const frmProfile = document.getElementById('frmProfile');
if(frmProfile){
  frmProfile.onsubmit = async (e) => {
    e.preventDefault();
    
    if(!ME) return alert('Vous devez être connecté');
    
    const data = Object.fromEntries(new FormData(e.target).entries());
    const payload = {
      name: data.name.trim(),
      email: data.email ? data.email.trim() : null,
      phone: data.phone ? data.phone.trim() : null,
      whatsapp: data.whatsapp ? data.whatsapp.trim() : null,
      region: data.region ? data.region.trim() : null,
      role: data.role || null
    };
    
    const r = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    const msgEl = document.getElementById('profileMessage');
    if(r.ok){
      await boot();
      msgEl.textContent = '✅ Profil mis à jour avec succès !';
      msgEl.style.background = '#f0fdf4';
      msgEl.style.color = '#059669';
      msgEl.style.border = '1px solid #10b981';
      msgEl.style.display = 'block';
      setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
    } else {
      const err = await r.json();
      msgEl.textContent = '❌ ' + (err.error || 'Erreur lors de la mise à jour');
      msgEl.style.background = '#fef2f2';
      msgEl.style.color = '#dc2626';
      msgEl.style.border = '1px solid #ef4444';
      msgEl.style.display = 'block';
    }
  };
}

const frmPassword = document.getElementById('frmPassword');
if(frmPassword){
  frmPassword.onsubmit = async (e) => {
    e.preventDefault();
    
    if(!ME) return alert('Vous devez être connecté');
    
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    if(data.newPassword !== data.confirmPassword){
      return alert('Les mots de passe ne correspondent pas');
    }
    
    if(data.newPassword.length < 6){
      return alert('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    const r = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name: ME.name,
        email: ME.email,
        phone: ME.phone,
        whatsapp: ME.whatsapp,
        region: ME.region,
        role: ME.role,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
    });
    
    const msgEl = document.getElementById('passwordMessage');
    if(r.ok){
      e.target.reset();
      msgEl.textContent = '✅ Mot de passe modifié avec succès !';
      msgEl.style.background = '#f0fdf4';
      msgEl.style.color = '#059669';
      msgEl.style.border = '1px solid #10b981';
      msgEl.style.display = 'block';
      setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
    } else {
      const err = await r.json();
      msgEl.textContent = '❌ ' + (err.error || 'Erreur lors du changement de mot de passe');
      msgEl.style.background = '#fef2f2';
      msgEl.style.color = '#dc2626';
      msgEl.style.border = '1px solid #ef4444';
      msgEl.style.display = 'block';
    }
  };
}

function showResetPasswordForm(token){
  const dlg=document.createElement('dialog');
  dlg.innerHTML=`<form id="frmResetPassword" class="dialog-body"><h3>🔐 Réinitialiser le mot de passe</h3>
  <p class="muted" style="margin-bottom:15px;">Entrez votre nouveau mot de passe</p>
  <div class="grid2">
    <label>Nouveau mot de passe <input name="newPassword" type="password" required minlength="6"></label>
    <label>Confirmer le mot de passe <input name="confirmPassword" type="password" required minlength="6"></label>
  </div>
  <div class="dialog-actions"><button type="submit">🔒 Réinitialiser le mot de passe</button><button type="button" id="cancelReset">Annuler</button></div></form>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.querySelector('#cancelReset').onclick=()=>{
    dlg.close();
    window.location.hash = '';
  };
  
  dlg.querySelector('#frmResetPassword').onsubmit=async(e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    if(data.newPassword !== data.confirmPassword){
      return alert('Les mots de passe ne correspondent pas');
    }
    
    if(data.newPassword.length < 6){
      return alert('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    await resetPassword(token, data.newPassword, dlg);
  };
}

async function resetPassword(token, newPassword, dlg){
  const r = await fetch('/api/auth/reset-password',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token, newPassword})
  });
  
  if(r.ok){
    dlg.close();
    window.location.hash = '';
    alert('✅ Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.');
    openLogin();
  } else {
    const err = await r.json();
    alert(err.error || 'Erreur lors de la réinitialisation');
  }
}

function checkResetPasswordUrl(){
  const hash = window.location.hash;
  if(hash.startsWith('#reset-password')){
    const params = new URLSearchParams(hash.split('?')[1]);
    const token = params.get('token');
    if(token){
      showResetPasswordForm(token);
    }
  }
}

window.addEventListener('hashchange', checkResetPasswordUrl);

async function loadStats(){
  if(!ME) return;
  try {
    const [overviewRes, actorsRes, budgetsRes] = await Promise.all([
      fetch('/api/stats/overview'),
      fetch('/api/stats/actors'),
      fetch('/api/stats/budgets')
    ]);
    
    if(overviewRes.ok && actorsRes.ok && budgetsRes.ok){
      STATS_DATA = {
        overview: await overviewRes.json(),
        actors: await actorsRes.json(),
        budgets: await budgetsRes.json()
      };
      
      renderStatsOverview();
      renderActorStats();
      renderBudgetStats();
      renderCharts();
    }
  } catch(e) {
    console.error('Error loading stats:', e);
  }
}

function renderStatsOverview(){
  const container = document.getElementById('statsOverview');
  if(!container) return;
  
  const stats = STATS_DATA.overview || {};
  
  const kpis = [
    {
      icon: '👥',
      label: 'Acteurs',
      value: stats.actors_count || 0,
      color: '#3b82f6',
      bg: '#eff6ff'
    },
    {
      icon: '📊',
      label: 'Budgets',
      value: stats.budgets_count || 0,
      color: '#8b5cf6',
      bg: '#f3e8ff'
    },
    {
      icon: '👁️',
      label: 'Vues',
      value: stats.views_count || 0,
      color: '#10b981',
      bg: '#f0fdf4'
    },
    {
      icon: '💸',
      label: 'Dépenses',
      value: (stats.total_expenses || 0).toLocaleString() + ' FCFA',
      color: '#ef4444',
      bg: '#fef2f2'
    },
    {
      icon: '🌾',
      label: 'Récoltes',
      value: (stats.total_harvests || 0) + ' kg',
      color: '#f59e0b',
      bg: '#fef3c7'
    },
    {
      icon: '⭐',
      label: 'Évaluations',
      value: stats.ratings_received || 0,
      color: '#fbbf24',
      bg: '#fef3c7'
    }
  ];
  
  container.innerHTML = kpis.map(kpi => `
    <div class="card" style="background:${kpi.bg};border:2px solid ${kpi.color}20;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">${kpi.icon}</div>
      <div style="font-size:28px;font-weight:bold;color:${kpi.color};margin-bottom:5px;">${kpi.value}</div>
      <div style="font-size:14px;color:#6b7280;font-weight:500;">${kpi.label}</div>
    </div>
  `).join('');
}

function renderActorStats(){
  const container = document.getElementById('actorStatsContent');
  if(!container) return;
  
  const actors = STATS_DATA.actors || [];
  
  if(actors.length === 0){
    container.innerHTML = '<p class="muted">Aucun acteur enregistré. Créez votre premier acteur pour voir les statistiques.</p>';
    return;
  }
  
  container.innerHTML = actors.map(actor => {
    const harvestsHtml = Object.keys(actor.harvests).length > 0 
      ? Object.entries(actor.harvests).map(([product, qty]) => `${product}: ${qty} kg`).join(', ')
      : 'Aucune récolte';
    
    const stars = actor.rating_avg > 0 ? '⭐'.repeat(Math.round(actor.rating_avg)) : '☆☆☆☆☆';
    
    return `
      <div style="background:#f9fafb;padding:15px;border-radius:8px;margin-bottom:15px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
          <div>
            <strong style="font-size:16px;color:#1f2937;">${actor.name}</strong>
            <div style="margin-top:5px;">
              <span class="badge" style="background:#3b82f6;color:white;">${actor.role}</span>
              <span class="badge" style="background:#10b981;color:white;">${actor.region}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:24px;font-weight:bold;color:#3b82f6;">${actor.views}</div>
            <div style="font-size:12px;color:#6b7280;">vues</div>
          </div>
        </div>
        
        <div style="margin-top:10px;">
          <div style="margin-bottom:5px;">
            <strong>Note:</strong> ${stars} ${actor.rating_avg > 0 ? actor.rating_avg.toFixed(1) : 'N/A'} 
            <span style="color:#6b7280;font-size:12px;">(${actor.rating_count} évaluation${actor.rating_count > 1 ? 's' : ''})</span>
          </div>
          <div style="margin-bottom:5px;">
            <strong>Produits:</strong> ${actor.products.join(', ') || 'Aucun'}
          </div>
          <div>
            <strong>Disponible:</strong> <span style="color:#059669;">${harvestsHtml}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderBudgetStats(){
  const container = document.getElementById('budgetStatsContent');
  if(!container) return;
  
  const budgets = STATS_DATA.budgets || [];
  
  if(budgets.length === 0){
    container.innerHTML = '<p class="muted">Aucun budget enregistré. Créez votre premier budget pour voir les statistiques financières.</p>';
    return;
  }
  
  container.innerHTML = budgets.map(budget => {
    const varianceColor = budget.variance < 0 ? '#10b981' : '#ef4444';
    const profitColor = budget.profit >= 0 ? '#10b981' : '#ef4444';
    const statusBadge = budget.status === 'completed' ? '<span class="badge" style="background:#10b981;color:white;">✓ Complété</span>' :
                        budget.status === 'in_progress' ? '<span class="badge" style="background:#3b82f6;color:white;">⏳ En cours</span>' :
                        '<span class="badge" style="background:#fbbf24;color:#000;">📝 Planifié</span>';
    
    return `
      <div style="background:#f9fafb;padding:15px;border-radius:8px;margin-bottom:15px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
          <div>
            <strong style="font-size:16px;color:#1f2937;">${budget.label}</strong>
            <div style="margin-top:5px;">
              <span class="badge">${budget.filiere}</span>
              <span class="badge">${budget.periode}</span>
              ${statusBadge}
            </div>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px;">
          <div style="background:#eff6ff;padding:10px;border-radius:6px;">
            <div style="font-size:12px;color:#6b7280;margin-bottom:3px;">Prévisionnel</div>
            <div style="font-size:18px;font-weight:bold;color:#3b82f6;">${budget.planned_total.toLocaleString()} F</div>
          </div>
          <div style="background:#fef2f2;padding:10px;border-radius:6px;">
            <div style="font-size:12px;color:#6b7280;margin-bottom:3px;">Dépenses réelles</div>
            <div style="font-size:18px;font-weight:bold;color:#ef4444;">${budget.real_expenses.toLocaleString()} F</div>
          </div>
          <div style="background:${budget.variance < 0 ? '#f0fdf4' : '#fef2f2'};padding:10px;border-radius:6px;">
            <div style="font-size:12px;color:#6b7280;margin-bottom:3px;">Écart</div>
            <div style="font-size:18px;font-weight:bold;color:${varianceColor};">
              ${budget.variance >= 0 ? '+' : ''}${budget.variance.toLocaleString()} F
              <span style="font-size:12px;">(${budget.variance_percent >= 0 ? '+' : ''}${budget.variance_percent.toFixed(1)}%)</span>
            </div>
          </div>
          <div style="background:${budget.profit >= 0 ? '#f0fdf4' : '#fef2f2'};padding:10px;border-radius:6px;">
            <div style="font-size:12px;color:#6b7280;margin-bottom:3px;">Profit</div>
            <div style="font-size:18px;font-weight:bold;color:${profitColor};">
              ${budget.profit >= 0 ? '+' : ''}${budget.profit.toLocaleString()} F
            </div>
          </div>
        </div>
        
        ${budget.actual_harvest > 0 ? `
          <div style="margin-top:10px;padding:10px;background:#fef3c7;border-radius:6px;">
            <strong>Récolte:</strong> ${budget.actual_harvest.toLocaleString()} kg
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderCharts(){
  const container = document.getElementById('chartsContainer');
  if(!container) return;
  
  const budgets = STATS_DATA.budgets || [];
  
  if(budgets.length === 0){
    container.innerHTML = '<p class="muted">Aucune donnée disponible pour les graphiques.</p>';
    return;
  }
  
  const maxExpense = Math.max(...budgets.map(b => Math.max(b.planned_total, b.real_expenses)));
  
  container.innerHTML = `
    <h4 style="margin-bottom:15px;color:#374151;">Comparaison Prévisionnel vs Réel par Budget</h4>
    ${budgets.map(budget => {
      const plannedPercent = (budget.planned_total / maxExpense * 100);
      const realPercent = (budget.real_expenses / maxExpense * 100);
      
      return `
        <div style="margin-bottom:25px;">
          <div style="margin-bottom:8px;font-weight:500;color:#374151;">${budget.label}</div>
          
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:3px;">
              <span>Prévisionnel</span>
              <span>${budget.planned_total.toLocaleString()} FCFA</span>
            </div>
            <div style="background:#e5e7eb;border-radius:8px;height:24px;overflow:hidden;">
              <div style="background:#3b82f6;height:100%;width:${plannedPercent}%;transition:width 0.3s;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;color:white;font-size:11px;font-weight:600;">
                ${plannedPercent > 15 ? plannedPercent.toFixed(0) + '%' : ''}
              </div>
            </div>
          </div>
          
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:3px;">
              <span>Réel</span>
              <span>${budget.real_expenses.toLocaleString()} FCFA</span>
            </div>
            <div style="background:#e5e7eb;border-radius:8px;height:24px;overflow:hidden;">
              <div style="background:${budget.real_expenses > budget.planned_total ? '#ef4444' : '#10b981'};height:100%;width:${realPercent}%;transition:width 0.3s;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;color:white;font-size:11px;font-weight:600;">
                ${realPercent > 15 ? realPercent.toFixed(0) + '%' : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function exportStatsCSV(){
  if(!ME || !STATS_DATA.budgets) return alert('Aucune donnée à exporter');
  
  let csv = 'Budget,Filière,Période,Prévisionnel,Réel,Écart,Écart %,Profit,Récolte (kg)\n';
  
  STATS_DATA.budgets.forEach(b => {
    csv += `"${b.label}","${b.filiere}","${b.periode}",${b.planned_total},${b.real_expenses},${b.variance},${b.variance_percent.toFixed(2)},${b.profit},${b.actual_harvest}\n`;
  });
  
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `statistiques_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportStatsPDF(){
  window.print();
}

const btnExportCSV = document.getElementById('btnExportCSV');
const btnExportPDF = document.getElementById('btnExportPDF');
if(btnExportCSV) btnExportCSV.onclick = exportStatsCSV;
if(btnExportPDF) btnExportPDF.onclick = exportStatsPDF;

async function loadPaymentHistory(){
  if(!ME) return;
  
  const container = document.getElementById('paymentHistoryContainer');
  if(!container) return;
  
  container.innerHTML = '<p class="muted">Chargement...</p>';
  
  try {
    const r = await fetch('/api/payments/history');
    if(!r.ok){
      container.innerHTML = '<p class="muted">Erreur lors du chargement de l\'historique</p>';
      return;
    }
    
    const payments = await r.json();
    
    if(payments.length === 0){
      container.innerHTML = '<p class="muted">Aucun paiement pour le moment</p>';
      return;
    }
    
    const statusBadge = (status) => {
      if(status === 'completed') return '<span class="badge" style="background:#10b981;color:white">✓ Complété</span>';
      if(status === 'pending') return '<span class="badge" style="background:#fbbf24;color:#000">⏳ En attente</span>';
      if(status === 'failed') return '<span class="badge" style="background:#ef4444;color:white">✖ Échoué</span>';
      return '<span class="badge">'+status+'</span>';
    };
    
    const providerIcon = (provider) => {
      if(provider === 'tmoney') return '📱 T-Money';
      if(provider === 'flooz') return '💰 Flooz';
      return provider;
    };
    
    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Montant</th>
              <th>Méthode</th>
              <th>Statut</th>
              <th>Transaction ID</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td>${new Date(p.created_at).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                <td><strong>${Number(p.amount).toLocaleString()} FCFA</strong></td>
                <td>${providerIcon(p.provider)}</td>
                <td>${statusBadge(p.status)}</td>
                <td style="font-family:monospace;font-size:12px;">${p.transaction_id || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) {
    console.error('Erreur:', e);
    container.innerHTML = '<p class="muted">Erreur lors du chargement de l\'historique</p>';
  }
}

async function loadNotifications(){
  if(!ME) return;
  
  const container = document.getElementById('notificationsContainer');
  if(!container) return;
  
  container.innerHTML = '<p class="muted">Chargement...</p>';
  
  try {
    const r = await fetch('/api/notifications/history');
    
    if(r.status === 403){
      const err = await r.json();
      container.innerHTML = `
        <div style="text-align:center;padding:40px 20px;background:#fef3c7;border-radius:8px;">
          <h3 style="color:#92400e;margin-bottom:15px;">💎 Fonctionnalité Premium</h3>
          <p style="color:#92400e;margin-bottom:20px;">
            Les notifications SMS et WhatsApp sont réservées aux utilisateurs Premium.<br>
            Passez Premium pour envoyer des notifications automatiques à vos clients.
          </p>
          <button onclick="document.getElementById('btnSubscription').click()" style="background:#fbbf24;color:#000;padding:12px 24px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">
            ✨ Passer Premium (1,000 FCFA/mois)
          </button>
        </div>
      `;
      return;
    }
    
    if(!r.ok){
      container.innerHTML = '<p class="muted">Erreur lors du chargement des notifications</p>';
      return;
    }
    
    const notifications = await r.json();
    
    if(notifications.length === 0){
      container.innerHTML = '<p class="muted">Aucune notification pour le moment</p>';
      return;
    }
    
    const statusBadge = (status) => {
      if(status === 'sent') return '<span class="badge" style="background:#10b981;color:white">✓ Envoyé</span>';
      if(status === 'pending') return '<span class="badge" style="background:#fbbf24;color:#000">⏳ En attente</span>';
      if(status === 'failed') return '<span class="badge" style="background:#ef4444;color:white">✖ Échoué</span>';
      return '<span class="badge">'+status+'</span>';
    };
    
    container.innerHTML = `
      <div style="max-height:400px;overflow-y:auto;">
        ${notifications.map(n => `
          <div class="card" style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
              <div>
                <strong>${n.title || 'Notification'}</strong>
                ${statusBadge(n.status)}
              </div>
              <span class="muted" style="font-size:12px;">${new Date(n.created_at).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <p style="margin:5px 0;color:#6b7280;font-size:14px;">${n.message || '-'}</p>
            ${n.type ? `<p style="margin:5px 0;"><span class="badge">${n.type}</span></p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } catch(e) {
    console.error('Erreur:', e);
    container.innerHTML = '<p class="muted">Erreur lors du chargement des notifications</p>';
  }
}

const btnSendTestNotification = document.getElementById('btnSendTestNotification');
if(btnSendTestNotification){
  btnSendTestNotification.onclick = async () => {
    if(!ME) return alert('Connectez-vous d\'abord');
    
    const recipient = prompt('Entrez le numéro de téléphone (format: +228XXXXXXXX) :');
    if(!recipient) return;
    
    try {
      const r = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          type: 'test',
          channel: 'sms',
          recipient: recipient,
          message: '🌾 Test AgriRéseau Pro : Vos notifications fonctionnent parfaitement !'
        })
      });
      
      if(r.status === 403){
        const err = await r.json();
        alert('💎 Cette fonctionnalité est réservée aux utilisateurs Premium.\n\nPassez Premium pour 1,000 FCFA/mois et bénéficiez de notifications SMS et WhatsApp illimitées !');
        document.getElementById('btnSubscription').click();
        return;
      }
      
      if(r.ok){
        alert('✓ Notification test envoyée avec succès !');
        await loadNotifications();
      } else {
        const err = await r.json();
        alert('Erreur: ' + (err.message || err.error || 'Impossible d\'envoyer la notification'));
      }
    } catch(e) {
      console.error('Erreur:', e);
      alert('Erreur lors de l\'envoi de la notification test');
    }
  };
}

async function loadMyActors(){
  if(!ME) return;
  
  const container = document.getElementById('myActorsList');
  const countEl = document.getElementById('myActorsCount');
  const limitEl = document.getElementById('myActorsLimit');
  
  if(!container) return;
  
  const myActors = ACTORS.filter(a => a.owner_id === ME.id);
  const count = myActors.length;
  
  if(countEl) countEl.textContent = `${count} acteur${count > 1 ? 's' : ''}`;
  
  const subRes = await fetch('/api/subscription');
  const subData = await subRes.json();
  const limit = subData.limit || 2;
  const isPremium = subData.subscription?.plan === 'premium';
  
  if(limitEl){
    if(isPremium){
      limitEl.innerHTML = '<span style="color:#fbbf24;">💎 Premium - Illimité</span>';
    } else {
      limitEl.innerHTML = `<span style="color:${count >= limit ? '#dc2626' : '#6b7280'};">sur ${limit} max (gratuit)</span>`;
    }
  }
  
  if(myActors.length === 0){
    container.innerHTML = '<p class="muted" style="text-align:center;padding:40px;">Vous n\'avez pas encore créé d\'acteur. Cliquez sur "✚ Nouvel acteur" ci-dessus.</p>';
    return;
  }
  
  container.innerHTML = myActors.map(a => {
    const products = Array.isArray(a.products) ? a.products : [];
    const productsText = products.length > 0 ? products.map(p => typeof p === 'string' ? p : p.name).join(', ') : 'Aucun produit';
    const photoUrl = a.photo_url || '';
    
    return `
      <div class="card" style="display:grid;grid-template-columns:auto 1fr auto;gap:15px;align-items:start;padding:15px;">
        <div style="width:80px;height:80px;border-radius:8px;overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center;">
          ${photoUrl ? `<img src="${photoUrl}" alt="${a.name}" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:32px;">📷</span>'}
        </div>
        <div>
          <h4 style="margin:0 0 8px 0;">${a.name}</h4>
          <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span class="badge">${a.role || ''}</span>
            <span class="badge" style="background:#e0f2fe;color:#0369a1;">${a.region || ''}</span>
            ${a.verified ? '<span class="badge" style="background:#10b981;color:white;">✓ vérifié</span>' : ''}
          </div>
          <p style="margin:5px 0;color:#6b7280;font-size:14px;">📦 ${productsText}</p>
          ${a.volume ? `<p style="margin:5px 0;color:#6b7280;font-size:14px;">📊 Volume: ${a.volume} ${a.unit || 'kg'}</p>` : ''}
          ${a.price ? `<p style="margin:5px 0;color:#6b7280;font-size:14px;">💰 Prix: ${a.price} FCFA/${a.unit || 'kg'}</p>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button onclick="openActorDialog(${JSON.stringify(a).replace(/"/g, '&quot;')})" style="background:#3b82f6;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:14px;white-space:nowrap;">✏️ Modifier</button>
          <button onclick="deleteMyActor(${a.id})" style="background:#dc2626;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:14px;white-space:nowrap;">🗑️ Supprimer</button>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteMyActor(id){
  if(!confirm('Êtes-vous sûr de vouloir supprimer cet acteur ?')) return;
  
  try {
    const r = await fetch(`/api/actors/${id}`, {method: 'DELETE'});
    if(r.ok){
      await loadActors();
      await loadMyActors();
      renderMap();
      alert('✓ Acteur supprimé avec succès');
    } else {
      alert('Erreur lors de la suppression');
    }
  } catch(e){
    console.error('Erreur:', e);
    alert('Erreur lors de la suppression');
  }
}

async function loadMyLogistics(){
  if(!ME) return;
  
  const container = document.getElementById('myLogisticsList');
  const countEl = document.getElementById('myLogisticsCount');
  
  if(!container) return;
  
  await loadLogistics();
  const myLogs = LOGS.filter(l => l.owner_id === ME.id);
  const count = myLogs.length;
  
  if(countEl) countEl.textContent = `${count} publication${count > 1 ? 's' : ''}`;
  
  if(myLogs.length === 0){
    container.innerHTML = '<p class="muted" style="text-align:center;padding:40px;">Vous n\'avez pas encore créé de publication logistique. Cliquez sur "✚ Nouvelle publication" ci-dessus.</p>';
    return;
  }
  
  container.innerHTML = myLogs.map(l => {
    const typeColor = l.type === 'need' ? '#dc2626' : '#059669';
    const typeLabel = l.type === 'need' ? 'BESOIN' : 'OFFRE';
    
    return `
      <div class="card" style="padding:15px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
          <div style="flex:1;">
            <h4 style="margin:0 0 8px 0;">${l.title}</h4>
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              <span class="badge" style="background:${typeColor};color:white;">${typeLabel}</span>
              <span class="badge" style="background:#e0f2fe;color:#0369a1;">${l.region || 'Non spécifié'}</span>
            </div>
            ${l.details ? `<p style="margin:5px 0;color:#6b7280;font-size:14px;">${l.details}</p>` : ''}
            ${l.contact ? `<p style="margin:5px 0;color:#6b7280;font-size:14px;">📞 ${l.contact}</p>` : ''}
            ${l.whatsapp ? `<p style="margin:5px 0;color:#6b7280;font-size:14px;">💬 WhatsApp: ${l.whatsapp}</p>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-left:15px;">
            <button onclick='openLogDialog(${JSON.stringify(l).replace(/'/g, "\\'")})'  style="background:#3b82f6;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:14px;white-space:nowrap;">✏️ Modifier</button>
            <button onclick="deleteMyLogistic(${l.id})" style="background:#dc2626;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:14px;white-space:nowrap;">🗑️ Supprimer</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteMyLogistic(id){
  if(!confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) return;
  
  try {
    const r = await fetch(`/api/logistics/${id}`, {method: 'DELETE'});
    if(r.ok){
      await loadLogistics();
      await loadMyLogistics();
      alert('✓ Publication supprimée avec succès');
    } else {
      const err = await r.json();
      alert('Erreur: ' + (err.error || 'Impossible de supprimer'));
    }
  } catch(e){
    console.error('Erreur:', e);
    alert('Erreur lors de la suppression');
  }
}

// Commercial functions
async function loadCommercialStats(){
  if(!ME || !ME.is_commercial) return;
  try {
    const r = await fetch('/api/commercial/stats');
    if(r.ok){
      const stats = await r.json();
      document.getElementById('commercialTotalUsers').textContent = stats.totalUsers;
      document.getElementById('commercialTotalActors').textContent = stats.totalActors;
      document.getElementById('commercialPremiumUsers').textContent = stats.premiumUsers;
      renderCommercialRecruits(stats.recentUsers);
    }
    const userR = await fetch('/api/auth/me');
    const user = await userR.json();
    if(user.commercial_code){
      document.getElementById('commercialCodeDisplay').value = user.commercial_code;
    }
  } catch(e) {
    console.error('Error loading commercial stats:', e);
  }
}

function renderCommercialRecruits(users){
  const tbody = document.getElementById('commercialRecruitsList');
  if(!tbody) return;
  if(users.length === 0){
    tbody.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:20px;">Aucun utilisateur recruté</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    const planBadge = u.plan === 'premium' ? '<span class="badge" style="background:#fbbf24;color:white">💎 Premium</span>' : '<span class="badge" style="background:#d1d5db">Free</span>';
    const date = u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '-';
    return `<tr>
      <td>${u.id}</td>
      <td>${u.name || '-'}</td>
      <td>${u.email || u.phone || '-'}</td>
      <td>${u.role || '-'}</td>
      <td>${u.region || '-'}</td>
      <td>${planBadge}</td>
      <td>${u.actors_count || 0}</td>
      <td>${date}</td>
    </tr>`;
  }).join('');
}

document.getElementById('btnCopyCommercialCode')?.addEventListener('click', () => {
  const input = document.getElementById('commercialCodeDisplay');
  input.select();
  navigator.clipboard.writeText(input.value);
  alert('✓ Code copié !');
});

// Admin commercial functions
let ADMIN_COMMERCIALS = [];

async function loadAdminCommercials(){
  if(!ME || !ME.is_admin) return;
  try {
    const r = await fetch('/api/admin/commercials');
    if(r.ok){
      ADMIN_COMMERCIALS = await r.json();
      renderAdminCommercials();
    }
  } catch(e) {
    console.error('Error loading admin commercials:', e);
  }
}

function renderAdminCommercials(){
  const tbody = document.getElementById('adminCommercialsList');
  if(!tbody) return;
  if(ADMIN_COMMERCIALS.length === 0){
    tbody.innerHTML = '<tr><td colspan="10" class="muted" style="text-align:center;padding:20px;">Aucun commercial</td></tr>';
    return;
  }
  tbody.innerHTML = ADMIN_COMMERCIALS.map(c => {
    const statusBadge = c.status === 'active' ? '<span class="badge" style="background:#10b981;color:white">✓ Actif</span>' : '<span class="badge" style="background:#ef4444;color:white">Bloqué</span>';
    return `<tr>
      <td>${c.id}</td>
      <td><strong>${c.name || '-'}</strong></td>
      <td>${c.email || c.phone || '-'}</td>
      <td><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${c.commercial_code}</code></td>
      <td>${c.region || '-'}</td>
      <td><strong>${c.total_recruits || 0}</strong></td>
      <td>${c.total_actors || 0}</td>
      <td><strong style="color:#fbbf24;">💎 ${c.premium_recruits || 0}</strong></td>
      <td>${statusBadge}</td>
      <td>
        <button onclick="viewCommercialDetails(${c.id})" style="background:#3b82f6;color:white;padding:4px 8px;font-size:12px;">📊 Détails</button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('btnCreateCommercial')?.addEventListener('click', () => {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<form id="frmCreateCommercial" class="dialog-body">
    <h3>➕ Créer un commercial</h3>
    <div class="grid2">
      <label>Nom complet <input name="name" required></label>
      <label>Mot de passe <input name="password" type="password" required></label>
    </div>
    <div class="grid2">
      <label>Email <input name="email" type="email"></label>
      <label>Téléphone <input name="phone" type="tel"></label>
    </div>
    <div class="grid2">
      <label>WhatsApp <input name="whatsapp" type="tel"></label>
      <label>Région <input name="region"></label>
    </div>
    <p class="muted" style="margin:10px 0;font-size:13px;">Un code commercial unique sera généré automatiquement</p>
    <div class="dialog-actions">
      <button type="submit">✓ Créer</button>
      <button type="button" id="cancelCreate">Annuler</button>
    </div>
  </form>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.querySelector('#cancelCreate').onclick = () => dlg.close();
  dlg.querySelector('#frmCreateCommercial').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const r = await fetch('/api/admin/commercials/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if(r.ok){
      const result = await r.json();
      dlg.close();
      await loadAdminCommercials();
      alert(`✓ Commercial créé avec succès!\n\nCode commercial: ${result.commercial_code}\n\nDonnez ce code au commercial pour qu'il puisse recruter.`);
    } else {
      const err = await r.json();
      alert(err.error || 'Erreur lors de la création');
    }
  };
});

async function viewCommercialDetails(commercialId){
  const commercial = ADMIN_COMMERCIALS.find(c => c.id === commercialId);
  if(!commercial) return;
  
  try {
    const r = await fetch('/api/commercial/recruits');
    if(!r.ok) return alert('Erreur lors du chargement des détails');
    
    alert(`📊 Performance de ${commercial.name}\n\n` +
          `👥 Utilisateurs recrutés: ${commercial.total_recruits}\n` +
          `📦 Acteurs créés: ${commercial.total_actors}\n` +
          `💎 Clients Premium: ${commercial.premium_recruits}\n` +
          `🔗 Code: ${commercial.commercial_code}`);
  } catch(e) {
    console.error('Error:', e);
  }
}

window.viewCommercialDetails = viewCommercialDetails;

async function boot(){ 
  const me = await fetch('/api/auth/me'); 
  ME = await me.json(); 
  meEl.textContent = ME? `Connecté: ${ME.email || ME.phone || ME.name}`:''; 
  btnLogin.style.display = ME? 'none':'inline-block'; 
  btnLogout.style.display = ME? 'inline-block':'none'; 
  const btnSub=document.getElementById('btnSubscription'); 
  if(btnSub) btnSub.style.display = ME? 'inline-block':'none'; 
  
  const adminTab = document.getElementById('adminTab');
  if(adminTab) adminTab.style.display = ME && ME.is_admin ? 'inline-block' : 'none';
  
  const commercialTab = document.getElementById('commercialTab');
  if(commercialTab) commercialTab.style.display = ME && ME.is_commercial ? 'inline-block' : 'none';
  
  const statsTab = document.getElementById('statsTab');
  if(statsTab) statsTab.style.display = ME ? 'inline-block' : 'none';
  
  const settingsTab = document.getElementById('settingsTab');
  if(settingsTab) settingsTab.style.display = ME ? 'inline-block' : 'none';
  
  const budgetTab = document.getElementById('budgetTab');
  if(budgetTab) budgetTab.style.display = ME ? 'inline-block' : 'none';
  
  const costingTab = document.getElementById('costingTab');
  if(costingTab) costingTab.style.display = ME ? 'inline-block' : 'none';
  
  await loadRefs(); 
  await loadActors(); 
  await loadLogistics(); 
  await loadBudgets(); 
  await loadCosts(); 
  await loadMyActors();
  await loadMyLogistics();
  
  checkResetPasswordUrl();
  
  if(window._booted) return; 
  window._booted=true; 
}
await boot();
