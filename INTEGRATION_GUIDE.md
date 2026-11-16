# Guide d'Intégration AgriRéseau Pro

Ce guide explique comment configurer les intégrations tierces pour activer toutes les fonctionnalités de monétisation d'AgriRéseau Pro.

---

## 📱 Intégration Twilio (SMS & WhatsApp) — à développer

**État actuel : indisponible.** Les exemples ci-dessous sont des pistes d’intégration, pas du code actif. Aucun fournisseur d’envoi SMS/WhatsApp/email n’est implémenté. L’API d’envoi refuse en HTTP 503, sans enregistrer ni envoyer de message. L’historique Premium contient d’anciennes demandes, sans preuve de livraison. Ajouter des clés ne suffit pas à activer l’envoi. Ne pas activer de fournisseur payant ni effectuer de paiement réel sans autorisation. Voir le README pour les avantages Premium réellement disponibles.

### Prérequis
1. Créer un compte Twilio : https://www.twilio.com/try-twilio
2. Vérifier votre numéro de téléphone
3. Obtenir vos identifiants API

### Configuration

1. **Récupérer vos identifiants** depuis le Dashboard Twilio :
   - Account SID (format : `AC...`)
   - Auth Token
   - Numéro de téléphone Twilio (format : `+1234567890`)

2. **Ajouter les secrets dans Replit** :
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=votre_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

3. **Installer le package Twilio** :
   ```bash
   npm install twilio
   ```

4. **Code d'intégration** (à ajouter dans server.js) :
   ```javascript
   import twilio from 'twilio';
   
   const twilioClient = twilio(
     process.env.TWILIO_ACCOUNT_SID,
     process.env.TWILIO_AUTH_TOKEN
   );
   
   async function sendSMS(to, message) {
     await twilioClient.messages.create({
       body: message,
       from: process.env.TWILIO_PHONE_NUMBER,
       to: to
     });
   }
   
   async function sendWhatsApp(to, message) {
     await twilioClient.messages.create({
       body: message,
       from: 'whatsapp:' + process.env.TWILIO_PHONE_NUMBER,
       to: 'whatsapp:' + to
     });
   }
   ```

### Utilisation

**Envoyer un SMS** :
```javascript
await sendSMS('+22890123456', 'Votre message ici');
```

**Envoyer un WhatsApp** :
```javascript
await sendWhatsApp('+22890123456', 'Votre message ici');
```

### Prix
- SMS : ~$0.075 par message au Togo
- WhatsApp : ~$0.005 par message
- Crédit de démarrage : $15 offerts

---

## 💳 Intégration PayGate (T-Money & Flooz)

### Prérequis
1. Créer un compte marchand : https://www.paygateglobal.com/nouveau-compte
2. Fournir les documents légaux :
   - NIF (Numéro d'Identification Fiscale)
   - Nom de l'entreprise
   - Informations bancaires

### Configuration

1. **Récupérer vos identifiants** depuis le Dashboard PayGate :
   - API Key (format UUID : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - Merchant ID

2. **Ajouter les secrets dans Replit** :
   ```
   PAYGATE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   PAYGATE_MERCHANT_ID=votre_merchant_id
   PAYGATE_CALLBACK_URL=https://votre-app.replit.app/api/payments/callback
   ```

3. **Installer le package PayGate** (si disponible) ou utiliser l'API REST :
   ```bash
   npm install axios
   ```

4. **Code d'intégration** (à ajouter dans server.js) :
   ```javascript
   import axios from 'axios';
   
   async function initiatePayGatePayment(amount, provider, phoneNumber, transactionId) {
     const response = await axios.post('https://api.paygateglobal.com/v1/pay', {
       api_key: process.env.PAYGATE_API_KEY,
       merchant_id: process.env.PAYGATE_MERCHANT_ID,
       amount: amount,
       provider: provider, // 'tmoney' ou 'flooz'
       phone_number: phoneNumber,
       transaction_id: transactionId,
       callback_url: process.env.PAYGATE_CALLBACK_URL,
       description: 'Activation Premium AgriRéseau Pro'
     });
     
     return response.data;
   }
   ```

### Utilisation

**Initier un paiement** :
```javascript
const result = await initiatePayGatePayment(
  5000,              // Montant en FCFA
  'tmoney',          // ou 'flooz'
  '90123456',        // Numéro du client
  transactionId      // ID unique de transaction
);
```

### Codes USSD
- **T-Money** : `*145#` ou `*155*3#`
- **Flooz** : `*155*1#`

### Frais de Transaction
- Gratuit pour le marchand (frais payés par le client)
- Règlement : J+1 pour Flooz, tous les 10 jours pour T-Money

### Test
- Pas de sandbox : utiliser de vraies micro-transactions
- Minimum : 1 FCFA pour T-Money, 150 FCFA pour Flooz

---

## 🔐 Sécurité des API Keys

### Bonnes Pratiques
1. **Jamais** commiter les clés API dans le code
2. Toujours utiliser les variables d'environnement Replit
3. Restreindre les IP autorisées (si possible)
4. Régénérer les clés régulièrement
5. Activer l'authentification à deux facteurs

### Vérification de la Configuration
```javascript
// Ajouter au démarrage du serveur
if (!process.env.TWILIO_ACCOUNT_SID) {
  console.warn('⚠️  TWILIO_ACCOUNT_SID non configuré - Notifications désactivées');
}

if (!process.env.PAYGATE_API_KEY) {
  console.warn('⚠️  PAYGATE_API_KEY non configuré - Paiements mobiles désactivés');
}
```

---

## 📊 Suivi et Monitoring

### Dashboard Twilio
- Consulter l'historique des messages
- Vérifier le crédit restant
- Analyser les taux de livraison

### Dashboard PayGate
- Consulter les transactions
- Télécharger les relevés
- Initier les retraits

---

## 🆘 Support

### Twilio
- Documentation : https://www.twilio.com/docs
- Support : https://support.twilio.com

### PayGate
- Dashboard : https://www.paygateglobal.com
- Email : support@paygateglobal.com
- Téléphone : +228 XX XX XX XX

---

## ✅ Checklist de Mise en Production

- [ ] Compte Twilio créé et vérifié
- [ ] API Keys Twilio ajoutées dans Replit Secrets
- [ ] Package Twilio installé
- [ ] Après implémentation et autorisation explicite seulement : test d’envoi SMS avec preuve de livraison
- [ ] Test d'envoi WhatsApp réussi
- [ ] Compte PayGate créé et approuvé
- [ ] API Keys PayGate ajoutées dans Replit Secrets
- [ ] Callback URL configurée dans PayGate
- [ ] Test de paiement T-Money réussi
- [ ] Test de paiement Flooz réussi
- [ ] Monitoring actif sur les deux plateformes
