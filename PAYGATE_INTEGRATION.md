# Guide d'Intégration PayGate - T-Money & Flooz

## 📋 Vue d'ensemble

Ce document décrit comment intégrer **PayGate Global** pour accepter les paiements automatiques via **T-Money** et **Flooz** au Togo.

---

## 🎯 Pourquoi PayGate ?

- ✅ **Support T-Money ET Flooz** (les 2 opérateurs dominants au Togo)
- ✅ **API simple et gratuite** à configurer
- ✅ **Monnaie locale** : FCFA
- ✅ **Dashboard de suivi** des paiements et soldes
- ✅ **Règlement rapide** : J+1 pour Flooz, tous les 10 jours pour T-Money
- ✅ **Documentation claire** avec exemples de code

---

## 🚀 Étapes d'inscription PayGate

### 1. Créer un compte marchand
1. Visitez : **https://www.paygateglobal.com/**
2. Créez un compte marchand gratuit
3. Complétez la vérification KYC (documents d'identité)
4. Liez vos comptes T-Money et/ou Flooz

### 2. Obtenir les identifiants API
Une fois votre compte approuvé :
- **Merchant ID** : Votre identifiant unique
- **API Key** : Clé secrète pour authentifier les requêtes
- **Callback URL** : URL de notification des paiements (webhook)

### 3. Configurer les URLs de callback
Dans le dashboard PayGate, configurez :
- **Success URL** : `https://votre-domaine.replit.app/payment/success`
- **Cancel URL** : `https://votre-domaine.replit.app/payment/cancel`
- **Callback URL** : `https://votre-domaine.replit.app/api/paygate/callback`

---

## 💻 Intégration Technique

### Architecture proposée

```
Frontend (public/app.js)
    ↓ Click "Passer à Premium"
    ↓
Backend (server.js)
    ↓ POST /api/payment/initiate
    ↓ Appel API PayGate
    ↓
PayGate
    ↓ Redirection vers page de paiement
    ↓
Utilisateur paye via T-Money/Flooz
    ↓
PayGate
    ↓ Callback POST /api/paygate/callback
    ↓
Backend vérifie et active Premium
    ↓
Utilisateur confirmé Premium ✅
```

---

## 📝 Code d'implémentation

### 1. Ajouter les dépendances

```bash
npm install axios
```

### 2. Configuration des secrets (Replit)

Ajoutez ces secrets dans Replit (Tools > Secrets) :
- `PAYGATE_MERCHANT_ID` : Votre Merchant ID
- `PAYGATE_API_KEY` : Votre API Key
- `PAYGATE_CALLBACK_SECRET` : Clé secrète pour valider les callbacks

### 3. Endpoint d'initiation de paiement

Ajoutez dans `server.js` :

```javascript
const axios = require('axios');

// Initier un paiement PayGate
app.post('/api/payment/initiate', requireAuth, async (req, res) => {
  const user = req.session.user;
  const amount = 5000; // 5000 FCFA pour Premium
  
  // Générer un ID de transaction unique
  const transactionId = `SUB-${user.id}-${Date.now()}`;
  
  try {
    const response = await axios.post('https://api.paygateglobal.com/v1/payment', {
      merchant_id: process.env.PAYGATE_MERCHANT_ID,
      api_key: process.env.PAYGATE_API_KEY,
      amount: amount,
      currency: 'XOF', // Franc CFA
      transaction_id: transactionId,
      customer_email: user.email,
      customer_name: user.name,
      description: 'Abonnement Premium AgriRéseau Pro',
      callback_url: `${process.env.REPLIT_DEV_DOMAIN}/api/paygate/callback`,
      success_url: `${process.env.REPLIT_DEV_DOMAIN}/payment/success`,
      cancel_url: `${process.env.REPLIT_DEV_DOMAIN}/payment/cancel`
    });
    
    // Sauvegarder la transaction en attente
    await db.query(
      'INSERT INTO payment_transactions (user_id, transaction_id, amount, status) VALUES ($1, $2, $3, $4)',
      [user.id, transactionId, amount, 'pending']
    );
    
    // Retourner l'URL de paiement PayGate
    res.json({ 
      payment_url: response.data.payment_url,
      transaction_id: transactionId
    });
  } catch (error) {
    console.error('PayGate initiation error:', error);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});
```

### 4. Endpoint de callback PayGate

```javascript
const crypto = require('crypto');

// Webhook de confirmation de paiement
app.post('/api/paygate/callback', async (req, res) => {
  const { transaction_id, status, amount, signature } = req.body;
  
  // Vérifier la signature pour sécurité
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PAYGATE_CALLBACK_SECRET)
    .update(transaction_id + status + amount)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    console.error('Invalid PayGate signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  if (status === 'success') {
    // Récupérer la transaction
    const transaction = await db.getOne(
      'SELECT * FROM payment_transactions WHERE transaction_id=$1',
      [transaction_id]
    );
    
    if (!transaction || transaction.status === 'completed') {
      return res.json({ message: 'Already processed' });
    }
    
    // Activer Premium
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    
    await db.query(
      `UPDATE subscriptions SET plan=$1, status=$2, payment_method=$3, amount=$4, 
       transaction_id=$5, started_at=$6, expires_at=$7 WHERE user_id=$8`,
      ['premium', 'active', 'paygate', amount, transaction_id, new Date(), expiresAt, transaction.user_id]
    );
    
    // Marquer la transaction comme complétée
    await db.query(
      'UPDATE payment_transactions SET status=$1, completed_at=$2 WHERE transaction_id=$3',
      ['completed', new Date(), transaction_id]
    );
    
    console.log(`Premium activated for user ${transaction.user_id}`);
  }
  
  res.json({ message: 'Callback processed' });
});
```

### 5. Table pour suivre les transactions

Créez une nouvelle table dans votre base de données :

```sql
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### 6. Modifier le frontend

Dans `public/app.js`, remplacez `showPaymentInstructions()` :

```javascript
window.showPaymentInstructions = async function() {
  // Afficher un loader
  const loader = document.createElement('div');
  loader.innerHTML = '<p style="text-align:center">⏳ Redirection vers PayGate...</p>';
  document.body.appendChild(loader);
  
  try {
    // Appeler l'API pour initier le paiement
    const response = await fetch('/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.payment_url) {
      // Rediriger vers PayGate
      window.location.href = data.payment_url;
    } else {
      alert('Erreur lors de l\'initiation du paiement');
    }
  } catch (error) {
    console.error('Payment error:', error);
    alert('Erreur lors de l\'initiation du paiement');
  } finally {
    loader.remove();
  }
}
```

---

## 🔒 Sécurité

### Bonnes pratiques :
1. ✅ **Toujours vérifier la signature** des callbacks PayGate
2. ✅ **Utiliser HTTPS** en production (Replit le fait automatiquement)
3. ✅ **Stocker les clés API** dans les Secrets (jamais dans le code)
4. ✅ **Vérifier le montant** dans le callback (éviter les modifications)
5. ✅ **Éviter les doublons** (vérifier si transaction déjà traitée)

---

## 🧪 Mode Test (Sandbox)

PayGate offre un environnement de test :
- URL Sandbox : `https://sandbox.paygateglobal.com/v1/payment`
- Utilisez des identifiants de test fournis par PayGate
- Testez avec de fausses transactions avant de passer en production

---

## 📊 Dashboard PayGate

Connectez-vous sur **https://www.paygateglobal.com/dashboard** pour :
- 📈 Voir toutes les transactions
- 💰 Consulter votre solde disponible
- 📤 Effectuer des retraits (Flooz quotidien, T-Money tous les 10 jours)
- 📧 Configurer les notifications email
- 🔧 Gérer vos paramètres API

---

## 💡 Activation Manuelle (Temporaire)

En attendant l'intégration PayGate, utilisez l'endpoint admin :

```bash
# Activer Premium manuellement
curl -X POST http://localhost:5000/api/admin/activate-premium \
  -H "Content-Type: application/json" \
  -b "cookies.txt" \
  -d '{
    "userEmail": "test@agri.tg",
    "transactionId": "TM123456789",
    "paymentMethod": "tmoney"
  }'
```

**Note** : Cet endpoint nécessite que vous soyez connecté. Pour l'utiliser :
1. Connectez-vous sur l'application
2. Récupérez le cookie de session
3. Appelez l'endpoint avec le cookie

---

## 📞 Support PayGate

- 🌐 Site web : https://www.paygateglobal.com/
- 📧 Email : support@paygateglobal.com
- 📱 WhatsApp : Disponible sur leur site web
- 📚 Documentation API : https://docs.paygateglobal.com/

---

## ✅ Checklist d'intégration

- [ ] Créer compte marchand PayGate
- [ ] Vérifier KYC (documents)
- [ ] Lier comptes T-Money/Flooz
- [ ] Obtenir Merchant ID et API Key
- [ ] Ajouter secrets dans Replit
- [ ] Installer dépendance `axios`
- [ ] Créer table `payment_transactions`
- [ ] Implémenter `/api/payment/initiate`
- [ ] Implémenter `/api/paygate/callback`
- [ ] Tester en mode Sandbox
- [ ] Modifier frontend pour redirection PayGate
- [ ] Tester paiement complet T-Money
- [ ] Tester paiement complet Flooz
- [ ] Passer en production
- [ ] Configurer monitoring des paiements

---

## 🎉 Prochaines étapes

Une fois PayGate intégré :
1. Les utilisateurs cliquent sur "Passer à Premium"
2. Ils sont redirigés vers PayGate
3. Ils choisissent T-Money ou Flooz
4. Ils paient via leur mobile
5. PayGate envoie une confirmation automatique
6. Premium activé instantanément ! ✨

**Temps estimé d'implémentation : 2-3 heures**

---

## 📝 Notes importantes

- **Frais PayGate** : Contactez PayGate pour connaître leurs tarifs (généralement ~2-3% par transaction)
- **Règlement** : J+1 pour Flooz, tous les 10 jours pour T-Money
- **Support client** : Prévoir une procédure de remboursement en cas de problème
- **Fiscalité** : Conservez les preuves de transactions pour la comptabilité

Bonne intégration ! 🚀
